"use client";

// أنواع وثوابت ودوال مساعدة مشتركة بين كل تابات التقارير — نُقلت من reports/page.tsx

import ExcelJS from "exceljs";
import { Card, CardContent } from "@/components/ui/card";

export interface Overview {
  totals: {
    sent: number; delivered: number; read: number; failed: number;
    inbound: number; uniqueContacts: number;
    deliveryRate: number; readRate: number; replyRate: number;
  };
  daily: { day: string; sent: number; delivered: number; received: number }[];
  hourly: { hour: number; cnt: number }[];
  bestCampaigns: { name: string; sentCount: number; deliveredCount: number; readCount: number; failedCount: number; rate: number }[];
}

export interface CustomerRow {
  id: string; phone: string; name: string | null;
  lastMessageAt: string | null; totalMessages?: number;
  unreadCount?: number; createdAt?: string;
}

export interface TeamRow {
  id: string; name: string; role: string; sent: number; replied: number;
}

export interface LogRow {
  id: string; content: string | null; type: string; status: string;
  direction: string; createdAt: string;
  contact: { phone: string; name: string | null } | null;
  campaign: { name: string } | null;
  user: { name: string | null; email: string } | null;
}

export interface LogsData { total: number; page: number; limit: number; messages: LogRow[] }

// ─── Store Report Types ───────────────────────────────────────────────────────
export interface StoreReportSummary {
  totalOrders: number; totalRevenue: number;
  totalCampaignRevenue: number; campaignRevenueShare: number;
  totalUniqueCustomers: number; storesConnected: number;
}
export interface CampaignRevenueRow {
  id: string; name: string; revenue: number; ordersCount: number;
  sentCount: number; readCount: number; completedAt: string | null; createdAt: string;
}
export interface TopCustomerRow {
  phone: string; name: string | null; ordersCount: number; totalSpent: number; currency: string;
}
export interface OrderStatusRow { status: string; count: number; revenue: number; }
export interface DailyTrendRow { day: string; orders: number; revenue: number; }
export interface StoreInfoRow { source: string; name: string; connectedAt: string | null; isActive: boolean; }
export interface ConfirmedOrderRow {
  id: string; orderNumber: string | null; externalId: string;
  customerName: string | null; customerPhone: string;
  status: string; total: number; currency: string; orderedAt: string;
}
export interface StoreReportData {
  summary: StoreReportSummary; stores: StoreInfoRow[];
  campaignRevenue: CampaignRevenueRow[]; topCustomers: TopCustomerRow[];
  ordersByStatus: OrderStatusRow[]; dailyTrend: DailyTrendRow[];
  confirmedOrders: ConfirmedOrderRow[];
  confirmedOrdersTotal: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const TODAY = new Date().toISOString().slice(0, 10);
export const MONTH_AGO = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

export const statusColor: Record<string, string> = {
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  read: "bg-purple-100 text-purple-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-gray-100 text-gray-600",
};

export const statusLabels: Record<"ar" | "en", Record<string, string>> = {
  ar: {
    sent: "مرسل", delivered: "وصل", read: "قُرئ", failed: "فشل", pending: "انتظار",
  },
  en: {
    sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed", pending: "Pending",
  },
};

export const dirLabels: Record<"ar" | "en", Record<string, string>> = {
  ar: { outbound: "صادر", inbound: "وارد" },
  en: { outbound: "Outbound", inbound: "Inbound" },
};

export const typeLabels: Record<"ar" | "en", Record<string, string>> = {
  ar: { text: "نص", image: "صورة", audio: "صوت", document: "مستند", template: "قالب" },
  en: { text: "Text", image: "Image", audio: "Audio", document: "Document", template: "Template" },
};

export const pageText: Record<"ar" | "en", Record<string, any>> = {
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
      delivered: "تم التوصيل",
      received: "وارد",
      bestSendTimeTitle: "أفضل أوقات الإرسال",
      bestCampaignsTitle: "أفضل الحملات أداءً",
      noData: "لا توجد بيانات",
      notEnoughDailyData: "لسه مفيش بيانات كفاية لرسم اتجاه — هيبان الخط أوضح بعد يوم تاني من النشاط.",
      campaignsLegendSent: "رسائل مرسلة",
      campaignsLegendDelivered: "تم التوصيل",
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
      delivered: "Delivered",
      received: "Received",
      bestSendTimeTitle: "Best send times",
      bestCampaignsTitle: "Top performing campaigns",
      noData: "No data",
      notEnoughDailyData: "Not enough data yet to draw a trend — the line will show clearly after another day of activity.",
      campaignsLegendSent: "Sent messages",
      campaignsLegendDelivered: "Delivered messages",
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

export const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`
);

export function formatNumber(value: number | string | null | undefined, locale: string, options?: Intl.NumberFormatOptions) {
  if (value == null || value === "") return "—";
  return Number(value).toLocaleString(locale, options);
}

export function formatDate(value: string | null | undefined, locale: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  return new Date(value).toLocaleString(locale, options);
}

export function getStatusLabel(locale: "ar" | "en", status: string) {
  return statusLabels[locale][status] ?? status;
}

export function getDirLabel(locale: "ar" | "en", direction: string) {
  return dirLabels[locale][direction] ?? direction;
}

export function getTypeLabel(locale: "ar" | "en", type: string) {
  return typeLabels[locale][type] ?? type;
}

export function StatCard({
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
export async function exportExcel(data: object[], filename: string, sheetName = "Report") {
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

export function printPage() {
  window.print();
}