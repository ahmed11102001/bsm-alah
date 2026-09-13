// src/app/dashboard/store/_components/StoreTab.tsx
// â”€â”€â”€ Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„ÙƒØ§Ù…Ù„ Ù„ÙƒÙ„ Ù…ØªØ¬Ø± (KPIs + Ø£ØªÙ…ØªØ§Øª + Ø¹Ù…Ù„Ø§Ø¡) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Package, Users, TrendingUp, RefreshCw, Search, Loader2, Phone, ChevronRight, Globe, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  AutomationItem, AutomationTemplate, Customer, Lang, StoreAutomationType, StoreInfo,
} from "./types";
import { tr } from "./constants";
import { formatMoney, formatDate } from "./store-utils";
import { KpiCard } from "./KpiCard";
import { CustomerCard } from "./CustomerCard";
import { CopyPhonesButton } from "./CopyPhonesButton";
import { ExportExcelButton } from "./ExportExcelButton";
import { AutomationCard } from "./AutomationCard";

export interface StoreTabProps {
  store: StoreInfo;
  onOpenChat: (phone: string) => void;
  lang: Lang;
}

export function StoreTab({ store, onOpenChat, lang }: StoreTabProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingC, setLoadingC] = useState(true);
  const [search, setSearch] = useState("");

  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [loadingA, setLoadingA] = useState(true);

  // â”€â”€ ØªØ¨ÙˆÙŠØ¨Ø§ Ø§Ù„Ø¹Ù…Ù„ Ø§Ù„ÙŠÙˆÙ…ÙŠ/Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯ â€” Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§ÙØªØ±Ø§Ø¶ÙŠÙ‹Ø§ØŒ ÙˆØ§Ù„Ø£ØªÙ…ØªØ© ØªÙ„Ù‚Ø§Ø¦ÙŠÙ‹Ø§ â”€â”€â”€â”€
  // Ù„Ùˆ Ù„Ù… ØªÙÙØ¹Ù‘Ù„ Ø£ÙŠ Ø£ØªÙ…ØªØ© Ø¨Ø¹Ø¯ (Ø¥Ø¹Ø¯Ø§Ø¯ Ø£ÙˆÙ„ Ù…Ø±Ø©). Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙŠÙˆØ²Ø± Ù„Ø§ ÙŠÙØªØ¬Ø§ÙˆÙŽØ² Ø£Ø¨Ø¯Ù‹Ø§.
  // Ù…Ù„Ø§Ø­Ø¸Ø© ØªÙ†ÙÙŠØ°: Ø§Ù„ØªØ¨ÙˆÙŠØ¨ Ø¹Ø¨Ø± hidden (Ù„Ø§ Ø¥Ù„ØºØ§Ø¡ mount) â€” Ø§Ù„ÙƒØ±ÙˆØª Ø¨Ù„Ø§ effects.
  const [storeTab, setStoreTab] = useState<"customers" | "automations">("customers");
  const tabTouched = useRef(false);
  const pickTab = (t: "customers" | "automations") => {
    tabTouched.current = true;
    setStoreTab(t);
  };

  const [syncing, setSyncing] = useState(false);

  // â”€â”€ Fetch Customers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      toast.error(lang === "ar" ? "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡" : "Failed to load customers");
    } finally {
      setLoadingC(false);
    }
  }, [store.source]);

  // â”€â”€ Fetch Automations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchAutomations = useCallback(async () => {
    setLoadingA(true);
    try {
      const r = await fetch(`/api/store/automation?source=${store.source}`);
      if (!r.ok) throw new Error("fetch failed");
      const d: { automations: AutomationItem[]; templates: AutomationTemplate[] } = await r.json();
      const list = d.automations ?? [];
      setAutomations(list);
      setTemplates(d.templates ?? []);
      if (!tabTouched.current && list.length > 0 && list.every((a) => !a.isEnabled)) {
        setStoreTab("automations");
      }
    } catch {
      toast.error(lang === "ar" ? "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ automations" : "Failed to load automations");
    } finally {
      setLoadingA(false);
    }
  }, [store.source]);

  useEffect(() => {
    fetchCustomers(1, "");
    fetchAutomations();
  }, [fetchCustomers, fetchAutomations]);

  useEffect(() => {
    tabTouched.current = false;
    setStoreTab("customers");
  }, [store.source]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(1, search), 400);
    return () => clearTimeout(timer);
  }, [search, fetchCustomers]);

  // â”€â”€ Save Automation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleSaveAutomation(
    type: StoreAutomationType,
    isEnabled: boolean,
    templateId: string | null,
    delayMinutes?: number
  ): Promise<void> {
    try {
      const r = await fetch("/api/store/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: store.source, type, isEnabled, templateId, delayMinutes }),
      });
      const d: { success?: boolean; error?: string; automation?: AutomationItem } = await r.json();

      if (!r.ok) {
        toast.error(d.error ?? (lang === "ar" ? "ÙØ´Ù„ Ø­ÙØ¸ Ø§Ù„Ø£ØªÙ…ØªØ©" : "Failed to save automation"));
        return;
      }

      toast.success(isEnabled ? (lang === "ar" ? "âœ… ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø£ØªÙ…ØªØ©" : "âœ… Automation enabled") : (lang === "ar" ? "ØªÙ… Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ø£ØªÙ…ØªØ©" : "Automation disabled"));

      setAutomations((prev) =>
        prev.map((a) =>
          a.type === type
            ? {
              ...a,
              isEnabled,
              templateId,
              template: d.automation?.template ?? null,
              delayMinutes: d.automation?.delayMinutes ?? delayMinutes ?? 0,
            }
            : a
        )
      );
    } catch {
      toast.error(lang === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„" : "Connection error");
    }
  }

  // â”€â”€ Manual Sync (EasyOrders only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Ù…Ù„Ø§Ø­Ø¸Ø©: Ø§Ù„Ù€ Public API Ø§Ù„Ø­Ø§Ù„ÙŠ Ù„Ù€ EasyOrders Ù„Ø§ ÙŠÙˆÙØ± Ø³Ø­Ø¨ ÙƒÙ„ Ø§Ù„Ø·Ù„Ø¨Ø§Øª Ø¯ÙØ¹Ø©
  // ÙˆØ§Ø­Ø¯Ø©ØŒ ÙØ§Ù„Ø·Ù„Ø¨Ø§Øª Ø¨ØªÙˆØµÙ„ Ø­ØµØ±ÙŠÙ‹Ø§ Ø¹Ø¨Ø± Ø§Ù„Ù€ Webhook. Ø§Ù„Ø²Ø±Ø§Ø± Ø¯Ù‡ Ø¨Ù‚Ù‰ Ø¨ÙŠØ¹ÙŠØ¯ Ù…Ø²Ø§Ù…Ù†Ø©
  // Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø¨Ø¯Ù„ Ø§Ù„Ø·Ù„Ø¨Ø§Øª.
  async function handleSync() {
    setSyncing(true);
    try {
      const r = await fetch("/api/easy-orders/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reuseStoredKey: true }),
      });
      const d: { success?: boolean; productsSynced?: number; productSyncError?: string | null; error?: string } = await r.json();

      if (!r.ok) {
        toast.error(d.error ?? (lang === "ar" ? "ÙØ´Ù„Øª Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø©" : "Sync failed"));
        return;
      }

      if (d.productSyncError) {
        toast.error(
          lang === "ar" ? `ØªÙ…Øª Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ø¬Ø²Ø¦ÙŠØ©: ${d.productSyncError}` : `Partial sync: ${d.productSyncError}`
        );
      } else {
        toast.success(
          `${lang === "ar" ? "âœ… ØªÙ…Øª Ù…Ø²Ø§Ù…Ù†Ø©" : "âœ… Synced"} ${d.productsSynced ?? 0} ${lang === "ar" ? "Ù…Ù†ØªØ¬" : "products"}`
        );
      }
      // Ø¥Ø¹Ø§Ø¯Ø© ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø¨Ø¹Ø¯ Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø©
      await fetchCustomers(1, search);

    } catch {
      toast.error(lang === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„" : "Connection error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* â”€â”€ KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          label={tr("campaignRevenue", lang)}
          value={formatMoney(store.campaignRevenue, lang)}
          sub={tr("revenueSub", lang)}
          color="bg-primary/10"
        />
        <KpiCard
          icon={<RefreshCw className="w-5 h-5 text-orange-500" />}
          label={tr("lastSync", lang)}
          value={store.lastSyncAt ? formatDate(store.lastSyncAt, lang) : "â€”"}
          sub={store.totalSynced ? `${store.totalSynced.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} ${tr("savedOrders", lang)}` : undefined}
          color="bg-orange-50 dark:bg-orange-900/20"
        />
      </div>

      {/* â”€â”€ ØªØ¨ÙˆÙŠØ¨Ø§ Ø§Ù„Ø¹Ù…Ù„ Ø§Ù„ÙŠÙˆÙ…ÙŠ / Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl w-fit">
        <TabButton
          active={storeTab === "customers"}
          onClick={() => pickTab("customers")}
          icon={<Users className="w-4 h-4" />}
          label={tr("tabCustomers", lang)}
          count={total}
          lang={lang}
        />
        <TabButton
          active={storeTab === "automations"}
          onClick={() => pickTab("automations")}
          icon={<Zap className="w-4 h-4" />}
          label={tr("tabAutomations", lang)}
          count={automations.filter((a) => a.isEnabled).length}
          lang={lang}
        />
      </div>

      {/* â”€â”€ Automations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className={storeTab === "automations" ? "" : "hidden"}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">
            {tr("automationsTitle", lang)}
          </h2>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
            {automations.filter((a) => a.isEnabled).length} / {automations.length} {tr("enabled", lang)}
          </span>
        </div>

        {loadingA ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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

      {/* â”€â”€ Customers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className={storeTab === "customers" ? "" : "hidden"}>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">
            {tr("customersTitle", lang)}
            <span className="text-sm font-normal text-gray-400 mr-2">
              ({total.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")})
            </span>
          </h2>

          {/* Ø£Ø²Ø±Ø§Ø± Ø§Ù„Ù†Ø³Ø® ÙˆØ§Ù„ØªØµØ¯ÙŠØ± */}
          <div className="flex items-center gap-2">
            <CopyPhonesButton customers={customers} lang={lang} />
            <ExportExcelButton source={store.source} search={search} lang={lang} />
          </div>
        </div>

        {/* Ø¨Ø­Ø« */}
        <div className="relative mb-4 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("searchPh", lang)}
            className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {loadingC && customers.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
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

      {/* â”€â”€ Contact List Banner â€” ØªØ®Øµ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4",
        storeTab === "customers" ? "" : "hidden"
      )}>
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800 dark:text-white">
            {tr("listTitle", lang)} "{lang === "ar" ? `Ø¹Ù…Ù„Ø§Ø¡ ${store.storeName}` : `${store.storeName} customers`}"
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {store.totalCustomers.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} {tr("syncedContacts", lang)}
          </p>
        </div>
        <button
          onClick={() => toast.info(tr("goContactsToast", lang))}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline flex-shrink-0"
        >
          {tr("goContacts", lang)}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* â”€â”€ EasyOrders Manual Sync â€” ØµÙŠØ§Ù†Ø©ØŒ Ù…Ø¹ Ø§Ù„Ø£ØªÙ…ØªØ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {storeTab === "automations" && store.source === "easyorders" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-gray-800 dark:text-white">{tr("manualSync", lang)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{tr("manualSyncSub", lang)}</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 active:bg-primary/80 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            {syncing ? tr("syncing", lang) : tr("syncNow", lang)}
          </button>
        </div>
      )}

      {/* â”€â”€ WooCommerce Webhook Info â€” Ø¥Ø¹Ø¯Ø§Ø¯ØŒ Ù…Ø¹ Ø§Ù„Ø£ØªÙ…ØªØ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {storeTab === "automations" && store.source === "woocommerce" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-500" />
                {tr("webhookTitle", lang)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{tr("webhookSub", lang)}</p>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 text-primary text-xs font-medium rounded-full border border-primary/20 dark:border-primary/30">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
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

// â”€â”€â”€ Ø²Ø±Ø§Ø± ØªØ¨ÙˆÙŠØ¨ Ø¯Ø§Ø®Ù„ÙŠ Ø¨Ø¹Ø¯Ù‘Ø§Ø¯ â€” Ù†ÙØ³ Ù„ØºØ© ØªØ¨ÙˆÙŠØ¨Ø§Øª Ø§Ù„Ù…Ù†ØµØ§Øª Ø£Ø¹Ù„Ù‰ Ø§Ù„ØµÙØ­Ø© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TabButton({ active, onClick, icon, label, count, lang }: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  count: number;
  lang: "ar" | "en";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all",
        active
          ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      )}
    >
      {icon}
      {label}
      <span className={cn(
        "text-[10px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center",
        active
          ? "bg-primary/10 text-primary"
          : "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300"
      )}>
        {count.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
      </span>
    </button>
  );
}
