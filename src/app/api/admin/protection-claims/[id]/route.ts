// src/app/api/admin/protection-claims/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  AdminProtectionClaimDecisionSchema,
  parseInput,
} from "@/lib/schemas";
import { calculateSubscriptionRefund } from "@/lib/protection/audit-engine";

async function requireSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper || !session.user.id) return null;
  return session;
}

// ─── GET /api/admin/protection-claims/[id] ────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSuper();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const claimId = params.id;

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

  // Fetch timeline of messages around ban date
  const timelineMessages = await prisma.message.findMany({
    where: {
      userId: claim.userId,
      createdAt: { lte: banDate },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      contact: { select: { id: true, phone: true, name: true } },
      campaign: { select: { id: true, name: true } },
      automationRule: { select: { id: true, name: true } },
    },
  });

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
  { params }: { params: { id: string } }
) {
  const session = await requireSuper();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const claimId = params.id;
  const body = await req.json();
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

  const { status, decisionReason, adminNotes, refundAmount, refundStatus } = parsed.data;

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
        refundAmount: finalRefundAmount,
        refundStatus: finalRefundStatus,
      },
    },
  });

  return NextResponse.json(updatedClaim);
}
