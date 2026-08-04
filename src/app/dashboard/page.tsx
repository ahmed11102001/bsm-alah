"use client";

import { useState } from "react";
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
  CheckCircle, Loader2,
} from "lucide-react";



function HomeDashboard({ data, onCreateCampaign, onOpenSettings, campaignAtLimit = false, whatsappConnected = false }: {
  data: DashboardData; onCreateCampaign: () => void; onOpenSettings: () => void; campaignAtLimit?: boolean; whatsappConnected?: boolean;
}) {
  const router = useRouter();
  const { t, locale, dir } = useLanguage();
  const h = t.home;
  const [metaPrompt, setMetaPrompt] = useState<string | null>(null);
  const { stats, recentCampaigns, user } = data;
  const firstName = (user.name ?? "").split(" ")[0] || (locale === "ar" ? "مرحباً" : "there");
  const numFmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");

  const kpis = [
    { label: h.kpi.totalSent, value: stats.totalSent, sub: h.kpi.deliveryRate(stats.deliveryRate), icon: <Send className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50 dark:bg-blue-900/20", trend: stats.totalSent > 0 ? "up" : null },
    { label: h.kpi.delivered, value: stats.totalDelivered, sub: h.kpi.deliveredOf(stats.deliveryRate), icon: <CheckCircle className="w-5 h-5 text-green-600" />, bg: "bg-green-50 dark:bg-green-900/20", trend: "up" },
    { label: h.kpi.totalReplies, value: stats.totalInbound, sub: h.kpi.replyRate(stats.replyRate), icon: <MessageSquare className="w-5 h-5 text-purple-600" />, bg: "bg-purple-50 dark:bg-purple-900/20", trend: stats.totalInbound > 0 ? "up" : null },
    { label: h.kpi.campaigns, value: stats.totalCampaigns, sub: h.kpi.thisMonth(data.plan.usage.campaignsThisMonth), icon: <BarChart3 className="w-5 h-5 text-orange-600" />, bg: "bg-orange-50 dark:bg-orange-900/20", trend: null },
  ] as const;

  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";
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
      ? <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>
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
