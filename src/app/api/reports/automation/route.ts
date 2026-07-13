// src/app/api/reports/automation/route.ts
// ─── تقارير الأتمتة — بيانات حقيقية ──────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";

// ─── helpers ──────────────────────────────────────────────────────────────────
function resolveUserId(session: any): string {
  const parent = (session.user as any).parentId as string | null;
  return parent ?? (session.user as any).id;
}

function dateRange(from?: string | null, to?: string | null) {
  const gte = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
  const lte = to   ? new Date(to)   : new Date();
  lte.setHours(23, 59, 59, 999);
  return { gte, lte };
}

// ─── Automation type mapping ──────────────────────────────────────────────────
function triggerTypeLabel(triggerType: string, replyType: string): string {
  if (replyType === "AI") return "AI Agent";
  switch (triggerType) {
    case "KEYWORD":       return "Keyword Replies";
    case "FIRST_MESSAGE": return "Welcome Messages";
    case "NO_REPLY":      return "Scheduled Automations";
    case "TIME_BASED":    return "Time-based Automations";
    default:              return triggerType;
  }
}

// ─── time-ago helper (Arabic) ─────────────────────────────────────────────────
function timeAgo(date: Date | null): string {
  if (!date) return "—";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

// ─── GET /api/reports/automation?from=&to= ────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });

    const userId = resolveUserId(session);
    const { searchParams } = new URL(req.url);
    const from  = searchParams.get("from");
    const to    = searchParams.get("to");
    const range = dateRange(from, to);

    // ── 1. Fetch all automation sources in parallel ──────────────────────────
    const [
      automationRules,
      aiAgent,
      storeAutomations,
      smartFollowUpSettings,
      // Message counts by senderType (ai/bot)
      botMessages,
      aiMessages,
      failedBotMessages,
      failedAiMessages,
      // Handoffs
      handoffCount,
      // Recent failed messages for error log
      recentErrors,
      // Recent bot/ai messages for timeline
      recentTimeline,
      // Funnel: total outbound bot/ai messages
      funnelSent,
      funnelDelivered,
      funnelRead,
      // Inbound replies after automation messages
      funnelReplied,
      // AI response time calculation
      aiResponseTimes,
    ] = await Promise.all([
      // AutomationRules
      prisma.automationRule.findMany({
        where: { userId },
        select: {
          id: true, name: true, isEnabled: true,
          triggerType: true, replyType: true,
          updatedAt: true, createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // AIAgent
      prisma.aIAgent.findUnique({
        where: { userId },
        select: { id: true, isEnabled: true, updatedAt: true, provider: true },
      }),

      // StoreAutomations
      prisma.storeAutomation.findMany({
        where: { userId },
        select: {
          id: true, type: true, isEnabled: true,
          sentCount: true, failedCount: true, lastSentAt: true,
        },
      }),

      // SmartFollowUpSettings
      prisma.smartFollowUpSetting.findMany({
        where: { userId },
        select: {
          id: true, type: true, isEnabled: true,
          sentCount: true, failedCount: true, lastSentAt: true,
        },
      }),

      // Bot messages (senderType=bot) in range
      prisma.message.count({
        where: {
          userId, senderType: "bot",
          direction: "outbound",
          createdAt: range,
        },
      }),

      // AI messages (senderType=ai) in range
      prisma.message.count({
        where: {
          userId, senderType: "ai",
          direction: "outbound",
          createdAt: range,
        },
      }),

      // Failed bot messages
      prisma.message.count({
        where: {
          userId, senderType: "bot",
          status: "failed",
          createdAt: range,
        },
      }),

      // Failed AI messages
      prisma.message.count({
        where: {
          userId, senderType: "ai",
          status: "failed",
          createdAt: range,
        },
      }),

      // Handoff count — contacts that were handed off to humans in range
      prisma.contact.count({
        where: {
          userId,
          aiStatus: "NEEDS_HUMAN",
          handoffAt: range,
        },
      }),

      // Recent failed messages for error log (top 10)
      prisma.message.findMany({
        where: {
          userId,
          senderType: { in: ["ai", "bot"] },
          status: "failed",
          createdAt: range,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, error: true, type: true, senderType: true,
          createdAt: true,
          contact: { select: { phone: true, name: true } },
        },
      }),

      // Recent bot/ai messages for timeline (top 10)
      prisma.message.findMany({
        where: {
          userId,
          senderType: { in: ["ai", "bot"] },
          createdAt: range,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, senderType: true, type: true, status: true,
          createdAt: true,
          contact: { select: { phone: true, name: true } },
        },
      }),

      // Funnel: sent (total outbound bot/ai)
      prisma.message.count({
        where: {
          userId, direction: "outbound",
          senderType: { in: ["ai", "bot"] },
          createdAt: range,
        },
      }),

      // Funnel: delivered
      prisma.message.count({
        where: {
          userId, direction: "outbound",
          senderType: { in: ["ai", "bot"] },
          status: { in: ["delivered", "read"] },
          createdAt: range,
        },
      }),

      // Funnel: read
      prisma.message.count({
        where: {
          userId, direction: "outbound",
          senderType: { in: ["ai", "bot"] },
          status: "read",
          createdAt: range,
        },
      }),

      // Funnel: inbound replies (rough approximation — inbound messages from contacts
      // that also received bot/ai messages in the range)
      prisma.$queryRaw<{ cnt: bigint }[]>`
        SELECT COUNT(DISTINCT m."id")::bigint AS cnt
        FROM "Message" m
        WHERE m."userId" = ${userId}
          AND m."direction" = 'inbound'
          AND m."createdAt" >= ${range.gte}
          AND m."createdAt" <= ${range.lte}
          AND m."contactId" IN (
            SELECT DISTINCT m2."contactId"
            FROM "Message" m2
            WHERE m2."userId" = ${userId}
              AND m2."direction" = 'outbound'
              AND m2."senderType" IN ('ai', 'bot')
              AND m2."createdAt" >= ${range.gte}
              AND m2."createdAt" <= ${range.lte}
          )
      `,

      // AI response time — compute average diff between inbound message and next ai/bot outbound
      prisma.$queryRaw<{ avg_ms: number | null; min_ms: number | null; max_ms: number | null }[]>`
        SELECT
          AVG(response_ms)::int AS avg_ms,
          MIN(response_ms)::int AS min_ms,
          MAX(response_ms)::int AS max_ms
        FROM (
          SELECT
            EXTRACT(EPOCH FROM (reply."createdAt" - incoming."createdAt")) * 1000 AS response_ms
          FROM "Message" incoming
          INNER JOIN LATERAL (
            SELECT "createdAt"
            FROM "Message"
            WHERE "userId" = ${userId}
              AND "contactId" = incoming."contactId"
              AND "direction" = 'outbound'
              AND "senderType" IN ('ai', 'bot')
              AND "createdAt" > incoming."createdAt"
            ORDER BY "createdAt" ASC
            LIMIT 1
          ) reply ON true
          WHERE incoming."userId" = ${userId}
            AND incoming."direction" = 'inbound'
            AND incoming."createdAt" >= ${range.gte}
            AND incoming."createdAt" <= ${range.lte}
          LIMIT 1000
        ) sub
        WHERE response_ms > 0
          AND response_ms < 300000
      `,
    ]);

    // ── 2. Build per-automation rule list ────────────────────────────────────

    // Count messages per automation type using triggerType info
    // We'll use the senderType to differentiate: ai = AI Agent, bot = other rules
    const rulesResult: Array<{
      id: string; name: string; type: string;
      isEnabled: boolean; hasError: boolean;
      runCount: number; successCount: number; failureCount: number;
      lastRun: string;
    }> = [];

    // Get per-rule message counts via a grouped query
    // For automation rules (bot sender type), group by the rule's existence
    // Since messages don't directly reference automation rules, we aggregate at the type level

    // Count messages per bot trigger type group
    const botMessagesByType = await prisma.$queryRaw<
      { sender_type: string; total: bigint; failed: bigint; last_at: Date | null }[]
    >`
      SELECT
        m."senderType" as sender_type,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE m."status" = 'failed')::bigint AS failed,
        MAX(m."createdAt") AS last_at
      FROM "Message" m
      WHERE m."userId" = ${userId}
        AND m."direction" = 'outbound'
        AND m."senderType" IN ('ai', 'bot')
        AND m."createdAt" >= ${range.gte}
        AND m."createdAt" <= ${range.lte}
      GROUP BY m."senderType"
    `;

    const aiMsgStats = botMessagesByType.find(r => r.sender_type === "ai");
    const botMsgStats = botMessagesByType.find(r => r.sender_type === "bot");

    const totalAiRuns     = Number(aiMsgStats?.total ?? 0);
    const totalAiFailed   = Number(aiMsgStats?.failed ?? 0);
    const totalBotRuns    = Number(botMsgStats?.total ?? 0);
    const totalBotFailed  = Number(botMsgStats?.failed ?? 0);

    // Distribute bot runs proportionally among automation rules
    const enabledBotRules = automationRules.filter(r => r.replyType !== "AI");
    const totalBotRulesCount = enabledBotRules.length || 1;

    for (const rule of automationRules) {
      const type = triggerTypeLabel(rule.triggerType, rule.replyType);
      const isAiRule = rule.replyType === "AI";

      let runCount: number;
      let failureCount: number;
      let lastRunDate: Date | null;

      if (isAiRule) {
        // AI rules get the AI message stats
        runCount = totalAiRuns;
        failureCount = totalAiFailed;
        lastRunDate = aiMsgStats?.last_at ?? null;
      } else {
        // Bot rules share the bot message stats proportionally
        runCount = Math.round(totalBotRuns / totalBotRulesCount);
        failureCount = Math.round(totalBotFailed / totalBotRulesCount);
        lastRunDate = botMsgStats?.last_at ?? null;
      }

      rulesResult.push({
        id:           rule.id,
        name:         rule.name,
        type,
        isEnabled:    rule.isEnabled,
        hasError:     failureCount > 0,
        runCount,
        successCount: runCount - failureCount,
        failureCount,
        lastRun:      timeAgo(lastRunDate),
      });
    }

    // Add AI Agent as a separate entry if it exists and no AI rule exists
    const hasAiRule = automationRules.some(r => r.replyType === "AI");
    if (aiAgent && !hasAiRule) {
      rulesResult.push({
        id:           aiAgent.id,
        name:         "AI Agent",
        type:         "AI Agent",
        isEnabled:    aiAgent.isEnabled,
        hasError:     totalAiFailed > 0,
        runCount:     totalAiRuns,
        successCount: totalAiRuns - totalAiFailed,
        failureCount: totalAiFailed,
        lastRun:      timeAgo(aiMsgStats?.last_at ?? null),
      });
    }

    // Add store automations
    const storeTypeLabels: Record<string, string> = {
      order_confirm: "تأكيد الطلب",
      order_shipped: "تم الشحن",
      promo:         "عروض ترويجية",
      cart_abandon:  "السلة المهجورة",
    };
    for (const sa of storeAutomations) {
      rulesResult.push({
        id:           sa.id,
        name:         storeTypeLabels[sa.type] ?? sa.type,
        type:         "Store Automation",
        isEnabled:    sa.isEnabled,
        hasError:     sa.failedCount > 0,
        runCount:     sa.sentCount + sa.failedCount,
        successCount: sa.sentCount,
        failureCount: sa.failedCount,
        lastRun:      timeAgo(sa.lastSentAt),
      });
    }

    // Add smart follow-up settings
    const followUpTypeLabels: Record<string, string> = {
      shipping: "متابعة الشحن",
      cart:     "متابعة السلة",
    };
    for (const sf of smartFollowUpSettings) {
      rulesResult.push({
        id:           sf.id,
        name:         followUpTypeLabels[sf.type] ?? sf.type,
        type:         "Smart Follow-up",
        isEnabled:    sf.isEnabled,
        hasError:     sf.failedCount > 0,
        runCount:     sf.sentCount + sf.failedCount,
        successCount: sf.sentCount,
        failureCount: sf.failedCount,
        lastRun:      timeAgo(sf.lastSentAt),
      });
    }

    // ── 3. KPIs ──────────────────────────────────────────────────────────────
    const totalRuns    = rulesResult.reduce((s, r) => s + r.runCount, 0);
    const totalSuccess = rulesResult.reduce((s, r) => s + r.successCount, 0);
    const totalFailures = rulesResult.reduce((s, r) => s + r.failureCount, 0);
    const activeCount  = rulesResult.filter(r => r.isEnabled).length;
    const stoppedCount = rulesResult.filter(r => !r.isEnabled).length;
    const errorCount   = rulesResult.filter(r => r.hasError).length;

    const kpis = {
      totalAutomations:       rulesResult.length,
      activeAutomations:      activeCount,
      stoppedAutomations:     stoppedCount,
      automationsWithErrors:  errorCount,
      totalRuns,
      totalSuccess,
      totalFailures,
      successRate: totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0,
    };

    // ── 4. Error log ─────────────────────────────────────────────────────────
    const errorLog = recentErrors.map(err => {
      const contactName = err.contact?.name ?? err.contact?.phone ?? "غير معروف";
      const errorMsg = err.error?.trim() ?? "خطأ غير محدد";
      const senderLabel = err.senderType === "ai" ? "AI Agent" : "Bot";

      // Categorize errors
      let title = `${senderLabel} Error`;
      if (errorMsg.toLowerCase().includes("token")) title = "WhatsApp Token Expired";
      else if (errorMsg.toLowerCase().includes("template")) title = "Template Rejected";
      else if (errorMsg.toLowerCase().includes("rate") || errorMsg.toLowerCase().includes("limit")) title = "Rate Limit Reached";
      else if (errorMsg.toLowerCase().includes("timeout") || errorMsg.toLowerCase().includes("timed out")) title = "AI Request Timeout";
      else if (err.senderType === "ai") title = "AI Request Failed";
      else title = "Automation Send Failed";

      return {
        id:      err.id,
        title,
        details: `${errorMsg} — ${contactName}`,
        time:    err.createdAt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: false }),
      };
    });

    // ── 5. Top automations (sorted by runCount) ──────────────────────────────
    const topAutomations = [...rulesResult]
      .sort((a, b) => b.runCount - a.runCount)
      .slice(0, 4)
      .map(r => ({ name: r.name, runs: r.runCount }));

    // ── 6. AI performance metrics ────────────────────────────────────────────
    const aiResp = aiResponseTimes?.[0];
    const avgMs = aiResp?.avg_ms ?? 0;
    const minMs = aiResp?.min_ms ?? 0;
    const maxMs = aiResp?.max_ms ?? 0;

    const totalAutoReplies = totalAiRuns + totalBotRuns;
    const aiSuccessRate = totalAiRuns > 0
      ? Math.round(((totalAiRuns - totalAiFailed) / totalAiRuns) * 100)
      : 0;

    const aiMetrics = {
      avgResponseTime:  formatMs(avgMs),
      fastestResponse:  formatMs(minMs),
      slowestResponse:  formatMs(maxMs),
      aiRepliesCount:   totalAiRuns,
      aiSuccessRate,
      humanHandoffs:    handoffCount,
    };

    // ── 7. Time saved estimation ─────────────────────────────────────────────
    // Assumption: each automated reply saves ~30 seconds of human time
    const estimatedSecondsSaved = totalAutoReplies * 30;
    const estimatedHoursSaved = Math.round(estimatedSecondsSaved / 3600);

    // Efficiency: how much of outbound messages were automated
    const totalOutbound = await prisma.message.count({
      where: { userId, direction: "outbound", createdAt: range },
    });
    const efficiencyGain = totalOutbound > 0
      ? Math.round((totalAutoReplies / totalOutbound) * 100)
      : 0;

    const timeSaved = {
      totalAutoReplies,
      estimatedHoursSaved,
      efficiencyGain,
    };

    // ── 8. Timeline ──────────────────────────────────────────────────────────
    const timeline = recentTimeline.map(msg => {
      const contactName = msg.contact?.name ?? msg.contact?.phone ?? "عميل";
      const senderLabel = msg.senderType === "ai" ? "AI Agent" : "البوت";
      const statusLabel = msg.status === "failed" ? "فشل" : msg.status === "read" ? "تم قراءتها" : "تم إرسالها";

      let title: string;
      if (msg.status === "failed") {
        title = `فشل ${senderLabel} في الرد على ${contactName}`;
      } else if (msg.senderType === "ai") {
        title = `قام AI بالرد على ${contactName}`;
      } else {
        title = `${senderLabel} رد على ${contactName} — ${statusLabel}`;
      }

      return {
        time: msg.createdAt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: false }),
        title,
      };
    });

    // ── 9. Funnel data ───────────────────────────────────────────────────────
    const funnelRepliedCount = Number(funnelReplied?.[0]?.cnt ?? 0);

    // Calculate funnel as percentages based on sent
    const funnelBase = funnelSent || 1;
    const funnel = {
      steps:  ["تم تفعيل الأتمتة", "تم إرسال الرسالة", "تم فتح الرسالة", "رد العميل"],
      values: [
        100,
        Math.round((funnelDelivered / funnelBase) * 100),
        Math.round((funnelRead / funnelBase) * 100),
        Math.round((funnelRepliedCount / funnelBase) * 100),
      ],
    };

    // ── Return ───────────────────────────────────────────────────────────────
    return NextResponse.json({
      kpis,
      rules: rulesResult,
      errorLog,
      topAutomations,
      aiMetrics,
      timeSaved,
      timeline,
      funnel,
    });

  } catch (err) {
    console.error("automation-reports error:", err);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// ─── Format milliseconds to human-readable ───────────────────────────────────
function formatMs(ms: number): string {
  if (!ms || ms <= 0) return "0s";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}
