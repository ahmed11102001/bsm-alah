"use client";

// src/components/dashboard/Store.tsx
// ─── صفحة المتجر — عملاء + أتمتات + إيرادات الحملات ─────────────────────────

import { useEffect, useState, useCallback } from "react";
import {
  ShoppingBag, Zap, Globe, Users, Package, TrendingUp, RefreshCw,
  MessageSquare, ChevronDown, ChevronUp, Search, Loader2,
  ToggleLeft, ToggleRight, CheckCircle, ChevronRight, Phone,
  Send, X, CheckSquare, Square, AlertCircle,
  Copy, Download, Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn }   from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
type StoreAutomationType = "order_confirm" | "order_shipped" | "promo";
type Lang = "ar" | "en";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreInfo {
  id:              string;
  storeName:       string;
  source:          "shopify" | "easyorders" | "woocommerce";
  totalOrders:     number;
  totalCustomers:  number;
  campaignRevenue: number;
  connectedAt:     string;
  isActive?:       boolean;
  lastSyncAt?:     string | null;
  totalSynced?:    number;
}

interface CustomerLastOrder {
  orderNumber: string | null;
  total:       number | null;
  status:      string | null;
  orderedAt:   string;
}

interface Customer {
  phone:       string;
  name:        string;
  ordersCount: number;
  totalSpent:  number;
  currency:    string;
  lastOrder:   CustomerLastOrder | null;
}

interface AutomationTemplate {
  id:   string;
  name: string;
}

interface AutomationItem {
  id:         string | null;
  type:       StoreAutomationType;
  isEnabled:  boolean;
  templateId: string | null;
  template:   AutomationTemplate | null;
  sentCount:  number;
}

interface StoreData {
  shopify:     StoreInfo | null;
  easyorders:  StoreInfo | null;
  woocommerce: StoreInfo | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const AUTO_LABELS: Record<StoreAutomationType, { label: string; desc: string; icon: string }> = {
  order_confirm: {
    label: "تأكيد الأوردر",
    desc:  "بيبعت للعميل فور إنشاء الطلب",
    icon:  "✅",
  },
  order_shipped: {
    label: "تحديث الشحن",
    desc:  "بيبعت لما يتشحن الطلب",
    icon:  "🚚",
  },
  promo: {
    label: "عروض وخصومات",
    desc:  "ترسله يدوياً لعملاء المتجر",
    icon:  "🎁",
  },
};

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  fulfilled: "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400",
  shipped:   "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400",
  cancelled: "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
};

const TX = {
  openChat: { ar: "فتح المحادثة", en: "Open Chat" },
  ordersCount: { ar: "طلب", en: "orders" },
  totalOrders: { ar: "إجمالي الطلبات", en: "Total Orders" },
  totalCustomers: { ar: "إجمالي العملاء", en: "Total Customers" },
  campaignRevenue: { ar: "إيرادات الحملات", en: "Campaign Revenue" },
  revenueSub: { ar: "من رسائل واتساب", en: "From WhatsApp messages" },
  lastSync: { ar: "آخر مزامنة", en: "Last Sync" },
  savedOrders: { ar: "طلب محفوظ", en: "saved orders" },
  automationsTitle: { ar: "⚙️ أتمتات المتجر", en: "⚙️ Store Automations" },
  enabled: { ar: "مفعّل", en: "enabled" },
  customersTitle: { ar: "👥 العملاء", en: "👥 Customers" },
  searchPh: { ar: "اسم أو رقم أو طلب...", en: "Name, number, or order..." },
  noCustomers: { ar: "لا يوجد عملاء مطابقون", en: "No matching customers" },
  loadMore: { ar: "تحميل المزيد", en: "Load more" },
  listTitle: { ar: "قائمة", en: "List" },
  syncedContacts: { ar: "جهة اتصال مزامَنة من المتجر", en: "contacts synced from store" },
  goContacts: { ar: "عرض القائمة", en: "View list" },
  goContactsToast: { ar: "اذهب إلى صفحة جهات الاتصال", en: "Go to Contacts page" },
  manualSync: { ar: "مزامنة يدوية", en: "Manual Sync" },
  manualSyncSub: { ar: "سحب آخر 100 طلب من إيزي أوردرز", en: "Pull latest 100 orders from EasyOrders" },
  syncing: { ar: "جاري المزامنة...", en: "Syncing..." },
  syncNow: { ar: "مزامنة الآن", en: "Sync now" },
  webhookTitle: { ar: "الطلبات تصل تلقائياً عبر Webhook", en: "Orders arrive automatically via Webhook" },
  webhookSub: { ar: "كل أوردر جديد في WooCommerce بيوصل فوراً", en: "Every new WooCommerce order arrives instantly" },
  active: { ar: "نشط", en: "Active" },
  webhookHint: { ar: "لو محتاج تضيف الـ Webhook من جديد، روح صفحة API وانسخ الرابط من قسم WooCommerce.", en: "If you need to add the webhook again, go to API page and copy the WooCommerce URL." },
  storeLoadErr: { ar: "تعذر تحميل بيانات المتجر", en: "Failed to load store data" },
  noStore: { ar: "لم يتم ربط أي متجر بعد", en: "No store connected yet" },
  noStoreSub: { ar: "اذهب إلى صفحة API لربط متجر Shopify أو EasyOrders أو WooCommerce", en: "Go to API page to connect Shopify, EasyOrders, or WooCommerce" },
  connected: { ar: "متصل", en: "Connected" },
  storeFallback: { ar: "المتجر", en: "Store" },
};
const tr = (k: keyof typeof TX, lang: Lang) => TX[k][lang];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(p: string): string {
  const clean = p.replace(/\D/g, "");
  return clean.startsWith("0") ? `+2${clean}` : `+${clean}`;
}

