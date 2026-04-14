import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. استلام البيانات (ضفنا phone هنا)
    const { email, password, name, phone } = await req.json();

    // 2. التأكد إن البيانات الأساسية موجودة
    if (!email || !password) {
      return NextResponse.json(
        { error: "البريد الإلكتروني وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    // 3. التأكد إن المستخدم مش موجود قبل كده
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "هذا البريد مسجل بالفعل" },
        { status: 400 }
      );
    }

    // 4. تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. حفظ المستخدم الجديد مع رقم الهاتف
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        phone, // ✅ تم إضافة الحقل هنا
      },
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