import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ===== GET TEAM =====
export async function GET() {
  try {
    const team = await prisma.user.findMany({
      orderBy: { createdAt: "desc" }, // أفضل من id
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "تعذر جلب بيانات الفريق" },
      { status: 500 }
    );
  }
}

// ===== ADD MEMBER =====
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, role } = body;

    // Validation أساسي
    if (!email || !role) {
      return NextResponse.json(
        { error: "email و role مطلوبين" },
        { status: 400 }
      );
    }

    const allowedRoles = ["FULL_ACCESS", "CHAT_ONLY"];

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Role غير صالح" },
        { status: 400 }
      );
    }

    // منع التكرار
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "هذا البريد مستخدم بالفعل" },
        { status: 400 }
      );
    }

    const newMember = await prisma.user.create({
      data: {
        email,
        name,
        role,
        password: crypto.randomUUID(), // حل مشكلة required field
      },
    });

    return NextResponse.json(newMember);
  } catch (error) {
    console.error("POST TEAM ERROR:", error);
    return NextResponse.json(
      { error: "فشل إضافة العضو" },
      { status: 500 }
    );
  }
}

// ===== DELETE MEMBER =====
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID مطلوب" },
        { status: 400 }
      );
    }

    // حماية بسيطة (اختياري لكن مهم)
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    if (user.role === "OWNER") {
      return NextResponse.json(
        { error: "لا يمكن حذف الـ OWNER" },
        { status: 403 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "فشل حذف العضو" },
      { status: 500 }
    );
  }
}