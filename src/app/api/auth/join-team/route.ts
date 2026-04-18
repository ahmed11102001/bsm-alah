import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, inviteCode, password } = body;

    // 1. تشيك أساسي على البيانات
    if (!email || !inviteCode || !password) {
      return NextResponse.json(
        { error: "البريد والكود وكلمة المرور مطلوبة" },
        { status: 400 }
      );
    }

    // 2. البحث عن المستخدم "بشرط" أن الكود غير فارغ
    // ده بيمنع أي حد يحاول يستخدم الـ API ده على حساب مفعل مسبقاً
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        inviteCode: {
          not: null, // لازم يكون الحساب مستني تفعيل (عنده كود)
          equals: inviteCode // ولازم الكود يطابق اللي الموظف دخله
        },
      },
    });

    // لو ملقناش المستخدم، ده معناه: (إما الإيميل غلط، أو الكود غلط، أو الحساب اتفعل قبل كدة)
    if (!user) {
      return NextResponse.json(
        { error: "كود الانضمام غير صحيح، أو أن الحساب قد تم تفعيله بالفعل" },
        { status: 404 }
      );
    }

    // 3. تأمين كلمة المرور
    if (password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. التحديث النهائي (التفعيل)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        inviteCode: null, // بمجرد ما يبقى null، الـ API ده مش هيشتغل على اليوزر ده تاني أبداً
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "أهلاً بك في الفريق! تم تفعيل حسابك." 
    }, { status: 200 });

  } catch (error) {
    console.error("JOIN_TEAM_SECURE_ERROR:", error);
    return NextResponse.json(
      { error: "فشل تفعيل الحساب، حاول مرة أخرى" },
      { status: 500 }
    );
  }
}