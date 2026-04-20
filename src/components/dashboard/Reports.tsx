"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart3, Users, Activity, FileText,
  TrendingUp, TrendingDown, Send, CheckCircle,
  Eye, XCircle, MessageSquare, Clock, Download,
  Printer, FileSpreadsheet, Loader2, ChevronLeft,
  ChevronRight, AlertCircle, UserCheck, Archive,
  RefreshCw, Shield,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Overview {
  totals: {
    sent: number; delivered: number; read: number; failed: number;
    inbound: number; uniqueContacts: number;
    deliveryRate: number; readRate: number; replyRate: number;
  };
  daily: { day: string; sent: number; received: number }[];
  hourly: { hour: number; cnt: number }[];
  bestCampaigns: { name: string; sentCount: number; deliveredCount: number; readCount: number; failedCount: number; rate: number }[];
}

interface CustomerRow {
  id: string; phone: string; name: string | null;
  lastMessageAt: string | null; totalMessages?: number;
  unreadCount?: number; createdAt?: string;
}

interface TeamRow {
  id: string; name: string; role: string; sent: number; replied: number;
}

interface LogRow {
  id: string; content: string | null; type: string; status: string;
  direction: string; createdAt: string;
  contact: { phone: string; name: string | null } | null;
  campaign: { name: string } | null;
  user: { name: string | null; email: string } | null;
}

