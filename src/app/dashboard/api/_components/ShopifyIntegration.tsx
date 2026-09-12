"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, RefreshCw, Trash2, Key, Eye, EyeOff,
  Link as LinkIcon, Loader2, ShoppingBag, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { normalizeShopDomain } from "@/lib/shopify-domain";
import { CopyInput } from "./CopyInput";

export interface ShopifyStatus {
  connected: boolean;
  storeName?: string;
  connectedAt?: string | null;
  webhookUrl?: string;
  authMethod?: "legacy_token" | "client_credentials" | "none";
}

export interface ShopifyIntegrationProps {
  storeName: string;
  setStoreName: (v: string) => void;
  shopDomain: string;
  setShopDomain: (v: string) => void;
  accessToken: string;
  setAccessToken: (v: string) => void;
  clientId: string;
  setClientId: (v: string) => void;
  clientSecret: string;
  setClientSecret: (v: string) => void;
  webhookUrl: string;
  status: ShopifyStatus | null;
  onConnect: () => void;
  onRefresh: () => void;
  onSyncWebhooks: () => void;
  loading: boolean;
  syncing: boolean;
  isSuperAdmin?: boolean;
  locale?: string;
  onDisconnect?: () => void;
}

export function ShopifyIntegration({
  storeName,
  setStoreName,
  shopDomain,
  setShopDomain,
  accessToken,
  setAccessToken,
  clientId,
  setClientId,
  clientSecret,
  setClientSecret,
  webhookUrl,
  status,
  onConnect,
  onRefresh,
  onSyncWebhooks,
  loading,
  syncing,
  locale = "ar",
  onDisconnect,
}: ShopifyIntegrationProps) {
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [oauthShop, setOAuthShop] = useState("");

  const showOAuth = true;

  function handleOAuthConnect() {
    const raw = oauthShop.trim();
    if (!raw) {
      toast.error(
        locale === "ar"
          ? "أدخل دومين متجرك أولاً (مثال: mystore.myshopify.com أو mystore)"
          : "Enter your store domain first (e.g. mystore.myshopify.com or mystore)"
      );
      return;
    }
    const shop = normalizeShopDomain(raw);
    if (!shop) {
      toast.error(
        locale === "ar"
          ? "دومين Shopify غير صالح — بصيغة متجر.myshopify.com"
          : "Invalid Shopify domain (format: yourstore.myshopify.com)"
      );
      return;
    }
    window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(shop)}`;
  }

  useEffect(() => {
    if (status?.connected) setShowForm(false);
  }, [status?.connected]);

  async function handleDisconnect() {
    if (onDisconnect) {
      onDisconnect();
      return;
    }
    const r = await fetch("/api/shopify/install", { method: "DELETE" });
    if (r.ok) {
      toast.success(locale === "ar" ? "تم فك الربط" : "Disconnected successfully");
      onRefresh();
    } else {
      toast.error(locale === "ar" ? "فشل فك الربط" : "Failed to disconnect");
    }
  }

  return (
    <div className="space-y-4">
      {/* ── متجر مربوط ── */}
      {status?.connected && !showForm && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50/80 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="flex-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              {status.storeName} — {locale === "ar" ? "متصل ✅" : "Connected ✅"}
              {status.authMethod && status.authMethod !== "none" && (
                <span className="ms-1.5 text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                  ({status.authMethod === "legacy_token" ? "Access Token" : "Client ID/Secret"})
                </span>
              )}
            </p>
          </div>
          {/* زر مزامنة الـ Webhooks */}
          <Button
            type="button"
            variant="outline"
            onClick={onSyncWebhooks}
            disabled={syncing}
            className="w-full gap-2 text-xs font-medium dark:border-gray-700"
          >
            {syncing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                {locale === "ar" ? "جاري تسجيل الـ Webhooks..." : "Registering webhooks..."}
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />{" "}
                {locale === "ar" ? "مزامنة الـ Webhooks تلقائياً" : "Auto-sync Webhooks"}
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="flex-1 gap-2 text-xs font-medium dark:border-gray-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {locale === "ar" ? "تعديل البيانات" : "Edit credentials"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDisconnect}
              className="gap-2 text-xs font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Trash2 className="w-3.5 h-3.5" /> {locale === "ar" ? "فك الربط" : "Disconnect"}
            </Button>
          </div>
        </div>
      )}

      {/* ── نموذج البيانات (قبل الربط أو أثناء التعديل) ── */}
      {(!status?.connected || showForm) && (
        <div className="space-y-3.5">
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {locale === "ar" ? "اسم المتجر *" : "Store Name *"}
            </Label>
            <Input
              placeholder={locale === "ar" ? "مثال: متجري" : "e.g. My Store"}
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              autoComplete="off"
              className="mt-1 dark:bg-gray-800 dark:border-gray-700 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {locale === "ar" ? "دومين Shopify *" : "Shopify Domain *"}
              <span className="text-gray-400 font-normal mr-1">
                {locale === "ar" ? "(بصيغة store.myshopify.com)" : "(e.g. store.myshopify.com)"}
              </span>
            </Label>
            <Input
              placeholder="mystore.myshopify.com"
              value={shopDomain}
              onChange={e => setShopDomain(e.target.value)}
              autoComplete="off"
              className="mt-1 dark:bg-gray-800 dark:border-gray-700 text-left text-xs font-mono"
              dir="ltr"
            />
          </div>

          {/* Admin API Access Token */}
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Key className="w-3 h-3 text-emerald-600" />
              Admin API Access Token
              <span className="text-gray-400 font-normal mr-1">
                {locale === "ar" ? "(للمتاجر القديمة — يبدأ بـ shpat_)" : "(legacy — starts with shpat_)"}
              </span>
            </Label>
            <div className="relative mt-1">
              <Input
                id="shopify-admin-access-token"
                name="shopify_admin_access_token_custom"
                placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                type={showToken ? "text" : "password"}
                autoComplete="new-password"
                spellCheck={false}
                className="dark:bg-gray-800 dark:border-gray-700 text-left pl-10 font-mono text-xs"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Client ID + Client Secret (Dev Dashboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Key className="w-3 h-3 text-emerald-600" /> Client ID
              </Label>
              <Input
                id="shopify-client-id"
                name="shopify_client_id_custom"
                placeholder="Client ID"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                autoComplete="off"
                className="mt-1 dark:bg-gray-800 dark:border-gray-700 text-left font-mono text-xs"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Key className="w-3 h-3 text-emerald-600" /> Client Secret
              </Label>
              <div className="relative mt-1">
                <Input
                  id="shopify-client-secret"
                  name="shopify_client_secret_custom"
                  placeholder="Client Secret"
                  value={clientSecret}
                  onChange={e => setClientSecret(e.target.value)}
                  type={showSecret ? "text" : "password"}
                  autoComplete="new-password"
                  spellCheck={false}
                  className="dark:bg-gray-800 dark:border-gray-700 text-left pl-10 font-mono text-xs"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(v => !v)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Webhook URL */}
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-1">
              <LinkIcon className="w-3 h-3" /> Webhook URL
              <span className="text-gray-400 font-normal">
                {status?.connected
                  ? locale === "ar" ? "(للإضافة اليدوية إن احتجت)" : "(for manual adding if needed)"
                  : locale === "ar" ? "(يتسجل تلقائياً عند إدخال البيانات)" : "(auto-registered with credentials)"}
              </span>
            </Label>
            <CopyInput value={webhookUrl} placeholder={webhookUrl ? "" : locale === "ar" ? "جاري التحميل..." : "Loading..."} />
          </div>

          {/* ── زر الربط بالأسفل ── */}
          <div className="pt-2 space-y-2.5">
            <Button
              type="button"
              size="default"
              onClick={onConnect}
              disabled={loading || !storeName.trim() || !shopDomain.trim()}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />{" "}
                  {locale === "ar" ? "جاري الحفظ والتسجيل..." : "Saving & registering..."}
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />{" "}
                  {locale === "ar" ? "ربط المتجر وتسجيل الـ Webhooks" : "Connect Store & Register Webhooks"}
                </>
              )}
            </Button>

            {/* الربط التلقائي بضغطة واحدة */}
            {showOAuth && !status?.connected && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{locale === "ar" ? "أو الربط التلقائي بضغطة واحدة (موصى به)" : "Or 1-Click Auto Connect (Recommended)"}</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="mystore.myshopify.com"
                    value={oauthShop}
                    onChange={e => setOAuthShop(e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700 text-left text-xs font-mono"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOAuthConnect}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex-shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5" /> {locale === "ar" ? "ربط تلقائي" : "Auto Connect"}
                  </Button>
                </div>
              </div>
            )}

            {showForm && status?.connected && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition py-1"
              >
                {locale === "ar" ? "إلغاء التعديل" : "Cancel"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
