"use client";

// src/components/dashboard/Store.tsx
// ─── صفحة المتجر — عملاء + أتمتات + إيرادات الحملات ─────────────────────────

import { useEffect, useState, useCallback } from "react";
import {
  ShoppingBag, Zap, Globe, Users, Package, TrendingUp, RefreshCw,
  MessageSquare, ChevronDown, ChevronUp, Search, Loader2,
  ToggleLeft, ToggleRight, CheckCircle, ChevronRight, Phone,
} from "lucide-react";
import { toast } from "sonner";
import { cn }   from "@/lib/utils";
type StoreAutomationType = "order_confirm" | "order_shipped" | "promo";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(p: string): string {
  const clean = p.replace(/\D/g, "");
  return clean.startsWith("0") ? `+2${clean}` : `+${clean}`;
}

function formatMoney(value: number, currency = "EGP"): string {
  if (isNaN(value)) return "—";
  return value.toLocaleString("ar-EG", {
    style:              "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG", {
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

// ─── Customer Card ────────────────────────────────────────────────────────────

interface CustomerCardProps {
  customer: Customer;
  onChat:   (phone: string) => void;
}

function CustomerCard({ customer, onChat }: CustomerCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusKey   = customer.lastOrder?.status?.toLowerCase() ?? "";
  const statusClass = STATUS_BADGE[statusKey] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  const initial     = customer.name.trim().charAt(0).toUpperCase() || "ع";

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
            {formatMoney(customer.totalSpent, customer.currency)}
          </p>
          <p className="text-[10px] text-gray-400 text-left">{customer.ordersCount} طلب</p>
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
              ? ` · ${formatMoney(customer.lastOrder.total, customer.currency)}`
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
          فتح المحادثة
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
            <span>إجمالي الطلبات: <strong className="text-gray-700 dark:text-gray-200">{customer.ordersCount}</strong></span>
            <span>
              {customer.lastOrder
                ? `آخر طلب: ${formatDate(customer.lastOrder.orderedAt)}`
                : "لا توجد طلبات"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Automation Card ──────────────────────────────────────────────────────────

interface AutomationCardProps {
  automation: AutomationItem;
  templates:  AutomationTemplate[];
  onSave:     (type: StoreAutomationType, isEnabled: boolean, templateId: string | null) => Promise<void>;
}

function AutomationCard({ automation, templates, onSave }: AutomationCardProps) {
  const [enabled,    setEnabled]    = useState(automation.isEnabled);
  const [templateId, setTemplateId] = useState(automation.templateId ?? "");
  const [saving,     setSaving]     = useState(false);

  const meta = AUTO_LABELS[automation.type];

  async function handleToggle() {
    if (!enabled && !templateId) {
      toast.error("اختر قالباً من القائمة أولاً");
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

  return (
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
          aria-label={enabled ? "إيقاف الأتمتة" : "تفعيل الأتمتة"}
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
        <label className="text-[11px] text-gray-400 mb-1.5 block">القالب المستخدم</label>
        <select
          value={templateId}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm px-3 py-2.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
        >
          <option value="">— اختر قالب معتمد —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {templates.length === 0 && (
          <p className="text-[10px] text-orange-500 mt-1.5">
            ⚠️ لا توجد قوالب معتمدة — اذهب لصفحة القوالب
          </p>
        )}
      </div>

      {/* Sent Count */}
      {automation.sentCount > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-[#25D366] flex-shrink-0" />
          <span className="text-[11px] text-gray-400">
            {automation.sentCount.toLocaleString("ar-EG")} رسالة أُرسلت
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Store Tab — المحتوى الكامل لكل متجر ─────────────────────────────────────

interface StoreTabProps {
  store:      StoreInfo;
  onOpenChat: (phone: string) => void;
}

function StoreTab({ store, onOpenChat }: StoreTabProps) {
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
      toast.error("تعذر تحميل بيانات العملاء");
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
      toast.error("تعذر تحميل الأتمتات");
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
        toast.error(d.error ?? "فشل حفظ الأتمتة");
        return;
      }

      toast.success(isEnabled ? "✅ تم تفعيل الأتمتة" : "تم إيقاف الأتمتة");

      setAutomations((prev) =>
        prev.map((a) =>
          a.type === type
            ? { ...a, isEnabled, templateId, template: d.automation?.template ?? null }
            : a
        )
      );
    } catch {
      toast.error("خطأ في الاتصال");
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
        toast.error(d.error ?? "فشلت المزامنة");
        return;
      }

      toast.success(
        `✅ تمت مزامنة ${d.synced ?? 0} طلب${d.hasMore ? " — اضغط مجدداً للمزيد" : ""}`
      );
      // إعادة تحميل العملاء بعد المزامنة
      await fetchCustomers(1, search);

    } catch {
      toast.error("خطأ في الاتصال");
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
          label="إجمالي الطلبات"
          value={store.totalOrders.toLocaleString("ar-EG")}
          color="bg-blue-50 dark:bg-blue-900/20"
        />
        <KpiCard
          icon={<Users className="w-5 h-5 text-purple-600" />}
          label="إجمالي العملاء"
          value={store.totalCustomers.toLocaleString("ar-EG")}
          color="bg-purple-50 dark:bg-purple-900/20"
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-[#25D366]" />}
          label="إيرادات الحملات"
          value={formatMoney(store.campaignRevenue)}
          sub="من رسائل واتساب"
          color="bg-[#25D366]/10"
        />
        <KpiCard
          icon={<RefreshCw className="w-5 h-5 text-orange-500" />}
          label="آخر مزامنة"
          value={store.lastSyncAt ? formatDate(store.lastSyncAt) : "—"}
          sub={store.totalSynced ? `${store.totalSynced.toLocaleString("ar-EG")} طلب محفوظ` : undefined}
          color="bg-orange-50 dark:bg-orange-900/20"
        />
      </div>

      {/* ── Automations ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">
            ⚙️ أتمتات المتجر
          </h2>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
            {automations.filter((a) => a.isEnabled).length} / {automations.length} مفعّل
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
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Customers ─────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">
            👥 العملاء
            <span className="text-sm font-normal text-gray-400 mr-2">
              ({total.toLocaleString("ar-EG")})
            </span>
          </h2>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="اسم أو رقم أو طلب..."
              className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
            />
          </div>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">لا يوجد عملاء مطابقون</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map((c) => (
                <CustomerCard key={c.phone} customer={c} onChat={onOpenChat} />
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
                    : "تحميل المزيد"}
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
            قائمة "عملاء {store.storeName}"
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {store.totalCustomers.toLocaleString("ar-EG")} جهة اتصال مزامَنة من المتجر
          </p>
        </div>
        <button
          onClick={() => toast.info("اذهب إلى صفحة جهات الاتصال")}
          className="flex items-center gap-1.5 text-xs font-medium text-[#25D366] hover:underline flex-shrink-0"
        >
          عرض القائمة
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── EasyOrders Manual Sync ─────────────────────────────────────────── */}
      {store.source === "easyorders" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-gray-800 dark:text-white">مزامنة يدوية</p>
            <p className="text-xs text-gray-400 mt-0.5">سحب آخر 100 طلب من إيزي أوردرز</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bb5a] active:bg-[#1aaa52] text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            {syncing ? "جاري المزامنة..." : "مزامنة الآن"}
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
                الطلبات تصل تلقائياً عبر Webhook
              </p>
              <p className="text-xs text-gray-400 mt-0.5">كل أوردر جديد في WooCommerce بيوصل فوراً</p>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium rounded-full border border-green-200 dark:border-green-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              نشط
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            لو محتاج تضيف الـ Webhook من جديد، روح صفحة <strong>API</strong> وانسخ الرابط من قسم WooCommerce.
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
      .catch(() => toast.error("تعذر تحميل بيانات المتجر"))
      .finally(() => setLoading(false));
  }, []);

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
        <p className="text-gray-600 dark:text-gray-400 font-medium">لم يتم ربط أي متجر بعد</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          اذهب إلى صفحة <strong>API</strong> لربط متجر Shopify أو EasyOrders أو WooCommerce
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
            {activeStore?.storeName ?? "المتجر"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              متصل
            </span>
            <span className="text-xs text-gray-400">
              {activeStore?.source === "shopify" ? "Shopify"
                : activeStore?.source === "easyorders" ? "إيزي أوردرز"
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
        />
      )}
    </div>
  );
}