function formatMoney(value: number, lang: Lang, currency = "EGP"): string {
  if (isNaN(value)) return "—";
  return value.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
    style:              "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon:  React.ReactNode;
  label: string;
  value: string | number;
  sub?:  string;
  color: string;
}

function KpiCard({ icon, label, value, sub, color }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm flex items-start gap-4">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-800 dark:text-white leading-none">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Copy Phones Button ───────────────────────────────────────────────────────

function CopyPhonesButton({ customers, lang }: { customers: Customer[]; lang: Lang }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (customers.length === 0) {
      toast.error(lang === "ar" ? "لا يوجد عملاء للنسخ" : "No customers to copy");
      return;
    }
    const text = customers.map((c) => c.phone).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success(
        lang === "ar"
          ? `✅ تم نسخ ${customers.length} رقم`
          : `✅ Copied ${customers.length} numbers`
      );
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error(lang === "ar" ? "تعذّر النسخ" : "Copy failed");
    });
  }

  return (
    <button
      onClick={handleCopy}
      title={lang === "ar" ? "نسخ أرقام العملاء" : "Copy customer phones"}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
        copied
          ? "border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366]"
          : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-[#25D366]/30 hover:text-[#25D366]"
      )}
    >
      {copied
        ? <Check className="w-3.5 h-3.5" />
        : <Copy  className="w-3.5 h-3.5" />}
      {lang === "ar" ? "نسخ الأرقام" : "Copy numbers"}
    </button>
  );
}

// ─── Export Excel Button ──────────────────────────────────────────────────────

function ExportExcelButton({
  source, search, lang,
}: { source: string; search: string; lang: Lang }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/store/export?source=${source}&search=${encodeURIComponent(search)}`
      );
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error((d as any).error ?? (lang === "ar" ? "فشل التصدير" : "Export failed"));
        return;
      }
      const blob     = await r.blob();
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      const today    = new Date().toISOString().slice(0, 10);
      a.href         = url;
      a.download     = `customers-${source}-${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(lang === "ar" ? "✅ تم تصدير الملف" : "✅ File exported");
    } catch {
      toast.error(lang === "ar" ? "خطأ في الاتصال" : "Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      title={lang === "ar" ? "تصدير Excel" : "Export Excel"}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-green-400 hover:text-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading
        ? <Loader2  className="w-3.5 h-3.5 animate-spin" />
        : <Download className="w-3.5 h-3.5" />}
      {lang === "ar" ? "تصدير Excel" : "Export Excel"}
    </button>
  );
}

// ─── Customer Card ────────────────────────────────────────────────────────────

interface CustomerCardProps {
  customer: Customer;
  onChat:   (phone: string) => void;
  lang: Lang;
}

