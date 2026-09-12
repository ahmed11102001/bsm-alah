"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { saveWhatsAppSettings, syncWhatsAppTemplates } from "@/app/actions/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Copy, CheckCircle2, RefreshCw, ShoppingBag, Zap, Eye, EyeOff,
  Loader2, CheckCircle, ChevronDown,
  MessageSquare, Webhook, ExternalLink, Shield,
  Database, Link as LinkIcon, Globe, Key, Trash2, Lock,
  Wifi, WifiOff, AlertTriangle, BookOpen,
  Filter, Bot, Code2, Store,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useSubscription } from "@/lib/dashboard-context";
import EmbeddedSignupButton from "@/components/dashboard/EmbeddedSignupButton";
import { normalizeShopDomain } from "@/lib/shopify-domain";

type CardId = "whatsapp" | "shopify" | "easyorders" | "woocommerce" | "webhook" | "claude" | "elevenlabs";
type CategoryId = "all" | "messaging" | "ecommerce" | "ai" | "developer";

const CATEGORIES: { id: CategoryId; labelAr: string; labelEn: string; icon: React.ReactNode; cardIds: CardId[] }[] = [
  { id: "all", labelAr: "الكل", labelEn: "All", icon: <Filter className="w-3.5 h-3.5" />, cardIds: ["whatsapp", "shopify", "easyorders", "woocommerce", "claude", "elevenlabs", "webhook"] },
  { id: "messaging", labelAr: "المراسلة", labelEn: "Messaging", icon: <MessageSquare className="w-3.5 h-3.5" />, cardIds: ["whatsapp"] },
  { id: "ecommerce", labelAr: "المتاجر", labelEn: "E-Commerce", icon: <Store className="w-3.5 h-3.5" />, cardIds: ["shopify", "easyorders", "woocommerce"] },
  { id: "ai", labelAr: "الذكاء الاصطناعي", labelEn: "AI & Voice", icon: <Bot className="w-3.5 h-3.5" />, cardIds: ["claude", "elevenlabs"] },
  { id: "developer", labelAr: "المطورين", labelEn: "Developers", icon: <Code2 className="w-3.5 h-3.5" />, cardIds: ["webhook"] },
];

