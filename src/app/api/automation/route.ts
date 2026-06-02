// src/app/api/automation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ReplyType } from "@/types/enums";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import {
  AutomationCreateSchema,
  AutomationPatchSchema,
  AutomationDeleteSchema,
  parseInput,
} from "@/lib/schemas";

function ownerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

// GET /api/automation
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const rules = await prisma.automationRule.findMany({
    where:   { userId: ownerId(session) },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(rules);
}

// POST /api/automation
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // Plan guard: automation — starter فأعلى
  const owner = ownerId(session);
  const agGuard = await checkFeature(owner, "scheduledCampaigns");
  const agBlocked = guardResponse(agGuard);
  if (agBlocked) return agBlocked;

  // فقط OWNER / FULL_ACCESS
  if ((session.user as any).role === "CHAT_ONLY")
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const parsed = parseInput(AutomationCreateSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const {
    name, triggerType, triggerValue, replyType, replyContent,
    templateId, extraInstructions, humanKeywords, pauseOnReply, replyMediaUrl,
  } = parsed.data;

  // تحقق خاص بـ AI — يحتاج DB
  if (replyType === ReplyType.AI) {
    const agent = await prisma.aIAgent.findUnique({
      where:  { userId: owner },
      select: { businessDesc: true },
    });
    if (!agent?.businessDesc?.trim())
      return NextResponse.json({
        error: "يجب إدخال وصف النشاط في إعدادات البراند أولاً قبل استخدام الرد الذكي",
      }, { status: 400 });
  }

  const rule = await prisma.automationRule.create({
    data: {
      userId:            owner,
      name:              name.trim(),
      triggerType,
      triggerValue:      triggerValue?.trim() || null,
      replyType,
      replyContent:      replyContent?.trim() || null,
      replyMediaUrl:     replyMediaUrl?.trim() || null,
      templateId:        templateId || null,
      extraInstructions: extraInstructions?.trim() || null,
      humanKeywords:     humanKeywords.map((k: string) => k.trim()).filter(Boolean),
      pauseOnReply,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}

// PATCH /api/automation — تعديل جزئي
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const parsed = parseInput(AutomationPatchSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { id, ...rest } = parsed.data as any;

  const existing = await prisma.automationRule.findFirst({
    where: { id, userId: ownerId(session) },
  });
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const updated = await prisma.automationRule.update({ where: { id }, data: rest });
  return NextResponse.json(updated);
}

// DELETE /api/automation
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const parsed = parseInput(AutomationDeleteSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { id } = parsed.data;

  const existing = await prisma.automationRule.findFirst({
    where: { id, userId: ownerId(session) },
  });
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.automationRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}