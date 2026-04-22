// src/app/api/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password, name, phone } = await req.json();

    // ── Validation ──────────────────────────────────────────────
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
      return NextResponse.json(
        { error: "الاسم مطلوب" },
        { status: 400 }
      );
    }

    if (!phone?.trim()) {
      return NextResponse.json(
        { error: "رقم الهاتف مطلوب" },
        { status: 400 }
      );
    }

    // ── التأكد إن البريد مش موجود ──────────────────────────────
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "هذا البريد مسجل بالفعل" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ── إنشاء المستخدم + اشتراك مجاني في transaction واحدة ────
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          name:  name.trim(),
          phone: phone.trim(),
          password: hashedPassword,
          role: "OWNER",
        },
      });

      // ✅ إنشاء اشتراك مجاني تلقائياً
      await tx.subscription.create({
        data: {
          userId: newUser.id,
          plan:   "free",
          status: "active",
          campaignsUsedThisMonth: 0,
          periodResetAt:          new Date(),
          currentPeriodStart:     new Date(),
          // free لا تنتهي — نضع تاريخ بعيد جداً
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