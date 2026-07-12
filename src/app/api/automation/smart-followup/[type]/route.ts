// src/app/api/automation/smart-followup/[type]/route.ts
// ─── API endpoints للمتابعة الذكية (شحن + سلة متروكة) ───────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const VALID_TYPES = ["shipping", "cart"] as const;

const TEXT_SCHEMAS: Record<typeof VALID_TYPES[number], string[]> = {
  shipping: ["rating", "ratingThanks", "notArrived", "problemType", "problemThanks"],
  cart:     ["completeReply", "inquiryReply", "reasonQuestion", "reasonThanks"],
};

const DELAY_DAY_OPTIONS: Record<typeof VALID_TYPES[number], number[]> = {
  shipping: [1, 2, 3, 4, 5, 7],
  cart:     [1, 2, 3],
};

const REPLY_DELAY_OPTIONS = [0, 0.5, 1, 2];
const MAX_TEXT_LENGTH = 1024;

function resolveOwnerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

function isValidType(type: string): type is typeof VALID_TYPES[number] {
  return VALID_TYPES.includes(type as any);
}

// ─── Template resolution (same logic as store/automation) ────────────────────
async function resolveSmartFollowUpTemplate(userId: string, type: typeof VALID_TYPES[number]) {
  const templateNames: Record<string, string> = {
    shipping: "wani_shipping_followup",
    cart:     "wani_abandoned_cart_followup",
  };
  const templateName = templateNames[type];
  const template = await prisma.template.findFirst({
    where: {
      userId,
      name: { equals: templateName, mode: "insensitive" },
    },
    orderBy: { status: "asc" },
    select: { id: true, name: true, status: true, language: true },
  });
  if (!template || template.status.toLowerCase() !== "approved") return null;
  return template;
}

// ─── GET ───────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> | { type: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);
  const { type } = await params;

  if (!isValidType(type)) {
    return NextResponse.json(
      { error: `type غير صحيح — القيم المتاحة: ${VALID_TYPES.join(", ")}` },
      { status: 422 }
    );
  }

  const setting = await prisma.smartFollowUpSetting.findUnique({
    where: { userId_type: { userId: ownerId, type } },
  });

  const template = await resolveSmartFollowUpTemplate(ownerId, type);

  return NextResponse.json({
    setting: setting ?? {
      isEnabled: false,
      triggerDelayDays: 3,
      replyDelayMinutes: 0,
      texts: {},
      sentCount: 0,
      failedCount: 0,
      lastSentAt: null,
    },
    template: template ? { id: template.id, name: template.name, status: template.status } : null,
    stats: {
      sentCount: setting?.sentCount ?? 0,
      failedCount: setting?.failedCount ?? 0,
      lastSentAt: setting?.lastSentAt ?? null,
    },
  });
}

// ─── PUT ───────────────────────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> | { type: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);
  const { type } = await params;

  if (!isValidType(type)) {
    return NextResponse.json(
      { error: `type غير صحيح — القيم المتاحة: ${VALID_TYPES.join(", ")}` },
      { status: 422 }
    );
  }

  let body: {
    isEnabled?: boolean;
    triggerDelayDays?: number;
    replyDelayMinutes?: number;
    texts?: Record<string, string>;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { isEnabled = false, triggerDelayDays, replyDelayMinutes, texts } = body;

  // ── Validation ──
  if (triggerDelayDays !== undefined) {
    if (!DELAY_DAY_OPTIONS[type].includes(triggerDelayDays)) {
      return NextResponse.json(
        { error: `triggerDelayDays غير صحيح — القيم المتاحة: ${DELAY_DAY_OPTIONS[type].join(", ")}` },
        { status: 400 }
      );
    }
  }

  if (replyDelayMinutes !== undefined) {
    if (!REPLY_DELAY_OPTIONS.includes(replyDelayMinutes)) {
      return NextResponse.json(
        { error: `replyDelayMinutes غير صحيح — القيم المتاحة: ${REPLY_DELAY_OPTIONS.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // Validate texts keys
  if (texts !== undefined) {
    const requiredKeys = TEXT_SCHEMAS[type];
    const providedKeys = Object.keys(texts);
    const hasAllRequired = requiredKeys.every(k => providedKeys.includes(k));
    const hasExtraKeys = providedKeys.some(k => !requiredKeys.includes(k));

    if (!hasAllRequired || hasExtraKeys) {
      return NextResponse.json(
        { error: `texts يجب أن تحتوي بالضبط على المفاتيح: ${requiredKeys.join(", ")}` },
        { status: 400 }
      );
    }

    for (const [key, value] of Object.entries(texts)) {
      const str = String(value).trim();
      if (str.length === 0 || str.length > MAX_TEXT_LENGTH) {
        return NextResponse.json(
          { error: `texts["${key}"] يجب أن يكون بين 1 و ${MAX_TEXT_LENGTH} حرف` },
          { status: 400 }
        );
      }
    }
  }

  // Check template approval before enabling
  if (isEnabled === true) {
    const template = await resolveSmartFollowUpTemplate(ownerId, type);
    if (!template) {
      const templateNames: Record<string, string> = {
        shipping: "wani_shipping_followup",
        cart:     "wani_abandoned_cart_followup",
      };
      const tpl = await prisma.template.findFirst({
        where: {
          userId: ownerId,
          name: { equals: templateNames[type], mode: "insensitive" },
        },
        select: { status: true },
      });
      return NextResponse.json(
        {
          error: `القالب "${templateNames[type]}" لم يُعتمد بعد — انتظر اعتماد ميتا قبل التفعيل`,
          templateStatus: tpl?.status ?? "MISSING",
        },
        { status: 422 }
      );
    }
  }

  // ── Upsert ──
  const updated = await prisma.smartFollowUpSetting.upsert({
    where: { userId_type: { userId: ownerId, type } },
    update: {
      isEnabled,
      ...(triggerDelayDays !== undefined && { triggerDelayDays }),
      ...(replyDelayMinutes !== undefined && { replyDelayMinutes }),
      ...(texts !== undefined && { texts }),
    },
    create: {
      userId: ownerId,
      type,
      isEnabled,
      triggerDelayDays: triggerDelayDays ?? 3,
      replyDelayMinutes: replyDelayMinutes ?? 0,
      texts: texts ?? {},
    },
  });

  return NextResponse.json({ success: true, setting: updated });
}
