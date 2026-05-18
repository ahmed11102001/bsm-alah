// src/app/api/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { RegisterSchema, parseInput } from "@/lib/schemas";

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
    const parsed = parseInput(RegisterSchema, await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { email, password, name, phone } = parsed.data;

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
        { error: "هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول أو استخدام بريد آخر" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
          currentPeriodEnd:   null,  // free plan — لا ينتهي
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