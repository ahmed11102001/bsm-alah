"use client";
import { ChatListSkeleton, DashboardHomeSkeleton, ListRowsSkeleton } from "@/components/dashboard/DashboardSkeletons";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { useSubscription, type DashboardData } from "@/lib/dashboard-context";
import { toast } from "sonner";
import { STATUS_BADGE } from "@/app/dashboard/_shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageSquare, Send, BarChart3,
  Plus, TrendingUp, Calendar, ChevronLeft,
  CheckCircle, Loader2, Feather, Bot, Zap,
  PieChart as PieChartIcon, Lock, Sparkles,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer as PieResponsiveContainer } from "recharts";
import {
  PartnerCardTemplate, type PartnerCardContent,
} from "@/app/dashboard/wani-partner/_components/PartnerCardTemplates";

// ─── Overview widgets data shape (from /api/dashboard/overview) ──────────────
interface OverviewData {
  range: "7d" | "30d" | "90d";
  campaignBreakdown: { draft: number; scheduled: number; running: number; completed: number; failed: number };
  messagingPerformance: Array<{ date: string; sent: number; delivered: number; replies: number }>;
  aiAgentReplies: number;
  automationPerformance: Array<{
    id: string; name: string; source: "rule" | "ai"; isEnabled: boolean;
    triggered: number; successRate: number | null;
  }>;
  recentConversations: Array<{
    id: string; name: string; lastMessage: string; lastMessageAt: string | null;
    status: "auto" | "needs_human" | "human_active"; unread: boolean;
  }>;
}

const STATUS_DOT: Record<string, string> = {
  auto: "bg-emerald-500",
  needs_human: "bg-amber-500",
  human_active: "bg-blue-500",
};
const STATUS_BADGE_CLS: Record<string, string> = {
  auto: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  needs_human: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  human_active: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
};

// ─── Egypt WhatsApp Conversation Pricing (USD) — same source as /reports/cost ──
const EG_PRICES: Record<string, number> = {
  MARKETING: 0.0125,
  UTILITY: 0.004,
  AUTHENTICATION: 0.0175,
  SERVICE: 0,
};
function templateMsgCost(count: number, category: string): number {
  const price = EG_PRICES[category?.toUpperCase()] ?? EG_PRICES.MARKETING;
  return count * price;
}

// ─── WANI Partner — الكارت بقى متحكَّم فيه من /dashboard/wani-partner (أدمن بس).
// الـ Array ده بقى Fallback بس: بيتعرض لو لسه محدش ضاف أي كارت من الصفحة ─────
const WANI_FEATURES: {
  icon: typeof Bot;
  title: { ar: string; en: string };
  desc: { ar: string; en: string };
}[] = [
    {
      icon: Bot,
      title: { ar: "وكيل واني الذكي 🤖", en: "WANI AI Agent 🤖" },
      desc: {
        ar: "بيرد على استفسارات عملائك ويقفل البيع لوحده على واتساب، على مدار الساعة.",
        en: "Answers your customers and closes sales on WhatsApp, around the clock.",
      },
    },
    {
      icon: Zap,
      title: { ar: "أتمتة المتجر ⚡", en: "Store Automation ⚡" },
      desc: {
        ar: "تأكيد الطلبات ومتابعة الشحن بتتبعت أوتوماتيك من غير ما تلمس حاجة.",
        en: "Order confirmations and shipping updates sent automatically.",
      },
    },
    {
      icon: Send,
      title: { ar: "حملات واتساب 📢", en: "WhatsApp Campaigns 📢" },
      desc: {
        ar: "وصّل عرضك لآلاف العملاء بضغطة واحدة، مع تقارير لحظية.",
        en: "Reach thousands of customers with one click, with live reporting.",
      },
    },
  ];

interface DbPartnerCard extends PartnerCardContent {
  id: string;
  template: number;
}

