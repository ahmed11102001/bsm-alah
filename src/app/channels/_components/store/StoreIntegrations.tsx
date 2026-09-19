"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { StoreCardId, StoreCardDef } from "./store-types";
import { StoreIntegrationCard } from "./StoreIntegrationCard";
import { DisconnectModal, UpgradeModal } from "@/app/dashboard/api/_components/Modals";
import { ShopifyScopesBox } from "./ShopifyScopesBox";
import { ShopifyIntegration, type ShopifyStatus } from "./ShopifyIntegration";
import { EasyOrdersIntegration } from "./EasyOrdersIntegration";
import { WooCommerceIntegration } from "./WooCommerceIntegration";

interface StoreIntegrationsProps {
  canStore: boolean;
  canManageStore: boolean;
  autoOpen?: boolean;
}

export default function StoreIntegrations({ canStore, canManageStore, autoOpen = false }: StoreIntegrationsProps) {
  const { t, locale } = useLanguage();
  const api = t.api;
  const sectionRef = useRef<HTMLDivElement>(null);

  const [openCard, setOpenCard] = useState<StoreCardId | null>(autoOpen ? "shopify" : null);

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

  // ── Load initial data ───────────────────────────────────────────────────────
  const loadShopifyStatus = useCallback(async () => {
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
  }, [canStore]);

  useEffect(() => {
    if (canStore) {
      fetch("/api/easy-orders/sync")
        .then(async r => (r.ok ? r.json() : null))
        .then(d => { if (d) setEoStatus(d); })
        .catch(err => console.error("[EasyOrders] Status fetch error", err));
    }
    loadShopifyStatus();
  }, [canStore, loadShopifyStatus]);

  useEffect(() => {
    if (autoOpen && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [autoOpen]);

  const loadEoWebhookUrl = useCallback(async () => {
    if (eoUrlLoaded) return;
    try {
      const r = await fetch("/api/easy-orders/URL");
      const d = await r.json();
      if (d.url) { setEoWebhookUrl(d.url); setEoUrlLoaded(true); }
    } catch {}
  }, [eoUrlLoaded]);

  // ── Plan Lock ──
  const lockMessage = locale === "ar"
    ? "ربط المتاجر متاح من باقة Pro فما فوق. قم بترقية الباقة."
    : "Store integrations are available on Pro plan and above. Please upgrade.";
  const isStoreCardLocked = () => !canStore;
  const handleCardClick = (id: StoreCardId) => {
    if (isStoreCardLocked()) {
      const upgradeDetails: Record<StoreCardId, { title: string; description: string }> = {
        shopify: {
          title: locale === "ar" ? "ربط Shopify — باقة Pro+" : "Shopify — Pro+ Plan",
          description: locale === "ar" ? "ربط المتاجر يحتاج باقة Pro أو أعلى. قم بالترقية لربط متجرك وتفعيل الأتمتة." : "Store integrations require Pro or above. Upgrade to connect and automate.",
        },
        easyorders: {
          title: locale === "ar" ? "ربط EasyOrders — باقة Pro+" : "EasyOrders — Pro+ Plan",
          description: locale === "ar" ? "ربط المتاجر يحتاج باقة Pro أو أعلى. قم بالترقية لربط متجرك وتفعيل الأتمتة." : "Store integrations require Pro or above. Upgrade to connect and automate.",
        },
        woocommerce: {
          title: locale === "ar" ? "ربط WooCommerce — باقة Pro+" : "WooCommerce — Pro+ Plan",
          description: locale === "ar" ? "ربط المتاجر يحتاج باقة Pro أو أعلى. قم بالترقية لربط متجرك وتفعيل الأتمتة." : "Store integrations require Pro or above. Upgrade to connect and automate.",
        },
      };
      const d = upgradeDetails[id];
      setUpgradeModal({ open: true, title: d.title, description: d.description });
      return;
    }
    setOpenCard(prev => (prev === id ? null : id));
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
      title: locale === "ar" ? "فك ربط إيزي أوردرز" : "Disconnect EasyOrders",
      description: locale === "ar"
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
          toast.success(locale === "ar" ? "تم فك ربط إيزي أوردرز" : "EasyOrders disconnected");
          setDisconnectModal(prev => ({ ...prev, open: false, loading: false }));
        } catch (e: any) {
          toast.error(e?.message ?? (locale === "ar" ? "فشل فك الربط" : "Disconnect failed"));
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

  // ── Shopify Handlers (Client Credentials فقط — بلا Admin Token) ──
  const handleShConnect = async () => {
    if (!shStoreName.trim()) { toast.error("أدخل اسم المتجر أولاً"); return; }
    if (!shShopDomain.trim()) { toast.error("أدخل دومين Shopify — مطلوب للتحقق من المتجر"); return; }
    const clientId = shClientId.trim();
    const clientSecret = shClientSecret.trim();
    if (!clientId || !clientSecret) {
      toast.error(locale === "ar" ? "أدخل Client ID و Client Secret — الاتنين مطلوبين" : "Client ID and Client Secret are both required");
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
      title: locale === "ar" ? "فك ربط متجر Shopify" : "Disconnect Shopify Store",
      description: locale === "ar"
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
          toast.success(locale === "ar" ? "تم فك ربط Shopify" : "Shopify disconnected");
          loadShopifyStatus();
          setDisconnectModal(prev => ({ ...prev, open: false, loading: false }));
        } catch (e: any) {
          toast.error(e?.message ?? (locale === "ar" ? "فشل فك الربط" : "Failed to disconnect"));
          setDisconnectModal(prev => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // ── WooCommerce Handlers ──
  const handleWooDisconnect = () => {
    setDisconnectModal({
      open: true,
      title: locale === "ar" ? "فك ربط متجر WooCommerce" : "Disconnect WooCommerce Store",
      description: locale === "ar"
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
          toast.success(locale === "ar" ? "تم فك ربط WooCommerce" : "WooCommerce disconnected");
          loadShopifyStatus();
          setDisconnectModal(prev => ({ ...prev, open: false, loading: false }));
        } catch (e: any) {
          toast.error(e?.message ?? (locale === "ar" ? "فشل فك الربط" : "Failed to disconnect"));
          setDisconnectModal(prev => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // ── Card Definitions ──
  const CARD_DEFS: StoreCardDef[] = [
    {
      id: "shopify",
      title: locale === "ar" ? "ربط Shopify" : "Connect Shopify",
      subtitle: locale === "ar" ? "Client ID + Secret — تسجيل تلقائي للـ Webhooks" : "Client ID + Secret — auto Webhook setup",
      steps: [
        { title: locale === "ar" ? "أنشئ تطبيقًا من لوحة مطوري Shopify" : "Create an app in Shopify Dev Dashboard", desc: locale === "ar" ? "افتح الزرار تحت ← أنشئ تطبيقًا جديدًا (Create app) ← اختر متجرك وثبّت التطبيق عليه (Custom distribution)." : "Open the button below → create a new app (Create app) → select your store and install it (Custom distribution)." },
        { title: locale === "ar" ? "فعّل الصلاحيات وثبّت" : "Enable scopes & install", desc: locale === "ar" ? "من صفحة التطبيق: Configuration ← فعّل صلاحيات Admin API من الصندوق تحت ← احفظ ثم Install/Update عشان تتطبق." : "In the app page: Configuration → enable the Admin API scopes from the box below → Save, then Install/Update to apply." },
        { title: locale === "ar" ? "انسخ بيانات الاعتماد واربط" : "Copy credentials & connect", desc: locale === "ar" ? "من API credentials انسخ Client ID و Client Secret والصقهما في وني مع اسم المتجر والدومين — وهنسجل الـ Webhooks تلقائيًا." : "From API credentials copy the Client ID and Client Secret, paste them in Wani with the store name and domain — webhooks register automatically." },
      ],
      guideExtra: <ShopifyScopesBox locale={locale} />,
      externalLink: {
        href: "https://dev.shopify.com/dashboard",
        label: locale === "ar" ? "لوحة مطوري Shopify (Dev Dashboard)" : "Shopify Dev Dashboard",
      },
    },
    {
      id: "easyorders",
      title: api.cards.easyorders.title,
      subtitle: api.cards.easyorders.subtitle,
      steps: api.cards.easyorders.steps.map((s: any) => ({ title: s.title, desc: s.desc })),
      externalLink: {
        href: "https://app.easy-orders.net",
        label: locale === "ar" ? "لوحة تحكم إيزي أوردرز (EasyOrders)" : "EasyOrders Dashboard",
      },
    },
    {
      id: "woocommerce",
      title: locale === "ar" ? "ربط WooCommerce" : "Connect WooCommerce",
      subtitle: locale === "ar" ? "ربط موحّد — أوردرات + منتجات AI" : "Unified — orders + AI products",
      steps: [
        { title: locale === "ar" ? "أدخل بيانات المتجر" : "Enter store details", desc: locale === "ar" ? "اسم المتجر + الرابط + Consumer Key/Secret من WooCommerce REST API" : "Store name + URL + Consumer Key/Secret from WooCommerce REST API" },
        { title: locale === "ar" ? "اضغط ربط المتجر" : "Click Connect", desc: locale === "ar" ? "هنتحقق من صحة البيانات ونبدأ مزامنة المنتجات تلقائياً" : "We'll verify credentials and auto-sync products" },
        { title: locale === "ar" ? "أضف الـ Webhook" : "Add the Webhook", desc: locale === "ar" ? "انسخ الـ Webhook URL وأضفه في WooCommerce → Settings → Advanced → Webhooks" : "Copy the Webhook URL and add it in WooCommerce → Settings → Advanced → Webhooks" },
      ],
      externalLink: {
        href: "https://woocommerce.com/document/woocommerce-rest-api/",
        label: locale === "ar" ? "دليل وتوثيق WooCommerce REST API" : "WooCommerce REST API Docs",
      },
    },
  ];

  if (!canManageStore) {
    return (
      <div ref={sectionRef} className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur-md">
        <p className="text-sm font-bold text-white">
          {locale === "ar" ? "ربط المتاجر متاح لأصحاب الصلاحيات فقط" : "Store integrations require additional permissions"}
        </p>
        <p className="mt-1 text-xs text-white/50">
          {locale === "ar" ? "تواصل مع مالك الحساب لمنحك صلاحية إدارة المتاجر." : "Ask the account owner for store management permission."}
        </p>
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="mt-10 scroll-mt-24">
      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal(prev => ({ ...prev, open: false }))}
        title={upgradeModal.title}
        description={upgradeModal.description}
        price={locale === "ar" ? "599 ج/شهر" : "599 EGP/mo"}
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

      {/* Section Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-400" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/50">
          {locale === "ar" ? "ربط المتاجر (Shopify / EasyOrders / WooCommerce)" : "Store Integrations (Shopify / EasyOrders / WooCommerce)"}
        </h2>
      </div>

      {/* Cards List */}
      <div className="space-y-3.5">
        {CARD_DEFS.map(card => {
          const getConnected = (): { connected: boolean; label?: string } => {
            if (card.id === "shopify") return { connected: !!shopifyStatus?.connected, label: shopifyStatus?.storeName };
            if (card.id === "easyorders") return { connected: !!eoStatus?.connected, label: eoStatus?.storeName };
            if (card.id === "woocommerce") return { connected: !!wooStatus?.connected, label: wooStatus?.storeName };
            return { connected: false };
          };
          const cs = getConnected();
          const locked = !canStore;

          return (
            <StoreIntegrationCard
              key={card.id}
              {...card}
              locale={locale}
              isOpen={openCard === card.id}
              onToggle={() => handleCardClick(card.id)}
              locked={locked}
              lockMessage={lockMessage}
              connected={cs.connected}
              connectedLabel={cs.label}
            >
              {card.id === "shopify" && (
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

              {card.id === "easyorders" && (
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

              {card.id === "woocommerce" && (
                <WooCommerceIntegration
                  status={wooStatus}
                  onRefresh={loadShopifyStatus}
                  locale={locale}
                  onDisconnect={handleWooDisconnect}
                />
              )}
            </StoreIntegrationCard>
          );
        })}
      </div>
    </div>
  );
}
