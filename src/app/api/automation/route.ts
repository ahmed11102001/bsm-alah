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
  InteractiveMenuConfigSchema,
  parseInput,
} from "@/lib/schemas";
import { requirePermission } from "@/lib/permissions";

function ownerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

async function validateInteractiveConfig(userId: string, config: unknown, currentRuleId?: string) {
  const parsed = InteractiveMenuConfigSchema.safeParse(config);
  if (!parsed.success) return "إعدادات القائمة التفاعلية غير صحيحة";
  const nextStepIds = parsed.data.buttons.map(button => button.nextStepId).filter((id): id is string => Boolean(id));
  if (currentRuleId && nextStepIds.includes(currentRuleId)) return "لا يمكن للقائمة الانتقال إلى نفسها";
  if (nextStepIds.length) {
    const count = await prisma.automationRule.count({ where: { id: { in: nextStepIds }, userId } });
    if (count !== new Set(nextStepIds).size) return "يوجد Next Step غير تابع لهذا الحساب";
  }
  return null;
}

// GET /api/automation
export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AUTOMATION_VIEW");
  if (denied) return denied;

  const rules = await prisma.automationRule.findMany({
    where:   { userId: ownerId(session) },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(rules);
}

// POST /api/automation
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AUTOMATION_MANAGE");
  if (denied) return denied;

  // Plan guard: automation — starter فأعلى
  const owner = ownerId(session);
  const agGuard = await checkFeature(owner, "scheduledCampaigns");
  const agBlocked = guardResponse(agGuard);
  if (agBlocked) return agBlocked;

  const parsed = parseInput(AutomationCreateSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const {
    name, triggerType, triggerValue, replyType, replyContent,
    templateId, extraInstructions, humanKeywords, pauseOnReply, replyMediaUrl,
    interactiveConfig,
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

  // تحقق خاص بـ القائمة التفاعلية
  if (replyType === ReplyType.INTERACTIVE_MENU) {
    const validationError = await validateInteractiveConfig(owner, interactiveConfig);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
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
      interactiveConfig: replyType === ReplyType.INTERACTIVE_MENU ? (interactiveConfig as any) : null,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}

// PATCH /api/automation — تعديل جزئي
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AUTOMATION_MANAGE");
  if (denied) return denied;

  const parsed = parseInput(AutomationPatchSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { id, ...rest } = parsed.data as any;
  const owner = ownerId(session);

  const existing = await prisma.automationRule.findFirst({
    where: { id, userId: owner },
  });
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const targetReplyType = rest.replyType ?? existing.replyType;
  if (targetReplyType === ReplyType.INTERACTIVE_MENU && (rest.interactiveConfig !== undefined || rest.replyType !== undefined)) {
    const cfgToValidate = rest.interactiveConfig !== undefined ? rest.interactiveConfig : existing.interactiveConfig;
    const validationError = await validateInteractiveConfig(owner, cfgToValidate, id);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
  }

  const updated = await prisma.automationRule.update({ where: { id }, data: rest });
  return NextResponse.json(updated);
}

// DELETE /api/automation
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AUTOMATION_MANAGE");
  if (denied) return denied;

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