function WaniPartnerCard({ locale }: { locale: "ar" | "en" }) {
  const [index, setIndex] = useState(0);
  // null = لسه بيحمّل، [] = محدش عمل كارت من /dashboard/wani-partner لسه
  const [dbCards, setDbCards] = useState<DbPartnerCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wani-partner")
      .then((r) => (r.ok ? r.json() : []))
      .then((json) => { if (!cancelled) setDbCards(Array.isArray(json) ? json : []); })
      .catch(() => { if (!cancelled) setDbCards([]); });
    return () => { cancelled = true; };
  }, []);

  const useDbCards = !!dbCards && dbCards.length > 0;
  const total = useDbCards ? dbCards!.length : WANI_FEATURES.length;

  useEffect(() => {
    setIndex(0);
    const id = setInterval(() => setIndex((i) => (i + 1) % total), 4500);
    return () => clearInterval(id);
  }, [total]);

  // ── محتوى مُتحكَّم فيه من /dashboard/wani-partner (5 تيمبلت مختلفة) ──
  if (useDbCards) {
    const card = dbCards![index % dbCards!.length];
    return (
      <Card className="h-full border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:col-span-2 p-0 gap-0">
        <CardContent className="p-0 h-full min-h-[240px] relative">
          <PartnerCardTemplate template={card.template} content={card} animKey={card.id} />
        </CardContent>
      </Card>
    );
  }

  // ── Fallback (default): يعرض مميزات وني نفسها بالتدوير لحد ما يتضاف كارت ──
  const feature = WANI_FEATURES[index % WANI_FEATURES.length];
  const Icon = feature.icon;

  return (
    <Card className="border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:col-span-2 bg-gradient-to-br from-[#25D366]/5 via-white to-white dark:from-[#25D366]/10 dark:via-gray-800/40 dark:to-gray-800/40">
      <CardContent className="p-0 h-full">
        <div className="flex flex-col sm:flex-row items-center gap-5 h-full px-5 sm:px-6 py-6">
          <div key={`icon-${index}`}
            className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-800 border border-[#25D366]/20 flex items-center justify-center flex-shrink-0 shadow-sm animate-in fade-in zoom-in-95 duration-500">
            <Icon className="w-7 h-7 text-[#25D366]" />
          </div>
          <div key={`text-${index}`} className="flex-1 min-w-0 text-center sm:text-start animate-in fade-in slide-in-from-bottom-1 duration-500">
            <span className="inline-block text-[10px] font-bold tracking-wide uppercase text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full mb-1.5">
              WANI Partner
            </span>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{feature.title[locale]}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{feature.desc[locale]}</p>
          </div>
          <div className="hidden sm:flex flex-col gap-1.5 flex-shrink-0">
            {WANI_FEATURES.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? "bg-[#25D366]" : "bg-gray-200 dark:bg-gray-600"}`} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HomeDashboard({ data, onCreateCampaign, onOpenSettings, campaignAtLimit = false, whatsappConnected = false }: {
  data: DashboardData; onCreateCampaign: () => void; onOpenSettings: () => void; campaignAtLimit?: boolean; whatsappConnected?: boolean;
}) {
  const router = useRouter();
  const { t, locale, dir } = useLanguage();
  const h = t.home;
  const ov = h.overview;
  const [metaPrompt, setMetaPrompt] = useState<string | null>(null);
  const { stats, recentCampaigns, user } = data;
  const planTier = data.plan.plan;
  const hasAiAgent = data.plan.limits.aiAgent;
  const isProPlan = planTier === "pro";
  const firstName = (user.name ?? "").split(" ")[0] || (locale === "ar" ? "مرحباً" : "there");
  const numFmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  // ─── Overview widgets (Automation / Conversations) ───
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingOverview(true);
    fetch(`/api/dashboard/overview?range=7d`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => { if (!cancelled) setOverview(json); })
      .catch(() => { if (!cancelled) setOverview(null); })
      .finally(() => { if (!cancelled) setLoadingOverview(false); });
    return () => { cancelled = true; };
  }, []);

  // ─── Template Cost breakdown (Marketing vs Service) — real data from campaigns ──
  const [templateCost, setTemplateCost] = useState<{ marketing: number; service: number } | null>(null);
  const [loadingCost, setLoadingCost] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingCost(true);
    fetch("/api/campaigns?limit=100")
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (cancelled) return;
        const list = Array.isArray(json) ? json : (json?.campaigns ?? []);
        let marketing = 0;
        let service = 0;
        for (const c of list) {
          if (!c.sentCount) continue;
          const category = c.template?.category ?? "MARKETING";
          const cost = templateMsgCost(c.sentCount, category);
          if (category?.toUpperCase() === "MARKETING") marketing += cost;
          else service += cost;
        }
        setTemplateCost({ marketing, service });
      })
      .catch(() => { if (!cancelled) setTemplateCost(null); })
      .finally(() => { if (!cancelled) setLoadingCost(false); });
    return () => { cancelled = true; };
  }, []);

  const relativeTime = useCallback((iso: string | null) => {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return ov.conversations.justNow;
    if (mins < 60) return ov.conversations.minutesAgo(mins);
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return ov.conversations.hoursAgo(hrs);
    return ov.conversations.daysAgo(Math.floor(hrs / 24));
  }, [ov]);

  const kpis = [
    { label: h.kpi.totalSent, value: stats.totalSent, sub: undefined, icon: <Send className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50 dark:bg-blue-900/20", trend: stats.totalSent > 0 ? "up" : null },
    { label: h.kpi.delivered, value: stats.totalSent + stats.totalInbound, sub: undefined, icon: <CheckCircle className="w-5 h-5 text-green-600" />, bg: "bg-green-50 dark:bg-green-900/20", trend: "up" },
    { label: h.kpi.totalReplies, value: stats.totalInbound, sub: h.kpi.replyRate(stats.replyRate), icon: <MessageSquare className="w-5 h-5 text-purple-600" />, bg: "bg-purple-50 dark:bg-purple-900/20", trend: stats.totalInbound > 0 ? "up" : null },
  ] as const;

  const cb = overview?.campaignBreakdown;
  const campaignTotal = cb ? cb.running + cb.scheduled + cb.completed + cb.draft + cb.failed : stats.totalCampaigns;

  const campaignLimitActive = whatsappConnected && campaignAtLimit;
  const showMetaConnectPrompt = () => {
    const message = locale === "ar"
      ? "اربط رقمك بميتا علشان تعمل حملة"
      : "Connect your Meta number to create a campaign.";
    window.alert(message);
    setMetaPrompt(message);
    window.setTimeout(() => setMetaPrompt(null), 3500);
  };
  const showCampaignLimitToast = () => {
    toast.custom(() => (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 flex flex-col gap-2 min-w-[260px]" dir="rtl">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          وصلت الحد الأقصى للحملات هذا الشهر
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          رقّي الباقة لإرسال حملات غير محدودة.
        </p>
        <button
          onClick={() => { toast.dismiss(); router.push("/checkout"); }}
          className="mt-1 text-xs font-semibold text-white bg-[#075E54] hover:bg-[#064944] px-4 py-2 rounded-lg transition-colors"
        >
          ترقية الباقة ←
        </button>
      </div>
    ), { duration: 6000 });
  };

  const templateCostTotal = (templateCost?.marketing ?? 0) + (templateCost?.service ?? 0);
  const marketingPct = templateCostTotal > 0 ? Math.round(((templateCost?.marketing ?? 0) / templateCostTotal) * 100) : 0;
  const servicePct = templateCostTotal > 0 ? 100 - marketingPct : 0;

  return (
    <div dir={dir}>
      {metaPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4">
          <div className="max-w-md w-full rounded-2xl border border-white/20 bg-white dark:bg-gray-900 shadow-2xl p-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-5 h-5 text-[#25D366]" />
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {locale === "ar" ? "لازم تربط ميتا أولاً" : "Meta connection required"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {metaPrompt}
            </p>
            <button
              type="button"
              onClick={() => setMetaPrompt(null)}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#075E54] px-4 py-2 text-sm font-semibold text-white hover:bg-[#064944] transition-colors"
            >
              {locale === "ar" ? "حسنًا" : "OK"}
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-0.5">{h.greeting(firstName)}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{h.subtitle}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            className={campaignLimitActive
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed gap-1.5 text-sm w-full sm:w-auto justify-center"
              : "bg-[#25D366] hover:bg-[#20bb5a] text-white gap-1.5 text-sm w-full sm:w-auto justify-center"}
            onClick={() => {
              if (!whatsappConnected) return showMetaConnectPrompt();
              if (campaignAtLimit) return showCampaignLimitToast();
              onCreateCampaign();
            }}
          >
            <Plus className="w-4 h-4" /> {campaignLimitActive ? (locale === "ar" ? "وصلت الحد الأقصى" : "Limit reached") : h.newCampaign}
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {kpis.map((k) => (
          <Card key={k.label} className="border border-gray-100 dark:border-gray-700 shadow-sm">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1 leading-tight">{k.label}</p>
                  <p className="text-xl sm:text-2xl font-bold leading-none">{numFmt(k.value)}</p>
                  {k.sub && (
                    <p className={`text-[10px] sm:text-xs mt-1.5 flex items-center gap-1 ${k.trend === "up" ? "text-green-600" : "text-gray-400"}`}>
                      {k.trend === "up" && <TrendingUp className="w-3 h-3 flex-shrink-0" />}
                      <span className="truncate">{k.sub}</span>
                    </p>
                  )}
                </div>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ms-2 ${k.bg}`}>
                  {k.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* ── Campaigns card: richer breakdown (Running/Scheduled/Completed) ── */}
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between mb-1">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1 leading-tight">{h.kpi.campaigns}</p>
                <p className="text-xl sm:text-2xl font-bold leading-none">{numFmt(stats.totalCampaigns)}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ms-2 bg-orange-50 dark:bg-orange-900/20">
                <BarChart3 className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            {cb && campaignTotal > 0 ? (
              <>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                  {cb.running > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{cb.running} {ov.campaignBreakdown.running}</span>}
                  {cb.scheduled > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{cb.scheduled} {ov.campaignBreakdown.scheduled}</span>}
                  {cb.completed > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{cb.completed} {ov.campaignBreakdown.completed}</span>}
                </div>
                <div className="flex w-full h-1.5 rounded-full overflow-hidden mt-2 bg-gray-100 dark:bg-gray-700">
                  {cb.running > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(cb.running / campaignTotal) * 100}%` }} />}
                  {cb.scheduled > 0 && <div className="bg-amber-500 h-full" style={{ width: `${(cb.scheduled / campaignTotal) * 100}%` }} />}
                  {cb.completed > 0 && <div className="bg-blue-500 h-full" style={{ width: `${(cb.completed / campaignTotal) * 100}%` }} />}
                </div>
              </>
            ) : (
              <p className="text-[10px] sm:text-xs mt-1.5 text-gray-400">{h.kpi.thisMonth(data.plan.usage.campaignsThisMonth)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Wani AI Agent + WANI Partner ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <WaniPartnerCard locale={locale as "ar" | "en"} />

        {/* ── Wani AI Agent — real stat for Enterprise, upsell hook below it ── */}
        {hasAiAgent ? (
          <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2.5 pb-2 pt-4 px-4 sm:px-5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-emerald-600" />
              </div>
              <CardTitle className="text-base font-bold">{ov.aiAgentCard.title}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-5 flex flex-col items-center justify-center h-[240px] text-center">
              {loadingOverview ? (
                <div className="animate-pulse flex flex-col items-center gap-2 py-4">
                  <div className="h-10 w-24 rounded-xl bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-40 max-w-full rounded-full bg-gray-100 dark:bg-gray-700/60" />
                </div>
              ) : (
                <>
                  <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">{numFmt(overview?.aiAgentReplies ?? 0)}</p>
                  <p className="text-xs text-gray-400 mt-2 max-w-[220px]">{ov.aiAgentCard.enterpriseSubtitle}</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : isProPlan ? (
          <Card className="relative overflow-hidden border border-purple-100 dark:border-purple-900/40 shadow-sm bg-gradient-to-br from-purple-50 via-white to-white dark:from-purple-950/30 dark:via-gray-900 dark:to-gray-900">
            <CardHeader className="flex flex-row items-center gap-2.5 pb-2 pt-4 px-4 sm:px-5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
              <CardTitle className="text-base font-bold">{ov.aiAgentCard.title}</CardTitle>
              <Lock className="w-3.5 h-3.5 text-purple-400 ms-auto flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-5 flex flex-col justify-center h-[240px]">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{ov.aiAgentCard.proHook}</p>
              <button
                onClick={() => router.push("/checkout?plan=enterprise")}
                className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl px-4 py-2.5 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {ov.aiAgentCard.proCta}
              </button>
            </CardContent>
          </Card>
        ) : (
          <Card className="relative overflow-hidden border border-purple-100 dark:border-purple-900/40 shadow-sm bg-gradient-to-br from-purple-50 via-white to-white dark:from-purple-950/30 dark:via-gray-900 dark:to-gray-900">
            <CardHeader className="flex flex-row items-center gap-2.5 pb-2 pt-4 px-4 sm:px-5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
              <CardTitle className="text-base font-bold">{ov.aiAgentCard.title}</CardTitle>
              <Lock className="w-3.5 h-3.5 text-purple-400 ms-auto flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-5 flex flex-col justify-center h-[240px]">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{ov.aiAgentCard.lowerHook}</p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => router.push("/checkout?plan=pro")}
                  className="flex items-center justify-center gap-1.5 text-sm font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-xl px-4 py-2.5 transition-colors"
                >
                  {ov.aiAgentCard.lowerCtaPro}
                </button>
                <button
                  onClick={() => router.push("/checkout?plan=enterprise")}
                  className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl px-4 py-2.5 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  {ov.aiAgentCard.lowerCtaEnterprise}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Automation Performance + Recent Conversations + Template Cost ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4 sm:px-5">
            <CardTitle className="text-base font-bold">{ov.automation.title}</CardTitle>
            <button onClick={() => router.push("/dashboard/automation")} className="text-xs text-[#25D366] hover:underline flex items-center gap-1 flex-shrink-0">
              {h.campaigns.viewAll} <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            {loadingOverview ? (
              <div className="py-4"><ListRowsSkeleton rows={3} /></div>
            ) : !overview || overview.automationPerformance.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">{ov.automation.empty}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overview.automationPerformance.map(a => (
                  <div key={a.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.source === "ai" ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-gray-100 dark:bg-gray-800"}`}>
                      {a.source === "ai" ? <Feather className="w-4 h-4 text-emerald-600" /> : <Bot className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold truncate">{a.name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${a.successRate == null ? "bg-gray-100 text-gray-500 dark:bg-gray-800" :
                          a.successRate >= 80 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" :
                            "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                          }`}>
                          {a.successRate == null ? ov.automation.noData : `${a.successRate}%`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div
                            className={`h-full ${a.successRate != null && a.successRate < 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${a.successRate ?? 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{numFmt(a.triggered)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4 sm:px-5">
            <CardTitle className="text-base font-bold">{ov.conversations.title}</CardTitle>
            <button onClick={() => router.push("/dashboard/chat")} className="text-xs text-[#25D366] hover:underline flex items-center gap-1 flex-shrink-0">
              {ov.conversations.viewAll} <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {loadingOverview ? (
              <div className="py-2"><ChatListSkeleton rows={3} /></div>
            ) : !overview || overview.recentConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">{ov.conversations.empty}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {overview.recentConversations.map(c => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/dashboard/chat?contact=${c.id}`)}
                    className="w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors text-right"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">{c.name}</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE_CLS[c.status]}`}>
                          {ov.conversations.status[c.status]}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">{c.lastMessage || "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[c.status]}`} />
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{relativeTime(c.lastMessageAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Template Cost (Marketing vs Service) ── */}
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                <PieChartIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <CardTitle className="text-base font-bold">{ov.templateCost.title}</CardTitle>
            </div>
            <button onClick={() => router.push("/dashboard/reports/cost")} className="text-xs text-gray-400 hover:text-[#25D366] hover:underline flex-shrink-0">
              {ov.templateCost.reports}
            </button>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            {loadingCost ? (
              <div className="h-[200px] flex items-end justify-center gap-2 animate-pulse">
                {[35, 60, 45, 80, 55, 70, 50].map((h, i) => (
                  <div key={i} className="w-8 rounded-t-lg bg-gray-200 dark:bg-gray-700" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : !templateCost || templateCostTotal === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-gray-400">
                <PieChartIcon className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs">{ov.templateCost.empty}</p>
              </div>
            ) : (
              <>
                <div className="relative h-[190px]">
                  <PieResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "marketing", value: templateCost.marketing },
                          { name: "service", value: templateCost.service },
                        ]}
                        dataKey="value"
                        innerRadius="62%"
                        outerRadius="90%"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#4f6ef7" />
                      </Pie>
                    </PieChart>
                  </PieResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[11px] text-gray-400">{ov.templateCost.totalSpend}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">${templateCostTotal.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                    <span className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] flex-shrink-0" />
                      {ov.templateCost.marketing}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ${templateCost.marketing.toFixed(2)} <span className="text-gray-400">({marketingPct}%)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                    <span className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4f6ef7] flex-shrink-0" />
                      {ov.templateCost.service}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ${templateCost.service.toFixed(2)} <span className="text-gray-400">({servicePct}%)</span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Campaigns ── */}
      <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4 sm:px-5">
          <CardTitle className="text-base font-bold">{h.campaigns.title}</CardTitle>
          <button onClick={onCreateCampaign} className="text-xs text-[#25D366] hover:underline flex items-center gap-1 flex-shrink-0">
            {h.campaigns.viewAll} <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {recentCampaigns.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Send className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{h.campaigns.empty}</p>
              <button onClick={onCreateCampaign} className="mt-3 text-xs text-[#25D366] hover:underline">{h.campaigns.startFirst}</button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                      {Object.values(h.campaigns.headers).map(hd => (
                        <th key={hd} className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">{hd}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentCampaigns.map((c) => (
                      <tr key={c.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4 font-medium max-w-[160px] truncate">{c.name}</td>
                        <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(c.createdAt).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">{numFmt(c.sentCount)}</td>
                        <td className="py-3 px-4 text-green-600 font-medium">{numFmt(c.deliveredCount + c.readCount)}</td>
                        <td className="py-3 px-4 text-blue-600 font-medium">{numFmt(c.readCount)}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {h.campaigns.status[c.status as keyof typeof h.campaigns.status] ?? c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {recentCampaigns.map((c) => (
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-sm truncate flex-1">{c.name}</p>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {h.campaigns.status[c.status as keyof typeof h.campaigns.status] ?? c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(c.createdAt).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3 text-blue-500" />
                        {numFmt(c.sentCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {numFmt(c.deliveredCount + c.readCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-purple-500" />
                        {numFmt(c.readCount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


// ─── Home Page (route: /dashboard) ────────────────────────────────────────────
export default function DashboardHomePage() {
  const router = useRouter();
  const { dashData, loadingDash, campaignAtMax, hasMetaConnection } = useSubscription();

  if (!dashData) {
    return loadingDash
      ? <DashboardHomeSkeleton />
      : null;
  }

  return (
    <HomeDashboard
      data={dashData}
      onCreateCampaign={() => router.push("/dashboard/campaigns")}
      onOpenSettings={() => { }}
      campaignAtLimit={campaignAtMax}
      whatsappConnected={hasMetaConnection}
    />
  );
}
