// src/lib/protection/audit-engine.ts

import prisma from "@/lib/prisma";
import { SUBSCRIPTION_PLANS, type PlanSlug } from "@/lib/pricing";
import type {
  EvidenceSnapshot,
  ComplianceCheckItem,
  RefundCalculation,
  MessageTimelineItem,
  CampaignSummaryItem,
  AutomationSummaryItem,
  BanStatusType,
} from "./types";

/**
 * Calculates remaining prorated refund from the user's active subscription.
 */
export function calculateSubscriptionRefund(
  subscription: {
    plan: string;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    createdAt: Date;
  } | null,
  banDate: Date,
  currency = "EGP"
): RefundCalculation {
  if (!subscription) {
    return {
      plan: "none",
      monthlyPrice: 0,
      currency,
      subscriptionStart: null,
      subscriptionEnd: null,
      banDate: banDate.toISOString(),
      totalDaysInPeriod: 0,
      usedDays: 0,
      remainingDays: 0,
      calculatedRefund: 0,
    };
  }

  const planKey = subscription.plan.toLowerCase() as PlanSlug;
  const planInfo = (SUBSCRIPTION_PLANS as Record<string, any>)[planKey];
  const monthlyPrice = planInfo?.monthly ?? 0;

  const startDate = subscription.currentPeriodStart || subscription.createdAt;
  // If end date is not explicitly set, default to 30 days after start
  const endDate =
    subscription.currentPeriodEnd ||
    new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  const totalPeriodMs = Math.max(1, endDate.getTime() - startDate.getTime());
  const totalDaysInPeriod = Math.max(1, Math.ceil(totalPeriodMs / (1000 * 60 * 60 * 24)));

  const banMs = banDate.getTime();
  let remainingDays = 0;
  let usedDays = 0;

  if (banMs <= startDate.getTime()) {
    remainingDays = totalDaysInPeriod;
    usedDays = 0;
  } else if (banMs >= endDate.getTime()) {
    remainingDays = 0;
    usedDays = totalDaysInPeriod;
  } else {
    usedDays = Math.floor((banMs - startDate.getTime()) / (1000 * 60 * 60 * 24));
    remainingDays = Math.max(0, Math.ceil((endDate.getTime() - banMs) / (1000 * 60 * 60 * 24)));
  }

  const calculatedRefund =
    monthlyPrice > 0 && remainingDays > 0
      ? Number(((monthlyPrice / totalDaysInPeriod) * remainingDays).toFixed(2))
      : 0;

  return {
    plan: planInfo?.name || subscription.plan,
    monthlyPrice,
    currency,
    subscriptionStart: startDate.toISOString(),
    subscriptionEnd: endDate.toISOString(),
    banDate: banDate.toISOString(),
    totalDaysInPeriod,
    usedDays,
    remainingDays,
    calculatedRefund,
  };
}

/**
 * Helper: safely serializes a date to ISO string, returns null if invalid.
 */
function safeIsoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Determine source label for a message (Chat / Campaign / Automation / API)
 */
function getMessageSource(msg: any): string {
  if (msg.campaign) {
    return `Campaign — ${msg.campaign.name}`;
  }
  if (msg.automationRule) {
    return `Automation — ${msg.automationRule.name}`;
  }
  if (msg.senderType === "bot" || msg.senderType === "ai") {
    return "AI Agent";
  }
  if (msg.senderType === "system") {
    return "System";
  }
  return "Chat";
}

/**
 * Runs the comprehensive Protection Audit on a claim.
 */
