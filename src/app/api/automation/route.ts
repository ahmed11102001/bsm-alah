// src/app/api/automation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { TriggerType, ReplyType } from "@/types/enums";
import { checkFeature, guardResponse } from "@/lib/plan-guard";

function ownerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

// ─── GET /api/automation ──────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const rules = await prisma.automationRule.findMany({
    where:   { userId: ownerId(session) },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(rules);
}

// ─── POST /api/automation ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // ── Plan guard: automation — starter فأعلى ──
  const owner = ownerId(session);
  const agGuard = await checkFeature(owner, "scheduledCampaigns");
  const agBlocked = guardResponse(agGuard);
  if (agBlocked) return agBlocked;

  // فقط OWNER / FULL_ACCESS
  if ((session.user as any).role === "CHAT_ONLY")
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await req.json();
  const { name, triggerType, triggerValue, replyType, replyContent,
          templateId, extraInstructions, humanKeywords, pauseOnReply } = body;

  // ── Validation ──────────────────────────────────────────────────
  if (!name?.trim())
    return NextResponse.json({ error: "اسم القاعدة مطلوب" }, { status: 400 });

  const validTriggers = Object.values(TriggerType) as string[];
  if (!validTriggers.includes(triggerType))
    return NextResponse.json({ error: "نوع المُشغِّل غير صالح" }, { status: 400 });

  if (triggerType === TriggerType.KEYWORD && !triggerValue?.trim())
    return NextResponse.json({ error: "الكلمة المفتاحية مطلوبة" }, { status: 400 });

  if (triggerType === TriggerType.NO_REPLY) {
    const days = Number(triggerValue);
    if (!days || days < 1 || days > 365)
      return NextResponse.json({ error: "عدد الأيام يجب أن يكون بين 1 و 365" }, { status: 400 });
  }

  const validReplies = Object.values(ReplyType) as string[];
  if (!validReplies.includes(replyType))
    return NextResponse.json({ error: "نوع الرد غير صالح" }, { status: 400 });

  if (replyType === ReplyType.TEXT && !replyContent?.trim())
    return NextResponse.json({ error: "نص الرد مطلوب" }, { status: 400 });

  if (replyType === ReplyType.TEMPLATE && !templateId)
    return NextResponse.json({ error: "اختر قالباً" }, { status: 400 });

  if (replyType === ReplyType.AI) {
    // تحقق إن المستخدم عنده بيانات البراند في AIAgent (المصدر الحقيقي)
    const agent = await prisma.aIAgent.findUnique({
      where:  { userId: ownerId(session) },
      select: { businessDesc: true },
    });
    if (!agent?.businessDesc?.trim())
      return NextResponse.json({
        error: "يجب إدخال وصف النشاط في إعدادات البراند أولاً قبل استخدام الرد الذكي",
      }, { status: 400 });
  }

  const rule = await prisma.automationRule.create({
    data: {
      userId:            ownerId(session),
      name:              name.trim(),
      triggerType,
      triggerValue:      triggerValue?.trim() || null,
      replyType,
      replyContent:      replyContent?.trim() || null,
      templateId:        templateId || null,
      extraInstructions: extraInstructions?.trim() || null,
      humanKeywords:     Array.isArray(humanKeywords) ? humanKeywords.map((k: string) => k.trim()).filter(Boolean) : [],
      pauseOnReply:      pauseOnReply !== false,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}

// ─── PATCH /api/automation ────────────────────────────────────────────────────
// Body: { id, ...fields } — يدعم التعديل الجزئي
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const { id, ...rest } = body;

  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  // تأكد إن القاعدة ملك نفس المستخدم
  const existing = await prisma.automationRule.findFirst({
    where: { id, userId: ownerId(session) },
  });
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const updated = await prisma.automationRule.update({
    where: { id },
    data:  rest,
  });

  return NextResponse.json(updated);
}

// ─── DELETE /api/automation ───────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  const existing = await prisma.automationRule.findFirst({
    where: { id, userId: ownerId(session) },
  });
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.automationRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}