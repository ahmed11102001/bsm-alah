// src/app/api/admin/protection-claims/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  AdminProtectionClaimDecisionSchema,
  AdminRefundOverrideSchema,
  AdminBanStatusUpdateSchema,
  parseInput,
} from "@/lib/schemas";
import { calculateSubscriptionRefund } from "@/lib/protection/audit-engine";

async function requireSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper || !session.user.id) return null;
  return session;
}

/** Safe ISO date serializer */
function safeIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

/** Determine source label for a message */
function getMessageSource(msg: any): string {
  if (msg.campaign) return `Campaign — ${msg.campaign.name}`;
  if (msg.automationRule) return `Automation — ${msg.automationRule.name}`;
  if (msg.senderType === "bot" || msg.senderType === "ai") return "AI Agent";
  if (msg.senderType === "system") return "System";
  return "Chat";
}

// ─── GET /api/admin/protection-claims/[id] ────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuper();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: claimId } = await params;

  const claim = await prisma.protectionClaim.findUnique({
    where: { id: claimId },
    include: {
      user: {
        include: {
          subscription: true,
        },
      },
      whatsappAccount: true,
      reviewer: {
        select: { id: true, name: true, email: true },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        include: {
          adminUser: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  const banDate = new Date(claim.banDetectedAt);

  // Fetch timeline of messages around ban date with proper serialization
  const rawMessages = await prisma.message.findMany({
    where: {
      userId: claim.userId,
      createdAt: { lte: banDate },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      contact: { select: { id: true, phone: true, name: true } },
      campaign: { select: { id: true, name: true } },
      automationRule: { select: { id: true, name: true, triggerType: true, replyType: true } },
    },
  });

  // Properly serialize timeline messages to prevent Invalid Date
  const timelineMessages = rawMessages.map((msg: any) => ({
    id: msg.id,
    createdAt: safeIso(msg.createdAt) || "",
    time: safeIso(msg.createdAt) || "",
    type: msg.type,
    direction: msg.direction,
    senderType: msg.senderType,
    contentSnippet: (msg.content || "").slice(0, 100),
    contactPhone: msg.contact?.phone || null,
    contactName: msg.contact?.name || null,
    templateName: msg.campaign?.name || msg.automationRule?.name || null,
    ruleName: msg.automationRule?.name || null,
    source: getMessageSource(msg),
    whatsappId: msg.whatsappId || null,
    status: msg.status,
    // Automation details
    automationId: msg.automationRule?.id || null,
    automationName: msg.automationRule?.name || null,
    automationTriggerType: msg.automationRule?.triggerType || null,
    automationReplyType: msg.automationRule?.replyType || null,
    // Campaign details
    campaignId: msg.campaign?.id || null,
    campaignName: msg.campaign?.name || null,
  }));

  // Fetch recent campaigns
  const recentCampaigns = await prisma.campaign.findMany({
    where: {
      userId: claim.userId,
      createdAt: { lte: banDate },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      template: { select: { id: true, name: true, status: true } },
    },
  });

  // Fetch recent automations
  const automations = await prisma.automationRule.findMany({
    where: { userId: claim.userId },
    take: 5,
  });

  // Calculate live prorated refund values
  const liveRefund = calculateSubscriptionRefund(
    claim.user.subscription,
    banDate,
    claim.currency || "EGP"
  );

  return NextResponse.json({
    claim,
    liveRefund,
    timelineMessages,
    recentCampaigns,
    automations,
  });
}

// ─── PATCH /api/admin/protection-claims/[id] ──────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuper();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: claimId } = await params;
  const body = await req.json();

  // ── Handle Ban Status Update ──
  if (body._action === "update_ban_status") {
    const parsed = parseInput(AdminBanStatusUpdateSchema, body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const updatedClaim = await prisma.protectionClaim.update({
      where: { id: claimId },
      data: { banStatus: parsed.data.banStatus },
    });

    await prisma.protectionAuditLog.create({
      data: {
        claimId,
        adminUserId: session.user.id,
        action: "UPDATE_BAN_STATUS",
        result: parsed.data.banStatus,
        details: { banStatus: parsed.data.banStatus },
      },
    });

    return NextResponse.json(updatedClaim);
  }

  // ── Handle Refund Override ──
  if (body._action === "refund_override") {
    const parsed = parseInput(AdminRefundOverrideSchema, body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existingClaim = await prisma.protectionClaim.findUnique({
      where: { id: claimId },
    });
    if (!existingClaim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const oldAmount = existingClaim.refundAmount;
    const updatedClaim = await prisma.protectionClaim.update({
      where: { id: claimId },
      data: {
        overrideRefund: parsed.data.overrideRefund,
        overrideReason: parsed.data.overrideReason,
        refundAmount: parsed.data.overrideRefund,
      },
    });

    await prisma.protectionAuditLog.create({
      data: {
        claimId,
        adminUserId: session.user.id,
        action: "REFUND_OVERRIDE",
        result: `${oldAmount} → ${parsed.data.overrideRefund}`,
        details: {
          oldAmount,
          newAmount: parsed.data.overrideRefund,
          reason: parsed.data.overrideReason,
        },
      },
    });

    return NextResponse.json(updatedClaim);
  }

  // ── Standard Decision ──
  const parsed = parseInput(AdminProtectionClaimDecisionSchema, body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const existingClaim = await prisma.protectionClaim.findUnique({
    where: { id: claimId },
    include: {
      user: { include: { subscription: true } },
    },
  });

  if (!existingClaim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  const { status, decisionReason, adminNotes, refundAmount, refundStatus, evidenceRequested } = parsed.data;

  // Compute final refund amount if approving
  let finalRefundAmount = refundAmount;
  let finalRefundStatus = refundStatus || existingClaim.refundStatus;

  if (status === "ELIGIBLE") {
    if (finalRefundAmount === undefined || finalRefundAmount === null) {
      const calc = calculateSubscriptionRefund(
        existingClaim.user.subscription,
        new Date(existingClaim.banDetectedAt),
        existingClaim.currency
      );
      finalRefundAmount = calc.calculatedRefund;
    }
    if (finalRefundStatus === "NONE") {
      finalRefundStatus = "APPROVED_PENDING_PROCESSING";
    }
  } else if (status === "NOT_ELIGIBLE") {
    finalRefundAmount = 0;
    finalRefundStatus = "NONE";
  }

  // Get snapshot to log UNKNOWN/NEEDS_EVIDENCE checks during approval
  const snapshot = existingClaim.evidenceSnapshot as any;
  let unknownChecks: string[] = [];
  if (status === "ELIGIBLE" && snapshot?.checklist) {
    unknownChecks = snapshot.checklist
      .filter((c: any) => c.status === "UNKNOWN" || c.status === "NEEDS EVIDENCE" || c.status === "NEEDS_EVIDENCE")
      .map((c: any) => `${c.id}: ${c.status}`);
  }

  const updatedClaim = await prisma.protectionClaim.update({
    where: { id: claimId },
    data: {
      status,
      decisionReason: decisionReason !== undefined ? decisionReason : existingClaim.decisionReason,
      adminNotes: adminNotes !== undefined ? adminNotes : existingClaim.adminNotes,
      refundAmount: finalRefundAmount !== undefined ? finalRefundAmount : existingClaim.refundAmount,
      refundStatus: finalRefundStatus,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, brandName: true },
      },
      whatsappAccount: {
        select: { id: true, phoneNumberId: true, wabaId: true, tokenStatus: true },
      },
      reviewer: {
        select: { id: true, name: true, email: true },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        include: {
          adminUser: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  // Action mapping for audit logging
  let action = "UPDATE_STATUS";
  if (status === "ELIGIBLE") action = "APPROVE_REFUND";
  else if (status === "NOT_ELIGIBLE") action = "REJECT_CLAIM";
  else if (status === "PENDING_EVIDENCE") action = "REQUEST_EVIDENCE";

  await prisma.protectionAuditLog.create({
    data: {
      claimId,
      adminUserId: session.user.id,
      action,
      result: status,
      details: {
        decisionReason: decisionReason || null,
        adminNotes: adminNotes || null,
        evidenceRequested: evidenceRequested || null,
        refundAmount: finalRefundAmount,
        refundStatus: finalRefundStatus,
        systemAssessmentAtDecision: snapshot?.systemAssessment || null,
        unknownChecksAtApproval: unknownChecks.length > 0 ? unknownChecks : null,
        adminConfirmation: parsed.data.confirmOverride || false,
      },
    },
  });

  return NextResponse.json(updatedClaim);
}

// ─── DELETE /api/admin/protection-claims/[id] ─────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuper();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: claimId } = await params;

  const existingClaim = await prisma.protectionClaim.findUnique({
    where: { id: claimId },
  });

  if (!existingClaim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  // Delete claim (audit logs will be deleted via cascading relation)
  await prisma.protectionClaim.delete({
    where: { id: claimId },
  });

  return NextResponse.json({ success: true, id: claimId });
}

