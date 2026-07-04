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
import { useLanguage } from "@/lib/language-context";
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
interface ConfirmedOrderRow {
  id: string; orderNumber: string | null; externalId: string;
  customerName: string | null; customerPhone: string;
  status: string; total: number; currency: string; orderedAt: string;
}
interface StoreReportData {
  summary: StoreReportSummary; stores: StoreInfoRow[];
  campaignRevenue: CampaignRevenueRow[]; topCustomers: TopCustomerRow[];
  ordersByStatus: OrderStatusRow[]; dailyTrend: DailyTrendRow[];
  confirmedOrders: ConfirmedOrderRow[];
  confirmedOrdersTotal: number;
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

const statusLabels: Record<"ar" | "en", Record<string, string>> = {
  ar: {
    sent: "مرسل", delivered: "وصل", read: "قُرئ", failed: "فشل", pending: "انتظار",
  },
  en: {
    sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed", pending: "Pending",
  },
};

const dirLabels: Record<"ar" | "en", Record<string, string>> = {
  ar: { outbound: "صادر", inbound: "وارد" },
  en: { outbound: "Outbound", inbound: "Inbound" },
};

const typeLabels: Record<"ar" | "en", Record<string, string>> = {
  ar: { text: "نص", image: "صورة", audio: "صوت", document: "مستند", template: "قالب" },
  en: { text: "Text", image: "Image", audio: "Audio", document: "Document", template: "Template" },
};

const pageText: Record<"ar" | "en", Record<string, any>> = {
  ar: {
    pageTitle: "التقارير والإحصائيات",
    pageSubtitle: "نظرة شاملة على أداء عملياتك",
    exportExcel: "Excel",
    print: "طباعة",
    from: "من",
    to: "إلى",
    refresh: "تحديث",
    quickRanges: [
      { label: "7 أيام", days: 7 },
      { label: "30 يوم", days: 30 },
      { label: "90 يوم", days: 90 },
    ],
    tabs: {
      overview: "نظرة عامة",
      customers: "العملاء",
      team: "الفريق",
      logs: "سجل النشاط",
      store: "تقرير المتجر",
      automation: "تقرير الأتمتة",
      cost: "التكلفة والإنفاق",
    },
    kpis: {
      totalSent: "إجمالي المرسل",
      delivered: "تم التوصيل",
      read: "تم القراءة",
      failed: "فشل الإرسال",
      inbound: "رسائل واردة",
      newContacts: "عملاء جدد",
      bestSendTime: "أفضل وقت للإرسال",
      replyRate: "معدل الردود",
      deliveryRate: (value: number) => `نسبة وصول ${value}%`,
      deliveredOf: (value: number) => `${value}% من المرسل`,
      readRate: (value: number) => `${value}% قرأوا`,
      replyRateSub: (value: number) => `معدل رد ${value}%`,
    },
    charts: {
      dailyTitle: "الرسائل يومياً",
      sent: "مرسل",
      received: "وارد",
      bestSendTimeTitle: "أفضل أوقات الإرسال",
      bestCampaignsTitle: "أفضل الحملات أداءً",
      noData: "لا توجد بيانات",
      campaignsLegendSent: "رسائل مرسلة",
      campaignsLegendReceived: "رسائل واردة",
      teamActivity: "نشاط الفريق",
      teamSent: "رسائل مرسلة",
      teamReplied: "ردود",
      campaignRevenueTitle: "نسبة إيرادات حملات واتساب",
      campaignRevenueLabel: "إيرادات الحملات:",
      totalLabel: "إجمالي:",
      ordersByStatusTitle: "الطلبات حسب الحالة",
      dailyTrendTitle: "اتجاه الطلبات والإيرادات اليومي",
      dailyTrendNoData: "لا توجد بيانات في هذه الفترة",
      revenueComparison: "مقارنة إيرادات الحملات",
      topCustomersTitle: "أفضل العملاء بالإنفاق (في الفترة المحددة)",
      confirmedOrdersTitle: "الأوردرات المؤكدة والملغية",
      filterPlaceholder: "الفلتر",
      noOrders: "لا توجد أوردرات في هذه الحالة.",
      totalOrders: "أوردر",
      pageOfLabel: "من",
      totalLabelShort: "إجمالي",
      orders: "أوردر",
      campaignRevenue: "الإيرادات",
      ordersLabel: "الطلبات",
      dayLabel: "يوم",
      dateLabel: "التاريخ",
    },
    customers: {
      segments: {
        engaged: "الأكثر تفاعلاً",
        noResponse: "لم يردوا",
        new: "العملاء الجدد",
        archived: "المحظورين/المؤرشفين",
        followup: "يحتاجون متابعة",
      },
      noResults: "لا توجد نتائج",
      phone: "الهاتف",
      name: "الاسم",
      messages: "الرسائل",
      unread: "غير مقروء",
      lastContact: "آخر تواصل",
      noData: "لا توجد بيانات",
    },
    logs: {
      status: "الحالة",
      type: "نوع الرسالة",
      searchPlaceholder: "بحث بالرقم",
      searchButton: "بحث",
      all: "الكل",
      sent: "مرسل",
      delivered: "وصل",
      read: "قُرئ",
      failed: "فشل",
      text: "نص",
      template: "قالب",
      image: "صورة",
      audio: "صوت",
      noRecords: "لا توجد سجلات",
      phone: "الهاتف",
      customer: "العميل",
      typeHeader: "النوع",
      direction: "الاتجاه",
      campaign: "الحملة",
      sender: "المرسِل",
      time: "التوقيت",
      of: "من",
      pagePrefix: "عرض",
    },
    store: {
      noData: "لا يوجد بيانات متجر متاحة",
      connectHint: "تأكد من ربط متجر Shopify أو EasyOrders أولاً",
      connectedStores: "المتاجر المربوطة",
      totalOrders: "إجمالي الطلبات",
      totalRevenue: "إجمالي الإيرادات",
      campaignRevenue: "إيرادات الحملات",
      campaignShare: "نسبة الحملات",
      uniqueCustomers: "العملاء الفريدون",
      storesConnected: "المتاجر المربوطة",
      whatsappCampaignRevenue: "نسبة إيرادات حملات واتساب",
      whatsappCampaignRevenueHint: "كل حملة واتساب وقيمة الطلبات الناتجة عنها مباشرة",
      campaignRevenueLabel: "إيرادات الحملات:",
      totalLabel: "إجمالي:",
      ordersByStatus: "الطلبات حسب الحالة",
      revenue: "الإيرادات",
      orders: "الطلبات",
      noTrendData: "لا توجد بيانات في هذه الفترة",
      campaignComparison: "مقارنة إيرادات الحملات",
      topCustomersTitle: "أفضل العملاء بالإنفاق (في الفترة المحددة)",
      confirmedOrdersTitle: "الأوردرات المؤكدة والملغية",
      filterPlaceholder: "الفلتر",
      all: "الكل",
      confirmed: "المؤكدة",
      cancelled: "الملغية",
      noOrders: "لا توجد أوردرات في هذه الحالة.",
      orderNumber: "رقم الأوردر",
      customer: "العميل",
      phone: "الهاتف",
      status: "الحالة",
      total: "الإجمالي",
      date: "التاريخ",
      orderTotalLabel: "أوردر",
      active: "نشط",
      inactive: "غير نشط",
      revenueShare: "نسبة الحملات",
    },
  },
  en: {
    pageTitle: "Reports & Analytics",
    pageSubtitle: "A comprehensive view of your performance.",
    exportExcel: "Excel",
    print: "Print",
    from: "From",
    to: "To",
    refresh: "Refresh",
    quickRanges: [
      { label: "7 days", days: 7 },
      { label: "30 days", days: 30 },
      { label: "90 days", days: 90 },
    ],
    tabs: {
      overview: "Overview",
      customers: "Customers",
      team: "Team",
      logs: "Activity Log",
      store: "Store Report",
      automation: "Automation Report",
      cost: "Cost & Spend",
    },
    kpis: {
      totalSent: "Total Sent",
      delivered: "Delivered",
      read: "Read",
      failed: "Failed",
      inbound: "Inbound Messages",
      newContacts: "New Contacts",
      bestSendTime: "Best Send Time",
      replyRate: "Reply Rate",
      deliveryRate: (value: number) => `Delivery rate ${value}%`,
      deliveredOf: (value: number) => `${value}% of sent`,
      readRate: (value: number) => `${value}% read`,
      replyRateSub: (value: number) => `Reply rate ${value}%`,
    },
    charts: {
      dailyTitle: "Messages per day",
      sent: "Sent",
      received: "Received",
      bestSendTimeTitle: "Best send times",
      bestCampaignsTitle: "Top performing campaigns",
      noData: "No data",
      campaignsLegendSent: "Sent messages",
      campaignsLegendReceived: "Inbound messages",
      teamActivity: "Team activity",
      teamSent: "Sent",
      teamReplied: "Replied",
      campaignRevenueTitle: "WhatsApp campaign revenue share",
      campaignRevenueLabel: "Campaign revenue:",
      totalLabel: "Total:",
      ordersByStatusTitle: "Orders by status",
      dailyTrendTitle: "Daily orders and revenue trend",
      dailyTrendNoData: "No data for this period",
      revenueComparison: "Campaign revenue comparison",
      topCustomersTitle: "Top spending customers (selected period)",
      confirmedOrdersTitle: "Confirmed and cancelled orders",
      filterPlaceholder: "Filter",
      noOrders: "No orders in this state.",
      totalOrders: "orders",
      pageOfLabel: "of",
      totalLabelShort: "Total",
      orders: "orders",
      campaignRevenue: "Revenue",
      ordersLabel: "Orders",
      dayLabel: "Day",
      dateLabel: "Date",
    },
    customers: {
      segments: {
        engaged: "Most engaged",
        noResponse: "No reply",
        new: "New customers",
        archived: "Archived/banned",
        followup: "Needs follow-up",
      },
      noResults: "No results",
      phone: "Phone",
      name: "Name",
      messages: "Messages",
      unread: "Unread",
      lastContact: "Last contact",
      noData: "No data",
    },
    logs: {
      status: "Status",
      type: "Type",
      searchPlaceholder: "Search by number",
      searchButton: "Search",
      all: "All",
      sent: "Sent",
      delivered: "Delivered",
      read: "Read",
      failed: "Failed",
      text: "Text",
      template: "Template",
      image: "Image",
      audio: "Audio",
      noRecords: "No logs found",
      phone: "Phone",
      customer: "Customer",
      typeHeader: "Type",
      direction: "Direction",
      campaign: "Campaign",
      sender: "Sender",
      time: "Time",
      of: "of",
      pagePrefix: "Showing",
    },
    store: {
      noData: "No store data available",
      connectHint: "Connect a Shopify or EasyOrders store first",
      connectedStores: "Connected stores",
      totalOrders: "Total orders",
      totalRevenue: "Total revenue",
      campaignRevenue: "Campaign revenue",
      campaignShare: "Campaign share",
      uniqueCustomers: "Unique customers",
      storesConnected: "Stores connected",
      whatsappCampaignRevenue: "WhatsApp campaign revenue share",
      whatsappCampaignRevenueHint: "Each WhatsApp campaign and the order value attributed directly to it",
      campaignRevenueLabel: "Campaign revenue:",
      totalLabel: "Total:",
      ordersByStatus: "Orders by status",
      revenue: "Revenue",
      orders: "Orders",
      noTrendData: "No data for this period",
      campaignComparison: "Campaign revenue comparison",
      topCustomersTitle: "Top spending customers (selected period)",
      confirmedOrdersTitle: "Confirmed and cancelled orders",
      filterPlaceholder: "Filter",
      all: "All",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
      noOrders: "No orders in this state.",
      orderNumber: "Order #",
      customer: "Customer",
      phone: "Phone",
      status: "Status",
      total: "Total",
      date: "Date",
      orderTotalLabel: "orders",
      active: "Active",
      inactive: "Inactive",
      revenueShare: "Campaign share",
    },
  },
};

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`
);

function formatNumber(value: number | string | null | undefined, locale: string, options?: Intl.NumberFormatOptions) {
  if (value == null || value === "") return "—";
  return Number(value).toLocaleString(locale, options);
}

function formatDate(value: string | null | undefined, locale: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  return new Date(value).toLocaleString(locale, options);
}

function getStatusLabel(locale: "ar" | "en", status: string) {
  return statusLabels[locale][status] ?? status;
}

function getDirLabel(locale: "ar" | "en", direction: string) {
  return dirLabels[locale][direction] ?? direction;
}

function getTypeLabel(locale: "ar" | "en", type: string) {
  return typeLabels[locale][type] ?? type;
}

function StatCard({
  label, value, sub, icon, color, locale,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; locale: "ar" | "en";
}) {
  return (
    <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {typeof value === "number" ? formatNumber(value, locale) : value}
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
async function exportExcel(data: object[], filename: string, sheetName = "Report") {
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet(sheetName);

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
  const { locale } = useLanguage();
  const numberLocale = locale === "ar" ? "ar-EG" : "en-US";
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

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
  const [ordersPage, setOrdersPage]   = useState(1);
  const [orderFilter, setOrderFilter] = useState("all");

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
      const params = new URLSearchParams({
        from, to,
        ordersPage: String(ordersPage),
        orderFilter: orderFilter
      });
      const r = await fetch(`/api/reports/store?${params}`);
      if (r.ok) setStoreReport(await r.json());
    } finally { setLS(false); }
  }, [from, to, ordersPage, orderFilter]);

  // Initial load per tab
  useEffect(() => {
    if (tab === "overview")  fetchOverview();
    if (tab === "customers") fetchCustomers();
    if (tab === "team")      fetchTeam();
    if (tab === "logs")      fetchLogs(1);
    if (tab === "store")     fetchStoreReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ordersPage, orderFilter]);

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
              else if (tab === "logs" && logs)
                exportExcel(logs.messages.map((m) => ({
                  الهاتف:    m.contact?.phone,
                  العميل:    m.contact?.name ?? "—",
                  الحالة:    getStatusLabel(locale, m.status),
                  النوع:     getTypeLabel(locale, m.type),
                  الاتجاه:   getDirLabel(locale, m.direction),
                  الحملة:    m.campaign?.name ?? "—",
                  المستخدم:  m.user?.name ?? m.user?.email ?? "—",
                  التاريخ:   formatDate(m.createdAt, dateLocale),
                })), locale === "ar" ? "سجل-النشاط" : "activity-log");
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
              if (tab === "overview")  fetchOverview();
              if (tab === "customers") fetchCustomers();
              if (tab === "logs")      fetchLogs(1);
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> {pageText[locale].refresh}
          </Button>
          {/* Quick ranges */}
          {pageText[locale].quickRanges.map((r: {label: string; days: number}) => (
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
            { value: "overview",   label: pageText[locale].tabs.overview,    icon: <BarChart3 className="w-4 h-4" />,    minPlan: "free"       },
            // starter+
            { value: "customers",  label: pageText[locale].tabs.customers,       icon: <Users className="w-4 h-4" />,        minPlan: "starter"    },
            { value: "team",       label: pageText[locale].tabs.team,        icon: <Shield className="w-4 h-4" />,       minPlan: "starter"    },
            // pro+
            { value: "logs",       label: pageText[locale].tabs.logs,   icon: <Activity className="w-4 h-4" />,     minPlan: "pro"        },
            { value: "store",      label: pageText[locale].tabs.store,  icon: <ShoppingBag className="w-4 h-4" />,  minPlan: "pro"        },
            { value: "automation", label: pageText[locale].tabs.automation, icon: <Bot className="w-4 h-4" />,          minPlan: "pro"        },
            { value: "cost",       label: pageText[locale].tabs.cost, icon: <DollarSign className="w-4 h-4" />, minPlan: "starter"    },
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
                <StatCard label={locale === "ar" ? "إجمالي المرسل" : "Total Sent"}   value={overview.totals.sent}         sub={locale === "ar" ? `نسبة وصول ${overview.totals.deliveryRate}%` : `Delivery rate ${overview.totals.deliveryRate}%`} icon={<Send className="w-5 h-5 text-blue-600" />}   color="bg-blue-50" locale={locale} />
                <StatCard label={locale === "ar" ? "تم التوصيل" : "Delivered"}       value={overview.totals.delivered}    sub={locale === "ar" ? `${overview.totals.deliveryRate}% من المرسل` : `${overview.totals.deliveryRate}% of sent`}   icon={<CheckCircle className="w-5 h-5 text-green-600" />} color="bg-green-50" locale={locale} />
                <StatCard label={locale === "ar" ? "تم القراءة" : "Read"}       value={overview.totals.read}         sub={locale === "ar" ? `${overview.totals.readRate}% قرأوا` : `${overview.totals.readRate}% read`}            icon={<Eye className="w-5 h-5 text-purple-600" />}  color="bg-purple-50" locale={locale} />
                <StatCard label={locale === "ar" ? "فشل الإرسال" : "Failed"}      value={overview.totals.failed}       icon={<XCircle className="w-5 h-5 text-red-500" />}   color="bg-red-50" locale={locale} />
                <StatCard label={locale === "ar" ? "رسائل واردة" : "Inbound Messages"}      value={overview.totals.inbound}      sub={locale === "ar" ? `معدل رد ${overview.totals.replyRate}%` : `Reply rate ${overview.totals.replyRate}%`}          icon={<MessageSquare className="w-5 h-5 text-teal-600" />} color="bg-teal-50" locale={locale} />
                <StatCard label={locale === "ar" ? "عملاء جدد" : "New Contacts"}        value={overview.totals.uniqueContacts} icon={<Users className="w-5 h-5 text-orange-500" />} color="bg-orange-50" locale={locale} />
                <StatCard label={locale === "ar" ? "أفضل وقت للإرسال" : "Best Send Time"} value={maxHour.hour}                sub={locale === "ar" ? `${maxHour.cnt} رسالة` : `${maxHour.cnt} messages`}                          icon={<Clock className="w-5 h-5 text-indigo-600" />}  color="bg-indigo-50" locale={locale} />
                <StatCard label={locale === "ar" ? "معدل الردود" : "Reply Rate"}      value={`${overview.totals.replyRate}%`} icon={<TrendingUp className="w-5 h-5 text-cyan-600" />} color="bg-cyan-50" locale={locale} />
              </div>

              {/* Daily chart */}
              <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{pageText[locale].charts.dailyTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={overview.daily}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }}
                        tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          value,
                          name === "sent" ? pageText[locale].charts.sent : pageText[locale].charts.received,
                        ]}
                        labelFormatter={(l) => `${pageText[locale].charts.dayLabel} ${l}`}
                      />
                      <Line type="monotone" dataKey="sent"     stroke="#22c55e" strokeWidth={2} dot={false} name="sent" />
                      <Line type="monotone" dataKey="received" stroke="#3b82f6" strokeWidth={2} dot={false} name="received" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex gap-6 justify-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-500 inline-block" /> {pageText[locale].charts.campaignsLegendSent}</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> {pageText[locale].charts.campaignsLegendReceived}</span>
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
                { value: "engaged",    label: pageText[locale].customers.segments.engaged,     icon: <TrendingUp className="w-4 h-4" /> },
                { value: "no-response",label: pageText[locale].customers.segments.noResponse,            icon: <AlertCircle className="w-4 h-4" /> },
                { value: "new",        label: pageText[locale].customers.segments.new,       icon: <UserCheck className="w-4 h-4" /> },
                { value: "archived",   label: pageText[locale].customers.segments.archived, icon: <Archive className="w-4 h-4" /> },
                { value: "followup",   label: pageText[locale].customers.segments.followup,      icon: <RefreshCw className="w-4 h-4" /> },
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
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-green-400" /></div>
          ) : team.length === 0 ? (
            <div className="text-center py-20">
              <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{locale === "ar" ? "لا يوجد أعضاء فريق حتى الآن" : "No team members yet"}</p>
            </div>
          ) : (
            <div className="space-y-5">
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
                      <Bar dataKey="sent"    fill="#22c55e" radius={[0, 3, 3, 0]} name="sent"    />
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
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                m.role === "OWNER"       ? "bg-purple-100 text-purple-700" :
                                m.role === "FULL_ACCESS" ? "bg-blue-100 text-blue-700"    :
                                                           "bg-gray-100 text-gray-600"
                              }`}>
                                {m.role === "OWNER" ? (locale === "ar" ? "مالك" : "Owner") : m.role === "FULL_ACCESS" ? (locale === "ar" ? "وصول كامل" : "Full Access") : (locale === "ar" ? "دردشة فقط" : "Chat Only")}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700 font-medium">{formatNumber(m.sent, numberLocale)}</td>
                            <td className="py-3 px-4 text-gray-700">{formatNumber(m.replied, numberLocale)}</td>
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
                  <Label className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].logs.status}</Label>
                  <Select value={logStatus} onValueChange={setLogStatus}>
                    <SelectTrigger className="w-32 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{pageText[locale].logs.all}</SelectItem>
                      <SelectItem value="sent">{pageText[locale].logs.sent}</SelectItem>
                      <SelectItem value="delivered">{pageText[locale].logs.delivered}</SelectItem>
                      <SelectItem value="read">{pageText[locale].logs.read}</SelectItem>
                      <SelectItem value="failed">{pageText[locale].logs.failed}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].logs.type}</Label>
                  <Select value={logType} onValueChange={setLogType}>
                    <SelectTrigger className="w-32 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{pageText[locale].logs.all}</SelectItem>
                      <SelectItem value="text">{pageText[locale].logs.text}</SelectItem>
                      <SelectItem value="template">{pageText[locale].logs.template}</SelectItem>
                      <SelectItem value="image">{pageText[locale].logs.image}</SelectItem>
                      <SelectItem value="audio">{pageText[locale].logs.audio}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].logs.searchPlaceholder}</Label>
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
                  <RefreshCw className="w-3.5 h-3.5" /> {pageText[locale].logs.searchButton}
                </Button>
              </CardContent>
            </Card>

            {/* Logs table */}
            <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
              <CardContent className="p-0">
                {loadingLogs ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-green-400" /></div>
                ) : !logs || logs.messages.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-sm">{pageText[locale].logs.noRecords}</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="border-b border-gray-100 bg-gray-50/50">
                          <tr>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].logs.phone}</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].logs.customer}</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].logs.status}</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].logs.typeHeader}</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].logs.direction}</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].logs.campaign}</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].logs.sender}</th>
                            <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{pageText[locale].logs.time}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.messages.map((m) => (
                            <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                              <td className="py-2.5 px-3 font-mono text-gray-600">{m.contact?.phone ?? "—"}</td>
                              <td className="py-2.5 px-3 text-gray-600">{m.contact?.name ?? "—"}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[m.status] ?? "bg-gray-100 text-gray-600"}`}>
                                  {getStatusLabel(locale, m.status)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{getTypeLabel(locale, m.type)}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${m.direction === "outbound" ? "bg-blue-50 text-blue-600" : "bg-teal-50 text-teal-600"}`}>
                                  {getDirLabel(locale, m.direction)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{m.campaign?.name ?? "—"}</td>
                              <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{m.user?.name ?? m.user?.email ?? "—"}</td>
                              <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                                {formatDate(m.createdAt, dateLocale, {
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
                        {formatNumber((logs.page - 1) * logs.limit + 1, numberLocale)} –{" "}
                        {formatNumber(Math.min(logs.page * logs.limit, logs.total), numberLocale)} {locale === "ar" ? "من" : "of"} {formatNumber(logs.total, numberLocale)}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm" variant="outline" className="h-7 w-7 p-0"
                          disabled={logs.page <= 1}
                          onClick={() => { setLogPage(p => p - 1); fetchLogs(logPage - 1); }}
                        >
                          {locale === "ar" ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          size="sm" variant="outline" className="h-7 w-7 p-0"
                          disabled={logs.page * logs.limit >= logs.total}
                          onClick={() => { setLogPage(p => p + 1); fetchLogs(logPage + 1); }}
                        >
                          {locale === "ar" ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
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
                <p className="text-sm">{pageText[locale].store.noData}</p>
                <p className="text-xs mt-1">{pageText[locale].store.connectHint}</p>
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
                        {s.isActive ? pageText[locale].store.active : pageText[locale].store.inactive}
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
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].store.totalOrders}</p>
                      <p className="text-xl font-bold text-gray-800">
                        {formatNumber(storeReport.summary.totalOrders, numberLocale)}
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
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].store.totalRevenue}</p>
                      <p className="text-xl font-bold text-gray-800">
                        {formatNumber(storeReport.summary.totalRevenue, numberLocale, { maximumFractionDigits: 0 })}
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
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].store.campaignRevenue}</p>
                      <p className="text-xl font-bold text-[#25D366]">
                        {formatNumber(storeReport.summary.totalCampaignRevenue, numberLocale, { maximumFractionDigits: 0 })}
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
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].store.campaignShare}</p>
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
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].store.uniqueCustomers}</p>
                      <p className="text-xl font-bold text-gray-800">
                        {formatNumber(storeReport.summary.totalUniqueCustomers, numberLocale)}
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
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].store.storesConnected}</p>
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
                      {pageText[locale].store.whatsappCampaignRevenue}
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
                          {locale === "ar" ? "إيرادات الحملات:" : "Campaign revenue:"} {formatNumber(storeReport.summary.totalCampaignRevenue, numberLocale, { maximumFractionDigits: 0 })} EGP
                        </span>
                        <span>
                          {locale === "ar" ? "إجمالي:" : "Total:"} {formatNumber(storeReport.summary.totalRevenue, numberLocale, { maximumFractionDigits: 0 })} EGP
                        </span>
                      </div>
                    </div>

                    {/* Orders by Status */}
                    {storeReport.ordersByStatus.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">{pageText[locale].store.ordersByStatus}</p>
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
                                <span className="text-gray-500 dark:text-gray-400">{s.count} {pageText[locale].charts.orders} ({pct}%)</span>
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
                      <p className="text-sm text-gray-400 text-center py-8">{pageText[locale].charts.dailyTrendNoData}</p>
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
                                  ? `${formatNumber(value, numberLocale)} EGP`
                                  : value,
                                name === "revenue" ? pageText[locale].store.revenue : pageText[locale].store.orders,
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
                          <th className="text-right py-2 pr-2">{pageText[locale].logs.campaign}</th>
                          <th className="text-center py-2">{locale === "ar" ? "الإيراد المنسوب" : "Attributed Revenue"}</th>
                          <th className="text-center py-2">{pageText[locale].charts.orders}</th>
                          <th className="text-center py-2">{pageText[locale].logs.sent}</th>
                          <th className="text-center py-2">{pageText[locale].logs.read}</th>
                          <th className="text-center py-2">{locale === "ar" ? "معدل التحويل" : "Conversion Rate"}</th>
                          <th className="text-center py-2">{locale === "ar" ? "الإيراد/رسالة" : "Rev/Message"}</th>
                          <th className="text-right py-2 pl-2">{pageText[locale].store.date}</th>
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
                                  {formatNumber(c.revenue, numberLocale, { maximumFractionDigits: 0 })} EGP
                                </span>
                              </td>
                              <td className="py-3 text-center">
                                <span className="bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                                  {c.ordersCount}
                                </span>
                              </td>
                              <td className="py-3 text-center text-gray-600">{formatNumber(c.sentCount, numberLocale)}</td>
                              <td className="py-3 text-center text-gray-600">{formatNumber(c.readCount, numberLocale)}</td>
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
                                  ? formatDate(c.completedAt, dateLocale, { day: "numeric", month: "short" })
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Revenue Bar Chart */}
                    <div className="mt-6">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">{pageText[locale].charts.revenueComparison}</p>
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
                                ? [`${formatNumber(num, numberLocale)} EGP`, locale === "ar" ? "الإيراد" : "Revenue"]
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
                      {pageText[locale].charts.topCustomersTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                          <th className="text-right py-2 pr-2">#</th>
                          <th className="text-right py-2">{pageText[locale].store.customer}</th>
                          <th className="text-center py-2">{pageText[locale].store.phone}</th>
                          <th className="text-center py-2">{pageText[locale].charts.orders}</th>
                          <th className="text-left py-2 pl-2">{locale === "ar" ? "إجمالي الإنفاق" : "Total Spent"}</th>
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
                              {formatNumber(c.totalSpent, numberLocale, { maximumFractionDigits: 0 })} {c.currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* ── Confirmed/Cancelled Orders ── */}
              {storeReport.confirmedOrders && (
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 mt-6">
                  <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {pageText[locale].charts.confirmedOrdersTitle}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Select value={orderFilter} onValueChange={(val) => { setOrderFilter(val); setOrdersPage(1); }}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue placeholder={pageText[locale].charts.filterPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{pageText[locale].store.all}</SelectItem>
                          <SelectItem value="confirmed">{pageText[locale].store.confirmed}</SelectItem>
                          <SelectItem value="cancelled">{pageText[locale].store.cancelled}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    {storeReport.confirmedOrders.length === 0 ? (
                      <div className="text-center text-gray-500 py-8 text-sm">
                        {pageText[locale].store.noOrders}
                      </div>
                    ) : (
                      <>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700 text-xs text-gray-400 bg-gray-50/50 dark:bg-gray-800/50">
                              <th className="text-right py-3 px-4 font-medium">{pageText[locale].store.orderNumber}</th>
                              <th className="text-right py-3 px-4 font-medium">{pageText[locale].store.customer}</th>
                              <th className="text-center py-3 px-4 font-medium">{pageText[locale].store.phone}</th>
                              <th className="text-center py-3 px-4 font-medium">{pageText[locale].store.status}</th>
                              <th className="text-left py-3 px-4 font-medium">{pageText[locale].store.total}</th>
                              <th className="text-left py-3 px-4 font-medium">{pageText[locale].store.date}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {storeReport.confirmedOrders.map((o) => (
                              <tr key={o.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800 transition-colors">
                                <td className="py-3 px-4 text-gray-600 font-mono text-xs">{o.orderNumber || o.externalId}</td>
                                <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{o.customerName || "—"}</td>
                                <td className="py-3 px-4 text-center text-gray-500 dark:text-gray-400 text-xs font-mono" dir="ltr">{o.customerPhone}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    o.status === "confirmed" ? "bg-green-100 text-green-700" :
                                    o.status === "cancelled" ? "bg-red-100 text-red-700" :
                                    "bg-gray-100 text-gray-600"
                                  }`}>
                                    {o.status === "confirmed" ? (locale === "ar" ? "مؤكد" : "Confirmed") : o.status === "cancelled" ? (locale === "ar" ? "ملغى" : "Cancelled") : o.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-left font-bold text-green-600 text-xs">
                                  {formatNumber(o.total, numberLocale, { maximumFractionDigits: 0 })} {o.currency}
                                </td>
                                <td className="py-3 px-4 text-left text-gray-400 text-xs" dir="ltr">
                                  {formatDate(o.orderedAt, dateLocale, { dateStyle: "short", timeStyle: "short" })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {/* Pagination */}
                        <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500">
                          <div>
                            {locale === "ar" ? "إجمالي:" : "Total:"} <span className="font-medium text-gray-800 dark:text-gray-200">{formatNumber(storeReport.confirmedOrdersTotal, numberLocale)}</span> {locale === "ar" ? "أوردر" : "orders"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline" size="sm" className="h-7 px-2"
                              disabled={ordersPage <= 1}
                              onClick={() => setOrdersPage(p => p - 1)}
                            >
                              {locale === "ar" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            </Button>
                            <span className="font-mono">{ordersPage}</span>
                            <Button
                              variant="outline" size="sm" className="h-7 px-2"
                              disabled={ordersPage * 50 >= storeReport.confirmedOrdersTotal}
                              onClick={() => setOrdersPage(p => p + 1)}
                            >
                              {locale === "ar" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
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