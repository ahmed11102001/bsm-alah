// src/app/api/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: Request) {
  const ip = getIP(req);
  const result = await rateLimit(`register:${ip}`, { limit: 5, windowSecs: 60 * 60 });

  if (!result.success) {
    return NextResponse.json(
      { error: `كثير من المحاولات. حاول بعد ${result.retryAfter} ثانية.` },
      { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
    );
  }

  try {
    const { email, password, name, phone } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "البريد الإلكتروني وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" },
        { status: 400 }
      );
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }

    if (!phone?.trim()) {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "رقم الهاتف غير صالح" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { message: "تم إنشاء الحساب بنجاح" },
        { status: 201 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          phone: normalizedPhone,
          password: hashedPassword,
          role: "OWNER",
        },
      });

      await tx.subscription.create({
        data: {
          userId: newUser.id,
          plan: "free",
          status: "active",
          campaignsUsedThisMonth: 0,
          periodResetAt: new Date(),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date("2099-12-31"),
        },
      });

      return newUser;
    });

    return NextResponse.json(
      { message: "تم إنشاء الحساب بنجاح", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء التسجيل" },
      { status: 500 }
    );
  }
}