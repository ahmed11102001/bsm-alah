// src/app/dashboard/store/_components/AutomationCard.tsx
// â”€â”€â”€ ÙƒØ§Ø±Ø¯ Ø£ØªÙ…ØªØ© ÙˆØ§Ø­Ø¯Ø© (ØªØ£ÙƒÙŠØ¯ Ø£ÙˆØ±Ø¯Ø± / Ø´Ø­Ù† / Ø¹Ø±ÙˆØ¶ / Ø³Ù„Ø© Ù…Ù‡Ø¬ÙˆØ±Ø©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { useState } from "react";
import {
  ToggleLeft, ToggleRight, CheckCircle, Send, Loader2, XCircle, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  AutomationItem, AutomationTemplate, Customer, DedicatedTemplate, Lang, StoreAutomationType,
} from "./types";
import { AUTO_LABELS, DEDICATED_TEMPLATE_NAMES } from "./constants";
import { PromoSendModal } from "./PromoSendModal";
import { DelayPickerModal } from "./DelayPickerModal";

export interface AutomationCardProps {
  automation: AutomationItem;
  templates: AutomationTemplate[];  // Ù„Ù„Ù€ promo ÙÙ‚Ø·
  onSave: (type: StoreAutomationType, isEnabled: boolean, templateId: string | null, delayMinutes?: number) => Promise<void>;
  lang: Lang;
  storeSource?: "shopify" | "easyorders" | "woocommerce";
  customers?: Customer[];
}

