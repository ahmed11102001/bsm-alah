// src/app/api/team/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { checkTeamLimit, guardResponse } from "@/lib/plan-guard";
import { TeamInviteSchema, parseInput } from "@/lib/schemas";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "TEAM_VIEW");
  if (denied) return denied;

  const team = await prisma.user.findMany({
    where:   { parentId: session!.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(team);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "TEAM_MANAGE");
  if (denied) return denied;

  const check = await checkTeamLimit(session!.user.id);
  const block = guardResponse(check);
  if (block) return block;

  const parsed = parseInput(TeamInviteSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { email, name, role } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser)
    return NextResponse.json({ error: "هذا البريد مسجل مسبقاً" }, { status: 400 });

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const newMember = await prisma.user.create({
    data: {
      email, name, role,
      parentId:   session!.user.id,
      inviteCode: inviteCode,
      password:   `PENDING_${crypto.randomUUID()}`,
    },
  });

  return NextResponse.json(newMember);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "TEAM_MANAGE");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  const member = await prisma.user.findFirst({
    where: { id, parentId: session!.user.id },
  });
  if (!member) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.user.update({
    where: { id },
    data:  { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}