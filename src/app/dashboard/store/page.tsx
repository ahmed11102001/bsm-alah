"use client";
import { CardsGridSkeleton } from "@/components/dashboard/DashboardSkeletons";

// src/app/dashboard/store/page.tsx
// ─── صفحة المتجر — عملاء + أتمتات + إيرادات الحملات ─────────────────────────

import { useCallback, useEffect, useState } from "react";
import { ShoppingBag, Zap, Globe, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

import type { Lang, StoreData } from "./_components/types";
import { tr } from "./_components/constants";
import { StoreTab } from "./_components/StoreTab";

// ─── Main Component ───────────────────────────────────────────────────────────

interface StoreProps {
  onOpenChat?: (phone: string) => void;
}

const DISCONNECT_ENDPOINT: Record<"shopify" | "easyorders" | "woocommerce", string> = {
  shopify: "/api/shopify/install",
  easyorders: "/api/easy-orders/sync",
  woocommerce: "/api/woocommerce/connect",
};

export default function Store({ onOpenChat }: StoreProps) {
  const { locale } = useLanguage();
  const lang: Lang = locale === "en" ? "en" : "ar";
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"shopify" | "easyorders" | "woocommerce">("shopify");
  const [disconnecting, setDisconnecting] = useState(false);

  const loadStore = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetch("/api/store")
      .then((r) => r.json())
      .then((d: StoreData) => {
        setStoreData(d);
        if (!silent) {
          if (!d.shopify && d.easyorders) setActiveTab("easyorders");
          else if (!d.shopify && !d.easyorders && d.woocommerce) setActiveTab("woocommerce");
        }
      })
      .catch(() => { if (!silent) toast.error(tr("storeLoadErr", lang)); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [lang]);

  useEffect(() => { loadStore(); }, [loadStore]);

  // تحديث دوري صامت كل 20 ثانية عشان حالة ربط المتجر تتحدث لوحدها
  useEffect(() => {
    const id = setInterval(() => loadStore(true), 20_000);
    return () => clearInterval(id);
  }, [loadStore]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") loadStore(true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadStore]);

  const handleDisconnect = async (source: "shopify" | "easyorders" | "woocommerce") => {
    if (!confirm(tr("disconnectConfirm", lang))) return;

    setDisconnecting(true);
    try {
      const res = await fetch(DISCONNECT_ENDPOINT[source], { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || tr("disconnectError", lang));
        return;
      }

      toast.success(tr("disconnectSuccess", lang));
      setStoreData((prev) => (prev ? { ...prev, [source]: null } : prev));

      const remainingTab = (["shopify", "easyorders", "woocommerce"] as const).find(
        (s) => s !== source && storeData?.[s]
      );
      if (remainingTab) setActiveTab(remainingTab);
    } catch {
      toast.error(tr("disconnectError", lang));
    } finally {
      setDisconnecting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return <CardsGridSkeleton count={3} />;
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
    activeTab === "shopify" ? storeData?.shopify :
      activeTab === "easyorders" ? storeData?.easyorders :
        storeData?.woocommerce;
  const storeCount = [storeData?.shopify, storeData?.easyorders, storeData?.woocommerce].filter(Boolean).length;
  const hasBoth = storeCount > 1;

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {activeStore?.storeName ?? tr("storeFallback", lang)}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {activeStore?.isActive === false ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {tr("disconnected", lang)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                {tr("connected", lang)}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {activeStore?.source === "shopify" ? "Shopify"
                : activeStore?.source === "easyorders" ? (lang === "ar" ? "إيزي أوردرز" : "EasyOrders")
                  : "WooCommerce"}
            </span>
          </div>
        </div>

        {activeStore && (
          <button
            onClick={() => handleDisconnect(activeStore.source)}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {disconnecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Unplug className="w-3.5 h-3.5" />
            )}
            {disconnecting ? tr("disconnecting", lang) : tr("disconnectBtn", lang)}
          </button>
        )}
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
                    ? <Zap className="w-4 h-4" />
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
          onOpenChat={onOpenChat ?? (() => { })}
          lang={lang}
        />
      )}
    </div>
  );
}