interface LogsData { total: number; page: number; limit: number; messages: LogRow[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10);
const MONTH_AGO = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

const statusColor: Record<string, string> = {
  sent:      "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  read:      "bg-purple-100 text-purple-700",
  failed:    "bg-red-100 text-red-700",
  pending:   "bg-gray-100 text-gray-600",
};

const statusLabel: Record<string, string> = {
  sent: "مرسل", delivered: "وصل", read: "قُرئ", failed: "فشل", pending: "انتظار",
};

const dirLabel: Record<string, string> = { outbound: "صادر", inbound: "وارد" };
const typeLabel: Record<string, string> = {
  text: "نص", image: "صورة", audio: "صوت", document: "مستند", template: "قالب",
};

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`
);

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
          </p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Export helpers ────────────────────────────────────────────────────────────
function exportExcel(data: object[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "تقرير");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function printPage() {
  window.print();
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Reports() {
  // ── Filters ─────────────────────────────────────────────────────
  const [from, setFrom]   = useState(MONTH_AGO);
  const [to,   setTo]     = useState(TODAY);
  const [tab,  setTab]    = useState("overview");

  // ── Overview ─────────────────────────────────────────────────────
  const [overview, setOverview]       = useState<Overview | null>(null);
  const [loadingOverview, setLO]       = useState(false);

  // ── Customers ────────────────────────────────────────────────────
  const [custSegment, setCustSegment] = useState("engaged");
  const [customers, setCustomers]     = useState<CustomerRow[]>([]);
  const [loadingCust, setLC]          = useState(false);

  // ── Team ─────────────────────────────────────────────────────────
  const [team, setTeam]               = useState<TeamRow[]>([]);
  const [loadingTeam, setLT]          = useState(false);

  // ── Logs ─────────────────────────────────────────────────────────
  const [logs, setLogs]               = useState<LogsData | null>(null);
  const [loadingLogs, setLL]          = useState(false);
  const [logPage, setLogPage]         = useState(1);
  const [logStatus, setLogStatus]     = useState("all");
  const [logSearch, setLogSearch]     = useState("");
  const [logType,   setLogType]       = useState("all");

  // ── Fetchers ─────────────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLO(true);
    try {
      const r = await fetch(`/api/reports?type=overview&from=${from}&to=${to}`);
      setOverview(await r.json());
    } finally { setLO(false); }
  }, [from, to]);

  const fetchCustomers = useCallback(async (seg = custSegment) => {
    setLC(true);
    try {
      const r = await fetch(`/api/reports?type=customers&segment=${seg}&from=${from}&to=${to}`);
      setCustomers(await r.json());
    } finally { setLC(false); }
  }, [custSegment, from, to]);

  const fetchTeam = useCallback(async () => {
    setLT(true);
    try {
      const r = await fetch("/api/reports?type=team");
      setTeam(await r.json());
    } finally { setLT(false); }
  }, []);

  const fetchLogs = useCallback(async (page = logPage) => {
    setLL(true);
    try {
      const params = new URLSearchParams({
        type: "logs", from, to, page: String(page), limit: "50",
        ...(logStatus !== "all" && { status: logStatus }),
        ...(logType   !== "all" && { msgType: logType }),
        ...(logSearch             && { search: logSearch }),
      });
      const r = await fetch(`/api/reports?${params}`);
      setLogs(await r.json());
    } finally { setLL(false); }
  }, [from, to, logPage, logStatus, logSearch, logType]);

  // Initial load per tab
  useEffect(() => {
    if (tab === "overview")  fetchOverview();
    if (tab === "customers") fetchCustomers();
    if (tab === "team")      fetchTeam();
    if (tab === "logs")      fetchLogs(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Chart colors ─────────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    if (!overview?.hourly) return [];
    const map = new Map(overview.hourly.map((h) => [h.hour, h.cnt]));
    return Array.from({ length: 24 }, (_, i) => ({
      hour: HOURS[i],
      cnt:  map.get(i) ?? 0,
    }));
  }, [overview]);

  const maxHour = useMemo(() =>
    hourlyData.reduce((a, b) => (b.cnt > a.cnt ? b : a), { hour: "—", cnt: 0 }),
  [hourlyData]);

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto" dir="rtl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التقارير والإحصائيات</h1>
          <p className="text-sm text-gray-500 mt-0.5">نظرة شاملة على أداء عملياتك</p>
        </div>
        {/* Export */}
        <div className="flex gap-2">
          <Button
            size="sm" variant="outline" className="gap-1.5"
            onClick={() => {
              if (tab === "overview" && overview)
                exportExcel(overview.daily, "تقرير-الرسائل");
              else if (tab === "customers")
                exportExcel(customers, "تقرير-العملاء");
              else if (tab === "team")
                exportExcel(team, "تقرير-الفريق");
              else if (tab === "logs" && logs)
                exportExcel(logs.messages.map((m) => ({
                  الهاتف:    m.contact?.phone,
                  العميل:    m.contact?.name ?? "—",
                  الحالة:    statusLabel[m.status] ?? m.status,
                  النوع:     typeLabel[m.type] ?? m.type,
                  الاتجاه:   dirLabel[m.direction] ?? m.direction,
                  الحملة:    m.campaign?.name ?? "—",
                  المستخدم:  m.user?.name ?? m.user?.email ?? "—",
                  التاريخ:   new Date(m.createdAt).toLocaleString("ar-EG"),
                })), "سجل-النشاط");
            }}
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={printPage}>
            <Printer className="w-4 h-4" /> طباعة
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm mb-6">
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-gray-500">من</Label>
            <Input type="date" value={from} max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="w-36 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-gray-500">إلى</Label>
            <Input type="date" value={to} min={from} max={TODAY}
              onChange={(e) => setTo(e.target.value)}
              className="w-36 text-sm"
            />
          </div>
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white gap-1.5"
            onClick={() => {
              if (tab === "overview")  fetchOverview();
              if (tab === "customers") fetchCustomers();
              if (tab === "logs")      fetchLogs(1);
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </Button>
          {/* Quick ranges */}
          {[
            { label: "7 أيام",  days: 7  },
            { label: "30 يوم",  days: 30 },
            { label: "90 يوم",  days: 90 },
          ].map((r) => (
            <button
              key={r.days}
              className="text-xs text-gray-500 hover:text-green-600 hover:underline"
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

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 bg-gray-100 p-1 rounded-xl h-auto flex-wrap gap-1">
          {[
            { value: "overview",  label: "نظرة عامة",      icon: <BarChart3 className="w-4 h-4" /> },
            { value: "customers", label: "العملاء",          icon: <Users className="w-4 h-4" /> },
            { value: "team",      label: "الفريق",           icon: <Shield className="w-4 h-4" /> },
            { value: "logs",      label: "سجل النشاط",      icon: <Activity className="w-4 h-4" /> },
          ].map((t) => (
            <TabsTrigger
              key={t.value} value={t.value}
              className="flex items-center gap-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2"
            >
              {t.icon} {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ══════════════ OVERVIEW ══════════════ */}
        <TabsContent value="overview">
          {loadingOverview ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-green-400" /></div>
          ) : !overview ? null : (
            <div className="space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="إجمالي المرسل"   value={overview.totals.sent}         sub={`نسبة وصول ${overview.totals.deliveryRate}%`} icon={<Send className="w-5 h-5 text-blue-600" />}   color="bg-blue-50" />
                <StatCard label="تم التوصيل"       value={overview.totals.delivered}    sub={`${overview.totals.deliveryRate}% من المرسل`}   icon={<CheckCircle className="w-5 h-5 text-green-600" />} color="bg-green-50" />
                <StatCard label="تم القراءة"       value={overview.totals.read}         sub={`${overview.totals.readRate}% قرأوا`}            icon={<Eye className="w-5 h-5 text-purple-600" />}  color="bg-purple-50" />
                <StatCard label="فشل الإرسال"      value={overview.totals.failed}       icon={<XCircle className="w-5 h-5 text-red-500" />}   color="bg-red-50" />
                <StatCard label="رسائل واردة"      value={overview.totals.inbound}      sub={`معدل رد ${overview.totals.replyRate}%`}          icon={<MessageSquare className="w-5 h-5 text-teal-600" />} color="bg-teal-50" />
                <StatCard label="عملاء جدد"        value={overview.totals.uniqueContacts} icon={<Users className="w-5 h-5 text-orange-500" />} color="bg-orange-50" />
                <StatCard label="أفضل وقت للإرسال" value={maxHour.hour}                sub={`${maxHour.cnt} رسالة`}                          icon={<Clock className="w-5 h-5 text-indigo-600" />}  color="bg-indigo-50" />
                <StatCard label="معدل الردود"      value={`${overview.totals.replyRate}%`} icon={<TrendingUp className="w-5 h-5 text-cyan-600" />} color="bg-cyan-50" />
              </div>

              {/* Daily chart */}
              <Card className="border border-gray-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">الرسائل يومياً</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={overview.daily}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }}
                        tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value,name) => [
                          value,("ar-EG"),
                          name === "sent" ? "مرسل" : "وارد",
                        ]}
                        labelFormatter={(l) => `يوم ${l}`}
                      />
                      <Line type="monotone" dataKey="sent"     stroke="#22c55e" strokeWidth={2} dot={false} name="sent" />
                      <Line type="monotone" dataKey="received" stroke="#3b82f6" strokeWidth={2} dot={false} name="received" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex gap-6 justify-center mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-500 inline-block" /> رسائل مرسلة</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> رسائل واردة</span>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Hourly heatmap */}
                <Card className="border border-gray-100 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">أفضل أوقات الإرسال</CardTitle>
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
                         value != null ? Number(value).toLocaleString("ar-EG") : "0",
                         name === "sent" ? "مرسل" : "رد"
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
                <Card className="border border-gray-100 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">أفضل الحملات أداءً</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overview.bestCampaigns.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">لا توجد بيانات</p>
                    ) : (
                      <div className="space-y-3">
                        {overview.bestCampaigns.map((c, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-gray-100 text-xs text-gray-500 flex items-center justify-center font-semibold flex-shrink-0">
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
                { value: "engaged",    label: "الأكثر تفاعلاً",     icon: <TrendingUp className="w-4 h-4" /> },
                { value: "no-response",label: "لم يردوا",            icon: <AlertCircle className="w-4 h-4" /> },
                { value: "new",        label: "العملاء الجدد",       icon: <UserCheck className="w-4 h-4" /> },
                { value: "archived",   label: "المحظورين/المؤرشفين", icon: <Archive className="w-4 h-4" /> },
                { value: "followup",   label: "يحتاجون متابعة",      icon: <RefreshCw className="w-4 h-4" /> },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setCustSegment(s.value);
                    fetchCustomers(s.value);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    custSegment === s.value
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                  }`}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            <Card className="border border-gray-100 shadow-sm">
              <CardContent className="p-0">
                {loadingCust ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-green-400" /></div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-sm">لا توجد نتائج</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100">
                        <tr>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">الهاتف</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">الاسم</th>
                          {custSegment === "engaged" && (
                            <><th className="text-right py-3 px-4 font-medium text-gray-500">الرسائل</th>
                              <th className="text-right py-3 px-4 font-medium text-gray-500">غير مقروء</th></>
                          )}
                          <th className="text-right py-3 px-4 font-medium text-gray-500">آخر تواصل</th>
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
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-green-400" /></div>
          ) : team.length === 0 ? (
            <div className="text-center py-20">
              <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">لا يوجد أعضاء فريق حتى الآن</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Team chart */}
              <Card className="border border-gray-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">نشاط الفريق</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={team} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                       <Tooltip
                       formatter={(value: any, name: any) => [
                       value != null ? Number(value).toLocaleString("ar-EG") : "0",
                       name === "sent" ? "مرسل" : "رد"
                       ]}
/>
                      <Bar dataKey="sent"    fill="#22c55e" radius={[0, 3, 3, 0]} name="sent"    />
                      <Bar dataKey="replied" fill="#3b82f6" radius={[0, 3, 3, 0]} name="replied" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-6 justify-center mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-green-400 inline-block rounded-sm" /> رسائل مرسلة</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-blue-400 inline-block rounded-sm" /> ردود</span>
                  </div>
                </CardContent>
              </Card>

              {/* Team table */}
              <Card className="border border-gray-100 shadow-sm">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100">
                      <tr>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">الاسم</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">الصلاحية</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">الرسائل المرسلة</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">الردود</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">معدل الرد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((m) => {
                        const rate = m.sent > 0 ? Math.round((m.replied / m.sent) * 100) : 0;
                        return (
                          <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-3 px-4 font-medium text-gray-800">{m.name}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                m.role === "OWNER"       ? "bg-purple-100 text-purple-700" :
                                m.role === "FULL_ACCESS" ? "bg-blue-100 text-blue-700"    :
                                                           "bg-gray-100 text-gray-600"
                              }`}>
                                {m.role === "OWNER" ? "مالك" : m.role === "FULL_ACCESS" ? "وصول كامل" : "دردشة فقط"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700 font-medium">{m.sent.toLocaleString("ar-EG")}</td>
                            <td className="py-3 px-4 text-gray-700">{m.replied.toLocaleString("ar-EG")}</td>
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

        {/* ══════════════ LOGS ══════════════ */}
        <TabsContent value="logs">
          <div className="space-y-4">
            {/* Log filters */}
            <Card className="border border-gray-100 shadow-sm">
              <CardContent className="p-4 flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-gray-500">الحالة</Label>
                  <Select value={logStatus} onValueChange={setLogStatus}>
                    <SelectTrigger className="w-32 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="sent">مرسل</SelectItem>
                      <SelectItem value="delivered">وصل</SelectItem>
                      <SelectItem value="read">قُرئ</SelectItem>
                      <SelectItem value="failed">فشل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-gray-500">نوع الرسالة</Label>
                  <Select value={logType} onValueChange={setLogType}>
                    <SelectTrigger className="w-32 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="text">نص</SelectItem>
                      <SelectItem value="template">قالب</SelectItem>
                      <SelectItem value="image">صورة</SelectItem>
                      <SelectItem value="audio">صوت</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-gray-500">بحث بالرقم</Label>
                  <Input
                    className="w-40 text-sm" placeholder="201234..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchLogs(1)}
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white gap-1.5"
                  onClick={() => fetchLogs(1)}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> بحث
                </Button>
              </CardContent>
            </Card>

            {/* Logs table */}
            <Card className="border border-gray-100 shadow-sm">
              <CardContent className="p-0">
                {loadingLogs ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-green-400" /></div>
                ) : !logs || logs.messages.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-sm">لا توجد سجلات</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="border-b border-gray-100 bg-gray-50/50">
                          <tr>
                            <th className="text-right py-3 px-3 font-medium text-gray-500">الهاتف</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500">العميل</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500">الحالة</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500">النوع</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500">الاتجاه</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500">الحملة</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500">المرسِل</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500">التوقيت</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.messages.map((m) => (
                            <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                              <td className="py-2.5 px-3 font-mono text-gray-600">{m.contact?.phone ?? "—"}</td>
                              <td className="py-2.5 px-3 text-gray-600">{m.contact?.name ?? "—"}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[m.status] ?? "bg-gray-100 text-gray-600"}`}>
                                  {statusLabel[m.status] ?? m.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-500">{typeLabel[m.type] ?? m.type}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${m.direction === "outbound" ? "bg-blue-50 text-blue-600" : "bg-teal-50 text-teal-600"}`}>
                                  {dirLabel[m.direction]}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-500 truncate max-w-[100px]">{m.campaign?.name ?? "—"}</td>
                              <td className="py-2.5 px-3 text-gray-500">{m.user?.name ?? m.user?.email ?? "—"}</td>
                              <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                                {new Date(m.createdAt).toLocaleString("ar-EG", {
                                  month: "short", day: "numeric",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        {((logs.page - 1) * logs.limit + 1).toLocaleString("ar-EG")} –{" "}
                        {Math.min(logs.page * logs.limit, logs.total).toLocaleString("ar-EG")} من{" "}
                        {logs.total.toLocaleString("ar-EG")}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm" variant="outline" className="h-7 w-7 p-0"
                          disabled={logs.page <= 1}
                          onClick={() => { setLogPage(p => p - 1); fetchLogs(logPage - 1); }}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="outline" className="h-7 w-7 p-0"
                          disabled={logs.page * logs.limit >= logs.total}
                          onClick={() => { setLogPage(p => p + 1); fetchLogs(logPage + 1); }}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}