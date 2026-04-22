// src/app/api/team/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { checkTeamLimit, guardResponse } from "@/lib/plan-guard";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });

  const team = await prisma.user.findMany({
    where:   { parentId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(team);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role === "CHAT_ONLY")
    return NextResponse.json({ error: "لا تملك صلاحية إضافة أعضاء" }, { status: 403 });

  // ✅ Guard: حد أعضاء الفريق
  const check = await checkTeamLimit(session.user.id);
  const block = guardResponse(check);
  if (block) return block;

  const body = await req.json();
  const { email, name, role } = body;

  if (!email || !role)
    return NextResponse.json({ error: "البريد والدور مطلوبان" }, { status: 400 });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser)
    return NextResponse.json({ error: "هذا البريد مسجل مسبقاً" }, { status: 400 });

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const newMember = await prisma.user.create({
    data: {
      email, name, role,
      parentId:   session.user.id,
      inviteCode: inviteCode,
      password:   `PENDING_${crypto.randomUUID()}`,
    },
  });

  return NextResponse.json(newMember);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID مطلوب" }, { status: 400 });

  const userToDelete = await prisma.user.findUnique({ where: { id } });
  if (!userToDelete)
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  if (userToDelete.parentId !== session.user.id)
    return NextResponse.json({ error: "لا تملك صلاحية حذف هذا المستخدم" }, { status: 403 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}