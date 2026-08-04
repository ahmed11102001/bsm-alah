// src/app/api/dashboard/overview/route.ts
// Feeds the home page's richer widgets (Messaging Performance chart, Automation
// Performance table, Recent Conversations, Campaign status breakdown).
// Kept separate from /api/dashboard on purpose: that endpoint backs the global
// DashboardProvider context loaded on every dashboard page, so it must stay
// cheap. These queries are heavier and only needed on the home page itself.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus } from "@/types/enums";

function resolveOwnerId(session: any): string {
    return (session.user.parentId as string | null) ?? (session.user.id as string);
}

type RangeKey = "7d" | "30d" | "90d";
const RANGE_DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90 };

type AutomationPerformanceItem = {
    id: string;
    name: string;
    source: "rule" | "ai";
    isEnabled: boolean;
    triggered: number;
    successRate: number | null;
};

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user)
            return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

        const ownerId = resolveOwnerId(session);
        const rangeParam = (req.nextUrl.searchParams.get("range") as RangeKey) || "7d";
        const days = RANGE_DAYS[rangeParam] ?? 7;

        const since = new Date();
        since.setDate(since.getDate() - (days - 1));
        since.setHours(0, 0, 0, 0);

        const [
            campaignGroups,
            messagesInRange,
            ruleAnalytics,
            agentAnalytics,
            automationRules,
            aiAgent,
            recentContacts,
        ] = await Promise.all([
            // ── Campaign status breakdown (Running / Scheduled / Completed / ...) ──
            prisma.campaign.groupBy({
                by: ["status"],
                where: { userId: ownerId },
                _count: { id: true },
            }),

            // ── Raw messages in range — grouped into a daily series in JS below ──
            prisma.message.findMany({
                where: { userId: ownerId, deletedAt: null, createdAt: { gte: since } },
                select: { createdAt: true, direction: true, status: true },
            }),

            // ── Classic keyword/welcome automation rules performance ──
            prisma.automationAnalytics.groupBy({
                by: ["automationRuleId", "success"],
                where: { userId: ownerId, source: "automation_rule", automationRuleId: { not: null } },
                _count: { id: true },
            }),

            // ── Wani (AI agent) performance, aggregated as a single virtual "rule" ──
            prisma.automationAnalytics.groupBy({
                by: ["success"],
                where: { userId: ownerId, source: "ai_agent" },
                _count: { id: true },
            }),

            prisma.automationRule.findMany({
                where: { userId: ownerId },
                select: { id: true, name: true, isEnabled: true },
            }),

            prisma.aIAgent.findUnique({
                where: { userId: ownerId },
                select: { isEnabled: true },
            }),

            // ── Recent conversations: latest contacts by activity + their last message ──
            prisma.contact.findMany({
                where: { userId: ownerId, deletedAt: null, lastMessageAt: { not: null } },
                orderBy: { lastMessageAt: "desc" },
                take: 6,
                select: {
                    id: true, name: true, phone: true, lastMessageAt: true,
                    aiStatus: true, unreadCount: true,
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: { content: true, direction: true, type: true },
                    },
                },
            }),
        ]);

        // ── Campaign breakdown ──
        const campaignBreakdown = { draft: 0, scheduled: 0, running: 0, completed: 0, failed: 0 };
        campaignGroups.forEach(g => { campaignBreakdown[g.status as keyof typeof campaignBreakdown] = g._count.id; });

        // ── Daily messaging series (Sent / Delivered / Replies) ──
        const dayKey = (d: Date) => d.toISOString().slice(0, 10);
        const seriesMap = new Map<string, { sent: number; delivered: number; replies: number }>();
        for (let i = 0; i < days; i++) {
            const d = new Date(since);
            d.setDate(d.getDate() + i);
            seriesMap.set(dayKey(d), { sent: 0, delivered: 0, replies: 0 });
        }
        for (const m of messagesInRange) {
            const key = dayKey(new Date(m.createdAt));
            const bucket = seriesMap.get(key);
            if (!bucket) continue;
            if (m.direction === MessageDirection.outbound) {
                bucket.sent += 1;
                if (m.status === MessageStatus.delivered || m.status === MessageStatus.read) bucket.delivered += 1;
            } else if (m.direction === MessageDirection.inbound) {
                bucket.replies += 1;
            }
        }
        const series = Array.from(seriesMap.entries()).map(([date, v]) => ({ date, ...v }));

        // ── Automation performance (rules + Wani as one row) ──
        const ruleStatsMap = new Map<string, { success: number; failure: number }>();
        ruleAnalytics.forEach(r => {
            if (!r.automationRuleId) return;
            const entry = ruleStatsMap.get(r.automationRuleId) ?? { success: 0, failure: 0 };
            if (r.success) entry.success += r._count.id; else entry.failure += r._count.id;
            ruleStatsMap.set(r.automationRuleId, entry);
        });

        const automationPerformance: AutomationPerformanceItem[] = automationRules
            .map(rule => {
                const s = ruleStatsMap.get(rule.id) ?? { success: 0, failure: 0 };
                const triggered = s.success + s.failure;
                return {
                    id: rule.id,
                    name: rule.name,
                    source: "rule",
                    isEnabled: rule.isEnabled,
                    triggered,
                    successRate: triggered > 0 ? Math.round((s.success / triggered) * 100) : null,
                };
            })
            .filter(r => r.triggered > 0 || r.isEnabled)
            .sort((a, b) => b.triggered - a.triggered)
            .slice(0, 4);

        if (aiAgent) {
            const agentSuccess = agentAnalytics.find(a => a.success)?._count.id ?? 0;
            const agentFailure = agentAnalytics.find(a => !a.success)?._count.id ?? 0;
            const agentTriggered = agentSuccess + agentFailure;
            if (agentTriggered > 0 || aiAgent.isEnabled) {
                automationPerformance.unshift({
                    id: "wani-ai-agent",
                    name: "Wani",
                    source: "ai",
                    isEnabled: aiAgent.isEnabled,
                    triggered: agentTriggered,
                    successRate: agentTriggered > 0 ? Math.round((agentSuccess / agentTriggered) * 100) : null,
                });
            }
        }

        // ── Recent conversations ──
        const STATUS_MAP: Record<string, "auto" | "needs_human" | "human_active"> = {
            AUTO: "auto", NEEDS_HUMAN: "needs_human", HUMAN_ACTIVE: "human_active",
        };
        const recentConversations = recentContacts.map(c => {
            const lastMsg = c.messages[0];
            return {
                id: c.id,
                name: c.name || c.phone,
                lastMessage: lastMsg ? (lastMsg.content || (lastMsg.type !== "text" ? `[${lastMsg.type}]` : "")) : "",
                lastMessageAt: c.lastMessageAt,
                status: STATUS_MAP[c.aiStatus] ?? "auto",
                unread: c.unreadCount > 0,
            };
        });

        return NextResponse.json({
            range: rangeParam,
            campaignBreakdown,
            messagingPerformance: series,
            automationPerformance,
            recentConversations,
        });
    } catch (err) {
        console.error("GET /api/dashboard/overview:", err);
        return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
    }
}