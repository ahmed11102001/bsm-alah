// src/app/api/automation/campaign-followup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function resolveOwnerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

// ─── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId") || "all";

  const setting = await prisma.campaignFollowUpSetting.findFirst({
    where: { userId: ownerId, campaignId },
  });

  return NextResponse.json({
    setting: setting ?? {
      campaignId,
      isEnabled: false,
      triggerDelayDays: 1,
      replyDelayMinutes: 0,
      texts: {},
      sentCount: 0,
      failedCount: 0,
      lastSentAt: null,
      templateId: null,
    },
    stats: {
      sentCount: setting?.sentCount ?? 0,
      failedCount: setting?.failedCount ?? 0,
      lastSentAt: setting?.lastSentAt ?? null,
    },
  });
}

// ─── PUT ───────────────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);
  
  let body: {
    campaignId?: string;
    isEnabled?: boolean;
    triggerDelayDays?: number;
    replyDelayMinutes?: number;
    texts?: Record<string, string>;
    templateId?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { campaignId = "all", isEnabled = false, triggerDelayDays, replyDelayMinutes, texts, templateId } = body;

  const updated = await prisma.campaignFollowUpSetting.upsert({
    where: { userId_campaignId: { userId: ownerId, campaignId } },
    update: {
      isEnabled,
      ...(triggerDelayDays !== undefined && { triggerDelayDays }),
      ...(replyDelayMinutes !== undefined && { replyDelayMinutes }),
      ...(texts !== undefined && { texts }),
      ...(templateId !== undefined && { templateId }),
    },
    create: {
      userId: ownerId,
      campaignId,
      isEnabled,
      triggerDelayDays: triggerDelayDays ?? 1,
      replyDelayMinutes: replyDelayMinutes ?? 0,
      texts: texts ?? {},
      templateId,
    },
  });

  return NextResponse.json({ success: true, setting: updated });
}
