import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

// ===== GET TEAM =====
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const team = await prisma.user.findMany({
      where: {
        parentId: session.user.id
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(team);
  } catch (error) {
    return NextResponse.json({ error: "تعذر جلب بيانات الفريق" }, { status: 500 });
  }
}

// ===== ADD MEMBER (توليد كود الدعوة) =====
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role === "CHAT_ONLY") {
      return NextResponse.json({ error: "لا تملك صلاحية إضافة أعضاء" }, { status: 403 });
    }

    const body = await req.json();
    const { email, name, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: "البريد والدور مطلوبان" }, { status: 400 });
    }

    // منع التكرار
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "هذا البريد مسجل مسبقاً" }, { status: 400 });
    }

    // --- الزتونة الجديدة: توليد كود دعوة فريد ---
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase(); 

    const newMember = await prisma.user.create({
      data: {
        email,
        name,
        role,
        parentId: session.user.id,
        inviteCode: inviteCode, // تخزين الكود
        password: `PENDING_${crypto.randomUUID()}`, // كلمة مرور مؤقتة غير قابلة للاختراق
      },
    });

    return NextResponse.json(newMember);
  } catch (error) {
    console.error("POST TEAM ERROR:", error);
    return NextResponse.json({ error: "فشل إضافة العضو" }, { status: 500 });
  }
}

// ===== DELETE MEMBER =====
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID مطلوب" }, { status: 400 });

    const userToDelete = await prisma.user.findUnique({ where: { id } });

    if (!userToDelete) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    if (userToDelete.parentId !== session.user.id) {
      return NextResponse.json({ error: "لا تملك صلاحية حذف هذا المستخدم" }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "فشل حذف العضو" }, { status: 500 });
  }
}