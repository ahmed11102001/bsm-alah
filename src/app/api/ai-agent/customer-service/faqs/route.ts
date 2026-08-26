// src/app/api/ai-agent/customer-service/faqs/route.ts
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

// ── GET — جلب الـ FAQs ──
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AI_AGENT_MANAGE");
  if (denied) return denied;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const faqs = await prisma.brandFAQ.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(faqs);
}

// ── POST — إضافة FAQ جديد ──
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
  const { question, answer, sortOrder } = body;

  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: "question and answer are required" }, { status: 400 });
  }

  const faq = await prisma.brandFAQ.create({
    data: {
      userId,
      question: question.trim(),
      answer: answer.trim(),
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    },
  });

  return NextResponse.json(faq, { status: 201 });
}

// ── PUT — تعديل FAQ ──
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
  const { id, question, answer, sortOrder } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const existing = await prisma.brandFAQ.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "FAQ not found" }, { status: 404 });

  const faq = await prisma.brandFAQ.update({
    where: { id },
    data: {
      ...(question?.trim() ? { question: question.trim() } : {}),
      ...(answer?.trim() ? { answer: answer.trim() } : {}),
      ...(typeof sortOrder === "number" ? { sortOrder } : {}),
    },
  });

  return NextResponse.json(faq);
}

// ── DELETE — حذف FAQ ──
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AI_AGENT_MANAGE");
  if (denied) return denied;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await prisma.brandFAQ.deleteMany({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
