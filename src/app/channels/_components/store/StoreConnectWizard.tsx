"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, ArrowRight, CheckCircle2, Store as StoreIcon } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { DisconnectModal, UpgradeModal } from "@/app/dashboard/api/_components/Modals";
import { ShopifyIntegration, type ShopifyStatus } from "./ShopifyIntegration";
import { EasyOrdersIntegration } from "./EasyOrdersIntegration";
import { WooCommerceIntegration } from "./WooCommerceIntegration";

type StoreId = "shopify" | "easyorders" | "woocommerce";
type Step = { name: "choose" } | { name: "connect"; store: StoreId } | { name: "done"; store: StoreId };

interface StoreConnectWizardProps {
  open: boolean;
  onClose: () => void;
  canStore: boolean;
  canManageStore: boolean;
}

const STORE_META: Array<{ id: StoreId; icon: string; alt: string }> = [
  { id: "shopify", icon: "/partners/shopify.svg", alt: "Shopify" },
  { id: "easyorders", icon: "/partners/easyorder.svg", alt: "EasyOrders" },
  { id: "woocommerce", icon: "/partners/woocommerce.svg", alt: "WooCommerce" },
];

export default function StoreConnectWizard({ open, onClose, canStore, canManageStore }: StoreConnectWizardProps) {
  const { t, locale } = useLanguage();
  const api = t.api;
  const ar = locale === "ar";

  const [step, setStep] = useState<Step>({ name: "choose" });
  const entryConnectedRef = useRef(false);

  // ── EasyOrders States ──
  const [eoApiKey, setEoApiKey] = useState("");
  const [eoStoreName, setEoStoreName] = useState("");
  const [eoWebhookUrl, setEoWebhookUrl] = useState("");
  const [eoUrlLoaded, setEoUrlLoaded] = useState(false);
  const [eoSyncing, setEoSyncing] = useState(false);
  const [eoWebhookSecretOrders, setEoWebhookSecretOrders] = useState("");
  const [eoSavingSecretOrders, setEoSavingSecretOrders] = useState(false);
  const [eoWebhookSecretStatusUpdate, setEoWebhookSecretStatusUpdate] = useState("");
  const [eoSavingSecretStatusUpdate, setEoSavingSecretStatusUpdate] = useState(false);
  const [eoStatus, setEoStatus] = useState<{
    connected: boolean; storeName?: string; totalSynced?: number; lastSyncAt?: string;
    webhookOrdersConfigured?: boolean; webhookStatusUpdateConfigured?: boolean;
  } | null>(null);

  // ── Shopify States ──
  const [shopifyStatus, setShopifyStatus] = useState<ShopifyStatus | null>(null);
  const [shStoreName, setShStoreName] = useState("");
  const [shShopDomain, setShShopDomain] = useState("");
  const [shClientId, setShClientId] = useState("");
  const [shClientSecret, setShClientSecret] = useState("");
  const [shWebhookUrl, setShWebhookUrl] = useState("");
  const [, setShUrlLoaded] = useState(false);
  const [shConnecting, setShConnecting] = useState(false);
  const [shSyncing, setShSyncing] = useState(false);

  // ── WooCommerce States ──
  const [wooStatus, setWooStatus] = useState<{
    connected: boolean; storeName?: string; totalSynced?: number; lastSyncAt?: string | null;
  } | null>(null);

  // ── Disconnect & Upgrade UI ──
  const [disconnectModal, setDisconnectModal] = useState<{
    open: boolean; title: string; description: string; loading: boolean; onConfirm: () => Promise<void>;
  }>({ open: false, title: "", description: "", loading: false, onConfirm: async () => {} });
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean; title: string; description: string;
  }>({ open: false, title: "", description: "" });

  const isConnected = (id: StoreId): boolean => {
    if (id === "shopify") return !!shopifyStatus?.connected;
    if (id === "easyorders") return !!eoStatus?.connected;
    return !!wooStatus?.connected;
  };

  const storeNameOf = (id: StoreId): string => {
    if (id === "shopify") return ar ? "Shopify" : "Shopify";
    if (id === "easyorders") return ar ? "إيزي أوردرز" : "EasyOrders";
    return "WooCommerce";
  };

  // ── Load statuses when wizard opens ─────────────────────────────────────────
  const loadShopifyStatus = async () => {
    if (!canStore) return;
    try {
      const shUrlRes = await fetch("/api/shopify/URL").catch(() => null);
      const shUrl = shUrlRes?.ok ? await shUrlRes.json() : {};
      const url = shUrl?.url ?? "";

      setShWebhookUrl(url);
      setShUrlLoaded(true);

      if (shUrl?.connected) {
        setShopifyStatus({
          connected: true,
          storeName: shUrl.storeName,
          connectedAt: shUrl.connectedAt,
          webhookUrl: url,
          authMethod: shUrl.authMethod,
        });
      } else {
        setShopifyStatus({ connected: false, webhookUrl: url });
      }

      const storeRes = await fetch("/api/store").catch(() => null);
      if (!storeRes?.ok) return;
      const d = await storeRes.json();

      if (d.woocommerce) {
        setWooStatus({
          connected: true,
          storeName: d.woocommerce.storeName,
          totalSynced: d.woocommerce.totalSynced,
          lastSyncAt: d.woocommerce.lastSyncAt,
        });
      } else {
        setWooStatus({ connected: false });
      }
    } catch (e) {
      console.error("[loadShopifyStatus]", e);
    }
  };

  useEffect(() => {
    if (!open) return;
    setStep({ name: "choose" });
    if (!canStore) return;
    loadShopifyStatus();
    fetch("/api/easy-orders/sync")
      .then(async r => (r.ok ? r.json() : null))
      .then(d => { if (d) setEoStatus(d); })
      .catch(err => console.error("[EasyOrders] Status fetch error", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const loadEoWebhookUrl = async () => {
    if (eoUrlLoaded) return;
    try {
      const r = await fetch("/api/easy-orders/URL");
      const d = await r.json();
      if (d.url) { setEoWebhookUrl(d.url); setEoUrlLoaded(true); }
    } catch {}
  };

  // ── التقدم التلقائي لخطوة "تم الربط" لما الحالة تتحول لمتصل ────────────────
  useEffect(() => {
    if (step.name !== "connect" || entryConnectedRef.current) return;
    if (isConnected(step.store)) setStep({ name: "done", store: step.store });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopifyStatus, eoStatus, wooStatus]);

  const lockMessage = ar
    ? "ربط المتاجر متاح من باقة Pro فما فوق. قم بترقية الباقة."
    : "Store integrations are available on Pro plan and above. Please upgrade.";

  const openStore = (id: StoreId) => {
    if (!canStore) {
      const titles: Record<StoreId, string> = {
        shopify: ar ? "ربط Shopify — باقة Pro+" : "Shopify — Pro+ Plan",
        easyorders: ar ? "ربط EasyOrders — باقة Pro+" : "EasyOrders — Pro+ Plan",
        woocommerce: ar ? "ربط WooCommerce — باقة Pro+" : "WooCommerce — Pro+ Plan",
      };
      setUpgradeModal({
        open: true,
        title: titles[id],
        description: ar
          ? "ربط المتاجر يحتاج باقة Pro أو أعلى. قم بالترقية لربط متجرك وتفعيل الأتمتة."
          : "Store integrations require Pro or above. Upgrade to connect and automate.",
      });
      return;
    }
    entryConnectedRef.current = isConnected(id);
    setStep({ name: "connect", store: id });
    if (id === "easyorders") loadEoWebhookUrl();
  };

  // ── EasyOrders Handlers ──
  const handleEoSync = async () => {
    if (!eoApiKey.trim()) { toast.error(api.cards.easyorders.apiKeyErr); return; }
    setEoSyncing(true);
    try {
      const r = await fetch("/api/easy-orders/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: eoApiKey.trim(), storeName: eoStoreName.trim() || "متجري" }),
      });
      const d = await r.json();
      if (!r.ok) {
        const codeMessages: Record<string, string> = {
          invalid_api_key: api.cards.easyorders.invalidApiKeyErr,
          insufficient_permissions: api.cards.easyorders.insufficientPermsErr,
          network_error: api.cards.easyorders.networkErr,
          timeout: api.cards.easyorders.networkErr,
        };
        toast.error(codeMessages[d.code as string] ?? d.error ?? api.cards.easyorders.syncErr);
        return;
      }
      toast.success(api.cards.easyorders.syncSuccess(d.productsSynced ?? 0));
      if (d.productSyncError) toast.error(d.productSyncError);
      setEoStatus(prev => ({
        connected: true,
        storeName: d.storeName,
        totalSynced: d.productsSynced,
        lastSyncAt: new Date().toISOString(),
        webhookOrdersConfigured: prev?.webhookOrdersConfigured ?? false,
        webhookStatusUpdateConfigured: prev?.webhookStatusUpdateConfigured ?? false,
      }));
    } catch {
      toast.error(api.cards.easyorders.syncErr);
    } finally {
      setEoSyncing(false);
    }
  };

  const handleEoDisconnect = () => {
    setDisconnectModal({
      open: true,
      title: ar ? "فك ربط إيزي أوردرز" : "Disconnect EasyOrders",
      description: ar
        ? "الأوردرات الجديدة مش هتتزامن تلقائياً بعد كده، ورسائل التأكيد التلقائية هتتوقف."
        : "New orders will stop syncing automatically, and auto-confirmation messages will be paused.",
      loading: false,
      onConfirm: async () => {
        setDisconnectModal(prev => ({ ...prev, loading: true }));
        try {
          const r = await fetch("/api/easy-orders/sync", { method: "DELETE" });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error ?? "Error");
          setEoStatus({ connected: false });
          setEoApiKey("");
          setEoStoreName("");
          toast.success(ar ? "تم فك ربط إيزي أوردرز" : "EasyOrders disconnected");
          setDisconnectModal(prev => ({ ...prev, open: false, loading: false }));
        } catch (e: any) {
          toast.error(e?.message ?? (ar ? "فشل فك الربط" : "Disconnect failed"));
          setDisconnectModal(prev => ({ ...prev, loading: false }));
        }
      },
    });
  };

  const handleEoSaveSecret = async (type: "orders" | "status_update") => {
    const secret = type === "orders" ? eoWebhookSecretOrders : eoWebhookSecretStatusUpdate;
    if (!secret.trim()) { toast.error(api.cards.easyorders.secretErr); return; }
    const setSaving = type === "orders" ? setEoSavingSecretOrders : setEoSavingSecretStatusUpdate;
    setSaving(true);
    try {
      const r = await fetch("/api/easy-orders/sync", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, secret: secret.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? api.cards.easyorders.syncErr); return; }
      toast.success(api.cards.easyorders.secretSavedMsg);
      setEoStatus(prev => prev
        ? {
            ...prev,
            ...(type === "orders" ? { webhookOrdersConfigured: true } : { webhookStatusUpdateConfigured: true }),
          }
        : prev);
      if (type === "orders") setEoWebhookSecretOrders(""); else setEoWebhookSecretStatusUpdate("");
    } catch {
      toast.error(api.cards.easyorders.syncErr);
    } finally {
      setSaving(false);
    }
  };

  // ── Shopify Handlers ──
  const handleShConnect = async () => {
    if (!shStoreName.trim()) { toast.error("أدخل اسم المتجر أولاً"); return; }
    if (!shShopDomain.trim()) { toast.error("أدخل دومين Shopify — مطلوب للتحقق من المتجر"); return; }
    const clientId = shClientId.trim();
    const clientSecret = shClientSecret.trim();
    if (!clientId || !clientSecret) {
      toast.error(ar ? "أدخل Client ID و Client Secret — الاتنين مطلوبين" : "Client ID and Client Secret are both required");
      return;
    }
    setShConnecting(true);
    try {
      const r = await fetch("/api/shopify/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: shStoreName.trim(),
          shopDomain: shShopDomain.trim(),
          clientId,
          clientSecret,
        }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "فشل الحفظ"); return; }
      if (d.webhooks?.autoSetup) {
        toast.success(`✅ تم ربط ${d.storeName} وتسجيل ${d.webhooks.registered} webhook تلقائياً 🎉`);
      } else if (d.webhooks?.registered > 0) {
        toast.success(`✅ تم ربط ${d.storeName} — ${d.webhooks.registered} webhook مسجل`);
      } else {
        toast.success(`✅ تم حفظ متجر ${d.storeName} — أضف الـ Webhook URL في Shopify يدوياً`);
      }
      setShStoreName(""); setShShopDomain("");
      setShClientId(""); setShClientSecret("");
      loadShopifyStatus();
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setShConnecting(false);
    }
  };

  const handleShSyncWebhooks = async () => {
    setShSyncing(true);
    try {
      const r = await fetch("/api/shopify/sync-webhooks", { method: "POST" });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "فشل تسجيل الـ webhooks"); return; }
      if (d.success) toast.success(d.message);
      else toast.warning(d.message);
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setShSyncing(false);
    }
  };

  const handleShDisconnect = () => {
    setDisconnectModal({
      open: true,
      title: ar ? "فك ربط متجر Shopify" : "Disconnect Shopify Store",
      description: ar
        ? "سيتم إيقاف مزامنة الطلبات وتحديثات الحالات واستعادة السلات المتروكة تلقائياً لهذا المتجر."
        : "Order synchronization, status updates, and abandoned cart recovery will be stopped for this store.",
      loading: false,
      onConfirm: async () => {
        setDisconnectModal(prev => ({ ...prev, loading: true }));
        try {
          const r = await fetch("/api/shopify/install", { method: "DELETE" });
          if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error(d.error ?? "Failed to disconnect");
          }
          toast.success(ar ? "تم فك ربط Shopify" : "Shopify disconnected");
          loadShopifyStatus();
          setDisconnectModal(prev => ({ ...prev, open: false, loading: false }));
        } catch (e: any) {
          toast.error(e?.message ?? (ar ? "فشل فك الربط" : "Failed to disconnect"));
          setDisconnectModal(prev => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // ── WooCommerce Handlers ──
  const handleWooDisconnect = () => {
    setDisconnectModal({
      open: true,
      title: ar ? "فك ربط متجر WooCommerce" : "Disconnect WooCommerce Store",
      description: ar
        ? "سيتم إيقاف مزامنة الطلبات والمنتجات وتحديثات الحالات التلقائية لهذا المتجر."
        : "Order & product synchronization and automatic status updates will be stopped for this store.",
      loading: false,
      onConfirm: async () => {
        setDisconnectModal(prev => ({ ...prev, loading: true }));
        try {
          const r = await fetch("/api/woocommerce/connect", { method: "DELETE" });
          if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error(d.error ?? "Failed to disconnect");
          }
          toast.success(ar ? "تم فك ربط WooCommerce" : "WooCommerce disconnected");
          loadShopifyStatus();
          setDisconnectModal(prev => ({ ...prev, open: false, loading: false }));
        } catch (e: any) {
          toast.error(e?.message ?? (ar ? "فشل فك الربط" : "Failed to disconnect"));
          setDisconnectModal(prev => ({ ...prev, loading: false }));
        }
      },
    });
  };

  if (!open) return null;

  const close = () => {
    setStep({ name: "choose" });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={close}
      dir={ar ? "rtl" : "ltr"}
    >
      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal(prev => ({ ...prev, open: false }))}
        title={upgradeModal.title}
        description={upgradeModal.description}
        price={ar ? "599 ج/شهر" : "599 EGP/mo"}
        locale={locale}
      />

      <DisconnectModal
        isOpen={disconnectModal.open}
        onClose={() => setDisconnectModal(prev => ({ ...prev, open: false }))}
        onConfirm={disconnectModal.onConfirm}
        title={disconnectModal.title}
        description={disconnectModal.description}
        loading={disconnectModal.loading}
        locale={locale}
      />

      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#071f18] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 flex-shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex-shrink-0">
            <StoreIcon className="h-5 w-5 text-emerald-300" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              {step.name === "choose" && (ar ? "ربط متجر" : "Connect a store")}
              {step.name === "connect" && `${ar ? "ربط" : "Connect"} ${storeNameOf(step.store)}`}
              {step.name === "done" && (ar ? "تم الربط" : "Connected")}
            </p>
            <p className="text-[11px] text-white/40">
              {step.name === "choose" && (ar ? "اختار المنصة" : "Choose a platform")}
              {step.name === "connect" && (ar ? "ادخل البيانات للربط" : "Enter details to connect")}
              {step.name === "done" && (ar ? "متجرك جاهز" : "Your store is ready")}
            </p>
          </div>
          {/* steps dots */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {(["choose", "connect", "done"] as const).map((s, i) => {
              const order = { choose: 0, connect: 1, done: 2 } as const;
              const cur = order[step.name];
              return (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${i <= cur ? "w-5 bg-emerald-400" : "w-1.5 bg-white/15"}`}
                />
              );
            })}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={ar ? "إغلاق" : "Close"}
            className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {!canManageStore ? (
            <div className="text-center py-6">
              <p className="text-sm font-bold text-white">
                {ar ? "ربط المتاجر متاح لأصحاب الصلاحيات فقط" : "Store integrations require additional permissions"}
              </p>
              <p className="mt-1 text-xs text-white/50">
                {ar ? "تواصل مع مالك الحساب لمنحك صلاحية إدارة المتاجر." : "Ask the account owner for store management permission."}
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-5 rounded-xl bg-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition"
              >
                {ar ? "إغلاق" : "Close"}
              </button>
            </div>
          ) : step.name === "choose" ? (
            <div className="space-y-2.5">
              {STORE_META.map(({ id, icon, alt }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => openStore(id)}
                  className="w-full flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-start transition-all hover:border-emerald-500/40 hover:bg-emerald-500/[0.07] active:scale-[0.99]"
                >
                  <img src={icon} alt={alt} className="h-9 w-9 object-contain flex-shrink-0 rounded-xl bg-white/90 p-1" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white">{storeNameOf(id)}</span>
                    <span className="block text-[11px] text-white/45 mt-0.5">
                      {id === "shopify" && (ar ? "Client ID + Secret — تسجيل تلقائي للـ Webhooks" : "Client ID + Secret — auto Webhook setup")}
                      {id === "easyorders" && (ar ? "تكامل يدوي آمن عبر API" : "Secure manual API integration")}
                      {id === "woocommerce" && (ar ? "ربط موحّد — أوردرات + منتجات" : "Unified — orders + products")}
                    </span>
                  </span>
                  {isConnected(id) ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300 flex-shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {ar ? "متصل" : "Connected"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/50 flex-shrink-0">
                      {ar ? "غير متصل" : "Not connected"}
                    </span>
                  )}
                </button>
              ))}
              {!canStore && (
                <p className="text-center text-[11px] text-amber-300/80 pt-1">{lockMessage}</p>
              )}
            </div>
          ) : step.name === "connect" ? (
            <div>
              <button
                type="button"
                onClick={() => setStep({ name: "choose" })}
                className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition"
              >
                <ArrowRight className={`h-3.5 w-3.5 ${ar ? "" : "rotate-180"}`} />
                {ar ? "كل المتاجر" : "All stores"}
              </button>

              {step.store === "shopify" && (
                <ShopifyIntegration
                  storeName={shStoreName}
                  shopDomain={shShopDomain}
                  setShopDomain={setShShopDomain}
                  clientId={shClientId}
                  setClientId={setShClientId}
                  clientSecret={shClientSecret}
                  setClientSecret={setShClientSecret}
                  setStoreName={setShStoreName}
                  isSuperAdmin={false}
                  webhookUrl={shWebhookUrl}
                  status={shopifyStatus}
                  onConnect={handleShConnect}
                  onSyncWebhooks={handleShSyncWebhooks}
                  syncing={shSyncing}
                  onRefresh={loadShopifyStatus}
                  loading={shConnecting}
                  locale={locale}
                  onDisconnect={handleShDisconnect}
                />
              )}

              {step.store === "easyorders" && (
                <EasyOrdersIntegration
                  apiKey={eoApiKey}
                  setApiKey={setEoApiKey}
                  storeName={eoStoreName}
                  setStoreName={setEoStoreName}
                  webhookUrl={eoWebhookUrl}
                  syncing={eoSyncing}
                  status={eoStatus}
                  onSync={handleEoSync}
                  onDisconnect={handleEoDisconnect}
                  webhookSecretOrders={eoWebhookSecretOrders}
                  setWebhookSecretOrders={setEoWebhookSecretOrders}
                  savingSecretOrders={eoSavingSecretOrders}
                  onSaveSecretOrders={() => handleEoSaveSecret("orders")}
                  webhookSecretStatusUpdate={eoWebhookSecretStatusUpdate}
                  setWebhookSecretStatusUpdate={setEoWebhookSecretStatusUpdate}
                  savingSecretStatusUpdate={eoSavingSecretStatusUpdate}
                  onSaveSecretStatusUpdate={() => handleEoSaveSecret("status_update")}
                  labels={api.cards.easyorders}
                  locale={locale}
                />
              )}

              {step.store === "woocommerce" && (
                <WooCommerceIntegration
                  status={wooStatus}
                  onRefresh={loadShopifyStatus}
                  locale={locale}
                  onDisconnect={handleWooDisconnect}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </span>
              <p className="text-base font-extrabold text-white">
                {ar ? "تم الربط بنجاح 🎉" : "Connected successfully 🎉"}
              </p>
              <p className="mt-1.5 text-xs text-white/50">
                {ar
                  ? `متجر ${storeNameOf(step.store)} اتربط وهيبدأ مزامنة الأوردرات تلقائيًا.`
                  : `Your ${storeNameOf(step.store)} store is connected and will start syncing orders.`}
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-5 w-full rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-[#04241b] hover:brightness-110 active:scale-[0.99] transition"
              >
                {ar ? "تم" : "Done"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
