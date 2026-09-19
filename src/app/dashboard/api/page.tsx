"use client";

import { useEffect, useState, useRef } from "react";
import { saveWhatsAppSettings } from "@/app/actions/whatsapp";
import { CheckCircle, Blocks } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useSubscription } from "@/lib/dashboard-context";

import Link from "next/link";
import { CardId, CategoryId, CATEGORIES, CardDef } from "./_types";
import { DisconnectModal, UpgradeModal } from "./_components/Modals";
import { IntegrationCard } from "./_components/IntegrationCard";
import { WhatsAppIntegration } from "./_components/WhatsAppIntegration";
import { ClaudeIntegration } from "./_components/ClaudeIntegration";
import { ElevenLabsIntegration } from "./_components/ElevenLabsIntegration";
import { WebhookIntegration } from "./_components/WebhookIntegration";

export default function API() {
  const { dashData, canUseClaude, planTier, metaTokenStatus } = useSubscription();
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
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, [canUseClaude]);

  // ── Plan Lock Messages ──
  const claudeLockMessage = locale === "ar"
    ? "Claude AI غير مناسب لباقتك الحالية. قم بالترقية للاستفادة منه."
    : "Claude AI is available on Pro plan and above. Please upgrade.";
  const canUseElevenLabs = planTier === "pro" || planTier === "enterprise";
  const elevenLabsLockMessage = "ElevenLabs integration is available on Pro and above. Please upgrade.";
  const isClaudeCardLocked = (id: CardId) => !canUseClaude && id === "claude";
  const isElevenLabsCardLocked = (id: CardId) => !canUseElevenLabs && id === "elevenlabs";
  const isCardLocked = (id: CardId) => isClaudeCardLocked(id) || isElevenLabsCardLocked(id);
  const getCardLockMessage = (id: CardId) =>
    isClaudeCardLocked(id) ? claudeLockMessage : elevenLabsLockMessage;

  const handleCardClick = (id: CardId) => {
    if (isCardLocked(id)) {
      const upgradeDetails: Record<string, { title: string; description: string }> = {
        claude: {
          title: "Claude AI — Pro+",
          description: locale === "ar" ? "Claude AI غير متاح لباقتك الحالية. قم بالترقية للوصول إليه." : "Claude AI requires Pro or above. Upgrade to access it.",
        },
        elevenlabs: {
          title: "ElevenLabs — Pro+",
          description: locale === "ar" ? "ربط ElevenLabs يحتاج باقة Pro أو أعلى لتفعيل الردود الصوتية." : "ElevenLabs requires Pro or above for voice replies.",
        },
      };
      const d = upgradeDetails[id] ?? upgradeDetails.claude;
      setUpgradeModal({ open: true, title: d.title, description: d.description });
      return;
    }
    setOpenCard(prev => (prev === id ? null : id));
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
      <PageHeader
        icon={<Blocks className="w-5 h-5 text-primary" />}
        title={api.title}
        subtitle={api.subtitle}
      />

      {/* ── Stores moved to Channels ── */}
      <Link
        href="/channels?connectStore=1"
        className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] dark:bg-emerald-950/20 px-4 py-3 transition-colors hover:border-emerald-500/45 hover:bg-emerald-500/[0.12]"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-lg">
          🏬
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">
            {locale === "ar" ? "ربط المتاجر اتنقل لمركز القنوات" : "Store integrations moved to Channels"}
          </span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            {locale === "ar" ? "اربط Shopify و EasyOrders و WooCommerce من هناك" : "Connect Shopify, EasyOrders & WooCommerce from there"}
          </span>
        </span>
        <span className="flex-shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {locale === "ar" ? "انتقال ←" : "Go →"}
        </span>
      </Link>

      {/* ── Category Pills ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CATEGORIES.map(cat => {
            const activeCount = cat.cardIds.filter(cid => {
              if (cid === "whatsapp") return waConnected;
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
                  ? "bg-foreground text-background border-transparent shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-muted-foreground/80 hover:bg-muted"
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