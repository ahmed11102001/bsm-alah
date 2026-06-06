"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ExcelJS from "exceljs";
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
  RefreshCw, Shield, ShoppingBag, DollarSign,
  Package, Star, Zap, Store, ArrowUpRight,
  Bot,
} from "lucide-react";
import AutomationReportTab from "@/components/dashboard/AutomationReportTab";
import CostReportTab       from "@/components/dashboard/CostReportTab";

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

// ─── Store Report Types ───────────────────────────────────────────────────────
interface StoreReportSummary {
  totalOrders: number; totalRevenue: number;
  totalCampaignRevenue: number; campaignRevenueShare: number;
  totalUniqueCustomers: number; storesConnected: number;
}
interface CampaignRevenueRow {
  id: string; name: string; revenue: number; ordersCount: number;
  sentCount: number; readCount: number; completedAt: string | null; createdAt: string;
}
interface TopCustomerRow {
  phone: string; name: string | null; ordersCount: number; totalSpent: number; currency: string;
}
interface OrderStatusRow { status: string; count: number; revenue: number; }
interface DailyTrendRow  { day: string; orders: number; revenue: number; }
interface StoreInfoRow   { source: string; name: string; connectedAt: string | null; isActive: boolean; }
interface StoreReportData {
  summary: StoreReportSummary; stores: StoreInfoRow[];
  campaignRevenue: CampaignRevenueRow[]; topCustomers: TopCustomerRow[];
  ordersByStatus: OrderStatusRow[]; dailyTrend: DailyTrendRow[];
}

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
    <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
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
async function exportExcel(data: object[], filename: string) {
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet("تقرير");

  if (!data || data.length === 0) {
    worksheet.addRow(["No Data"]);
  } else {
    // headers
    const columns = Object.keys(data[0]).map((key) => ({
      header: key,
      key,
    }));

    worksheet.columns = columns;

    // rows
    data.forEach((item) => {
      worksheet.addRow(item);
    });
  }

  await workbook.xlsx.writeFile(`${filename}.xlsx`);
}