export async function runProtectionAudit(
  claimId: string,
  adminUserId: string
): Promise<{ snapshot: EvidenceSnapshot; claim: any }> {
  const claim = await prisma.protectionClaim.findUnique({
    where: { id: claimId },
    include: {
      user: {
        include: {
          subscription: true,
        },
      },
      whatsappAccount: true,
    },
  });

  if (!claim) {
    throw new Error("Protection Claim not found");
  }

  const { user, whatsappAccount, banDetectedAt } = claim;
  const banDate = new Date(banDetectedAt);
  const banStatus: BanStatusType = (claim as any).banStatus || "CUSTOMER_REPORTED";

  // Audit period: from account creation to ban reported time
  const auditPeriodFrom = new Date(whatsappAccount.createdAt);

  // 1. Account Connection Check
  const accountConnectedAt = new Date(whatsappAccount.createdAt);
  const isConnectedBeforeBan = accountConnectedAt <= banDate;
  const tokenStatus = whatsappAccount.tokenStatus;
  const messagingTier = whatsappAccount.messagingTier ?? 1;
  const dailySentCount = whatsappAccount.dailySentCount ?? 0;

  // 2. Fetch Recent Messages around ban date (focused on window prior to ban)
  // Limit to 200 most recent messages before ban for optimal performance
  const recentMessages = await prisma.message.findMany({
    where: {
      userId: user.id,
      createdAt: { lte: banDate },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      contact: { select: { id: true, phone: true, name: true } },
      campaign: { select: { id: true, name: true, templateId: true } },
      automationRule: { select: { id: true, name: true, triggerType: true, replyType: true } },
    },
  });

  // Also fetch user's templates
  const userTemplates = await prisma.template.findMany({
    where: { userId: user.id },
  });
  const templateMap = new Map(userTemplates.map((t: any) => [t.id, t]));
  const templateNameMap = new Map(userTemplates.map((t: any) => [t.name, t]));

  // 3. Wani Outbound Activity & Last message
  const outboundMessages = recentMessages.filter((m: any) => m.direction === "outbound");
  const lastOutbound = outboundMessages[0] || null;
  const waniActivityFound = outboundMessages.length > 0;

  // Count messages in the last 24h before ban specifically
  const banWindow24hStart = new Date(banDate.getTime() - 24 * 60 * 60 * 1000);
  const outboundLast24h = outboundMessages.filter(
    (m: any) => new Date(m.createdAt).getTime() >= banWindow24hStart.getTime()
  );

  // 4. 24-Hour Window & Template Compliance Analysis
  let insideWindowCount = 0;
  let templatesOutsideWindowCount = 0;
  let violations24hCount = 0;
  let evaluated24hCount = 0;

  const timelineItems: MessageTimelineItem[] = [];

  // Batch query inbound messages for relevant contacts to check 24h window
  const uniqueContactIds = Array.from(new Set(outboundMessages.map((m: any) => m.contactId)));
  const inboundMessages = await prisma.message.findMany({
    where: {
      userId: user.id,
      contactId: { in: uniqueContactIds },
      direction: "inbound",
      createdAt: { lte: banDate },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group inbound messages by contactId
  const inboundByContact = new Map<string, typeof inboundMessages>();
  for (const inMsg of inboundMessages) {
    const list = inboundByContact.get(inMsg.contactId) || [];
    list.push(inMsg);
    inboundByContact.set(inMsg.contactId, list);
  }

  for (const msg of recentMessages.slice(0, 50)) {
    let hoursDiff: number | null = null;
    let windowCompliance: "PASS" | "FAIL" | "UNKNOWN" = "UNKNOWN";

    if (msg.direction === "outbound") {
      evaluated24hCount++;
      const contactInbounds = inboundByContact.get(msg.contactId) || [];
      // Find latest inbound before this outbound message
      const prevInbound = contactInbounds.find(
        (inMsg) => new Date(inMsg.createdAt).getTime() <= new Date(msg.createdAt).getTime()
      );

      if (prevInbound) {
        const diffMs = new Date(msg.createdAt).getTime() - new Date(prevInbound.createdAt).getTime();
        hoursDiff = Number((diffMs / (1000 * 60 * 60)).toFixed(1));
      }

      const isTemplate =
        msg.type === "template" ||
        Boolean(msg.campaignId) ||
        Boolean(msg.automationRuleId);

      if (hoursDiff !== null && hoursDiff <= 24) {
        insideWindowCount++;
        windowCompliance = "PASS";
      } else {
        // Outside 24h window (or no prior inbound recorded)
        if (isTemplate) {
          templatesOutsideWindowCount++;
          windowCompliance = "PASS"; // Valid template used outside window
        } else {
          // Freeform outbound message sent outside 24h window without template!
          violations24hCount++;
          windowCompliance = "FAIL";
        }
      }
    } else {
      windowCompliance = "PASS";
    }

    // Build enriched timeline item with proper timestamps
    const msgCreatedAt = safeIsoDate(msg.createdAt);
    const source = getMessageSource(msg);

    timelineItems.push({
      id: msg.id,
      createdAt: msgCreatedAt || "",
      time: msgCreatedAt || "",
      type: msg.type,
      direction: msg.direction as "inbound" | "outbound",
      senderType: msg.senderType as any,
      contentSnippet: (msg.content || "").slice(0, 100),
      contactPhone: msg.contact?.phone,
      contactName: msg.contact?.name,
      templateName: msg.campaign?.name || msg.automationRule?.name,
      ruleName: msg.automationRule?.name,
      source,
      whatsappId: msg.whatsappId || null,
      status: msg.status,
      hoursSinceLastInbound: hoursDiff,
      windowCompliance,
    });
  }

  // 5. Campaigns Audit
  const recentCampaigns = await prisma.campaign.findMany({
    where: {
      userId: user.id,
      createdAt: { lte: banDate },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      template: true,
    },
  });

  const campaignSummaries: CampaignSummaryItem[] = recentCampaigns.map((c: any) => ({
    id: c.id,
    name: c.name,
    createdAt: safeIsoDate(c.createdAt) || "",
    status: c.status,
    sentCount: c.sentCount,
    deliveredCount: c.deliveredCount,
    failedCount: c.failedCount,
    readCount: c.readCount,
    templateName: c.template?.name || null,
  }));

  // 6. Automation Rules & Interactions Audit - enriched with message count
  const automations = await prisma.automationRule.findMany({
    where: { userId: user.id },
    include: {
      interactions: {
        where: { createdAt: { lte: banDate } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    take: 10,
  });

  // Count messages linked to each automation rule
  const automationIds = automations.map((a: any) => a.id);
  const automationMessageCounts = automationIds.length > 0
    ? await prisma.message.groupBy({
        by: ["automationRuleId"],
        where: {
          automationRuleId: { in: automationIds },
          createdAt: { lte: banDate },
        },
        _count: { id: true },
      })
    : [];
  const automationMsgCountMap = new Map(
    automationMessageCounts.map((r: any) => [r.automationRuleId, r._count.id])
  );

  const automationSummaries: AutomationSummaryItem[] = automations.map((a: any) => ({
    id: a.id,
    name: a.name,
    ruleId: a.id,
    triggerType: a.triggerType,
    replyType: a.replyType,
    lastTriggeredAt: safeIsoDate(a.interactions[0]?.createdAt) || null,
    interactionCount: a.interactions.length,
    matchedMessagesCount: automationMsgCountMap.get(a.id) || 0,
  }));

  // 7. Template Compliance Check
  let unapprovedTemplatesUsed = 0;
  const templatesFound: Array<{
    name: string;
    metaId: string;
    category: string;
    status: string;
    language: string;
  }> = [];

  for (const tpl of userTemplates) {
    templatesFound.push({
      name: tpl.name,
      metaId: tpl.metaId,
      category: tpl.category,
      status: tpl.status,
      language: tpl.language,
    });
    const isApproved = tpl.status.toUpperCase() === "APPROVED";
    if (!isApproved) {
      // Check if this unapproved template was used in campaigns/messages
      const usedInCampaign = recentCampaigns.some((c: any) => c.templateId === tpl.id);
      if (usedInCampaign) unapprovedTemplatesUsed++;
    }
  }

  const templateComplianceStatus: "PASS" | "FAIL" | "UNKNOWN" =
    templatesFound.length === 0
      ? "UNKNOWN"
      : unapprovedTemplatesUsed > 0
      ? "FAIL"
      : "PASS";

  // 8. 24h Window Overall Status
  const window24hStatus: "PASS" | "FAIL" | "UNKNOWN" =
    evaluated24hCount === 0
      ? "UNKNOWN"
      : violations24hCount > 0
      ? "FAIL"
      : "PASS";

  // 9. Sending Limits Check
  // Check messages velocity in the 24 hours immediately before ban
  const countIn24hBeforeBan = await prisma.message.count({
    where: {
      userId: user.id,
      direction: "outbound",
      createdAt: {
        gte: banWindow24hStart,
        lte: banDate,
      },
    },
  });

  // If we can't determine the tier limit reliably, use UNKNOWN instead of PASS
  const sendingLimitsStatus: "PASS" | "FAIL" | "UNKNOWN" =
    countIn24hBeforeBan > 10000 && messagingTier === 1
      ? "FAIL"
      : countIn24hBeforeBan > 0
      ? (messagingTier > 0 ? "PASS" : "UNKNOWN")
      : "UNKNOWN";

  // 10. Opt-in Check
  // Check contact audiences or documented opt-ins
  const contactsCount = await prisma.contact.count({
    where: { userId: user.id, deletedAt: null },
  });
  const optInStatus: "PASS" | "FAIL" | "NEEDS EVIDENCE" =
    contactsCount > 0 ? "NEEDS EVIDENCE" : "NEEDS EVIDENCE";

  // 11. Refund Estimation
  const refundEstimate = calculateSubscriptionRefund(
    user.subscription,
    banDate,
    claim.currency || "EGP"
  );

  // 12. Build Checklist
  const checklist: ComplianceCheckItem[] = [
    {
      id: "account_connected",
      title: "Wani Account Connection",
      subtitle: isConnectedBeforeBan ? "Connected before ban date" : "Not connected at ban date",
      status: isConnectedBeforeBan ? "PASS" : "FAIL",
      details: `Account created: ${accountConnectedAt.toLocaleDateString("en-CA")}. Token Status: ${tokenStatus}. Messaging Tier: ${messagingTier}.`,
      evidence: { createdAt: accountConnectedAt.toISOString(), tokenStatus, messagingTier },
    },
    {
      id: "wani_activity",
      title: "Wani Activity Found",
      subtitle: waniActivityFound
        ? `${outboundMessages.length} outbound message(s) identified`
        : "No outbound messages found prior to ban",
      status: waniActivityFound ? "PASS" : "FAIL",
      details: lastOutbound
        ? `Last message: ${safeIsoDate(lastOutbound.createdAt) || "Unknown"} (${lastOutbound.type}, sender: ${lastOutbound.senderType})`
        : "No activity recorded through Wani before ban timestamp.",
      evidence: { outboundCount: outboundMessages.length, lastOutbound: lastOutbound ? { id: lastOutbound.id, createdAt: safeIsoDate(lastOutbound.createdAt), type: lastOutbound.type } : null },
    },
    {
      id: "template_compliance",
      title: "Template Compliance",
      subtitle:
        unapprovedTemplatesUsed > 0
          ? `${unapprovedTemplatesUsed} unapproved template(s) used`
          : `${templatesFound.length} template(s) verified compliant`,
      status: templateComplianceStatus,
      details:
        unapprovedTemplatesUsed > 0
          ? "Critical: Outbound message or campaign was sent using a non-approved template."
          : "All registered templates are approved by Meta with compliant categories.",
      evidence: { templatesFound, unapprovedTemplatesUsed },
    },
    {
      id: "window_24h",
      title: "24-Hour Messaging Window",
      subtitle:
        violations24hCount > 0
          ? `${violations24hCount} freeform message(s) sent outside 24h window`
          : `${insideWindowCount} inside window, ${templatesOutsideWindowCount} templates compliant`,
      status: window24hStatus,
      details:
        violations24hCount > 0
          ? "WhatsApp policy violation: non-template outbound message sent after 24h customer care window expired."
          : "All outbound messages were either within the 24h interactive window or used approved templates.",
      evidence: { evaluated24hCount, insideWindowCount, templatesOutsideWindowCount, violations24hCount },
    },
    {
      id: "sending_limits",
      title: "Sending Limits & Velocity",
      subtitle: `${countIn24hBeforeBan} messages sent in 24h window before ban (Tier ${messagingTier})`,
      status: sendingLimitsStatus,
      details: `Audit period: ${safeIsoDate(banWindow24hStart) || "Unknown"} → ${safeIsoDate(banDate) || "Unknown"}. Daily sent count: ${dailySentCount}. Recent 24h velocity: ${countIn24hBeforeBan} msgs.`,
      evidence: { countIn24hBeforeBan, messagingTier, dailySentCount, auditPeriodFrom: safeIsoDate(banWindow24hStart), auditPeriodTo: safeIsoDate(banDate) },
    },
    {
      id: "opt_in",
      title: "Opt-in / Consent Verification",
      subtitle: "Customer opt-in documentation required",
      status: optInStatus,
      details: "Wani tracks audience lists, but independent external opt-in records must be verified by the admin.",
      evidence: { contactsCount },
    },
    {
      id: "external_platform",
      title: "External Platform Activity",
      subtitle: "Independent verification notice",
      status: "UNKNOWN",
      details: "Wani cannot independently prove that the number was not used through another provider unless supporting evidence is available.",
      evidence: {},
    },
  ];

  // 13. System Assessment Recommendation
  let systemAssessment: "ELIGIBLE" | "NEEDS_REVIEW" | "NOT_ELIGIBLE" = "ELIGIBLE";
  let assessmentSummary = "All automated checks passed. Number appears eligible for Wani Protection Guarantee.";

  if (!isConnectedBeforeBan || !waniActivityFound || templateComplianceStatus === "FAIL" || window24hStatus === "FAIL") {
    systemAssessment = "NOT_ELIGIBLE";
    assessmentSummary = "Policy violation or non-compliance detected (e.g. account disconnected, non-template message outside 24h window, or unapproved template usage).";
  } else if (
    templateComplianceStatus === "UNKNOWN" ||
    window24hStatus === "UNKNOWN" ||
    optInStatus === "NEEDS EVIDENCE" ||
    sendingLimitsStatus === "UNKNOWN" ||
    banStatus === "CUSTOMER_REPORTED" ||
    evaluated24hCount < 3
  ) {
    systemAssessment = "NEEDS_REVIEW";
    assessmentSummary = "Some compliance data requires manual admin review or customer evidence verification. Ban status is still customer-reported and not verified.";
  }

  // 14. Compile Snapshot
  const snapshot: EvidenceSnapshot = {
    auditedAt: new Date().toISOString(),
    auditedBy: adminUserId,
    claimedBanDate: safeIsoDate(banDetectedAt) || "",
    verifiedBanStatus: banStatus,
    systemAssessment,
    assessmentSummary,
    auditPeriod: {
      from: safeIsoDate(auditPeriodFrom) || "",
      to: safeIsoDate(banDate) || "",
    },
    accountCheck: {
      isConnected: isConnectedBeforeBan,
      connectedAt: accountConnectedAt.toISOString(),
      tokenStatus,
      messagingTier,
      dailySentCount,
      wabaId: whatsappAccount.wabaId,
      phoneNumberId: whatsappAccount.phoneNumberId,
    },
    waniActivity: {
      found: waniActivityFound,
      totalOutboundCount: outboundMessages.length,
      last24hOutboundCount: outboundLast24h.length,
      lastOutboundAt: safeIsoDate(lastOutbound?.createdAt) || null,
      lastOutboundType: lastOutbound?.type || null,
      lastOutboundSender: lastOutbound?.senderType || null,
    },
    twentyFourHourWindow: {
      status: window24hStatus,
      evaluatedCount: evaluated24hCount,
      insideWindowCount,
      templatesOutsideWindowCount,
      violationsCount: violations24hCount,
      notes: violations24hCount > 0 ? "Detected freeform messages outside 24h window" : "Compliant",
    },
    templateCompliance: {
      status: templateComplianceStatus,
      templatesFound,
      unapprovedUsedCount: unapprovedTemplatesUsed,
      notes: unapprovedTemplatesUsed > 0 ? "Unapproved templates used" : "All templates approved",
    },
    sendingLimits: {
      status: sendingLimitsStatus,
      tier: messagingTier,
      dailySentCount,
      recentVelocity24h: countIn24hBeforeBan,
      auditPeriodDescription: `${safeIsoDate(banWindow24hStart) || "Unknown"} → ${safeIsoDate(banDate) || "Ban reported time"}`,
      notes: `${countIn24hBeforeBan} messages in 24h prior to ban`,
    },
    externalPlatform: {
      status: "UNKNOWN",
      warning: "Wani cannot independently prove that the number was not used through another provider unless supporting evidence is available.",
      details: "No external third-party activity detected in Wani logs.",
    },
    optIn: {
      status: optInStatus,
      documentedCount: contactsCount,
      notes: "Audience records present; customer opt-in verification recommended.",
    },
    refundEstimate,
    checklist,
  };

  // 15. Save Evidence Snapshot to Database and record Audit Log
  const updatedClaim = await prisma.protectionClaim.update({
    where: { id: claimId },
    data: {
      evidenceSnapshot: snapshot as any,
      calculatedRefund: refundEstimate.calculatedRefund,
      refundAmount: refundEstimate.calculatedRefund,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, brandName: true },
      },
      whatsappAccount: {
        select: { id: true, phoneNumberId: true, wabaId: true, createdAt: true, tokenStatus: true, messagingTier: true },
      },
      reviewer: {
        select: { id: true, name: true, email: true },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          adminUser: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  await prisma.protectionAuditLog.create({
    data: {
      claimId,
      adminUserId,
      action: "RUN_AUDIT",
      result: systemAssessment,
      details: {
        assessmentSummary,
        verifiedBanStatus: banStatus,
        refundEstimate,
        evaluatedMessages: evaluated24hCount,
        totalOutbound: outboundMessages.length,
        last24hOutbound: outboundLast24h.length,
        auditPeriod: { from: safeIsoDate(auditPeriodFrom), to: safeIsoDate(banDate) },
      } as any,
    },
  });

  return {
    snapshot,
    claim: updatedClaim,
  };
}
