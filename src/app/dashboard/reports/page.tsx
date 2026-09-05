"use client";
import { ListRowsSkeleton, ReportsOverviewSkeleton, TableRowsSkeleton } from "@/components/dashboard/DashboardSkeletons";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart3, Users, TrendingUp, Send, CheckCircle,
  Eye, XCircle, MessageSquare, Clock,
  FileSpreadsheet, Printer, Loader2, AlertCircle,
  UserCheck, Archive, RefreshCw, Shield, UserX,
} from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language-context";
import {
  type Overview, type CustomerRow, type TeamRow,
  TODAY, MONTH_AGO, HOURS, pageText,
  formatNumber, formatDate, StatCard, exportExcel, printPage,
} from "./_shared";

export default function ReportsOverviewPage() {
  const { locale } = useLanguage();
  const numberLocale = locale === "ar" ? "ar-EG" : "en-US";
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "overview"; // "overview" | "customers" | "team"

  // ── Filters ─────────────────────────────────────────────────────
  const [from, setFrom] = useState(MONTH_AGO);
  const [to, setTo] = useState(TODAY);

  // ── Overview ─────────────────────────────────────────────────────
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadingOverview, setLO] = useState(false);

  // ── Customers ────────────────────────────────────────────────────
  const [custSegment, setCustSegment] = useState("engaged");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loadingCust, setLC] = useState(false);

  // ── Team ─────────────────────────────────────────────────────────
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loadingTeam, setLT] = useState(false);

  // ── Fetchers ─────────────────────────────────────────────────────
  const fetchOverview = useCallback(async (silent = false) => {
    if (!silent) setLO(true);
    try {
      const r = await fetch(`/api/reports?type=overview&from=${from}&to=${to}`);
      setOverview(await r.json());
    } finally { if (!silent) setLO(false); }
  }, [from, to]);

  const fetchCustomers = useCallback(async (seg = custSegment, silent = false) => {
    if (!silent) setLC(true);
    try {
      const r = await fetch(`/api/reports?type=customers&segment=${seg}&from=${from}&to=${to}`);
      setCustomers(await r.json());
    } finally { if (!silent) setLC(false); }
  }, [custSegment, from, to]);

  const fetchTeam = useCallback(async (silent = false) => {
    if (!silent) setLT(true);
    try {
      const r = await fetch("/api/reports?type=team");
      const data = await r.json();
      setTeam(data.members ?? []);
      setUnassignedCount(data.unassigned ?? 0);
    } finally { if (!silent) setLT(false); }
  }, []);

  // Initial load per sub-tab
  useEffect(() => {
    if (tab === "overview") fetchOverview();
    if (tab === "customers") fetchCustomers();
    if (tab === "team") fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // تحديث دوري صامت في الخلفية كل 20 ثانية للتاب المفتوح حاليًا فقط،
  // من غير أي loading spinner يبان — عشان الأرقام تتحدث لوحدها
  useEffect(() => {
    const id = setInterval(() => {
      if (tab === "overview") fetchOverview(true);
      if (tab === "customers") fetchCustomers(custSegment, true);
      if (tab === "team") fetchTeam(true);
    }, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fetchOverview, fetchCustomers, fetchTeam]);

  // تحديث فوري لما اليوزر يرجع للتاب بعد ما يكون سايبه مفتوح في الخلفية
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (tab === "overview") fetchOverview(true);
      if (tab === "customers") fetchCustomers(custSegment, true);
      if (tab === "team") fetchTeam(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fetchOverview, fetchCustomers, fetchTeam]);

  // ── Chart colors ─────────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    if (!overview?.hourly) return [];
    const map = new Map(overview.hourly.map((h) => [h.hour, h.cnt]));
    return Array.from({ length: 24 }, (_, i) => ({
      hour: HOURS[i],
      cnt: map.get(i) ?? 0,
    }));
  }, [overview]);

  const maxHour = useMemo(() =>
    hourlyData.reduce((a, b) => (b.cnt > a.cnt ? b : a), { hour: "—", cnt: 0 }),
    [hourlyData]);

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto" dir={locale === "ar" ? "rtl" : "ltr"}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {locale === "ar" ? "التقارير والإحصائيات" : "Reports & Analytics"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {locale === "ar" ? "نظرة شاملة على أداء عملياتك" : "A comprehensive view of your performance."}
          </p>
        </div>
        {/* Export */}
        <div className="flex gap-2">
          <Button
            size="sm" variant="outline" className="gap-1.5"
            onClick={() => {
              if (tab === "overview" && overview)
                exportExcel(overview.daily, locale === "ar" ? "تقرير-الرسائل" : "message-report");
              else if (tab === "customers")
                exportExcel(customers, locale === "ar" ? "تقرير-العملاء" : "customer-report");
              else if (tab === "team")
                exportExcel(team, locale === "ar" ? "تقرير-الفريق" : "team-report");
            }}
          >
            <FileSpreadsheet className="w-4 h-4" /> {locale === "ar" ? "Excel" : "Excel"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={printPage}>
            <Printer className="w-4 h-4" /> {locale === "ar" ? "طباعة" : "Print"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 mb-6">
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-gray-500 dark:text-gray-400">من</Label>
            <Input type="date" value={from} max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="w-36 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-gray-500 dark:text-gray-400">إلى</Label>
            <Input type="date" value={to} min={from} max={TODAY}
              onChange={(e) => setTo(e.target.value)}
              className="w-36 text-sm"
            />
          </div>
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white gap-1.5"
            onClick={() => {
              if (tab === "overview") fetchOverview();
              if (tab === "customers") fetchCustomers();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> {pageText[locale].refresh}
          </Button>
          {/* Quick ranges */}
          {pageText[locale].quickRanges.map((r: { label: string; days: number }) => (
            <button
              key={r.days}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 hover:underline"
              onClick={() => {
                setFrom(new Date(Date.now() - r.days * 86400_000).toISOString().slice(0, 10));
                setTo(TODAY);
              }}
            >
              {r.label}
            </button>
          ))}
        </CardContent>
      </Card>

      <Tabs value={tab}>
        <TabsContent value="overview">
          {loadingOverview ? (
            <ReportsOverviewSkeleton />
          ) : !overview ? null : (
            <div className="space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label={locale === "ar" ? "الرسائل المرسلة" : "Messages Sent"} value={overview.totals.sent} icon={<Send className="w-5 h-5 text-blue-600" />} color="bg-blue-50" locale={locale} />
                <StatCard label={locale === "ar" ? "إجمالي الرسائل" : "Total Messages"} value={overview.totals.sent + overview.totals.inbound} icon={<CheckCircle className="w-5 h-5 text-green-600" />} color="bg-green-50" locale={locale} />
                <StatCard label={locale === "ar" ? "تم القراءة" : "Read"} value={overview.totals.read} sub={locale === "ar" ? `${overview.totals.readRate}% قرأوا` : `${overview.totals.readRate}% read`} icon={<Eye className="w-5 h-5 text-purple-600" />} color="bg-purple-50" locale={locale} />
                <StatCard label={locale === "ar" ? "فشل الإرسال" : "Failed"} value={overview.totals.failed} icon={<XCircle className="w-5 h-5 text-red-500" />} color="bg-red-50" locale={locale} />
                <StatCard label={locale === "ar" ? "الرسائل المستلمة" : "Messages Received"} value={overview.totals.inbound} sub={locale === "ar" ? `معدل رد ${overview.totals.replyRate}%` : `Reply rate ${overview.totals.replyRate}%`} icon={<MessageSquare className="w-5 h-5 text-teal-600" />} color="bg-teal-50" locale={locale} />
                <StatCard label={locale === "ar" ? "عملاء جدد" : "New Contacts"} value={overview.totals.uniqueContacts} icon={<Users className="w-5 h-5 text-orange-500" />} color="bg-orange-50" locale={locale} />
                <StatCard label={locale === "ar" ? "أفضل وقت للإرسال" : "Best Send Time"} value={maxHour.hour} sub={locale === "ar" ? `${maxHour.cnt} رسالة` : `${maxHour.cnt} messages`} icon={<Clock className="w-5 h-5 text-indigo-600" />} color="bg-indigo-50" locale={locale} />
                <StatCard label={locale === "ar" ? "معدل الردود" : "Reply Rate"} value={`${overview.totals.replyRate}%`} icon={<TrendingUp className="w-5 h-5 text-cyan-600" />} color="bg-cyan-50" locale={locale} />
              </div>

              {/* Daily chart */}
              <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{pageText[locale].charts.dailyTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  {overview.daily.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-16">{pageText[locale].charts.noData}</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={overview.daily}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }}
                            tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip
                            formatter={(value: any, name: any) => [
                              value,
                              name === "sent" ? pageText[locale].charts.sent : name === "delivered" ? pageText[locale].charts.delivered : pageText[locale].charts.received,
                            ]}
                            labelFormatter={(l) => `${pageText[locale].charts.dayLabel} ${l}`}
                          />
                          {/* بيوم واحد بس مفيش نقطتين ترسم بينهم خط، فبنظهر نقطة واضحة بدل ما الرسم يبان فاضي */}
                          <Line type="monotone" dataKey="sent" stroke="#2563eb" strokeWidth={2} dot={overview.daily.length <= 1 ? { r: 4, fill: "#2563eb", strokeWidth: 0 } : false} name="sent" />
                          <Line type="monotone" dataKey="delivered" stroke="#16a34a" strokeWidth={2} dot={overview.daily.length <= 1 ? { r: 4, fill: "#16a34a", strokeWidth: 0 } : false} name="delivered" />
                          <Line type="monotone" dataKey="received" stroke="#9333ea" strokeWidth={2} dot={overview.daily.length <= 1 ? { r: 4, fill: "#9333ea", strokeWidth: 0 } : false} name="received" />
                        </LineChart>
                      </ResponsiveContainer>
                      {overview.daily.length <= 1 && (
                        <p className="text-xs text-gray-400 text-center mt-2">{pageText[locale].charts.notEnoughDailyData}</p>
                      )}
                    </>
                  )}
                  <div className="flex gap-6 justify-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-600 inline-block" /> {pageText[locale].charts.campaignsLegendSent}</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-600 inline-block" /> {pageText[locale].charts.campaignsLegendDelivered}</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-600 inline-block" /> {pageText[locale].charts.campaignsLegendReceived}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Hourly heatmap */}
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">{pageText[locale].charts.bestSendTimeTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10 }}
                          interval={3}
                          tickFormatter={(v) => v.slice(0, 2)} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(value: any, name: any) => [
                            value != null ? formatNumber(Number(value), numberLocale) : "0",
                            name === "sent" ? pageText[locale].charts.sent : pageText[locale].charts.received
                          ]}
                        />
                        <Bar dataKey="cnt" radius={[3, 3, 0, 0]}>
                          {hourlyData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.cnt === maxHour.cnt && entry.cnt > 0 ? "#22c55e" : "#d1fae5"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Best campaigns */}
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">{pageText[locale].charts.bestCampaignsTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overview.bestCampaigns.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">{pageText[locale].charts.noData}</p>
                    ) : (
                      <div className="space-y-3">
                        {overview.bestCampaigns.map((c, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-gray-100 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center font-semibold flex-shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                              <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-green-400 rounded-full" style={{ width: `${c.rate}%` }} />
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-green-600 flex-shrink-0">{c.rate}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ══════════════ CUSTOMERS ══════════════ */}
        <TabsContent value="customers">
          <div className="space-y-5">
            {/* Segment selector */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: "engaged", label: pageText[locale].customers.segments.engaged, icon: <TrendingUp className="w-4 h-4" /> },
                { value: "no-response", label: pageText[locale].customers.segments.noResponse, icon: <AlertCircle className="w-4 h-4" /> },
                { value: "new", label: pageText[locale].customers.segments.new, icon: <UserCheck className="w-4 h-4" /> },
                { value: "archived", label: pageText[locale].customers.segments.archived, icon: <Archive className="w-4 h-4" /> },
                { value: "followup", label: pageText[locale].customers.segments.followup, icon: <RefreshCw className="w-4 h-4" /> },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setCustSegment(s.value);
                    fetchCustomers(s.value);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${custSegment === s.value
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                    }`}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
              <CardContent className="p-0">
                {loadingCust ? (
                  <div className="p-3"><TableRowsSkeleton rows={5} bare cols={2} /></div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-sm">{pageText[locale].customers.noResults}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100">
                        <tr>
                          <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].customers.phone}</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].customers.name}</th>
                          {custSegment === "engaged" && (
                            <><th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].customers.messages}</th>
                              <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].customers.unread}</th></>
                          )}
                          <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].customers.lastContact}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((c) => (
                          <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-4 font-mono text-gray-700">{c.phone}</td>
                            <td className="py-3 px-4 text-gray-600">{c.name ?? "—"}</td>
                            {custSegment === "engaged" && (
                              <><td className="py-3 px-4 text-gray-700 font-medium">{c.totalMessages?.toLocaleString("ar-EG")}</td>
                                <td className="py-3 px-4">
                                  {(c.unreadCount ?? 0) > 0 && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                                      {c.unreadCount}
                                    </span>
                                  )}
                                </td></>
                            )}
                            <td className="py-3 px-4 text-gray-400 text-xs">
                              {c.lastMessageAt
                                ? new Date(c.lastMessageAt).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════ TEAM ══════════════ */}
        <TabsContent value="team">
          {loadingTeam ? (
            <ListRowsSkeleton rows={4} />
          ) : team.length === 0 ? (
            <div className="text-center py-20">
              <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{locale === "ar" ? "لا يوجد أعضاء فريق حتى الآن" : "No team members yet"}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Unassigned summary */}
              {unassignedCount > 0 && (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3.5">
                  <UserX className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                      {formatNumber(unassignedCount, numberLocale)} {pageText[locale].charts.teamUnassigned}
                    </p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-500/70">{pageText[locale].charts.teamUnassignedHint}</p>
                  </div>
                </div>
              )}

              {/* Team chart */}
              <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{pageText[locale].charts.teamActivity}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={team} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          value != null ? Number(value).toLocaleString(numberLocale) : "0",
                          name === "sent" ? pageText[locale].charts.teamSent : pageText[locale].charts.teamReplied
                        ]}
                      />
                      <Bar dataKey="sent" fill="#22c55e" radius={[0, 3, 3, 0]} name="sent" />
                      <Bar dataKey="replied" fill="#3b82f6" radius={[0, 3, 3, 0]} name="replied" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-6 justify-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-green-400 inline-block rounded-sm" /> {pageText[locale].charts.teamSent}</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-blue-400 inline-block rounded-sm" /> {pageText[locale].charts.teamReplied}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Team table */}
              <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100">
                      <tr>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{locale === "ar" ? "الاسم" : "Name"}</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{locale === "ar" ? "الصلاحية" : "Role"}</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{locale === "ar" ? "الرسائل المرسلة" : "Sent Messages"}</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{locale === "ar" ? "الردود" : "Replies"}</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].charts.teamAssigned}</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{locale === "ar" ? "معدل الرد" : "Reply Rate"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((m) => {
                        const rate = m.sent > 0 ? Math.round((m.replied / m.sent) * 100) : 0;
                        return (
                          <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-3 px-4 font-medium text-gray-800">{m.name}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === "OWNER" ? "bg-purple-100 text-purple-700" :
                                m.role === "FULL_ACCESS" ? "bg-blue-100 text-blue-700" :
                                  "bg-gray-100 text-gray-600"
                                }`}>
                                {m.role === "OWNER" ? (locale === "ar" ? "مالك" : "Owner") : m.role === "FULL_ACCESS" ? (locale === "ar" ? "وصول كامل" : "Full Access") : (locale === "ar" ? "دردشة فقط" : "Chat Only")}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700 font-medium">{formatNumber(m.sent, numberLocale)}</td>
                            <td className="py-3 px-4 text-gray-700">{formatNumber(m.replied, numberLocale)}</td>
                            <td className="py-3 px-4 text-gray-700">
                              {m.role === "CHAT_ONLY" || m.role === "FULL_ACCESS" ? formatNumber(m.assigned, numberLocale) : "—"}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-green-400 rounded-full" style={{ width: `${rate}%` }} />
                                </div>
                                <span className="text-xs font-medium text-gray-600">{rate}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}