function printPage() {
  window.print();
}
// ─── Main Component ────────────────────────────────────────────────────────────
export default function Reports({ planTier = "free" }: { planTier?: string }) {
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

  // ── Store Report ──────────────────────────────────────────────────
  const [storeReport, setStoreReport] = useState<StoreReportData | null>(null);
  const [loadingStore, setLS]         = useState(false);

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

  const fetchStoreReport = useCallback(async () => {
    setLS(true);
    try {
      const r = await fetch(`/api/reports/store?from=${from}&to=${to}`);
      if (r.ok) setStoreReport(await r.json());
    } finally { setLS(false); }
  }, [from, to]);

  // Initial load per tab
  useEffect(() => {
    if (tab === "overview")  fetchOverview();
    if (tab === "customers") fetchCustomers();
    if (tab === "team")      fetchTeam();
    if (tab === "logs")      fetchLogs(1);
    if (tab === "store")     fetchStoreReport();
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">التقارير والإحصائيات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">نظرة شاملة على أداء عملياتك</p>
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

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl h-auto flex-wrap gap-1">
          {[
            // free+
            { value: "overview",   label: "نظرة عامة",    icon: <BarChart3 className="w-4 h-4" />,    minPlan: "free"       },
            // starter+
            { value: "customers",  label: "العملاء",       icon: <Users className="w-4 h-4" />,        minPlan: "starter"    },
            { value: "team",       label: "الفريق",        icon: <Shield className="w-4 h-4" />,       minPlan: "starter"    },
            // pro+
            { value: "logs",       label: "سجل النشاط",   icon: <Activity className="w-4 h-4" />,     minPlan: "pro"        },
            { value: "store",      label: "تقرير المتجر",  icon: <ShoppingBag className="w-4 h-4" />,  minPlan: "pro"        },
            { value: "automation", label: "تقرير الأتمتة", icon: <Bot className="w-4 h-4" />,          minPlan: "pro"        },
            { value: "cost",       label: "التكلفة والإنفاق", icon: <DollarSign className="w-4 h-4" />, minPlan: "starter"    },
          ].map((t) => {
            const order = ["free","starter","pro","enterprise"];
            const allowed = order.indexOf(planTier) >= order.indexOf(t.minPlan);
            return (
              <TabsTrigger
                key={t.value} value={t.value}
                disabled={!allowed}
                className={`flex items-center gap-1.5 text-sm rounded-lg px-4 py-2
                  ${!allowed
                    ? "opacity-40 cursor-not-allowed text-gray-400"
                    : "text-gray-600 dark:text-gray-300 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 data-[state=active]:shadow-sm"
                  }`}
              >
                {t.icon} {t.label}
                {!allowed && <span className="text-[10px] mr-1">🔒</span>}
              </TabsTrigger>
            );
          })}
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
              <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
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
                  <div className="flex gap-6 justify-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-500 inline-block" /> رسائل مرسلة</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> رسائل واردة</span>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Hourly heatmap */}
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
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
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
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

            <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
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
                          <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الهاتف</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الاسم</th>
                          {custSegment === "engaged" && (
                            <><th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الرسائل</th>
                              <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">غير مقروء</th></>
                          )}
                          <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">آخر تواصل</th>
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
              <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
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
                  <div className="flex gap-6 justify-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-green-400 inline-block rounded-sm" /> رسائل مرسلة</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-blue-400 inline-block rounded-sm" /> ردود</span>
                  </div>
                </CardContent>
              </Card>

              {/* Team table */}
              <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100">
                      <tr>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الاسم</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الصلاحية</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الرسائل المرسلة</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الردود</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">معدل الرد</th>
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
            <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
              <CardContent className="p-4 flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400">الحالة</Label>
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
                  <Label className="text-xs text-gray-500 dark:text-gray-400">نوع الرسالة</Label>
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
                  <Label className="text-xs text-gray-500 dark:text-gray-400">بحث بالرقم</Label>
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
            <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
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
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">الهاتف</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">العميل</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">النوع</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">الاتجاه</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">الحملة</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">المرسِل</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">التوقيت</th>
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
                              <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{typeLabel[m.type] ?? m.type}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${m.direction === "outbound" ? "bg-blue-50 text-blue-600" : "bg-teal-50 text-teal-600"}`}>
                                  {dirLabel[m.direction]}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{m.campaign?.name ?? "—"}</td>
                              <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{m.user?.name ?? m.user?.email ?? "—"}</td>
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

        {/* ══════════════ STORE REPORT ══════════════ */}
        <TabsContent value="store">
          {loadingStore ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-green-400" />
            </div>
          ) : !storeReport ? (
            <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
              <CardContent className="p-12 text-center text-gray-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا يوجد بيانات متجر متاحة</p>
                <p className="text-xs mt-1">تأكد من ربط متجر Shopify أو EasyOrders أولاً</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">

              {/* ── Connected Stores ── */}
              {storeReport.stores.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-2">
                  {storeReport.stores.map((s) => (
                    <div key={s.name}
                      className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm text-sm">
                      <Store className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-gray-700">{s.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        s.source === "shopify"
                          ? "bg-green-50 text-green-600"
                          : "bg-blue-50 text-blue-600"
                      }`}>
                        {s.source === "shopify" ? "Shopify" : "EasyOrders"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        s.isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                      }`}>
                        {s.isActive ? "نشط" : "غير نشط"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── KPIs ── */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 col-span-1">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي الطلبات</p>
                      <p className="text-xl font-bold text-gray-800">
                        {storeReport.summary.totalOrders.toLocaleString("ar-EG")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 col-span-1">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي الإيرادات</p>
                      <p className="text-xl font-bold text-gray-800">
                        {storeReport.summary.totalRevenue.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 col-span-1 border-l-4 border-l-[#25D366]">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-[#25D366]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">إيرادات الحملات</p>
                      <p className="text-xl font-bold text-[#25D366]">
                        {storeReport.summary.totalCampaignRevenue.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 col-span-1">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">نسبة الحملات</p>
                      <p className="text-xl font-bold text-purple-700">
                        {storeReport.summary.campaignRevenueShare}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 col-span-1">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">العملاء الفريدون</p>
                      <p className="text-xl font-bold text-gray-800">
                        {storeReport.summary.totalUniqueCustomers.toLocaleString("ar-EG")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 col-span-1">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <Store className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">المتاجر المربوطة</p>
                      <p className="text-xl font-bold text-gray-800">
                        {storeReport.summary.storesConnected}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── Revenue Attribution — Campaign Bar ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Campaign Revenue Share Visual */}
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#25D366]" />
                      نسبة إيرادات حملات واتساب
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">حملات واتساب</span>
                        <span className="font-bold text-[#25D366]">{storeReport.summary.campaignRevenueShare}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-4 rounded-full bg-gradient-to-r from-[#25D366] to-emerald-400 transition-all duration-700"
                          style={{ width: `${Math.min(storeReport.summary.campaignRevenueShare, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-gray-400">
                        <span>
                          إيرادات الحملات: {storeReport.summary.totalCampaignRevenue.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} EGP
                        </span>
                        <span>
                          إجمالي: {storeReport.summary.totalRevenue.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} EGP
                        </span>
                      </div>
                    </div>

                    {/* Orders by Status */}
                    {storeReport.ordersByStatus.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">الطلبات حسب الحالة</p>
                        {storeReport.ordersByStatus.map((s) => {
                          const total = storeReport.summary.totalOrders || 1;
                          const pct = Math.round((s.count / total) * 100);
                          const colors: Record<string, string> = {
                            pending:   "bg-yellow-400",
                            fulfilled: "bg-green-400",
                            shipped:   "bg-blue-400",
                            cancelled: "bg-red-400",
                          };
                          const labels: Record<string, string> = {
                            pending: "انتظار", fulfilled: "مكتمل",
                            shipped: "تم الشحن", cancelled: "ملغي",
                          };
                          return (
                            <div key={s.status}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-gray-600">{labels[s.status] ?? s.status}</span>
                                <span className="text-gray-500 dark:text-gray-400">{s.count} طلب ({pct}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${colors[s.status] ?? "bg-gray-400"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Daily Revenue Trend Chart */}
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      اتجاه الطلبات والإيرادات اليومي
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {storeReport.dailyTrend.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">لا توجد بيانات في هذه الفترة</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={storeReport.dailyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(val, name) => {
                              const value = typeof val === "number" ? val : Number(val ?? 0);
                              return [
                                name === "revenue"
                                  ? `${value.toLocaleString("ar-EG")} EGP`
                                  : value,
                                name === "revenue" ? "الإيرادات" : "الطلبات",
                              ];
                            }}
                            labelFormatter={(l) => `يوم: ${l}`}
                          />
                          <Line type="monotone" dataKey="orders"  stroke="#3b82f6" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="revenue" stroke="#25D366" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* ── Revenue Attribution per Campaign ── */}
              {storeReport.campaignRevenue.length > 0 && (
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-[#25D366]" />
                      Revenue Attribution — الإيرادات المنسوبة للحملات
                    </CardTitle>
                    <p className="text-xs text-gray-400 mt-0.5">
                      كل حملة واتساب وقيمة الطلبات الناتجة عنها مباشرة
                    </p>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400">
                          <th className="text-right py-2 pr-2">الحملة</th>
                          <th className="text-center py-2">الإيراد المنسوب</th>
                          <th className="text-center py-2">الطلبات</th>
                          <th className="text-center py-2">مرسل</th>
                          <th className="text-center py-2">قُرئ</th>
                          <th className="text-center py-2">معدل التحويل</th>
                          <th className="text-center py-2">الإيراد/رسالة</th>
                          <th className="text-right py-2 pl-2">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storeReport.campaignRevenue.map((c) => {
                          const convRate = c.sentCount > 0
                            ? ((c.ordersCount / c.sentCount) * 100).toFixed(1)
                            : "0";
                          const revPerMsg = c.sentCount > 0
                            ? (c.revenue / c.sentCount).toFixed(1)
                            : "0";
                          return (
                            <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="py-3 pr-2">
                                <div className="font-medium text-gray-800 max-w-[180px] truncate">{c.name}</div>
                              </td>
                              <td className="py-3 text-center">
                                <span className="font-bold text-[#25D366]">
                                  {c.revenue.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} EGP
                                </span>
                              </td>
                              <td className="py-3 text-center">
                                <span className="bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                                  {c.ordersCount}
                                </span>
                              </td>
                              <td className="py-3 text-center text-gray-600">{c.sentCount.toLocaleString("ar-EG")}</td>
                              <td className="py-3 text-center text-gray-600">{c.readCount.toLocaleString("ar-EG")}</td>
                              <td className="py-3 text-center">
                                <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                                  parseFloat(convRate) >= 5 ? "bg-green-50 text-green-600"
                                  : parseFloat(convRate) >= 2 ? "bg-yellow-50 text-yellow-600"
                                  : "bg-gray-100 text-gray-500 dark:text-gray-400"
                                }`}>
                                  {convRate}%
                                </span>
                              </td>
                              <td className="py-3 text-center text-gray-500 dark:text-gray-400 text-xs">{revPerMsg} EGP</td>
                              <td className="py-3 pl-2 text-right text-xs text-gray-400">
                                {c.completedAt
                                  ? new Date(c.completedAt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Revenue Bar Chart */}
                    <div className="mt-6">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">مقارنة إيرادات الحملات</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={storeReport.campaignRevenue.slice(0, 8)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100}
                            tickFormatter={(v) => v.length > 14 ? v.slice(0, 14) + "…" : v} />
                          <Tooltip
                            formatter={(value: any) => {
                              const num = typeof value === "number" ? value : Number(value);
                              return !isNaN(num)
                                ? [`${num.toLocaleString("ar-EG")} EGP`, "الإيراد"]
                                : ["", ""];
                            }}
                          />
                          <Bar dataKey="revenue" fill="#25D366" radius={[0, 4, 4, 0]}>
                            {storeReport.campaignRevenue.slice(0, 8).map((_, i) => (
                              <Cell key={i}
                                fill={i === 0 ? "#25D366" : i === 1 ? "#34d399" : "#6ee7b7"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Top Customers ── */}
              {storeReport.topCustomers.length > 0 && (
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      أفضل العملاء بالإنفاق (في الفترة المحددة)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400">
                          <th className="text-right py-2 pr-2">#</th>
                          <th className="text-right py-2">العميل</th>
                          <th className="text-center py-2">الهاتف</th>
                          <th className="text-center py-2">الطلبات</th>
                          <th className="text-left py-2 pl-2">إجمالي الإنفاق</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storeReport.topCustomers.map((c, i) => (
                          <tr key={c.phone} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 pr-2 text-gray-400 text-xs">{i + 1}</td>
                            <td className="py-3">
                              <div className="font-medium text-gray-800">{c.name ?? "—"}</div>
                            </td>
                            <td className="py-3 text-center text-gray-500 dark:text-gray-400 text-xs font-mono">{c.phone}</td>
                            <td className="py-3 text-center">
                              <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs">
                                {c.ordersCount}
                              </span>
                            </td>
                            <td className="py-3 pl-2 text-left font-bold text-green-600">
                              {c.totalSpent.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} {c.currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

            </div>
          )}
        </TabsContent>

        <TabsContent value="automation">
          <AutomationReportTab />
        </TabsContent>

        <TabsContent value="cost">
          <CostReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}