// src/app/api/ai-agent/customer-service/issues/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { requirePermission } from "@/lib/permissions";

async function resolveUserId(session: any): Promise<string | null> {
  const directId = session?.user?.id;
  if (typeof directId === "string" && directId.trim()) return directId;
  const email = session?.user?.email;
  if (typeof email !== "string" || !email.trim()) return null;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  return user?.id ?? null;
}

// ── GET — جلب مشاكل العملاء وحلولها ──
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AI_AGENT_MANAGE");
  if (denied) return denied;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const issues = await prisma.customerIssue.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(issues);
}

// ── POST — إضافة مشكلة وحل جديدة ──
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AI_AGENT_MANAGE");
  if (denied) return denied;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guard = await checkFeature(userId, "aiAgent");
  const blocked = guardResponse(guard);
  if (blocked) return blocked;

  const body = await req.json();
  const { problem, resolution, sortOrder } = body;

  if (!problem?.trim() || !resolution?.trim()) {
    return NextResponse.json({ error: "problem and resolution are required" }, { status: 400 });
  }

  const issue = await prisma.customerIssue.create({
    data: {
      userId,
      problem: problem.trim(),
      resolution: resolution.trim(),
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    },
  });

  return NextResponse.json(issue, { status: 201 });
}

// ── PUT — تعديل مشكلة وحل ──
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AI_AGENT_MANAGE");
  if (denied) return denied;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guard = await checkFeature(userId, "aiAgent");
  const blocked = guardResponse(guard);
  if (blocked) return blocked;

  const body = await req.json();
  const { id, problem, resolution, sortOrder } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const existing = await prisma.customerIssue.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

  const issue = await prisma.customerIssue.update({
    where: { id },
    data: {
      ...(problem?.trim() ? { problem: problem.trim() } : {}),
      ...(resolution?.trim() ? { resolution: resolution.trim() } : {}),
      ...(typeof sortOrder === "number" ? { sortOrder } : {}),
    },
  });

  return NextResponse.json(issue);
}

// ── DELETE — حذف مشكلة وحل ──
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AI_AGENT_MANAGE");
  if (denied) return denied;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await prisma.customerIssue.deleteMany({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
