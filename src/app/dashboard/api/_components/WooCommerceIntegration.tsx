"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, RefreshCw, Trash2, Globe, Key, Eye, EyeOff,
  Link as LinkIcon, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { CopyInput } from "./CopyInput";

export interface WooStatus {
  connected: boolean;
  storeName?: string;
  storeUrl?: string;
  totalSynced?: number;
  lastSyncAt?: string | null;
  productsAvailable?: number;
}

export interface WooCommerceIntegrationProps {
  status: WooStatus | null;
  onRefresh: () => void;
  locale: string;
  onDisconnect?: () => void;
}

export function WooCommerceIntegration({
  status,
  onRefresh,
  locale,
  onDisconnect,
}: WooCommerceIntegrationProps) {
  const isAr = locale === "ar";
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [urlLoaded, setUrlLoaded] = useState(false);
  const [error, setError] = useState("");
  const [showKeys, setShowKeys] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);

  const loadWebhookUrl = useCallback(async () => {
    if (urlLoaded) return;
    try {
      const r = await fetch("/api/woocommerce/URL");
      const d = await r.json();
      if (d.url) {
        setWebhookUrl(d.url);
        setUrlLoaded(true);
      }
    } catch { }
  }, [urlLoaded]);

  useEffect(() => {
    loadWebhookUrl();
  }, [loadWebhookUrl]);

  async function handleConnect() {
    setError("");
    if (!storeName.trim()) {
      setError(isAr ? "أدخل اسم المتجر" : "Store name is required");
      return;
    }
    if (!storeUrl.trim()) {
      setError(isAr ? "أدخل رابط المتجر" : "Store URL is required");
      return;
    }
    if (!consumerKey.trim() || !consumerSecret.trim()) {
      setError(isAr ? "أدخل Consumer Key و Consumer Secret" : "Consumer Key and Secret are required");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/woocommerce/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: storeName.trim(),
          storeUrl: storeUrl.trim(),
          consumerKey: consumerKey.trim(),
          consumerSecret: consumerSecret.trim(),
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? (isAr ? "فشل الربط" : "Connection failed"));
        return;
      }
      if (d.webhookUrl) setWebhookUrl(d.webhookUrl);
      toast.success(
        isAr
          ? `✅ تم ربط ${d.storeName} بنجاح — ${d.productsAvailable ?? 0} منتج متاح — بدأت مزامنة المنتجات تلقائياً`
          : `✅ ${d.storeName} connected — ${d.productsAvailable ?? 0} products available — product sync started`
      );
      setStoreName("");
      setStoreUrl("");
      setConsumerKey("");
      setConsumerSecret("");
      onRefresh();
    } catch {
      setError(isAr ? "خطأ في الاتصال" : "Connection error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (onDisconnect) {
      onDisconnect();
      return;
    }
    const r = await fetch("/api/woocommerce/connect", { method: "DELETE" });
    if (r.ok) {
      toast.success(isAr ? "تم فك الربط" : "Disconnected");
      onRefresh();
    } else {
      toast.error(isAr ? "فشل فك الربط" : "Failed to disconnect");
    }
  }

  async function handleSyncProducts() {
    setSyncingProducts(true);
    try {
      const r = await fetch("/api/ai-agent/products/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "woocommerce" }),
      });
      if (r.ok) {
        toast.success(isAr ? "تم بدء مزامنة المنتجات في الخلفية" : "Product sync started in background");
      } else {
        toast.error(isAr ? "فشل بدء المزامنة" : "Failed to start sync");
      }
    } catch {
      toast.error(isAr ? "خطأ أثناء المزامنة" : "Sync error");
    } finally {
      setSyncingProducts(false);
    }
  }

  const dateStr = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString(isAr ? "ar-EG" : "en-US")
    : "";

  return (
    <div className="space-y-4">
      {/* Connected Badge */}
      {status?.connected && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50/80 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                {status.storeName} — {(status.totalSynced ?? 0).toLocaleString(isAr ? "ar-EG" : "en-US")}{" "}
                {isAr ? "طلب مستلم" : "orders received"}
              </p>
              {dateStr && (
                <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                  {isAr ? "آخر طلب" : "Last order"}: {dateStr}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              className="text-red-500 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Sync Products button for connected stores */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncProducts}
            disabled={syncingProducts}
            className="w-full gap-2 text-xs font-medium dark:border-gray-700"
          >
            {syncingProducts ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                {isAr ? "جاري مزامنة المنتجات..." : "Syncing products..."}
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />{" "}
                {isAr ? "مزامنة المنتجات للذكاء الاصطناعي" : "Sync products for AI"}
              </>
            )}
          </Button>
        </div>
      )}

      {/* ── نموذج البيانات ── */}
      {!status?.connected && (
        <div className="space-y-3.5">
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {isAr ? "اسم المتجر *" : "Store name *"}
            </Label>
            <Input
              id="woo_store_name"
              name="woo_store_name"
              autoComplete="off"
              placeholder={isAr ? "مثال: متجري" : "E.g. My Store"}
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              className="mt-1 dark:bg-gray-800 dark:border-gray-700 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Globe className="w-3 h-3 text-emerald-600" /> {isAr ? "رابط المتجر *" : "Store URL *"}
            </Label>
            <Input
              id="woo_store_url"
              name="woo_store_url"
              autoComplete="off"
              placeholder="https://mystore.com"
              dir="ltr"
              value={storeUrl}
              onChange={e => setStoreUrl(e.target.value)}
              className="mt-1 dark:bg-gray-800 dark:border-gray-700 font-mono text-xs text-left"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Key className="w-3 h-3 text-emerald-600" /> Consumer Key *
              </Label>
              <Input
                id="woo_consumer_key_custom"
                name="woo_consumer_key_custom"
                autoComplete="new-password"
                spellCheck={false}
                placeholder="ck_xxxxxxxxxxxxxxxx"
                dir="ltr"
                value={consumerKey}
                onChange={e => setConsumerKey(e.target.value)}
                type={showKeys ? "text" : "password"}
                className="mt-1 font-mono text-xs dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Key className="w-3 h-3 text-emerald-600" /> Consumer Secret *
              </Label>
              <div className="relative mt-1">
                <Input
                  id="woo_consumer_secret_custom"
                  name="woo_consumer_secret_custom"
                  autoComplete="new-password"
                  spellCheck={false}
                  placeholder="cs_xxxxxxxxxxxxxxxx"
                  dir="ltr"
                  value={consumerSecret}
                  onChange={e => setConsumerSecret(e.target.value)}
                  type={showKeys ? "text" : "password"}
                  className="font-mono text-xs dark:bg-gray-800 dark:border-gray-700 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKeys(v => !v)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook URL */}
      <div>
        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-1">
          <LinkIcon className="w-3 h-3 text-emerald-600" /> Webhook URL
          <span className="text-gray-400 font-normal">
            {status?.connected
              ? isAr ? "(أضفه يدوياً في إعدادات WooCommerce)" : "(add manually in WooCommerce)"
              : isAr ? "(رابط الاستقبال)" : "(receiving URL)"}
          </span>
        </Label>
        <CopyInput value={webhookUrl} placeholder={isAr ? "جاري التحميل..." : "Loading..."} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* ── زر الربط بالأسفل ── */}
      {!status?.connected && (
        <div className="pt-2">
          <Button
            type="button"
            onClick={handleConnect}
            disabled={loading || !storeName.trim() || !storeUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()}
            size="default"
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {isAr ? "جاري الربط والتحقق..." : "Connecting & verifying..."}
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" /> {isAr ? "ربط المتجر والتحقق" : "Connect Store & Verify"}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