// ─── CopyInput ────────────────────────────────────────────────────────────────
function CopyInput({ value, placeholder }: { value: string; placeholder?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex gap-2">
      <Input readOnly value={value} placeholder={placeholder ?? ""}
        className="bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 font-mono text-xs" dir="ltr" />
      <Button variant="outline" size="icon" onClick={copy} disabled={!value}
        className="dark:border-gray-600 dark:text-gray-300">
        {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

// ─── IntegrationCard ──────────────────────────────────────────────────────────
interface CardVisual {
  id: CardId;
  icon: React.ReactNode;
}

const CARD_VISUALS: CardVisual[] = [
  { id: "whatsapp", icon: <img src="/partners/meta.svg" alt="Meta" className="w-5 h-5 object-contain" /> },
  { id: "shopify", icon: <img src="/partners/shopify.svg" alt="Shopify" className="w-5 h-5 object-contain" /> },
  { id: "easyorders", icon: <img src="/partners/easyorder.svg" alt="EasyOrders" className="w-5 h-5 object-contain" /> },
  { id: "woocommerce", icon: <img src="/partners/woocommerce.svg" alt="WooCommerce" className="w-5 h-5 object-contain" /> },
  { id: "webhook", icon: <Webhook className="w-5 h-5 text-gray-700 dark:text-gray-300" /> },
  { id: "claude", icon: <img src="/partners/claude.svg.svg" alt="Claude" className="w-5 h-5 object-contain" /> },
  { id: "elevenlabs", icon: <img src="/partners/elevenlabs.svg" alt="ElevenLabs" className="w-6 h-6 object-contain" /> },
];

// ─── Disconnect Confirmation Modal ──────────────────────────────────────────
function DisconnectModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  loading,
  locale = "ar",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  loading?: boolean;
  locale?: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4 border border-red-200 dark:border-red-900/50" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">{title}</h3>
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">
              {locale === "ar" ? "إجراء حساس — يؤثر على الأتمتة الحالية" : "Sensitive action — affects active automations"}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
          {description}
        </p>
        <div className="flex gap-2 pt-2">
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {locale === "ar" ? "نعم، تأكيد فك الربط" : "Yes, Disconnect"}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="dark:border-gray-700 dark:text-gray-300"
          >
            {locale === "ar" ? "إلغاء" : "Cancel"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Unified Upgrade Modal ──────────────────────────────────────────────────
function UpgradeModal({
  isOpen,
  onClose,
  title,
  description,
  price = "599 ج/شهر",
  plan = "pro",
  locale = "ar",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  price?: string;
  plan?: string;
  locale?: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4 border border-amber-200 dark:border-amber-900/50" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-1.5">
              {title}
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                PRO+
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {locale === "ar" ? "هذه الميزة متوفرة للباقات المتقدمة" : "Available on Pro and Enterprise plans"}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-100/70 dark:border-amber-900/30">
          {description}
        </p>
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => { onClose(); window.location.href = `/checkout?plan=${plan}`; }}
            className="flex-1 gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <Zap className="w-4 h-4" />
            {locale === "ar" ? `ترقية الباقة الآن (${price})` : `Upgrade Plan Now (${price})`}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="dark:border-gray-700 dark:text-gray-300"
          >
            {locale === "ar" ? "لاحقاً" : "Later"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── IntegrationCard ──────────────────────────────────────────────────────────
function IntegrationCard({
  id,
  title,
  subtitle,
  steps,
  isOpen,
  onToggle,
  children,
  locked = false,
  lockMessage = "",
  externalLink,
  locale = "ar",
  connected = false,
  connectedLabel,
}: {
  id: CardId;
  title: string;
  subtitle: string;
  steps?: { title: string; desc: string }[];
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  locked?: boolean;
  lockMessage?: string;
  externalLink?: { href: string; label: string };
  locale?: string;
  connected?: boolean;
  connectedLabel?: string;
}) {
  const [showGuide, setShowGuide] = useState(false);
  const v = CARD_VISUALS.find(c => c.id === id);
  const hasGuide = Boolean((steps && steps.length > 0) || externalLink);

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300 overflow-hidden",
      isOpen
        ? "bg-white dark:bg-gray-850 border-emerald-500/40 dark:border-emerald-500/40 shadow-sm"
        : "bg-white dark:bg-gray-850 border-gray-200 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-xs"
    )}>
      <button onClick={onToggle}
        title={locked ? lockMessage : undefined}
        className="w-full text-right p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform bg-gray-100 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60",
            isOpen && "scale-105 shadow-xs"
          )}>
            {v?.icon}
          </div>
          <div className="text-right min-w-0">
            <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <span className="truncate">{title}</span>
              {locked && <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {locked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Lock className="w-3 h-3" />
              {locale === "ar" ? "باقة Pro" : "Pro Plan"}
            </span>
          ) : connected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {locale === "ar" ? "متصل" : "Connected"}
              {connectedLabel && (
                <span className="hidden sm:inline font-mono text-[10px] text-emerald-600 dark:text-emerald-400 max-w-[130px] truncate">
                  ({connectedLabel})
                </span>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              {locale === "ar" ? "غير متصل" : "Not connected"}
            </span>
          )}
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700/50 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-700/60 pt-4 animate-in fade-in duration-200">
          {/* ── زر دليل الربط والشرح (Collapsible Guide) ── */}
          {hasGuide && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowGuide(prev => !prev)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-xs font-semibold text-gray-700 dark:text-gray-300 select-none cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{locale === "ar" ? "دليل الربط وشرح الخطوات" : "Connection Guide & Setup Steps"}</span>
                </span>
                <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                  <span>{showGuide ? (locale === "ar" ? "إخفاء الدليل" : "Hide guide") : (locale === "ar" ? "عرض الدليل" : "View guide")}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showGuide && "rotate-180")} />
                </div>
              </button>

              {showGuide && (
                <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/70 dark:border-gray-700/70 space-y-3 animate-in fade-in duration-200">
                  {steps && steps.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {steps.map((step, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200/70 dark:border-gray-700/60 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                              {i + 1}
                            </span>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{step.title}</p>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 pr-7 leading-relaxed">{step.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {externalLink && (
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                      <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                        {externalLink.label}
                      </span>
                      <a
                        href={externalLink.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
                      >
                        <span>{locale === "ar" ? "فتح المنصة في نافذة جديدة" : "Open platform in new tab"}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── نموذج البيانات وزر الربط بالأسفل ── */}
          <div className="bg-white dark:bg-gray-850 rounded-xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WhatsApp Content ─────────────────────────────────────────────────────────
function WhatsAppContent({ initialData, loading, onSubmit, labels, connected, onDisconnect, locale, onAutoConnectSuccess }: {
  initialData?: any; loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  labels: { savingBtn: string; saveBtn: string };
  connected: boolean;
  onDisconnect: () => void;
  locale: string;
  onAutoConnectSuccess?: (phone_number_id: string, waba_id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyField = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  // ── الحالة المربوطة: عرض المعرفات وخيارات التعديل وفك الربط ──
  if (connected && initialData && !showForm) {
    return (
      <div className="space-y-3.5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
            <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              {locale === "ar" ? "تم ربط Meta بنجاح ✅" : "Meta connected successfully ✅"}
            </p>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
              {locale === "ar" ? "حسابك مربوط ويعمل بكفاءة" : "Your account is active and connected"}
            </p>
          </div>
        </div>

        {initialData.wabaId && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">WABA ID</p>
              <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mt-0.5">{initialData.wabaId}</p>
            </div>
            <button
              onClick={() => copyField(initialData.wabaId, "waba")}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-emerald-600"
            >
              {copied === "waba" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {initialData.phoneNumberId && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Phone Number ID</p>
              <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mt-0.5">{initialData.phoneNumberId}</p>
            </div>
            <button
              onClick={() => copyField(initialData.phoneNumberId, "phone")}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-emerald-600"
            >
              {copied === "phone" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* أزرار التحكم بالأسفل */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
            className="flex-1 gap-2 text-xs font-medium dark:border-gray-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {locale === "ar" ? "تعديل البيانات" : "Edit credentials"}
          </Button>
          <Button
            variant="outline"
            onClick={onDisconnect}
            className="gap-2 text-xs font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {locale === "ar" ? "فك الربط" : "Disconnect"}
          </Button>
        </div>
      </div>
    );
  }

  // ── نموذج إدخال البيانات المنظم — زر الربط بالأسفل ──
  return (
    <div className="space-y-4">
      <form id="manual-connect-form" onSubmit={onSubmit} className="space-y-3.5" autoComplete="off">
        <div>
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Access Token *</Label>
          <Input name="accessToken" id="wa_access_token" defaultValue={initialData?.accessToken || ""} placeholder="EAA..." required
            autoComplete="off" spellCheck={false} className="mt-1 dark:bg-gray-800 dark:border-gray-700 font-mono text-xs" dir="ltr" />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Phone Number ID *</Label>
          <Input name="phoneNumberId" id="wa_phone_number_id" defaultValue={initialData?.phoneNumberId || ""} placeholder="123456789..." required
            autoComplete="off" spellCheck={false} className="mt-1 dark:bg-gray-800 dark:border-gray-700 font-mono text-xs" dir="ltr" />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">WABA ID *</Label>
          <Input name="wabaId" id="wa_waba_id" defaultValue={initialData?.wabaId || ""} placeholder="987654321..." required
            autoComplete="off" spellCheck={false} className="mt-1 dark:bg-gray-800 dark:border-gray-700 font-mono text-xs" dir="ltr" />
        </div>

        {/* ── زر الربط بالأسفل ── */}
        <div className="pt-2 space-y-2.5">
          <Button disabled={loading} size="default" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {labels.savingBtn}</>
              : <><CheckCircle className="w-4 h-4" /> {locale === "ar" ? "ربط Meta وحفظ البيانات" : "Connect Meta & Save"}</>}
          </Button>

          {/* خيار الربط التلقائي بضغطة واحدة */}
          {onAutoConnectSuccess && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <EmbeddedSignupButton
                locale={locale}
                onSuccess={({ phone_number_id, waba_id }) => {
                  onAutoConnectSuccess(phone_number_id, waba_id);
                }}
              />
            </div>
          )}

          {showForm && connected && (
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition py-1"
            >
              {locale === "ar" ? "إلغاء التعديل" : "Cancel"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Shopify Content — Webhook فقط، زي EasyOrders بالظبط ────────────────────
interface ShopifyStatus {
  connected: boolean;
  storeName?: string;
  connectedAt?: string | null;
  webhookUrl?: string;
  authMethod?: "legacy_token" | "client_credentials" | "none";
}

function ShopifyContent({
  storeName, setStoreName, shopDomain, setShopDomain,
  accessToken, setAccessToken,
  clientId, setClientId, clientSecret, setClientSecret,
  webhookUrl, status, onConnect, onRefresh, onSyncWebhooks, loading, syncing,
  isSuperAdmin,
  locale = "ar",
  onDisconnect,
}: {
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
}) {
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [oauthShop, setOAuthShop] = useState("");

  // ── الربط التلقائي (Public App OAuth) متاح للجميع ──
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

  const [manualOpen, setManualOpen] = useState(false);
  const isManualVisible = !showOAuth || Boolean(status?.connected) || manualOpen;

  useEffect(() => {
    if (status?.connected) setShowForm(false);
  }, [status?.connected]);

  async function handleDisconnect() {
    if (onDisconnect) {
      onDisconnect();
      return;
    }
    const r = await fetch("/api/shopify/install", { method: "DELETE" });
    if (r.ok) { toast.success("تم فك الربط"); onRefresh(); }
    else toast.error("فشل فك الربط");
  }

  return (
    <div className="space-y-4">
      {/* ── متجر مربوط ── */}
      {status?.connected && !showForm && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50/80 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="flex-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              {status.storeName} — متصل ✅
              {status.authMethod && status.authMethod !== "none" && (
                <span className="ms-1.5 text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                  ({status.authMethod === "legacy_token" ? "Access Token" : "Client ID/Secret"})
                </span>
              )}
            </p>
          </div>
          {/* زر مزامنة الـ Webhooks */}
          <Button
            variant="outline"
            onClick={onSyncWebhooks}
            disabled={syncing}
            className="w-full gap-2 text-xs font-medium dark:border-gray-700"
          >
            {syncing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري تسجيل الـ Webhooks...</>
              : <><RefreshCw className="w-3.5 h-3.5 text-emerald-600" /> مزامنة الـ Webhooks تلقائياً</>}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowForm(true)}
              className="flex-1 gap-2 text-xs font-medium dark:border-gray-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> تعديل البيانات
            </Button>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              className="gap-2 text-xs font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Trash2 className="w-3.5 h-3.5" /> فك الربط
            </Button>
          </div>
        </div>
      )}

      {/* ── نموذج البيانات (قبل الربط أو أثناء التعديل) ── */}
      {(!status?.connected || showForm) && (
        <div className="space-y-3.5">
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">اسم المتجر *</Label>
            <Input
              placeholder="مثال: متجري"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              autoComplete="off"
              className="mt-1 dark:bg-gray-800 dark:border-gray-700 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              دومين Shopify *
              <span className="text-gray-400 font-normal mr-1">(بصيغة store.myshopify.com)</span>
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
              <span className="text-gray-400 font-normal mr-1">(للمتاجر القديمة — يبدأ بـ shpat_)</span>
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
                {status?.connected ? "(للإضافة اليدوية إن احتجت)" : "(يتسجل تلقائياً عند إدخال البيانات)"}
              </span>
            </Label>
            <CopyInput value={webhookUrl} placeholder={webhookUrl ? "" : "جاري التحميل..."} />
          </div>

          {/* ── زر الربط بالأسفل ── */}
          <div className="pt-2 space-y-2.5">
            <Button
              size="default"
              onClick={onConnect}
              disabled={loading || !storeName.trim() || !shopDomain.trim()}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ والتسجيل...</>
                : <><ShoppingBag className="w-4 h-4" /> {locale === "ar" ? "ربط المتجر وتسجيل الـ Webhooks" : "Connect Store & Register Webhooks"}</>}
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

// ─── EasyOrders Content ───────────────────────────────────────────────────────
interface EasyOrdersLabels {
  storeLabel: string; storePlaceholder: string;
  apiKeyLabel: string; webhookLabel: string; webhookWarning: string;
  webhookSecretOrdersLabel: string; webhookSecretStatusUpdateLabel: string; webhookSecretPlaceholder: string;
  saveSecretBtn: string; savingSecretBtn: string;
  webhookOrdersConfiguredBadge: string; webhookOrdersNotConfiguredBadge: string;
  webhookStatusConfiguredBadge: string; webhookStatusNotConfiguredBadge: string;
  connectFirstHint: string;
  syncingBtn: string; syncBtn: string; apiKeyErr: string;
  syncSuccess: (synced: number) => string;
  syncErr: string;
  connectedBadge: (store: string, total: number) => string;
  lastSync: (date: string) => string;
  loading: string;
}

function EasyOrdersContent({
  apiKey, setApiKey, storeName, setStoreName, webhookUrl, syncing, status, onSync, onDisconnect,
  webhookSecretOrders, setWebhookSecretOrders, savingSecretOrders, onSaveSecretOrders,
  webhookSecretStatusUpdate, setWebhookSecretStatusUpdate, savingSecretStatusUpdate, onSaveSecretStatusUpdate,
  labels, locale,
}: {
  apiKey: string; setApiKey: (v: string) => void;
  storeName: string; setStoreName: (v: string) => void;
  webhookUrl: string; syncing: boolean;
  status: {
    connected: boolean; storeName?: string; totalSynced?: number; lastSyncAt?: string;
    webhookOrdersConfigured?: boolean; webhookStatusUpdateConfigured?: boolean;
  } | null;
  onSync: () => void;
  onDisconnect: () => void;
  webhookSecretOrders: string; setWebhookSecretOrders: (v: string) => void;
  savingSecretOrders: boolean; onSaveSecretOrders: () => void;
  webhookSecretStatusUpdate: string; setWebhookSecretStatusUpdate: (v: string) => void;
  savingSecretStatusUpdate: boolean; onSaveSecretStatusUpdate: () => void;
  labels: EasyOrdersLabels;
  locale: string;
}) {
  const dateStr = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")
    : "";

  const webhookBadge = (configured: boolean | undefined, configuredLabel: string, notConfiguredLabel: string) => (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg border",
      configured
        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
    )}>
      {configured
        ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
        : <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
      <p className={cn(
        "text-xs font-medium",
        configured ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"
      )}>
        {configured ? configuredLabel : notConfiguredLabel}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {status?.connected && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50/80 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="flex-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              {labels.connectedBadge(status.storeName ?? "", status.totalSynced ?? 0)}
            </p>
            <button
              onClick={onDisconnect}
              className="text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {webhookBadge(status.webhookOrdersConfigured, labels.webhookOrdersConfiguredBadge, labels.webhookOrdersNotConfiguredBadge)}
          {webhookBadge(status.webhookStatusUpdateConfigured, labels.webhookStatusConfiguredBadge, labels.webhookStatusNotConfiguredBadge)}
        </div>
      )}

      <div>
        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">{labels.storeLabel}</Label>
        <Input
          id="easyorders_store_name"
          name="easyorders_store_name"
          autoComplete="off"
          placeholder={labels.storePlaceholder}
          value={storeName}
          onChange={e => setStoreName(e.target.value)}
          className="mt-1 dark:bg-gray-800 dark:border-gray-700 text-xs"
        />
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <Shield className="w-3 h-3 text-emerald-600" /> {labels.apiKeyLabel}
        </Label>
        <Input
          id="easyorders_api_key_custom"
          name="easyorders_api_key_custom"
          autoComplete="new-password"
          spellCheck={false}
          placeholder="eo_live_xxxxxxxxxxxx"
          dir="ltr"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          type="password"
          className="mt-1 font-mono text-xs dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <LinkIcon className="w-3 h-3 text-emerald-600" /> {labels.webhookLabel}
        </Label>
        <div className="mt-1"><CopyInput value={webhookUrl} placeholder={labels.loading} /></div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{labels.webhookWarning}</p>
      </div>

      {/* Webhook Secrets */}
      <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div>
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-600" /> {labels.webhookSecretOrdersLabel}
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="easyorders_secret_orders_custom"
              name="easyorders_secret_orders_custom"
              autoComplete="new-password"
              spellCheck={false}
              placeholder={labels.webhookSecretPlaceholder}
              dir="ltr"
              value={webhookSecretOrders}
              onChange={e => setWebhookSecretOrders(e.target.value)}
              type="password"
              className="font-mono text-xs dark:bg-gray-800 dark:border-gray-700 flex-1"
            />
            <Button
              onClick={onSaveSecretOrders}
              disabled={savingSecretOrders || !webhookSecretOrders.trim() || !status?.connected}
              size="sm"
              variant="outline"
              className="text-xs dark:border-gray-700 flex-shrink-0"
            >
              {savingSecretOrders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : labels.saveSecretBtn}
            </Button>
          </div>
          {!status?.connected && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">{labels.connectFirstHint}</p>
          )}
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-600" /> {labels.webhookSecretStatusUpdateLabel}
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="easyorders_secret_status_custom"
              name="easyorders_secret_status_custom"
              autoComplete="new-password"
              spellCheck={false}
              placeholder={labels.webhookSecretPlaceholder}
              dir="ltr"
              value={webhookSecretStatusUpdate}
              onChange={e => setWebhookSecretStatusUpdate(e.target.value)}
              type="password"
              className="font-mono text-xs dark:bg-gray-800 dark:border-gray-700 flex-1"
            />
            <Button
              onClick={onSaveSecretStatusUpdate}
              disabled={savingSecretStatusUpdate || !webhookSecretStatusUpdate.trim() || !status?.connected}
              size="sm"
              variant="outline"
              className="text-xs dark:border-gray-700 flex-shrink-0"
            >
              {savingSecretStatusUpdate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : labels.saveSecretBtn}
            </Button>
          </div>
          {!status?.connected && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">{labels.connectFirstHint}</p>
          )}
        </div>
      </div>

      {/* ── زر الربط والمزامنة بالأسفل ── */}
      <div className="pt-2 space-y-2">
        <Button
          onClick={onSync}
          disabled={syncing || !apiKey.trim()}
          size="default"
          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
        >
          {syncing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {labels.syncingBtn}</>
            : <><Database className="w-4 h-4" /> {labels.syncBtn}</>}
        </Button>
        {dateStr && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">{labels.lastSync(dateStr)}</p>
        )}
      </div>
    </div>
  );
}

// ─── WooCommerce Content (Unified: Webhook + REST API) ────────────────────────
interface WooStatus {
  connected: boolean;
  storeName?: string;
  storeUrl?: string;
  totalSynced?: number;
  lastSyncAt?: string | null;
  productsAvailable?: number;
}

function WooCommerceContent({ status, onRefresh, locale, onDisconnect }: {
  status: WooStatus | null;
  onRefresh: () => void;
  locale: string;
  onDisconnect?: () => void;
}) {
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
      if (d.url) { setWebhookUrl(d.url); setUrlLoaded(true); }
    } catch { }
  }, [urlLoaded]);

  useEffect(() => { loadWebhookUrl(); }, [loadWebhookUrl]);

  async function handleConnect() {
    setError("");
    if (!storeName.trim()) { setError(isAr ? "أدخل اسم المتجر" : "Store name is required"); return; }
    if (!storeUrl.trim()) { setError(isAr ? "أدخل رابط المتجر" : "Store URL is required"); return; }
    if (!consumerKey.trim() || !consumerSecret.trim()) { setError(isAr ? "أدخل Consumer Key و Consumer Secret" : "Consumer Key and Secret are required"); return; }
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
      if (!r.ok) { setError(d.error ?? (isAr ? "فشل الربط" : "Connection failed")); return; }
      if (d.webhookUrl) setWebhookUrl(d.webhookUrl);
      toast.success(
        isAr
          ? `✅ تم ربط ${d.storeName} بنجاح — ${d.productsAvailable ?? 0} منتج متاح — بدأت مزامنة المنتجات تلقائياً`
          : `✅ ${d.storeName} connected — ${d.productsAvailable ?? 0} products available — product sync started`
      );
      setStoreName(""); setStoreUrl(""); setConsumerKey(""); setConsumerSecret("");
      onRefresh();
    } catch { setError(isAr ? "خطأ في الاتصال" : "Connection error"); }
    finally { setLoading(false); }
  }

  async function handleDisconnect() {
    if (onDisconnect) {
      onDisconnect();
      return;
    }
    const r = await fetch("/api/woocommerce/connect", { method: "DELETE" });
    if (r.ok) { toast.success(isAr ? "تم فك الربط" : "Disconnected"); onRefresh(); }
    else toast.error(isAr ? "فشل فك الربط" : "Failed to disconnect");
  }

  async function handleSyncProducts() {
    setSyncingProducts(true);
    try {
      const r = await fetch("/api/ai-agent/products/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "woocommerce" }),
      });
      if (r.ok) toast.success(isAr ? "تم بدء مزامنة المنتجات في الخلفية" : "Product sync started in background");
      else toast.error(isAr ? "فشل بدء المزامنة" : "Failed to start sync");
    } catch { toast.error(isAr ? "خطأ أثناء المزامنة" : "Sync error"); }
    finally { setSyncingProducts(false); }
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
                {status.storeName} — {(status.totalSynced ?? 0).toLocaleString(isAr ? "ar-EG" : "en-US")} {isAr ? "طلب مستلم" : "orders received"}
              </p>
              {dateStr && <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">{isAr ? "آخر طلب" : "Last order"}: {dateStr}</p>}
            </div>
            <button onClick={handleDisconnect} className="text-red-500 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Sync Products button for connected stores */}
          <Button
            variant="outline"
            onClick={handleSyncProducts}
            disabled={syncingProducts}
            className="w-full gap-2 text-xs font-medium dark:border-gray-700"
          >
            {syncingProducts
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {isAr ? "جاري مزامنة المنتجات..." : "Syncing products..."}</>
              : <><RefreshCw className="w-3.5 h-3.5 text-emerald-600" /> {isAr ? "مزامنة المنتجات للذكاء الاصطناعي" : "Sync products for AI"}</>}
          </Button>
        </div>
      )}

      {/* ── نموذج البيانات ── */}
      {!status?.connected && (
        <div className="space-y-3.5">
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">{isAr ? "اسم المتجر *" : "Store name *"}</Label>
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
              ? (isAr ? "(أضفه يدوياً في إعدادات WooCommerce)" : "(add manually in WooCommerce)")
              : (isAr ? "(رابط الاستقبال)" : "(receiving URL)")}
          </span>
        </Label>
        <CopyInput value={webhookUrl} placeholder={isAr ? "جاري التحميل..." : "Loading..."} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* ── زر الربط بالأسفل ── */}
      {!status?.connected && (
        <div className="pt-2">
          <Button
            onClick={handleConnect}
            disabled={loading || !storeName.trim() || !storeUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()}
            size="default"
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {isAr ? "جاري الربط والتحقق..." : "Connecting & verifying..."}</>
              : <><Globe className="w-4 h-4" /> {isAr ? "ربط المتجر والتحقق" : "Connect Store & Verify"}</>}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Webhook Content ──────────────────────────────────────────────────────────
function WebhookContent({ webhookUrl, verifyToken, hint, locale = "ar" }: {
  webhookUrl: string; verifyToken: string; hint: string; locale?: string;
}) {
  return (
    <div className="space-y-3.5">
      <div>
        <Label className="text-xs text-gray-600 dark:text-gray-400 font-bold">Callback URL</Label>
        <div className="mt-1"><CopyInput value={webhookUrl} /></div>
      </div>
      <div>
        <Label className="text-xs text-gray-600 dark:text-gray-400 font-bold">Verify Token</Label>
        <div className="mt-1"><CopyInput value={verifyToken} placeholder="..." /></div>
      </div>
      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-700 dark:text-gray-300">{hint}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function API() {
  const { dashData, canStore: canUseStoreIntegrations, canUseClaude, planTier, isSuper } =
useSubscription();
  const initialData = dashData?.whatsapp;
  const { t, dir, locale } = useLanguage();
  const api = t.api;

  const [openCard, setOpenCard] = useState<CardId | null>(null);

  const [waLoading, setWaLoading] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const [waData, setWaData] = useState<{ phoneNumberId?: string; wabaId?: string } | null>(null);
  const [waJustConnected, setWaJustConnected] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [shopifyStatus, setShopifyStatus] = useState<{
    connected: boolean; storeName?: string; connectedAt?: string | null; webhookUrl?: string;
    authMethod?: "legacy_token" | "client_credentials" | "none";
  } | null>(null);
  const [shStoreName, setShStoreName] = useState("");
  const [shShopDomain, setShShopDomain] = useState("");
  const [shAccessToken, setShAccessToken] = useState("");
  const [shClientId, setShClientId] = useState("");
  const [shClientSecret, setShClientSecret] = useState("");
  const [shWebhookUrl, setShWebhookUrl] = useState("");
  const [shUrlLoaded, setShUrlLoaded] = useState(false);
  const [shConnecting, setShConnecting] = useState(false);
  const [shSyncing, setShSyncing] = useState(false);
  const [wooStatus, setWooStatus] = useState<{
    connected: boolean; storeName?: string; totalSynced?: number; lastSyncAt?: string | null;
  } | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [claudeCopied, setClaudeCopied] = useState<"key" | "config" | null>(null);
  const [elevenLabsEnabled, setElevenLabsEnabled] = useState(false);
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(false);
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [elevenLabsAgentId, setElevenLabsAgentId] = useState("");
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState("");
  const [elevenLabsSaving, setElevenLabsSaving] = useState(false);
  const [elevenLabsEditMode, setElevenLabsEditMode] = useState(false);
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
      // جيب الـ Webhook URL أول حاجة وحده عشان مش يأثرش على باقي الداتا لو فشل
      const shUrlRes = await fetch("/api/shopify/URL").catch(() => null);
      const shUrl = shUrlRes?.ok ? await shUrlRes.json() : {};
      const webhookUrl = shUrl?.url ?? "";

      setShWebhookUrl(webhookUrl);
      setShUrlLoaded(true);

      if (shUrl?.connected) {
        setShopifyStatus({
          connected: true,
          storeName: shUrl.storeName,
          connectedAt: shUrl.connectedAt,
          webhookUrl,
          authMethod: shUrl.authMethod,
        });
      } else {
        setShopifyStatus({ connected: false, webhookUrl });
      }

      // جيب WooCommerce من store route
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

  // Check if WhatsApp/Meta is already connected
  useEffect(() => {
    if (initialData?.phoneNumberId && initialData?.wabaId) {
      setWaConnected(true);
      setWaData({ phoneNumberId: initialData.phoneNumberId, wabaId: initialData.wabaId });
    }
  }, [initialData]);

  useEffect(() => {
    fetch("/api/me/webhook-config").then(r => r.json()).then(d => setVerifyToken(d.verifyToken ?? "")).catch(() => { });
    if (canUseStoreIntegrations) {
      fetch("/api/easy-orders/sync")
        .then(async r => {
          if (!r.ok) {
            console.error("[EasyOrders] Failed to load status", r.status);
            return null;
          }
          return r.json();
        })
        .then(d => { if (d) setEoStatus(d); })
        .catch(err => console.error("[EasyOrders] Status fetch error", err));
    }
    if (canUseClaude) {
      fetch("/api/me/api-key").then(r => r.ok ? r.json() : { apiKey: "" }).then(d => setClaudeApiKey(d.apiKey ?? "")).catch(() => { });
    }
    fetch("/api/ai-agent").then(r => r.ok ? r.json() : null).then(d => {
      if (!d) return;
      setElevenLabsAgentData(d);
      setElevenLabsEnabled(Boolean(d.elevenLabsEnabled));
      setVoiceRepliesEnabled(Boolean(d.voiceRepliesEnabled));
      setElevenLabsApiKey(d.elevenLabsApiKey ?? "");
      setElevenLabsAgentId(d.elevenLabsAgentId ?? "");
      setElevenLabsVoiceId(d.elevenLabsVoiceId ?? "");
    }).catch(() => { });
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
    } catch { }
  }, [eoUrlLoaded]);

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
    setOpenCard(prev => prev === id ? null : id);
    if (id === "easyorders") loadEoWebhookUrl();
  };

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
    } finally { setElevenLabsSaving(false); }
  };

  const isElevenLabsLinked = Boolean(elevenLabsAgentData?.elevenLabsAgentId && elevenLabsAgentData?.elevenLabsApiKey);

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

  const handleSaveWhatsApp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const accessToken = (fd.get("accessToken") as string)?.trim();
    const phoneNumberId = (fd.get("phoneNumberId") as string)?.trim();
    const wabaId = (fd.get("wabaId") as string)?.trim();

    // ── Validation: امنع الإرسال أصلاً لو أي حقل فاضي ──────────────────────
    // قبل كده كان ممكن تدوس "Connect Meta manually" من غير ما تحط أي قيمة
    // وكان بيقولك "تم الربط بنجاح" وهو مش متربط فعليًا.
    if (!accessToken || !phoneNumberId || !wabaId) {
      toast.error(
        locale === "ar"
          ? "لازم تدخل Access Token و Phone Number ID و WABA ID الثلاثة الأول"
          : "Please fill in Access Token, Phone Number ID, and WABA ID first",
      );
      return;
    }

    setWaLoading(true);
    try {
      await saveWhatsAppSettings({ accessToken, phoneNumberId, wabaId });
      // Update connected state
      setWaConnected(true);
      setWaData({ phoneNumberId, wabaId });
      setWaJustConnected(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-dash"));
      }
      toast.success(locale === "ar" ? "✅ تم ربط Meta بنجاح" : "✅ Meta connected successfully");
      // Auto-close the card after 2 seconds (like the Portal)
      closeTimerRef.current = setTimeout(() => {
        setOpenCard(null);
        setWaJustConnected(false);
      }, 2000);
    } catch (err: any) {
      toast.error(err?.message || api.cards.whatsapp.saveErr);
    }
    finally { setWaLoading(false); }
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

  const handleEoSync = async () => {
    if (!eoApiKey.trim()) { toast.error(api.cards.easyorders.apiKeyErr); return; }
    setEoSyncing(true);
    try {
      const r = await fetch("/api/easy-orders/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: eoApiKey.trim(), storeName: eoStoreName.trim() || "متجري" }),
      });
      const d = await r.json();
      if (!r.ok) {
        // رسائل مخصصة حسب نوع الخطأ بدل رسالة 502 عامة
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
      if (d.productSyncError) {
        toast.error(d.productSyncError);
      }
      setEoStatus(prev => ({
        connected: true,
        storeName: d.storeName,
        totalSynced: d.productsSynced,
        lastSyncAt: new Date().toISOString(),
        webhookOrdersConfigured: prev?.webhookOrdersConfigured ?? false,
        webhookStatusUpdateConfigured: prev?.webhookStatusUpdateConfigured ?? false,
      }));
    } catch { toast.error(api.cards.easyorders.syncErr); }
    finally { setEoSyncing(false); }
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
        method: "PATCH", headers: { "Content-Type": "application/json" },
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
    } catch { toast.error(api.cards.easyorders.syncErr); }
    finally { setSaving(false); }
  };

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
    } catch { toast.error("خطأ في الاتصال"); }
    finally { setShConnecting(false); }
  };

  const handleShSyncWebhooks = async () => {
    setShSyncing(true);
    try {
      const r = await fetch("/api/shopify/sync-webhooks", { method: "POST" });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "فشل تسجيل الـ webhooks"); return; }
      if (d.success) toast.success(d.message);
      else toast.warning(d.message);
    } catch { toast.error("خطأ في الاتصال"); }
    finally { setShSyncing(false); }
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

  const handleGenerateApiKey = async () => {
    setClaudeLoading(true);
    try {
      const r = await fetch("/api/me/api-key", { method: "POST" });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "خطأ"); return; }
      setClaudeApiKey(d.apiKey);
      toast.success("تم إنشاء API Key جديد");
    } catch { toast.error("خطأ في الاتصال"); }
    finally { setClaudeLoading(false); }
  };

  const copyClaudeText = (type: "key" | "config") => {
    const host = typeof window !== "undefined" ? window.location.host : "aiwni.com";
    const text = type === "key"
      ? `Bearer ${claudeApiKey}`
      : JSON.stringify({
        mcpServers: {
          wani: {
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-fetch", `https://${host}/api/mcp`],
            env: { AUTHORIZATION: `Bearer ${claudeApiKey}` },
          },
        },
      }, null, 2);
    navigator.clipboard.writeText(text);
    setClaudeCopied(type);
    setTimeout(() => setClaudeCopied(null), 2000);
  };

  const CARD_DEFS: {
    id: CardId; title: string; subtitle: string;
    steps: { title: string; desc: string }[];
    externalLink?: { href: string; label: string };
  }[] = [
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
        subtitle: "اربط وني بـ Claude وتحكم بكل حاجة من الشات",
        steps: [
          { title: "أنشئ API Key", desc: "اضغط 'إنشاء مفتاح جديد' للحصول على مفتاحك الخاص" },
          { title: "افتح Claude Desktop", desc: "حمّل التطبيق من claude.ai/download ثم افتح الإعدادات" },
          { title: "الصق الـ Config", desc: "انسخ إعدادات الربط والصقها في Settings → Developer → MCP" },
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
            // Category filter
            const cat = CATEGORIES.find(c => c.id === activeCategory);
            if (cat && !cat.cardIds.includes(card.id)) return false;
            return true;
          })
          .map(card => {
          // Determine connected status per card
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
                <WhatsAppContent
                  initialData={waData ?? initialData}
                  loading={waLoading}
                  onSubmit={handleSaveWhatsApp}
                  labels={{ savingBtn: api.cards.whatsapp.savingBtn, saveBtn: api.cards.whatsapp.saveBtn }}
                  connected={waConnected}
                  onDisconnect={handleDisconnectWhatsApp}
                  locale={locale}
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
              <ShopifyContent
                storeName={shStoreName}
                shopDomain={shShopDomain} setShopDomain={setShShopDomain}
                accessToken={shAccessToken} setAccessToken={setShAccessToken}
                clientId={shClientId} setClientId={setShClientId}
                clientSecret={shClientSecret} setClientSecret={setShClientSecret}
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
              <EasyOrdersContent
                apiKey={eoApiKey} setApiKey={setEoApiKey}
                storeName={eoStoreName} setStoreName={setEoStoreName}
                webhookUrl={eoWebhookUrl} syncing={eoSyncing} status={eoStatus}
                onSync={handleEoSync}
                onDisconnect={handleEoDisconnect}
                webhookSecretOrders={eoWebhookSecretOrders} setWebhookSecretOrders={setEoWebhookSecretOrders}
                savingSecretOrders={eoSavingSecretOrders} onSaveSecretOrders={() => handleEoSaveSecret("orders")}
                webhookSecretStatusUpdate={eoWebhookSecretStatusUpdate} setWebhookSecretStatusUpdate={setEoWebhookSecretStatusUpdate}
                savingSecretStatusUpdate={eoSavingSecretStatusUpdate} onSaveSecretStatusUpdate={() => handleEoSaveSecret("status_update")}
                labels={api.cards.easyorders} locale={locale}
              />
            )}
            {card.id === "woocommerce" && (
              <WooCommerceContent
                status={wooStatus}
                onRefresh={loadShopifyStatus}
                locale={locale}
                onDisconnect={handleWooDisconnect}
              />
            )}
            {card.id === "webhook" && (
              <WebhookContent webhookUrl={webhookUrl} verifyToken={verifyToken} hint={api.cards.webhook.hint} locale={locale} />
            )}
            {card.id === "claude" && (
              <div className="space-y-5 pt-1">

                {/* API Key — shows "Bearer bsm_..." for easy copy-paste */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Key className="w-3 h-3" /> API Key الخاص بك
                  </label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      dir="ltr"
                      value={claudeApiKey ? `Bearer ${claudeApiKey}` : "لم يتم إنشاء مفتاح بعد"}
                      className="font-mono text-xs bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    />
                    <Button variant="outline" size="icon"
                      onClick={() => copyClaudeText("key")}
                      disabled={!claudeApiKey}
                      className="dark:border-gray-600 dark:text-gray-300 flex-shrink-0"
                      title="نسخ المفتاح"
                    >
                      {claudeCopied === "key"
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleGenerateApiKey}
                      disabled={claudeLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
                      title={claudeApiKey ? "تجديد المفتاح" : "إنشاء مفتاح"}
                    >
                      {claudeLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <RefreshCw className="w-4 h-4" />}
                    </Button>
                  </div>
                  {claudeApiKey && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> احتفظ بهذا المفتاح سري — لا تشاركه
                    </p>
                  )}
                </div>

                {/* MCP URL */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3 text-emerald-600" /> رابط الاتصال (MCP URL)
                  </label>
                  <CopyInput
                    value={typeof window !== "undefined"
                      ? `https://${window.location.host}/api/mcp`
                      : "https://aiwni.com/api/mcp"}
                    placeholder="https://aiwni.com/api/mcp"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    استخدم هذا الرابط + المفتاح أعلاه في إعدادات Claude Desktop
                  </p>
                </div>

                {/* Config */}
                {claudeApiKey && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <Database className="w-3 h-3 text-emerald-600" /> إعدادات Claude Desktop (انسخ والصق في MCP Config)
                    </label>
                    <div className="relative">
                      <pre className="text-xs font-mono bg-gray-950 text-emerald-400 rounded-xl p-4 overflow-x-auto leading-relaxed" dir="ltr">
                        {`{
  "mcpServers": {
    "wani": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch",
               "https://${typeof window !== "undefined" ? window.location.host : "aiwni.com"}/api/mcp"],
      "env": {
        "AUTHORIZATION": "Bearer ${claudeApiKey}"
      }
    }
  }
}`}
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyClaudeText("config")}
                        className="absolute top-2 left-2 text-xs gap-1 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                      >
                        {claudeCopied === "config"
                          ? <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> تم النسخ</>
                          : <><Copy className="w-3 h-3" /> نسخ</>}
                      </Button>
                    </div>
                  </div>
                )}

                {/* أمثلة أوامر Claude */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">بعد الربط — تقدر تقول لـ Claude:</p>
                  <ul className="space-y-1">
                    {[
                      "\"اختار جمهور عشوائي واعملي حملة\"",
                      "\"فيه كام رسالة واردة؟\"",
                      "\"اعرضلي أفضل الحملات هذا الشهر\"",
                      "\"كام جهة اتصال عندي؟\"",
                      "\"اعملي قالب تسويقي يشد العميل \"",
                    ].map((ex, i) => (
                      <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <span className="text-emerald-500 font-bold">›</span> {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {card.id === "elevenlabs" && (
              isElevenLabsLinked && !elevenLabsEditMode ? (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                      <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                        {locale === "ar" ? "تم ربط ElevenLabs بنجاح ✅" : "ElevenLabs connected successfully ✅"}
                      </p>
                      <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                        {locale === "ar" ? "الـ Agent الصوتي شغّال" : "Your voice agent is active"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Agent ID</p>
                      <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mt-0.5">{elevenLabsAgentId}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-3">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {locale === "ar" ? "الرد الصوتي مفعّل" : "Voice Reply enabled"}
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        const next = !voiceRepliesEnabled;
                        setVoiceRepliesEnabled(next);
                        try {
                          const r = await fetch("/api/ai-agent", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ...(elevenLabsAgentData ?? {}), elevenLabsEnabled: true, voiceRepliesEnabled: next, elevenLabsApiKey: elevenLabsApiKey.trim(), elevenLabsAgentId: elevenLabsAgentId.trim() || null, elevenLabsVoiceId: elevenLabsVoiceId.trim() || null }),
                          });
                          const d = await r.json();
                          if (!r.ok) throw new Error(d.error ?? "Save failed");
                          setElevenLabsAgentData(d);
                        } catch (e: any) {
                          setVoiceRepliesEnabled(!next);
                          toast.error(e?.message ?? "Could not update");
                        }
                      }}
                      className={cn("w-12 h-6 rounded-full p-1 transition-colors", voiceRepliesEnabled ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700")}
                      aria-label="Toggle Voice Replies Output"
                    >
                      <span className={cn("block w-4 h-4 rounded-full bg-white transition-transform", voiceRepliesEnabled ? "translate-x-6" : "translate-x-0")} />
                    </button>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={() => setElevenLabsEditMode(true)}
                      className="flex-1 gap-2 text-xs font-medium dark:border-gray-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {locale === "ar" ? "تعديل البيانات" : "Edit credentials"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDisconnectElevenLabs}
                      className="gap-2 text-xs font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {locale === "ar" ? "فك الربط" : "Disconnect"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">ElevenLabs API Key *</Label>
                    <Input
                      id="elevenlabs_api_key_custom"
                      name="elevenlabs_api_key_custom"
                      type="password"
                      autoComplete="new-password"
                      spellCheck={false}
                      value={elevenLabsApiKey}
                      onChange={e => setElevenLabsApiKey(e.target.value)}
                      placeholder="sk_••••••••"
                      dir="ltr"
                      className="rounded-xl text-xs font-mono dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Agent ID *</Label>
                    <Input
                      id="elevenlabs_agent_id_custom"
                      name="elevenlabs_agent_id_custom"
                      autoComplete="off"
                      value={elevenLabsAgentId}
                      onChange={e => setElevenLabsAgentId(e.target.value)}
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      dir="ltr"
                      className="rounded-xl text-xs font-mono dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>

                  {/* زر الربط بالأسفل */}
                  <div className="pt-2">
                    <Button
                      onClick={async () => { await handleSaveElevenLabs(); setElevenLabsEditMode(false); }}
                      disabled={elevenLabsSaving}
                      size="default"
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                    >
                      {elevenLabsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> {locale === "ar" ? "حفظ وربط ElevenLabs" : "Save & Connect ElevenLabs"}</>}
                    </Button>
                  </div>
                </div>
              )
            )}
          </IntegrationCard>
          );
        })}
      </div>
    </div>
  );
}