// â”€â”€ Ù…ÙƒÙˆÙ‘Ù† Ø¹Ø±Ø¶ Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ù…Ø®ØµØµ (Ù„Ù„Ø£ØªÙ…ØªØ§Øª Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠØ©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DedicatedTemplateStatus({
  dedicatedTemplate,
  expectedName,
  lang,
}: {
  dedicatedTemplate: DedicatedTemplate | null;
  expectedName: string;
  lang: Lang;
}) {
  if (!dedicatedTemplate) {
    return (
      <div className="rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 px-3 py-2.5 text-xs text-orange-700 dark:text-orange-400">
        <p className="font-medium mb-0.5">
          {lang === "ar" ? "âš ï¸ Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ù…Ø®ØµØµ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" : "âš ï¸ Dedicated template missing"}
        </p>
        <p className="opacity-80">
          {lang === "ar"
            ? <>Ø£Ù†Ø´Ø¦ Ù‚Ø§Ù„Ø¨Ø§Ù‹ Ø¨Ø§Ø³Ù…: <span className="font-mono font-bold">"{expectedName}"</span> Ø«Ù… Ø²Ø§Ù…Ù†Ù‡ Ù…Ù† ØµÙØ­Ø© Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨</>
            : <>Create a Meta template named: <span className="font-mono font-bold">"{expectedName}"</span> then sync it from Templates page</>
          }
        </p>
      </div>
    );
  }

  const status = dedicatedTemplate.status?.toLowerCase() ?? "";
  const isApproved = status === "approved";

  const statusConfig: Record<string, { bg: string; text: string; label: { ar: string; en: string }; icon: string }> = {
    approved: { bg: "bg-primary/10", text: "text-green-700 dark:text-green-400", label: { ar: "Ù…Ø¹ØªÙ…Ø¯ âœ“", en: "Approved âœ“" }, icon: "âœ“" },
    pending: { bg: "bg-yellow-50 dark:bg-yellow-900/10", text: "text-yellow-700 dark:text-yellow-400", label: { ar: "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©", en: "Under Review" }, icon: "â³" },
    rejected: { bg: "bg-red-50 dark:bg-red-900/10", text: "text-red-700 dark:text-red-400", label: { ar: "Ù…Ø±ÙÙˆØ¶", en: "Rejected" }, icon: "âœ•" },
    submitted: { bg: "bg-blue-50 dark:bg-blue-900/10", text: "text-blue-700 dark:text-blue-400", label: { ar: "ØªÙ… Ø§Ù„Ø¥Ø±Ø³Ø§Ù„", en: "Submitted" }, icon: "ðŸ“¤" },
  };

  const cfg = statusConfig[status] ?? statusConfig["pending"];

  return (
    <div className={cn("rounded-xl border px-3 py-2.5", cfg.bg,
      isApproved ? "border-green-200 dark:border-green-800" : "border-yellow-200 dark:border-yellow-800"
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-900/30 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xs">{cfg.icon}</span>
          </div>
          <div className="min-w-0">
            <p className={cn("text-[11px] font-semibold truncate", cfg.text)}>
              {dedicatedTemplate.name}
            </p>
            <p className={cn("text-[10px] opacity-80", cfg.text)}>
              {cfg.label[lang]}
            </p>
          </div>
        </div>
        {!isApproved && (
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {lang === "ar" ? "Ø§Ù†ØªØ¸Ø± Ø§Ø¹ØªÙ…Ø§Ø¯ Ù…ÙŠØªØ§" : "Awaiting Meta approval"}
          </span>
        )}
      </div>
    </div>
  );
}

export function AutomationCard({ automation, templates, onSave, lang, storeSource, customers = [] }: AutomationCardProps) {
  const [enabled, setEnabled] = useState(automation.isEnabled);
  const [templateId, setTemplateId] = useState(automation.templateId ?? "");
  const [saving, setSaving] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [promoSentAdj, setPromoSentAdj] = useState(0);
  const [showDelayModal, setShowDelayModal] = useState(false);

  const meta = AUTO_LABELS[automation.type];
  const label = meta.label[lang];
  const desc = meta.desc[lang];

  // cart_abandon ØªØ´ØªØºÙ„ Ø¨Ø³ Ù…Ø¹ Shopify
  const isShopifyOnly = meta.shopifyOnly === true;
  const isUnsupported = isShopifyOnly && storeSource !== "shopify";

  // Ù‡Ù„ Ù‡Ø°Ù‡ Ø£ØªÙ…ØªØ© Ù„Ù‡Ø§ Ù‚Ø§Ù„Ø¨ Ù…Ø®ØµØµ Ø«Ø§Ø¨ØªØŸ
  const isDedicated = meta.isDedicated === true;

  // Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ù…Ø®ØµØµ ÙˆØ­Ø§Ù„ØªÙ‡
  const dedicatedTemplate = automation.dedicatedTemplate ?? null;
  const dedicatedName = isDedicated ? DEDICATED_TEMPLATE_NAMES[automation.type] ?? "" : "";
  const dedicatedIsApproved = dedicatedTemplate?.status?.toLowerCase() === "approved";

  // Ù‡Ù„ ÙŠÙ…ÙƒÙ† ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø£ØªÙ…ØªØ©ØŸ
  const canToggle = isDedicated
    ? dedicatedIsApproved && !isUnsupported  // ÙÙ‚Ø· Ù„Ùˆ Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ù…Ø®ØµØµ Ù…Ø¹ØªÙ…Ø¯
    : !!templateId && !isUnsupported;        // promo: Ù„Ø§Ø²Ù… ÙŠØ®ØªØ§Ø± Ù‚Ø§Ù„Ø¨

  async function handleToggle() {
    if (isUnsupported || !canToggle) {
      if (isDedicated && !dedicatedIsApproved) {
        toast.error(
          lang === "ar"
            ? "Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ØªÙØ¹ÙŠÙ„ â€” Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ù…Ø®ØµØµ Ù„Ù… ÙŠÙØ¹ØªÙ…Ø¯ Ø¨Ø¹Ø¯ Ù…Ù† Ù…ÙŠØªØ§"
            : "Cannot enable â€” dedicated template not approved by Meta yet"
        );
      } else if (!isDedicated && !templateId) {
        toast.error(lang === "ar" ? "Ø§Ø®ØªØ± Ù‚Ø§Ù„Ø¨Ø§Ù‹ Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø£ÙˆÙ„Ø§Ù‹" : "Choose a template first");
      }
      return;
    }

    if (!enabled) {
      setShowDelayModal(true);
    } else {
      setEnabled(false);
      setSaving(true);
      await onSave(automation.type, false, isDedicated ? null : (templateId || null), automation.delayMinutes);
      setSaving(false);
    }
  }

  async function handleConfirmDelay(minutes: number) {
    setShowDelayModal(false);
    setEnabled(true);
    setSaving(true);
    await onSave(
      automation.type,
      true,
      isDedicated ? null : (templateId || null),
      minutes
    );
    setSaving(false);
  }

  function getDelayLabel(minutes: number): string {
    if (minutes === 0) return lang === "ar" ? "âš¡ Ø¥Ø±Ø³Ø§Ù„ ÙÙˆØ±ÙŠ" : "âš¡ Immediate send";
    if (minutes === 15) return lang === "ar" ? "â±ï¸ Ø¨Ø¹Ø¯ 15 Ø¯Ù‚ÙŠÙ‚Ø©" : "â±ï¸ After 15 minutes";
    if (minutes === 30) return lang === "ar" ? "â±ï¸ Ø¨Ø¹Ø¯ 30 Ø¯Ù‚ÙŠÙ‚Ø©" : "â±ï¸ After 30 minutes";
    if (minutes === 60) return lang === "ar" ? "â±ï¸ Ø¨Ø¹Ø¯ Ø³Ø§Ø¹Ø©" : "â±ï¸ After 1 hour";
    if (minutes === 120) return lang === "ar" ? "â±ï¸ Ø¨Ø¹Ø¯ Ø³Ø§Ø¹ØªÙŠÙ†" : "â±ï¸ After 2 hours";
    if (minutes === 180) return lang === "ar" ? "â±ï¸ Ø¨Ø¹Ø¯ 3 Ø³Ø§Ø¹Ø§Øª" : "â±ï¸ After 3 hours";
    if (minutes === 360) return lang === "ar" ? "â±ï¸ Ø¨Ø¹Ø¯ 6 Ø³Ø§Ø¹Ø§Øª" : "â±ï¸ After 6 hours";
    if (minutes === 720) return lang === "ar" ? "â±ï¸ Ø¨Ø¹Ø¯ 12 Ø³Ø§Ø¹Ø©" : "â±ï¸ After 12 hours";
    if (minutes === 1440) return lang === "ar" ? "â±ï¸ Ø¨Ø¹Ø¯ 24 Ø³Ø§Ø¹Ø©" : "â±ï¸ After 24 hours";
    return lang === "ar" ? `â±ï¸ Ø¨Ø¹Ø¯ ${minutes} Ø¯Ù‚ÙŠÙ‚Ø©` : `â±ï¸ After ${minutes} minutes`;
  }

  async function handleTemplateChange(tid: string) {
    if (isUnsupported || isDedicated) return;
    setTemplateId(tid);
    if (enabled && tid) {
      setSaving(true);
      await onSave(automation.type, true, tid);
      setSaving(false);
    }
  }

  const isPromo = automation.type === "promo";
  const totalSent = (automation.sentCount ?? 0) + promoSentAdj;

  function formatLastSent(iso: string | null): string {
    if (!iso) return lang === "ar" ? "Ù„Ù… ÙŠÙØ±Ø³Ù„ Ø¨Ø¹Ø¯" : "Not sent yet";
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <>
      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-5 transition-all relative",
        enabled && !isUnsupported
          ? "border-primary/40 dark:border-primary/25"
          : "border-gray-100 dark:border-gray-700",
        isUnsupported && "opacity-70"
      )}>

        {/* Badge: Shopify ÙÙ‚Ø· */}
        {isShopifyOnly && (
          <span className={cn(
            "absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded-full font-medium",
            storeSource === "shopify"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          )}>
            {storeSource === "shopify" ? "Shopify âœ“" : (lang === "ar" ? "Shopify ÙÙ‚Ø·" : "Shopify only")}
          </span>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">{meta.icon}</span>
            <div>
              <p className="font-semibold text-sm text-gray-800 dark:text-white">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving || isUnsupported || (isDedicated && !dedicatedIsApproved)}
            title={
              isDedicated && !dedicatedIsApproved
                ? (lang === "ar" ? "Ø§Ù†ØªØ¸Ø± Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ù‚Ø§Ù„Ø¨ Ù…Ù† Ù…ÙŠØªØ§" : "Awaiting template approval from Meta")
                : undefined
            }
            className="flex-shrink-0 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={enabled
              ? (lang === "ar" ? "Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ø£ØªÙ…ØªØ©" : "Disable automation")
              : (lang === "ar" ? "ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø£ØªÙ…ØªØ©" : "Enable automation")}
          >
            {saving
              ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              : enabled && !isUnsupported
                ? <ToggleRight className="w-8 h-8 text-primary" />
                : <ToggleLeft className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            }
          </button>
        </div>

        {/* Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ù…ØªØ§Ø¬Ø± ØºÙŠØ± Ø§Ù„Ù…Ø¯Ø¹ÙˆÙ…Ø© */}
        {isUnsupported ? (
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 px-3 py-2.5 text-xs text-orange-700 dark:text-orange-400">
            {lang === "ar"
              ? "âš ï¸ Ù‡Ø°Ù‡ Ø§Ù„Ø£ØªÙ…ØªØ© Ù…ØªØ§Ø­Ø© ÙÙ‚Ø· Ù„Ù…ØªØ§Ø¬Ø± Shopify â€” ÙŠØ³ØªÙ„Ø²Ù… webhook Ø§Ù„Ø³Ù„Ø© Ø§Ù„Ù…Ù‡Ø¬ÙˆØ±Ø©"
              : "âš ï¸ This automation is available for Shopify stores only â€” requires abandoned checkout webhook"}
          </div>
        ) : isDedicated ? (
          /* â”€â”€ Ø§Ù„Ø£ØªÙ…ØªØ§Øª Ø°Ø§Øª Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ù…Ø®ØµØµ Ø§Ù„Ø«Ø§Ø¨Øª â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
          <>
            <div className="mb-3">
              <label className="text-[11px] text-gray-400 mb-1.5 block">
                {lang === "ar" ? "Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ù…Ø®ØµØµ" : "Dedicated template"}
              </label>
              <DedicatedTemplateStatus
                dedicatedTemplate={dedicatedTemplate}
                expectedName={dedicatedName}
                lang={lang}
              />
            </div>

            {/* Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ */}
            <div className="space-y-1.5">
              {totalSent > 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-[11px] text-gray-400">
                    {totalSent.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}{" "}
                    {lang === "ar" ? "Ø±Ø³Ø§Ù„Ø© Ø£ÙØ±Ø³Ù„Øª" : "messages sent"}
                  </span>
                </div>
              )}
              {(automation.failedCount ?? 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <span className="text-[11px] text-gray-400">
                    {(automation.failedCount ?? 0).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}{" "}
                    {lang === "ar" ? "ÙØ´Ù„" : "failed"}
                  </span>
                </div>
              )}
              {automation.lastSentAt && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  <span className="text-[11px] text-gray-400">
                    {lang === "ar" ? "Ø¢Ø®Ø± Ø¥Ø±Ø³Ø§Ù„:" : "Last sent:"}{" "}
                    {formatLastSent(automation.lastSentAt)}
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          /* â”€â”€ Ø§Ù„Ø¹Ø±ÙˆØ¶ (promo): Ø§Ø®ØªÙŠØ§Ø± Ø­Ø± Ù…Ù† Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨ Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
          <>
            <div>
              <label className="text-[11px] text-gray-400 mb-1.5 block">
                {lang === "ar" ? "Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…" : "Used template"}
              </label>
              <select
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm px-3 py-2.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">{lang === "ar" ? "â€” Ø§Ø®ØªØ± Ù‚Ø§Ù„Ø¨ Ù…Ø¹ØªÙ…Ø¯ â€”" : "â€” Choose approved template â€”"}</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className="text-[10px] text-orange-500 mt-1.5">
                  {lang === "ar" ? "âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚ÙˆØ§Ù„Ø¨ Ù…Ø¹ØªÙ…Ø¯Ø© â€” Ø§Ø°Ù‡Ø¨ Ù„ØµÙØ­Ø© Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨" : "âš ï¸ No approved templates â€” go to Templates page"}
                </p>
              )}
            </div>

            {/* Ø²Ø± Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¹Ø±ÙˆØ¶ */}
            <button
              onClick={() => {
                if (!enabled || !templateId) {
                  toast.error(lang === "ar" ? "ÙØ¹Ù‘Ù„ Ø§Ù„Ø£ØªÙ…ØªØ© ÙˆØ§Ø®ØªØ± Ù‚Ø§Ù„Ø¨Ø§Ù‹ Ø£ÙˆÙ„Ø§Ù‹" : "Enable automation and choose a template first");
                  return;
                }
                if (customers.length === 0) {
                  toast.error(lang === "ar" ? "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¹Ù…Ù„Ø§Ø¡ ÙÙŠ Ø§Ù„Ù…ØªØ¬Ø±" : "No store customers found");
                  return;
                }
                setShowPromo(true);
              }}
              className={cn(
                "mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                enabled && templateId
                  ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed border border-transparent"
              )}
            >
              <Send className="w-4 h-4" />
              {lang === "ar" ? "Ø¥Ø±Ø³Ø§Ù„ Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù…ØªØ¬Ø±" : "Send to store customers"}
              {customers.length > 0 && (
                <span className="text-[11px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  {customers.length}
                </span>
              )}
            </button>

            {/* Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ */}
            <div className="mt-3 space-y-1.5">
              {totalSent > 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-[11px] text-gray-400">
                    {totalSent.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}{" "}
                    {lang === "ar" ? "Ø±Ø³Ø§Ù„Ø© Ø£ÙØ±Ø³Ù„Øª" : "messages sent"}
                  </span>
                </div>
              )}
              {(automation.failedCount ?? 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <span className="text-[11px] text-gray-400">
                    {(automation.failedCount ?? 0).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}{" "}
                    {lang === "ar" ? "ÙØ´Ù„" : "failed"}
                  </span>
                </div>
              )}
              {automation.lastSentAt && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  <span className="text-[11px] text-gray-400">
                    {lang === "ar" ? "Ø¢Ø®Ø± Ø¥Ø±Ø³Ø§Ù„:" : "Last sent:"}{" "}
                    {formatLastSent(automation.lastSentAt)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {enabled && (
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700/60 pt-3 mt-4">
            <span className="text-[11px] text-gray-400">
              {lang === "ar" ? "ÙˆÙ‚Øª Ø§Ù„Ø¥Ø±Ø³Ø§Ù„:" : "Send time:"}
            </span>
            <button
              onClick={() => setShowDelayModal(true)}
              className="text-xs font-semibold text-primary hover:text-[#1fba59] transition-colors flex items-center gap-1.5"
            >
              {getDelayLabel(automation.delayMinutes ?? 0)}
              <span className="text-[9px] font-bold bg-primary/10 px-1.5 py-0.5 rounded-md">
                {lang === "ar" ? "ØªØ¹Ø¯ÙŠÙ„" : "Edit"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Promo Modal */}
      {isPromo && showPromo && storeSource && (
        <PromoSendModal
          source={storeSource}
          customers={customers}
          lang={lang}
          onClose={() => setShowPromo(false)}
          onSent={(n) => setPromoSentAdj((p) => p + n)}
        />
      )}

      {/* Delay Picker Modal */}
      {showDelayModal && (
        <DelayPickerModal
          currentDelay={automation.delayMinutes ?? 0}
          isOpen={showDelayModal}
          onClose={() => setShowDelayModal(false)}
          onConfirm={handleConfirmDelay}
          lang={lang}
        />
      )}
    </>
  );
}
