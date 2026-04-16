import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    console.log("🔧 إنشاء مستخدم تجريبي...");

    // تحقق من وجود المستخدم أولاً
    const existingUser = await prisma.user.findUnique({
      where: { email: "test@example.com" }
    });

    if (existingUser) {
      console.log("✅ المستخدم موجود بالفعل:", existingUser.id);
      return NextResponse.json({
        message: "المستخدم موجود",
        user: { id: existingUser.id, email: existingUser.email, name: existingUser.name }
      });
    }

    // إنشاء كلمة مرور مشفرة
    const hashedPassword = await bcrypt.hash("123456", 10);

    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "مستخدم تجريبي",
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    console.log("✅ تم إنشاء مستخدم تجريبي:", user);

    return NextResponse.json({
      message: "تم إنشاء المستخدم بنجاح",
      user,
      credentials: {
        email: "test@example.com",
        password: "123456"
      }
    });
  } catch (error) {
    console.error("❌ خطأ في إنشاء المستخدم:", error);
    return NextResponse.json(
      { error: "فشل إنشاء المستخدم", details: String(error) },
      { status: 500 }
    );
  }
}