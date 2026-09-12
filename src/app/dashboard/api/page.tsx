"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { saveWhatsAppSettings } from "@/app/actions/whatsapp";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useSubscription } from "@/lib/dashboard-context";

import { CardId, CategoryId, CATEGORIES, CardDef } from "./_types";
import { DisconnectModal, UpgradeModal } from "./_components/Modals";
import { IntegrationCard } from "./_components/IntegrationCard";
import { WhatsAppIntegration } from "./_components/WhatsAppIntegration";
import { ShopifyIntegration, type ShopifyStatus } from "./_components/ShopifyIntegration";
import { EasyOrdersIntegration } from "./_components/EasyOrdersIntegration";
import { WooCommerceIntegration } from "./_components/WooCommerceIntegration";
import { ClaudeIntegration } from "./_components/ClaudeIntegration";
import { ElevenLabsIntegration } from "./_components/ElevenLabsIntegration";
import { WebhookIntegration } from "./_components/WebhookIntegration";

export default function API() {
  const { dashData, canStore: canUseStoreIntegrations, canUseClaude, planTier, isSuper, metaTokenStatus } = useSubscription();
  const initialData = dashData?.whatsapp;
  const { t, dir, locale } = useLanguage();
  const api = t.api;

  const [openCard, setOpenCard] = useState<CardId | null>(null);

  // ── WhatsApp States ──
  const [waLoading, setWaLoading] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const [waData, setWaData] = useState<{ phoneNumberId?: string; wabaId?: string } | null>(null);
  const [waJustConnected, setWaJustConnected] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [shAccessToken, setShAccessToken] = useState("");
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

  // ── Generic Webhook States ──
  const [verifyToken, setVerifyToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  // ── Claude AI States ──
  const [claudeApiKey, setClaudeApiKey] = useState("");

  // ── ElevenLabs States ──
  const [, setElevenLabsEnabled] = useState(false);
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(false);
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [elevenLabsAgentId, setElevenLabsAgentId] = useState("");
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState("");
  const [elevenLabsSaving, setElevenLabsSaving] = useState(false);
  const [elevenLabsAgentData, setElevenLabsAgentData] = useState<Record<string, unknown> | null>(null);

  // ── Category, Disconnect & Upgrade UI ──
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [disconnectModal, setDisconnectModal] = useState<{
    open: boolean; title: string; description: string; loading: boolean; onConfirm: () => Promise<void>;
  }>({ open: false, title: "", description: "", loading: false, onConfirm: async () => {} });
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean; title: string; description: string;
  }>({ open: false, title: "", description: "" });

  // ── Load initial data ───────────────────────────────────────────────────────
  const loadShopifyStatus = useCallback(async () => {
    if (!canUseStoreIntegrations) return;
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
  }, [canUseStoreIntegrations]);

  useEffect(() => {
    if (initialData?.phoneNumberId && initialData?.wabaId) {
      // waConnected = true حتى لو التوكن معطوب — المعرّفات موجودة (الكارد بيعرض "connected" أو "broken")
      setWaConnected(true);
      setWaData({ phoneNumberId: initialData.phoneNumberId, wabaId: initialData.wabaId });
    }
  }, [initialData]);

  // ── Token Warning for WhatsApp card badge ──
  const waTokenWarning: 'invalid' | 'expiring' | null =
    metaTokenStatus === 'INVALID' || metaTokenStatus === 'EXPIRED'
      ? 'invalid'
      : metaTokenStatus === 'EXPIRING_SOON'
        ? 'expiring'
        : null;

  useEffect(() => {
    fetch("/api/me/webhook-config").then(r => r.json()).then(d => setVerifyToken(d.verifyToken ?? "")).catch(() => {});
    if (canUseStoreIntegrations) {
      fetch("/api/easy-orders/sync")
        .then(async r => (r.ok ? r.json() : null))
        .then(d => { if (d) setEoStatus(d); })
        .catch(err => console.error("[EasyOrders] Status fetch error", err));
    }
    if (canUseClaude) {
      fetch("/api/me/api-key").then(r => r.ok ? r.json() : { apiKey: "" }).then(d => setClaudeApiKey(d.apiKey ?? "")).catch(() => {});
    }
    fetch("/api/ai-agent").then(r => r.ok ? r.json() : null).then(d => {
      if (!d) return;
      setElevenLabsAgentData(d);
      setElevenLabsEnabled(Boolean(d.elevenLabsEnabled));
      setVoiceRepliesEnabled(Boolean(d.voiceRepliesEnabled));
      setElevenLabsApiKey(d.elevenLabsApiKey ?? "");
      setElevenLabsAgentId(d.elevenLabsAgentId ?? "");
      setElevenLabsVoiceId(d.elevenLabsVoiceId ?? "");
    }).catch(() => {});
    if (typeof window !== "undefined") setWebhookUrl(`https://${window.location.host}/api/webhook`);
    loadShopifyStatus();
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, [canUseClaude, canUseStoreIntegrations, loadShopifyStatus]);

  const loadEoWebhookUrl = useCallback(async () => {
    if (eoUrlLoaded) return;
    try {
      const r = await fetch("/api/easy-orders/URL");
      const d = await r.json();
      if (d.url) { setEoWebhookUrl(d.url); setEoUrlLoaded(true); }
    } catch {}
  }, [eoUrlLoaded]);

  // ── Plan Lock Messages ──
  const lockMessage = locale === "ar"
    ? "ربط المتاجر متاح من باقة Professional فما فوق. قم بترقية الباقة."
    : "Store integrations are available on Professional plan and above. Please upgrade.";
  const claudeLockMessage = locale === "ar"
    ? "Claude AI غير مناسب لباقتك الحالية. قم بالترقية للاستفادة منه."
    : "Claude AI is available on Pro plan and above. Please upgrade.";
  const canUseElevenLabs = planTier === "pro" || planTier === "enterprise";
  const elevenLabsLockMessage = "ElevenLabs integration is available on Pro and above. Please upgrade.";
  const isStoreCardLocked = (id: CardId) =>
    !canUseStoreIntegrations && (id === "shopify" || id === "easyorders" || id === "woocommerce");
  const isClaudeCardLocked = (id: CardId) => !canUseClaude && id === "claude";
  const isElevenLabsCardLocked = (id: CardId) => !canUseElevenLabs && id === "elevenlabs";
  const isCardLocked = (id: CardId) => isStoreCardLocked(id) || isClaudeCardLocked(id) || isElevenLabsCardLocked(id);
  const getCardLockMessage = (id: CardId) =>
    isClaudeCardLocked(id) ? claudeLockMessage : isElevenLabsCardLocked(id) ? elevenLabsLockMessage : lockMessage;

  const handleCardClick = (id: CardId) => {
    if (isCardLocked(id)) {
      const upgradeDetails: Record<string, { title: string; description: string }> = {
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
        claude: {
          title: "Claude AI — Pro+",
          description: locale === "ar" ? "Claude AI غير متاح لباقتك الحالية. قم بالترقية للوصول إليه." : "Claude AI requires Pro or above. Upgrade to access it.",
        },
        elevenlabs: {
          title: "ElevenLabs — Pro+",
          description: locale === "ar" ? "ربط ElevenLabs يحتاج باقة Pro أو أعلى لتفعيل الردود الصوتية." : "ElevenLabs requires Pro or above for voice replies.",
        },
      };
      const d = upgradeDetails[id] ?? upgradeDetails.shopify;
      setUpgradeModal({ open: true, title: d.title, description: d.description });
      return;
    }
    setOpenCard(prev => (prev === id ? null : id));
    if (id === "easyorders") loadEoWebhookUrl();
  };

  // ── ElevenLabs Handlers ──
  const isElevenLabsLinked = Boolean(elevenLabsAgentData?.elevenLabsAgentId && elevenLabsAgentData?.elevenLabsApiKey);

  const handleSaveElevenLabs = async () => {
    if (!elevenLabsAgentId.trim()) {
      toast.error(locale === "ar" ? "أدخل Agent ID بتاع الـ Conversational AI Agent أولاً" : "Enter your Conversational AI Agent ID first");
      return;
    }
    if (!elevenLabsApiKey.trim() && !elevenLabsAgentData?.elevenLabsApiKey) {
      toast.error(locale === "ar" ? "أدخل مفتاح ElevenLabs API أولاً" : "Enter the ElevenLabs API key first");
      return;
    }
    setElevenLabsSaving(true);
    try {
      const r = await fetch("/api/ai-agent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(elevenLabsAgentData ?? {}),
          elevenLabsEnabled: true,
          voiceRepliesEnabled: voiceRepliesEnabled || !isElevenLabsLinked,
          elevenLabsApiKey: elevenLabsApiKey.trim(),
          elevenLabsAgentId: elevenLabsAgentId.trim() || null,
          elevenLabsVoiceId: elevenLabsVoiceId.trim() || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Save failed");
      setElevenLabsAgentData(d);
      setElevenLabsApiKey(d.elevenLabsApiKey ?? "");
      setElevenLabsVoiceId(d.elevenLabsVoiceId ?? "");
      toast.success(locale === "ar" ? "تم حفظ إعدادات الردود الصوتية بنجاح" : "ElevenLabs Voice Reply settings saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save settings");
    } finally {
      setElevenLabsSaving(false);
    }
  };

  const handleDisconnectElevenLabs = () => {
    setDisconnectModal({
      open: true,
      title: locale === "ar" ? "فك ربط ElevenLabs" : "Disconnect ElevenLabs",
      description: locale === "ar"
        ? "الردود الصوتية التلقائية هتتوقف فوراً، والـ Agent مش هيقدر يرد على رسائل واتساب بعد كده."
        : "Automatic voice replies will stop immediately, and the Agent won't be able to reply to WhatsApp messages.",
      loading: false,
      onConfirm: async () => {
        setDisconnectModal(prev => ({ ...prev, loading: true }));
        try {
          const r = await fetch("/api/ai-agent", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(elevenLabsAgentData ?? {}),
              elevenLabsEnabled: false,
              voiceRepliesEnabled: false,
              elevenLabsApiKey: null,
              elevenLabsAgentId: null,
              elevenLabsVoiceId: null,
            }),
          });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error ?? "Disconnect failed");
          setElevenLabsAgentData(d);
          setElevenLabsEnabled(false);
          setVoiceRepliesEnabled(false);
          setElevenLabsApiKey("");
          setElevenLabsAgentId("");
          setElevenLabsVoiceId("");
          toast.success(locale === "ar" ? "تم فك ربط ElevenLabs" : "ElevenLabs disconnected");
          setDisconnectModal(prev => ({ ...prev, open: false, loading: false }));
        } catch (e: any) {
          toast.error(e?.message ?? "Could not disconnect");
          setDisconnectModal(prev => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // ── WhatsApp Handlers ──
  const handleSaveWhatsApp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const accessToken = (fd.get("accessToken") as string)?.trim();
    const phoneNumberId = (fd.get("phoneNumberId") as string)?.trim();
    const wabaId = (fd.get("wabaId") as string)?.trim();

    if (!accessToken || !phoneNumberId || !wabaId) {
      toast.error(
        locale === "ar"
          ? "لازم تدخل Access Token و Phone Number ID و WABA ID الثلاثة الأول"
          : "Please fill in Access Token, Phone Number ID, and WABA ID first"
      );
      return;
    }

    setWaLoading(true);
    try {
      await saveWhatsAppSettings({ accessToken, phoneNumberId, wabaId });
      setWaConnected(true);
      setWaData({ phoneNumberId, wabaId });
      setWaJustConnected(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-dash"));
      }
      toast.success(locale === "ar" ? "✅ تم ربط Meta بنجاح" : "✅ Meta connected successfully");
      closeTimerRef.current = setTimeout(() => {
        setOpenCard(null);
        setWaJustConnected(false);
      }, 2000);
    } catch (err: any) {
      toast.error(err?.message || api.cards.whatsapp.saveErr);
    } finally {
      setWaLoading(false);
    }
  };

  const handleDisconnectWhatsApp = () => {
    setDisconnectModal({
      open: true,
      title: locale === "ar" ? "فك ربط Meta / WhatsApp" : "Disconnect Meta / WhatsApp",
      description: locale === "ar"
        ? "كل الحملات الشغّالة هتتوقف فوراً، والرسائل المعلّقة مش هتتبعت. لو عندك أتمتة نشطة، تأكد إنك جاهز."
        : "All running campaigns will stop immediately, and pending messages won't be sent. Make sure you're ready if you have active automations.",
      loading: false,
      onConfirm: async () => {
        setDisconnectModal(prev => ({ ...prev, loading: true }));
        try {
          const res = await fetch("/api/settings/whatsapp", { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Error");
          setWaConnected(false);
          setWaData(null);
          window.dispatchEvent(new CustomEvent("refresh-dash"));
          const stopped = data.stoppedCampaigns ?? 0;
          const queued = data.stoppedQueue ?? 0;
          const detail = stopped > 0 || queued > 0
            ? (locale === "ar"
              ? ` — تم إيقاف ${stopped} حملة و${queued} رسالة معلّقة`
              : ` — stopped ${stopped} campaign(s) and ${queued} queued message(s)`)
            : "";
          toast.success((locale === "ar" ? "تم فك الربط" : "Disconnected") + detail);
          setDisconnectModal(prev => ({ ...prev, open: false, loading: false }));
        } catch {
          toast.error(locale === "ar" ? "خطأ في فك الربط" : "Error disconnecting");
          setDisconnectModal(prev => ({ ...prev, loading: false }));
        }
      },
    });
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

  // ── Shopify Handlers ──
  const handleShConnect = async () => {
    if (!shStoreName.trim()) { toast.error("أدخل اسم المتجر أولاً"); return; }
    if (!shShopDomain.trim()) { toast.error("أدخل دومين Shopify — مطلوب للتحقق من المتجر"); return; }
    const token = shAccessToken.trim();
    const clientId = shClientId.trim();
    const clientSecret = shClientSecret.trim();
    if ((clientId && !clientSecret) || (!clientId && clientSecret)) {
      toast.error("ابعت Client ID و Client Secret مع بعض — المجموعة ناقصة");
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
          accessToken: token || undefined,
          clientId: clientId || undefined,
          clientSecret: clientSecret || undefined,
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
      setShStoreName(""); setShShopDomain(""); setShAccessToken("");
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
  const CARD_DEFS: CardDef[] = [
    {
      id: "whatsapp",
      title: api.cards.whatsapp.title,
      subtitle: api.cards.whatsapp.subtitle,
      steps: api.cards.whatsapp.steps.map((s: any) => ({ title: s.title, desc: s.desc })),
      externalLink: {
        href: "https://developers.facebook.com/apps",
        label: locale === "ar" ? "لوحة مطوري Meta (Meta for Developers)" : "Meta for Developers",
      },
    },
    {
      id: "shopify",
      title: locale === "ar" ? "ربط Shopify" : "Connect Shopify",
      subtitle: locale === "ar" ? "دومين + Access Token — تسجيل تلقائي للـ Webhooks" : "Domain + Access Token — auto Webhook setup",
      steps: [
        { title: locale === "ar" ? "أنشئ Custom App على Shopify" : "Create a Custom App on Shopify", desc: locale === "ar" ? "من لوحة تحكم متجرك: Settings → Apps → Develop apps → Create an app. ده تطبيق خاص بيك انت بتعمله جوه متجرك، مش تطبيق من الـ App Store." : "In your store admin: Settings → Apps → Develop apps → Create an app. This is a private app you create inside your own store, not one you install from the App Store." },
        { title: locale === "ar" ? "فعّل الصلاحيات وخد الـ Token" : "Grant scopes & copy the token", desc: locale === "ar" ? "فعّل read_orders, write_orders, read_checkouts, read_customers, read_products، ثم Install app وانسخ الـ Admin API access token" : "Enable read_orders, write_orders, read_checkouts, read_customers, read_products, then Install app and copy the Admin API access token" },
        { title: locale === "ar" ? "أدخل البيانات في وني واربط" : "Enter the details in Wani & connect", desc: locale === "ar" ? "اسم المتجر + الدومين (متجرك.myshopify.com) + الـ Token — لو حطيت الـToken هنسجل الـ Webhooks تلقائيًا، من غير ما تدخل Shopify تاني" : "Store name + domain (yourstore.myshopify.com) + the token — with the token provided, webhooks are registered automatically, no need to go back into Shopify" },
      ],
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
    {
      id: "claude",
      title: "Claude AI",
      subtitle: locale === "ar" ? "اربط وني بـ Claude وتحكم بكل حاجة من الشات" : "Connect WANI with Claude and control everything from chat",
      steps: [
        { title: locale === "ar" ? "أنشئ API Key" : "Generate API Key", desc: locale === "ar" ? "اضغط 'إنشاء مفتاح جديد' للحصول على مفتاحك الخاص" : "Click 'Generate Key' to get your personal API Key" },
        { title: locale === "ar" ? "افتح Claude Desktop" : "Open Claude Desktop", desc: locale === "ar" ? "حمّل التطبيق من claude.ai/download ثم افتح الإعدادات" : "Download app from claude.ai/download and open settings" },
        { title: locale === "ar" ? "الصق الـ Config" : "Paste the Config", desc: locale === "ar" ? "انسخ إعدادات الربط والصقها في Settings → Developer → MCP" : "Copy configuration and paste in Settings → Developer → MCP" },
      ],
      externalLink: {
        href: "https://claude.ai/download",
        label: locale === "ar" ? "تحميل تطبيق Claude Desktop" : "Download Claude Desktop",
      },
    },
    {
      id: "elevenlabs",
      title: "ElevenLabs",
      subtitle: locale === "ar" ? "إيجنت صوتي مستقل يفكر ويرد بنفسه" : "An independent voice agent that thinks and replies on its own",
      steps: [
        { title: locale === "ar" ? "جهّز الـ Agent على ElevenLabs" : "Set up your Agent on ElevenLabs", desc: locale === "ar" ? "من Conversational AI، جهّز الـ Agent بمعرفته وبرومبته الخاصين" : "In Conversational AI, configure your agent with its own knowledge and prompt" },
        { title: locale === "ar" ? "أدخل API Key والـ Agent ID" : "Enter API Key & Agent ID", desc: locale === "ar" ? "من إعدادات الحساب والـ Agent بتاعك على ElevenLabs" : "From your ElevenLabs account and agent settings" },
        { title: locale === "ar" ? "اربط وفعّل الرد الصوتي" : "Connect & enable Voice Reply", desc: locale === "ar" ? "الـ Agent هيرد بنفسه على واتساب — مستقل عن رد وني النصي" : "Your agent replies on WhatsApp — independent from Wani's text replies" },
      ],
      externalLink: {
        href: "https://elevenlabs.io/app/conversational-ai",
        label: locale === "ar" ? "منصة ElevenLabs Conversational AI" : "ElevenLabs Conversational AI",
      },
    },
    {
      id: "webhook",
      title: api.cards.webhook.title,
      subtitle: api.cards.webhook.subtitle,
      steps: api.cards.webhook.steps.map((s: any) => ({ title: s.title, desc: s.desc })),
      externalLink: {
        href: "https://webhook.site",
        label: locale === "ar" ? "أداة فحص واختبار Webhook.site" : "Test Webhooks on Webhook.site",
      },
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto" dir={dir}>
      {/* ── Unified Upgrade Modal ── */}
      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal(prev => ({ ...prev, open: false }))}
        title={upgradeModal.title}
        description={upgradeModal.description}
        price={locale === "ar" ? "599 ج/شهر" : "599 EGP/mo"}
        locale={locale}
      />

      {/* ── Disconnect Confirmation Modal ── */}
      <DisconnectModal
        isOpen={disconnectModal.open}
        onClose={() => setDisconnectModal(prev => ({ ...prev, open: false }))}
        onConfirm={disconnectModal.onConfirm}
        title={disconnectModal.title}
        description={disconnectModal.description}
        loading={disconnectModal.loading}
        locale={locale}
      />

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{api.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{api.subtitle}</p>
      </div>

      {/* ── Category Pills ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CATEGORIES.map(cat => {
          const activeCount = cat.cardIds.filter(cid => {
            if (cid === "whatsapp") return waConnected;
            if (cid === "shopify") return shopifyStatus?.connected;
            if (cid === "easyorders") return eoStatus?.connected;
            if (cid === "woocommerce") return wooStatus?.connected;
            if (cid === "claude") return !!claudeApiKey;
            if (cid === "elevenlabs") return isElevenLabsLinked;
            return false;
          }).length;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border select-none",
                isActive
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent shadow-sm"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/60"
              )}
            >
              {cat.icon}
              <span>{locale === "ar" ? cat.labelAr : cat.labelEn}</span>
              {activeCount > 0 && (
                <span className={cn(
                  "min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center",
                  isActive
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                )}>
                  {activeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Cards List ── */}
      <div className="space-y-3.5">
        {CARD_DEFS
          .filter(card => {
            const cat = CATEGORIES.find(c => c.id === activeCategory);
            if (cat && !cat.cardIds.includes(card.id)) return false;
            return true;
          })
          .map(card => {
            const getConnected = (): { connected: boolean; label?: string } => {
              if (card.id === "whatsapp") return { connected: waConnected, label: waData?.phoneNumberId };
              if (card.id === "shopify") return { connected: !!shopifyStatus?.connected, label: shopifyStatus?.storeName };
              if (card.id === "easyorders") return { connected: !!eoStatus?.connected, label: eoStatus?.storeName };
              if (card.id === "woocommerce") return { connected: !!wooStatus?.connected, label: wooStatus?.storeName };
              if (card.id === "claude") return { connected: !!claudeApiKey };
              if (card.id === "elevenlabs") return { connected: isElevenLabsLinked };
              return { connected: false };
            };
            const cs = getConnected();

            return (
              <IntegrationCard
                key={card.id}
                {...card}
                locale={locale}
                isOpen={openCard === card.id}
                onToggle={() => handleCardClick(card.id)}
                locked={isCardLocked(card.id)}
                lockMessage={getCardLockMessage(card.id)}
                connected={cs.connected}
                connectedLabel={cs.label}
                tokenWarning={card.id === 'whatsapp' ? waTokenWarning : undefined}
              >
                {card.id === "whatsapp" && (
                  waJustConnected ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-3 animate-in fade-in">
                      <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle className="w-7 h-7 text-green-500" />
                      </div>
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        {locale === "ar" ? "تم ربط Meta بنجاح ✅" : "Meta connected successfully ✅"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {locale === "ar" ? "جاري الإغلاق..." : "Closing..."}
                      </p>
                    </div>
                  ) : (
                    <WhatsAppIntegration
                      initialData={waData ?? initialData}
                      loading={waLoading}
                      onSubmit={handleSaveWhatsApp}
                      labels={{ savingBtn: api.cards.whatsapp.savingBtn, saveBtn: api.cards.whatsapp.saveBtn }}
                      connected={waConnected}
                      onDisconnect={handleDisconnectWhatsApp}
                      locale={locale}
                      tokenStatus={metaTokenStatus}
                      onAutoConnectSuccess={(phone_number_id, waba_id) => {
                        setWaConnected(true);
                        setWaData({ phoneNumberId: phone_number_id, wabaId: waba_id });
                        setWaJustConnected(true);
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("refresh-dash"));
                        }
                        closeTimerRef.current = setTimeout(() => {
                          setOpenCard(null);
                          setWaJustConnected(false);
                        }, 2000);
                      }}
                    />
                  )
                )}

                {card.id === "shopify" && (
                  <ShopifyIntegration
                    storeName={shStoreName}
                    shopDomain={shShopDomain}
                    setShopDomain={setShShopDomain}
                    accessToken={shAccessToken}
                    setAccessToken={setShAccessToken}
                    clientId={shClientId}
                    setClientId={setShClientId}
                    clientSecret={shClientSecret}
                    setClientSecret={setShClientSecret}
                    setStoreName={setShStoreName}
                    isSuperAdmin={!!isSuper}
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

                {card.id === "webhook" && (
                  <WebhookIntegration
                    webhookUrl={webhookUrl}
                    verifyToken={verifyToken}
                    hint={api.cards.webhook.hint}
                    locale={locale}
                  />
                )}

                {card.id === "claude" && (
                  <ClaudeIntegration
                    apiKey={claudeApiKey}
                    onApiKeyChange={setClaudeApiKey}
                    locale={locale}
                  />
                )}

                {card.id === "elevenlabs" && (
                  <ElevenLabsIntegration
                    apiKey={elevenLabsApiKey}
                    setApiKey={setElevenLabsApiKey}
                    agentId={elevenLabsAgentId}
                    setAgentId={setElevenLabsAgentId}
                    voiceId={elevenLabsVoiceId}
                    setVoiceId={setElevenLabsVoiceId}
                    voiceRepliesEnabled={voiceRepliesEnabled}
                    setVoiceRepliesEnabled={setVoiceRepliesEnabled}
                    agentData={elevenLabsAgentData}
                    setAgentData={setElevenLabsAgentData}
                    onSave={handleSaveElevenLabs}
                    onDisconnect={handleDisconnectElevenLabs}
                    saving={elevenLabsSaving}
                    locale={locale}
                  />
                )}
              </IntegrationCard>
            );
          })}
      </div>
    </div>
  );
}