function CustomerCard({ customer, onChat, lang }: CustomerCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusKey   = customer.lastOrder?.status?.toLowerCase() ?? "";
  const statusClass = STATUS_BADGE[statusKey] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  const initial     = customer.name.trim().charAt(0).toUpperCase() || (lang === "ar" ? "ع" : "C");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[#25D366] font-bold text-sm">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">{customer.name}</p>
          <p className="text-xs text-gray-400 font-mono" dir="ltr">{formatPhone(customer.phone)}</p>
        </div>
        <div className="text-left flex-shrink-0">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
            {formatMoney(customer.totalSpent, lang, customer.currency)}
          </p>
          <p className="text-[10px] text-gray-400 text-left">{customer.ordersCount} {tr("ordersCount", lang)}</p>
        </div>
      </div>

      {/* Last Order Badge */}
      {customer.lastOrder && (
        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
          <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full font-medium", statusClass)}>
            {customer.lastOrder.status ?? "pending"}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {customer.lastOrder.orderNumber ? `#${customer.lastOrder.orderNumber}` : "—"}
            {customer.lastOrder.total != null
              ? ` · ${formatMoney(customer.lastOrder.total, lang, customer.currency)}`
              : ""}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => onChat(customer.phone)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20bb5a] active:bg-[#1aaa52] text-white text-xs font-medium py-2.5 rounded-xl transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {tr("openChat", lang)}
        </button>
        <button
          onClick={() => setExpanded((p) => !p)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {expanded
            ? <ChevronUp   className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Info */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-700/30">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{tr("totalOrders", lang)}: <strong className="text-gray-700 dark:text-gray-200">{customer.ordersCount}</strong></span>
            <span>
              {customer.lastOrder
                ? `${tr("lastSync", lang)}: ${formatDate(customer.lastOrder.orderedAt, lang)}`
                : (lang === "ar" ? "لا توجد طلبات" : "No orders")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Promo Send Modal ─────────────────────────────────────────────────────────

interface PromoSendModalProps {
  source:    "shopify" | "easyorders" | "woocommerce";
  customers: Customer[];
  onClose:   () => void;
  lang:      Lang;
  onSent?:   (sent: number) => void;
}

function PromoSendModal({ source, customers, onClose, lang, onSent }: PromoSendModalProps) {
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending,  setSending]  = useState(false);
  const [result,   setResult]   = useState<{ sent: number; failed: number } | null>(null);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.phone));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.phone));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.add(c.phone));
        return next;
      });
    }
  }

  function toggleOne(phone: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(phone) ? next.delete(phone) : next.add(phone);
      return next;
    });
  }

  async function handleSend() {
    if (selected.size === 0) {
      toast.error(lang === "ar" ? "اختر عميلاً واحداً على الأقل" : "Select at least one customer");
      return;
    }
    setSending(true);
    try {
      const r = await fetch("/api/store/automation/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ source, phones: Array.from(selected) }),
      });
      const d: { success?: boolean; sent?: number; failed?: number; error?: string } = await r.json();
      if (!r.ok) {
        toast.error(d.error ?? (lang === "ar" ? "فشل الإرسال" : "Send failed"));
        return;
      }
      setResult({ sent: d.sent ?? 0, failed: d.failed ?? 0 });
      onSent?.(d.sent ?? 0);
      toast.success(
        lang === "ar"
          ? `✅ تم إرسال ${d.sent} رسالة${(d.failed ?? 0) > 0 ? ` — فشل ${d.failed}` : ""}`
          : `✅ Sent ${d.sent}${(d.failed ?? 0) > 0 ? ` — failed ${d.failed}` : ""}`
      );
    } catch {
      toast.error(lang === "ar" ? "خطأ في الاتصال" : "Connection error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div>
            <p className="font-bold text-gray-800 dark:text-white">
              🎁 {lang === "ar" ? "إرسال عرض لعملاء المتجر" : "Send promo to store customers"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {selected.size > 0
                ? `${selected.size.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} ${lang === "ar" ? "عميل مختار" : "selected"}`
                : lang === "ar" ? "اختر العملاء اللي هتبعتلهم" : "Choose which customers to send to"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Result banner */}
        {result && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2 flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-400">
              {lang === "ar"
                ? `تم إرسال ${result.sent} رسالة${result.failed > 0 ? ` — فشل ${result.failed}` : " بنجاح"}`
                : `Sent ${result.sent}${result.failed > 0 ? ` — failed ${result.failed}` : " successfully"}`}
            </p>
          </div>
        )}

        {/* Search + Select All */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "ar" ? "بحث باسم أو رقم..." : "Search by name or number..."}
              className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
            />
          </div>

          {filtered.length > 0 && (
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm text-[#25D366] hover:underline"
            >
              {allSelected
                ? <CheckSquare className="w-4 h-4" />
                : <Square      className="w-4 h-4" />}
              {allSelected
                ? (lang === "ar" ? "إلغاء تحديد الكل" : "Deselect all")
                : (lang === "ar" ? "تحديد الكل" : "Select all")}
              <span className="text-gray-400 text-xs">({filtered.length})</span>
            </button>
          )}
        </div>

        {/* Customer list */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Users className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400">
                {lang === "ar" ? "لا يوجد عملاء مطابقون" : "No matching customers"}
              </p>
            </div>
          ) : (
            filtered.map((c) => {
              const isChecked = selected.has(c.phone);
              return (
                <button
                  key={c.phone}
                  onClick={() => toggleOne(c.phone)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border text-right transition-all",
                    isChecked
                      ? "border-[#25D366]/40 bg-[#25D366]/5 dark:bg-[#25D366]/10"
                      : "border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    isChecked
                      ? "border-[#25D366] bg-[#25D366]"
                      : "border-gray-300 dark:border-gray-600"
                  )}>
                    {isChecked && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>

                  <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#25D366]">
                    {c.name.trim().charAt(0).toUpperCase() || "ع"}
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.phone}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.ordersCount} {lang === "ar" ? "طلب" : "orders"}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {lang === "ar" ? "إلغاء" : "Cancel"}
          </button>

          <button
            onClick={handleSend}
            disabled={sending || selected.size === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#25D366] text-white text-sm font-medium hover:bg-[#1fba59] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
            {sending
              ? (lang === "ar" ? "جاري الإرسال..." : "Sending...")
              : `${lang === "ar" ? "إرسال لـ" : "Send to"} ${selected.size > 0 ? selected.size : ""} ${lang === "ar" ? "عميل" : "customers"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Automation Card ──────────────────────────────────────────────────────────

interface AutomationCardProps {
  automation: AutomationItem;
  templates:  AutomationTemplate[];
  onSave:     (type: StoreAutomationType, isEnabled: boolean, templateId: string | null) => Promise<void>;
  lang: Lang;
  // للـ promo بس
  storeSource?: "shopify" | "easyorders" | "woocommerce";
  customers?:   Customer[];
}

function AutomationCard({ automation, templates, onSave, lang, storeSource, customers = [] }: AutomationCardProps) {
  const [enabled,      setEnabled]      = useState(automation.isEnabled);
  const [templateId,   setTemplateId]   = useState(automation.templateId ?? "");
  const [saving,       setSaving]       = useState(false);
  const [showPromo,    setShowPromo]    = useState(false);
  const [promoSentAdj, setPromoSentAdj] = useState(0);

  const meta = AUTO_LABELS[automation.type];

  async function handleToggle() {
    if (!enabled && !templateId) {
      toast.error(lang === "ar" ? "اختر قالباً من القائمة أولاً" : "Choose a template first");
      return;
    }
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    await onSave(automation.type, next, templateId || null);
    setSaving(false);
  }

  async function handleTemplateChange(tid: string) {
    setTemplateId(tid);
    if (enabled && tid) {
      setSaving(true);
      await onSave(automation.type, true, tid);
      setSaving(false);
    }
  }

  const isPromo    = automation.type === "promo";
  const totalSent  = (automation.sentCount ?? 0) + promoSentAdj;

  return (
    <>
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-5 transition-all",
      enabled
        ? "border-[#25D366]/40 dark:border-[#25D366]/25"
        : "border-gray-100 dark:border-gray-700"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{meta.icon}</span>
          <div>
            <p className="font-semibold text-sm text-gray-800 dark:text-white">{meta.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{meta.desc}</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className="flex-shrink-0 transition-opacity disabled:opacity-50"
          aria-label={enabled ? (lang === "ar" ? "إيقاف الأتمتة" : "Disable automation") : (lang === "ar" ? "تفعيل الأتمتة" : "Enable automation")}
        >
          {saving
            ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            : enabled
              ? <ToggleRight className="w-8 h-8 text-[#25D366]" />
              : <ToggleLeft  className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          }
        </button>
      </div>

      {/* Template Selector */}
      <div>
        <label className="text-[11px] text-gray-400 mb-1.5 block">{lang === "ar" ? "القالب المستخدم" : "Used template"}</label>
        <select
          value={templateId}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm px-3 py-2.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
        >
          <option value="">{lang === "ar" ? "— اختر قالب معتمد —" : "— Choose approved template —"}</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {templates.length === 0 && (
          <p className="text-[10px] text-orange-500 mt-1.5">
            {lang === "ar" ? "⚠️ لا توجد قوالب معتمدة — اذهب لصفحة القوالب" : "⚠️ No approved templates — go to Templates page"}
          </p>
        )}
      </div>

      {/* زر إرسال العروض — الـ promo فقط */}
      {isPromo && (
        <button
          onClick={() => {
            if (!enabled || !templateId) {
              toast.error(lang === "ar" ? "فعّل الأتمتة واختر قالباً أولاً" : "Enable automation and choose a template first");
              return;
            }
            if (customers.length === 0) {
              toast.error(lang === "ar" ? "لا يوجد عملاء في المتجر" : "No store customers found");
              return;
            }
            setShowPromo(true);
          }}
          className={cn(
            "mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
            enabled && templateId
              ? "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20"
              : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed border border-transparent"
          )}
        >
          <Send className="w-4 h-4" />
          {lang === "ar" ? "إرسال لعملاء المتجر" : "Send to store customers"}
          {customers.length > 0 && (
            <span className="text-[11px] bg-[#25D366]/20 text-[#25D366] px-1.5 py-0.5 rounded-full">
              {customers.length}
            </span>
          )}
        </button>
      )}

      {/* Sent Count */}
      {totalSent > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-[#25D366] flex-shrink-0" />
          <span className="text-[11px] text-gray-400">
            {totalSent.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} {lang === "ar" ? "رسالة أُرسلت" : "messages sent"}
          </span>
        </div>
      )}
    </div>

    {/* Promo Modal */}
    {isPromo && showPromo && storeSource && (
      <PromoSendModal
        source={storeSource}
        customers={customers}
        lang={lang}
        onClose={() => setShowPromo(false)}
        onSent={(n) => setPromoSentAdj((p) => p + n)}
      />
    )}
    </>
  );
}

// ─── Store Tab — المحتوى الكامل لكل متجر ─────────────────────────────────────

interface StoreTabProps {
  store:      StoreInfo;
  onOpenChat: (phone: string) => void;
  lang: Lang;
}

function StoreTab({ store, onOpenChat, lang }: StoreTabProps) {
  const [customers,   setCustomers]   = useState<Customer[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [loadingC,    setLoadingC]    = useState(true);
  const [search,      setSearch]      = useState("");

  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [templates,   setTemplates]   = useState<AutomationTemplate[]>([]);
  const [loadingA,    setLoadingA]    = useState(true);

  const [syncing,     setSyncing]     = useState(false);

  // ── Fetch Customers ─────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async (p: number, q: string) => {
    setLoadingC(true);
    try {
      const r = await fetch(
        `/api/store/orders?source=${store.source}&page=${p}&search=${encodeURIComponent(q)}`
      );
      if (!r.ok) throw new Error("fetch failed");
      const d: { customers: Customer[]; total: number; hasMore: boolean } = await r.json();
      setCustomers((prev) => p === 1 ? d.customers : [...prev, ...d.customers]);
      setTotal(d.total);
      setHasMore(d.hasMore);
      setPage(p);
    } catch {
      toast.error(lang === "ar" ? "تعذر تحميل بيانات العملاء" : "Failed to load customers");
    } finally {
      setLoadingC(false);
    }
  }, [store.source]);

  // ── Fetch Automations ───────────────────────────────────────────────────
  const fetchAutomations = useCallback(async () => {
    setLoadingA(true);
    try {
      const r = await fetch(`/api/store/automation?source=${store.source}`);
      if (!r.ok) throw new Error("fetch failed");
      const d: { automations: AutomationItem[]; templates: AutomationTemplate[] } = await r.json();
      setAutomations(d.automations ?? []);
      setTemplates(d.templates ?? []);
    } catch {
      toast.error(lang === "ar" ? "تعذر تحميل automations" : "Failed to load automations");
    } finally {
      setLoadingA(false);
    }
  }, [store.source]);

  useEffect(() => {
    fetchCustomers(1, "");
    fetchAutomations();
  }, [fetchCustomers, fetchAutomations]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(1, search), 400);
    return () => clearTimeout(timer);
  }, [search, fetchCustomers]);

  // ── Save Automation ─────────────────────────────────────────────────────
  async function handleSaveAutomation(
    type:       StoreAutomationType,
    isEnabled:  boolean,
    templateId: string | null
  ): Promise<void> {
    try {
      const r = await fetch("/api/store/automation", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ source: store.source, type, isEnabled, templateId }),
      });
      const d: { success?: boolean; error?: string; automation?: AutomationItem } = await r.json();

      if (!r.ok) {
        toast.error(d.error ?? (lang === "ar" ? "فشل حفظ الأتمتة" : "Failed to save automation"));
        return;
      }

      toast.success(isEnabled ? (lang === "ar" ? "✅ تم تفعيل الأتمتة" : "✅ Automation enabled") : (lang === "ar" ? "تم إيقاف الأتمتة" : "Automation disabled"));

      setAutomations((prev) =>
        prev.map((a) =>
          a.type === type
            ? { ...a, isEnabled, templateId, template: d.automation?.template ?? null }
            : a
        )
      );
    } catch {
      toast.error(lang === "ar" ? "خطأ في الاتصال" : "Connection error");
    }
  }

  // ── Manual Sync (EasyOrders only) ───────────────────────────────────────
  async function handleSync() {
    setSyncing(true);
    try {
      const r = await fetch("/api/easy-orders/sync", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reuseStoredKey: true }),
      });
      const d: { success?: boolean; synced?: number; error?: string; hasMore?: boolean } = await r.json();

      if (!r.ok) {
        toast.error(d.error ?? (lang === "ar" ? "فشلت المزامنة" : "Sync failed"));
        return;
      }

      toast.success(
        `${lang === "ar" ? "✅ تمت مزامنة" : "✅ Synced"} ${d.synced ?? 0} ${lang === "ar" ? "طلب" : "orders"}${d.hasMore ? (lang === "ar" ? " — اضغط مجدداً للمزيد" : " — press again for more") : ""}`
      );
      // إعادة تحميل العملاء بعد المزامنة
      await fetchCustomers(1, search);

    } catch {
      toast.error(lang === "ar" ? "خطأ في الاتصال" : "Connection error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Package className="w-5 h-5 text-blue-600" />}
          label={tr("totalOrders", lang)}
          value={store.totalOrders.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
          color="bg-blue-50 dark:bg-blue-900/20"
        />
        <KpiCard
          icon={<Users className="w-5 h-5 text-purple-600" />}
          label={tr("totalCustomers", lang)}
          value={store.totalCustomers.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
          color="bg-purple-50 dark:bg-purple-900/20"
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-[#25D366]" />}
          label={tr("campaignRevenue", lang)}
          value={formatMoney(store.campaignRevenue, lang)}
          sub={tr("revenueSub", lang)}
          color="bg-[#25D366]/10"
        />
        <KpiCard
          icon={<RefreshCw className="w-5 h-5 text-orange-500" />}
          label={tr("lastSync", lang)}
          value={store.lastSyncAt ? formatDate(store.lastSyncAt, lang) : "—"}
          sub={store.totalSynced ? `${store.totalSynced.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} ${tr("savedOrders", lang)}` : undefined}
          color="bg-orange-50 dark:bg-orange-900/20"
        />
      </div>

      {/* ── Automations ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">
            {tr("automationsTitle", lang)}
          </h2>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
            {automations.filter((a) => a.isEnabled).length} / {automations.length} {tr("enabled", lang)}
          </span>
        </div>

        {loadingA ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {automations.map((auto) => (
              <AutomationCard
                key={auto.type}
                automation={auto}
                templates={templates}
                onSave={handleSaveAutomation}
                lang={lang}
                storeSource={store.source}
                customers={customers}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Customers ─────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">
            {tr("customersTitle", lang)}
            <span className="text-sm font-normal text-gray-400 mr-2">
              ({total.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")})
            </span>
          </h2>

          {/* أزرار النسخ والتصدير */}
          <div className="flex items-center gap-2">
            <CopyPhonesButton customers={customers} lang={lang} />
            <ExportExcelButton source={store.source} search={search} lang={lang} />
          </div>
        </div>

        {/* بحث */}
        <div className="relative mb-4 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("searchPh", lang)}
            className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
          />
        </div>

        {loadingC && customers.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{tr("noCustomers", lang)}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map((c) => (
                <CustomerCard key={c.phone} customer={c} onChat={onOpenChat} lang={lang} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => fetchCustomers(page + 1, search)}
                  disabled={loadingC}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {loadingC
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : tr("loadMore", lang)}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Contact List Banner ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
          <Phone className="w-5 h-5 text-[#25D366]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800 dark:text-white">
            {tr("listTitle", lang)} "{lang === "ar" ? `عملاء ${store.storeName}` : `${store.storeName} customers`}"
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {store.totalCustomers.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} {tr("syncedContacts", lang)}
          </p>
        </div>
        <button
          onClick={() => toast.info(tr("goContactsToast", lang))}
          className="flex items-center gap-1.5 text-xs font-medium text-[#25D366] hover:underline flex-shrink-0"
        >
          {tr("goContacts", lang)}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── EasyOrders Manual Sync ─────────────────────────────────────────── */}
      {store.source === "easyorders" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-gray-800 dark:text-white">{tr("manualSync", lang)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{tr("manualSyncSub", lang)}</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bb5a] active:bg-[#1aaa52] text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            {syncing ? tr("syncing", lang) : tr("syncNow", lang)}
          </button>
        </div>
      )}

      {/* ── WooCommerce Webhook Info ───────────────────────────────────────── */}
      {store.source === "woocommerce" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-500" />
                {tr("webhookTitle", lang)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{tr("webhookSub", lang)}</p>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium rounded-full border border-green-200 dark:border-green-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              {tr("active", lang)}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {tr("webhookHint", lang)}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface StoreProps {
  onOpenChat?: (phone: string) => void;
}

export default function Store({ onOpenChat }: StoreProps) {
  const { locale } = useLanguage();
  const lang: Lang = locale === "en" ? "en" : "ar";
  const [storeData,  setStoreData]  = useState<StoreData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<"shopify" | "easyorders" | "woocommerce">("shopify");

  useEffect(() => {
    fetch("/api/store")
      .then((r) => r.json())
      .then((d: StoreData) => {
        setStoreData(d);
        if (!d.shopify && d.easyorders) setActiveTab("easyorders");
        else if (!d.shopify && !d.easyorders && d.woocommerce) setActiveTab("woocommerce");
      })
      .catch(() => toast.error(tr("storeLoadErr", lang)))
      .finally(() => setLoading(false));
  }, [lang]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
      </div>
    );
  }

  // ── No Store ─────────────────────────────────────────────────────────────
  const hasStore = storeData?.shopify || storeData?.easyorders || storeData?.woocommerce;
  if (!hasStore) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
        <ShoppingBag className="w-16 h-16 text-gray-200 dark:text-gray-700" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">{tr("noStore", lang)}</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          {tr("noStoreSub", lang)}
        </p>
      </div>
    );
  }

  const activeStore =
    activeTab === "shopify"     ? storeData?.shopify    :
    activeTab === "easyorders"  ? storeData?.easyorders :
                                  storeData?.woocommerce;
  const storeCount  = [storeData?.shopify, storeData?.easyorders, storeData?.woocommerce].filter(Boolean).length;
  const hasBoth     = storeCount > 1;

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {activeStore?.storeName ?? tr("storeFallback", lang)}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {tr("connected", lang)}
            </span>
            <span className="text-xs text-gray-400">
              {activeStore?.source === "shopify" ? "Shopify"
                : activeStore?.source === "easyorders" ? (lang === "ar" ? "إيزي أوردرز" : "EasyOrders")
                : "WooCommerce"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabs (لو في متجرين) ────────────────────────────────────────────── */}
      {hasBoth && (
        <div className="flex gap-1.5 mb-6 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl w-fit">
          {(["shopify", "easyorders", "woocommerce"] as const).map((src) => {
            const info = storeData?.[src];
            if (!info) return null;
            return (
              <button
                key={src}
                onClick={() => setActiveTab(src)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all",
                  activeTab === src
                    ? "bg-white dark:bg-gray-800 text-[#25D366] shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}
              >
                {src === "shopify"
                  ? <ShoppingBag className="w-4 h-4" />
                  : src === "easyorders"
                    ? <Zap   className="w-4 h-4" />
                    : <Globe className="w-4 h-4" />}
                {info.storeName}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Tab Content ───────────────────────────────────────────────────── */}
      {activeStore && (
        <StoreTab
          store={activeStore}
          onOpenChat={onOpenChat ?? (() => {})}
          lang={lang}
        />
      )}
    </div>
  );
}