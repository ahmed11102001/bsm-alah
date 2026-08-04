"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { useSubscription, type DashboardData } from "./_lib/dashboard-context";
import { toast } from "sonner";
import { STATUS_BADGE } from "@/app/dashboard/_shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  MessageSquare, Send, BarChart3,
  Plus, TrendingUp, Calendar, ChevronLeft,
  CheckCircle, Loader2, Feather, Bot, Zap,
} from "lucide-react";
import { DEMO_OVERVIEW_DATA } from "./_lib/demo-data";

interface OverviewData {
  range: "7d" | "30d" | "90d";
  campaignBreakdown: { draft: number; scheduled: number; running: number; completed: number; failed: number };
  messagingPerformance: Array<{ date: string; sent: number; delivered: number; replies: number }>;
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

function HomeDashboard({ data, onCreateCampaign, onOpenSettings, campaignAtLimit = false, whatsappConnected = false }: {
  data: DashboardData; onCreateCampaign: () => void; onOpenSettings: () => void; campaignAtLimit?: boolean; whatsappConnected?: boolean;
}) {
  const router = useRouter();
  const { t, locale, dir } = useLanguage();
  const h = t.home;
  const ov = h.overview;
  const [metaPrompt, setMetaPrompt] = useState<string | null>(null);
  const { stats, recentCampaigns, user } = data;
  const firstName = (user.name ?? "").split(" ")[0] || (locale === "ar" ? "مرحباً" : "there");
  const numFmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  const [overview, setOverview] = useState<OverviewData | null>(DEMO_OVERVIEW_DATA as OverviewData);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("7d");

  useEffect(() => {
    setOverview({ ...(DEMO_OVERVIEW_DATA as OverviewData), range });
  }, [range]);

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
    { label: h.kpi.totalSent, value: stats.totalSent, sub: h.kpi.deliveryRate(stats.deliveryRate), icon: <Send className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50 dark:bg-blue-900/20", trend: stats.totalSent > 0 ? "up" : null },
    { label: h.kpi.delivered, value: stats.totalDelivered, sub: h.kpi.deliveredOf(stats.deliveryRate), icon: <CheckCircle className="w-5 h-5 text-green-600" />, bg: "bg-green-50 dark:bg-green-900/20", trend: "up" },
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
          onClick={() => { toast.dismiss(); router.push("/"); }}
          className="mt-1 text-xs font-semibold text-white bg-[#075E54] hover:bg-[#064944] px-4 py-2 rounded-lg transition-colors"
        >
          ترقية الباقة ←
        </button>
      </div>
    ), { duration: 6000 });
  };

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

      <Card className="border border-gray-100 dark:border-gray-700 shadow-sm mb-5">
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4 sm:px-5 flex-wrap gap-2">
          <CardTitle className="text-base font-bold">{ov.messaging.title}</CardTitle>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {(["7d", "30d", "90d"] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${range === r ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
              >
                {r === "7d" ? ov.messaging.range7 : r === "30d" ? ov.messaging.range30 : ov.messaging.range90}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-5 pb-4">
          {loadingOverview ? (
            <div className="h-[240px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          ) : !overview || overview.messagingPerformance.every(d => d.sent === 0 && d.delivered === 0 && d.replies === 0) ? (
            <div className="h-[240px] flex flex-col items-center justify-center text-gray-400">
              <BarChart3 className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs">{ov.messaging.empty}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={overview.messagingPerformance} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })} stroke="currentColor" className="text-gray-400" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400" />
                <Tooltip
                  labelFormatter={d => new Date(d).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => value === "sent" ? ov.messaging.sent : value === "delivered" ? ov.messaging.delivered : ov.messaging.replies} />
                <Line type="monotone" dataKey="sent" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="delivered" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="replies" stroke="#9333ea" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4 sm:px-5">
            <CardTitle className="text-base font-bold">{ov.automation.title}</CardTitle>
            <button onClick={() => router.push("/demo/automation")} className="text-xs text-[#25D366] hover:underline flex items-center gap-1 flex-shrink-0">
              {h.campaigns.viewAll} <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            {loadingOverview ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
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
            <button onClick={() => router.push("/demo/chat")} className="text-xs text-[#25D366] hover:underline flex items-center gap-1 flex-shrink-0">
              {ov.conversations.viewAll} <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {loadingOverview ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
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
                    onClick={() => router.push(`/demo/chat?contact=${c.id}`)}
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
      </div>

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

export default function DemoHomePage() {
  const router = useRouter();
  const { dashData, loadingDash, campaignAtMax, hasMetaConnection } = useSubscription();

  if (!dashData) {
    return loadingDash
      ? <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>
      : null;
  }

  return (
    <HomeDashboard
      data={dashData}
      onCreateCampaign={() => router.push("/demo/campaigns")}
      onOpenSettings={() => { }}
      campaignAtLimit={campaignAtMax}
      whatsappConnected={hasMetaConnection}
    />
  );
}
