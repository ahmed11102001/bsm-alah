// src/app/dashboard/store/_components/AutomationCard.tsx
// ─── كارد أتمتة واحدة (تأكيد أوردر / شحن / عروض / سلة مهجورة) ───────────────

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
    templates: AutomationTemplate[];  // للـ promo فقط
    onSave: (type: StoreAutomationType, isEnabled: boolean, templateId: string | null, delayMinutes?: number) => Promise<void>;
    lang: Lang;
    storeSource?: "shopify" | "easyorders" | "woocommerce";
    customers?: Customer[];
}

// ── مكوّن عرض القالب المخصص (للأتمتات التلقائية) ──────────────────────────────
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
                    {lang === "ar" ? "⚠️ القالب المخصص غير موجود" : "⚠️ Dedicated template missing"}
                </p>
                <p className="opacity-80">
                    {lang === "ar"
                        ? <>أنشئ قالباً باسم: <span className="font-mono font-bold">"{expectedName}"</span> ثم زامنه من صفحة القوالب</>
                        : <>Create a Meta template named: <span className="font-mono font-bold">"{expectedName}"</span> then sync it from Templates page</>
                    }
                </p>
            </div>
        );
    }

    const status = dedicatedTemplate.status?.toLowerCase() ?? "";
    const isApproved = status === "approved";

    const statusConfig: Record<string, { bg: string; text: string; label: { ar: string; en: string }; icon: string }> = {
        approved: { bg: "bg-green-50 dark:bg-green-900/10", text: "text-green-700 dark:text-green-400", label: { ar: "معتمد ✓", en: "Approved ✓" }, icon: "✓" },
        pending: { bg: "bg-yellow-50 dark:bg-yellow-900/10", text: "text-yellow-700 dark:text-yellow-400", label: { ar: "قيد المراجعة", en: "Under Review" }, icon: "⏳" },
        rejected: { bg: "bg-red-50 dark:bg-red-900/10", text: "text-red-700 dark:text-red-400", label: { ar: "مرفوض", en: "Rejected" }, icon: "✕" },
        submitted: { bg: "bg-blue-50 dark:bg-blue-900/10", text: "text-blue-700 dark:text-blue-400", label: { ar: "تم الإرسال", en: "Submitted" }, icon: "📤" },
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
                        {lang === "ar" ? "انتظر اعتماد ميتا" : "Awaiting Meta approval"}
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

    // cart_abandon تشتغل بس مع Shopify
    const isShopifyOnly = meta.shopifyOnly === true;
    const isUnsupported = isShopifyOnly && storeSource !== "shopify";

    // هل هذه أتمتة لها قالب مخصص ثابت؟
    const isDedicated = meta.isDedicated === true;

    // القالب المخصص وحالته
    const dedicatedTemplate = automation.dedicatedTemplate ?? null;
    const dedicatedName = isDedicated ? DEDICATED_TEMPLATE_NAMES[automation.type] ?? "" : "";
    const dedicatedIsApproved = dedicatedTemplate?.status?.toLowerCase() === "approved";

    // هل يمكن تفعيل الأتمتة؟
    const canToggle = isDedicated
        ? dedicatedIsApproved && !isUnsupported  // فقط لو القالب المخصص معتمد
        : !!templateId && !isUnsupported;        // promo: لازم يختار قالب

    async function handleToggle() {
        if (isUnsupported || !canToggle) {
            if (isDedicated && !dedicatedIsApproved) {
                toast.error(
                    lang === "ar"
                        ? "لا يمكن التفعيل — القالب المخصص لم يُعتمد بعد من ميتا"
                        : "Cannot enable — dedicated template not approved by Meta yet"
                );
            } else if (!isDedicated && !templateId) {
                toast.error(lang === "ar" ? "اختر قالباً من القائمة أولاً" : "Choose a template first");
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
        if (minutes === 0) return lang === "ar" ? "⚡ إرسال فوري" : "⚡ Immediate send";
        if (minutes === 15) return lang === "ar" ? "⏱️ بعد 15 دقيقة" : "⏱️ After 15 minutes";
        if (minutes === 30) return lang === "ar" ? "⏱️ بعد 30 دقيقة" : "⏱️ After 30 minutes";
        if (minutes === 60) return lang === "ar" ? "⏱️ بعد ساعة" : "⏱️ After 1 hour";
        if (minutes === 120) return lang === "ar" ? "⏱️ بعد ساعتين" : "⏱️ After 2 hours";
        if (minutes === 180) return lang === "ar" ? "⏱️ بعد 3 ساعات" : "⏱️ After 3 hours";
        if (minutes === 360) return lang === "ar" ? "⏱️ بعد 6 ساعات" : "⏱️ After 6 hours";
        if (minutes === 720) return lang === "ar" ? "⏱️ بعد 12 ساعة" : "⏱️ After 12 hours";
        if (minutes === 1440) return lang === "ar" ? "⏱️ بعد 24 ساعة" : "⏱️ After 24 hours";
        return lang === "ar" ? `⏱️ بعد ${minutes} دقيقة` : `⏱️ After ${minutes} minutes`;
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
        if (!iso) return lang === "ar" ? "لم يُرسل بعد" : "Not sent yet";
        const d = new Date(iso);
        return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
        });
    }

    return (
        <>
            <div className={cn(
                "bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-5 transition-all relative",
                enabled && !isUnsupported
                    ? "border-[#25D366]/40 dark:border-[#25D366]/25"
                    : "border-gray-100 dark:border-gray-700",
                isUnsupported && "opacity-70"
            )}>

                {/* Badge: Shopify فقط */}
                {isShopifyOnly && (
                    <span className={cn(
                        "absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded-full font-medium",
                        storeSource === "shopify"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    )}>
                        {storeSource === "shopify" ? "Shopify ✓" : (lang === "ar" ? "Shopify فقط" : "Shopify only")}
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
                                ? (lang === "ar" ? "انتظر اعتماد القالب من ميتا" : "Awaiting template approval from Meta")
                                : undefined
                        }
                        className="flex-shrink-0 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label={enabled
                            ? (lang === "ar" ? "إيقاف الأتمتة" : "Disable automation")
                            : (lang === "ar" ? "تفعيل الأتمتة" : "Enable automation")}
                    >
                        {saving
                            ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            : enabled && !isUnsupported
                                ? <ToggleRight className="w-8 h-8 text-[#25D366]" />
                                : <ToggleLeft className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                        }
                    </button>
                </div>

                {/* رسالة المتاجر غير المدعومة */}
                {isUnsupported ? (
                    <div className="rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 px-3 py-2.5 text-xs text-orange-700 dark:text-orange-400">
                        {lang === "ar"
                            ? "⚠️ هذه الأتمتة متاحة فقط لمتاجر Shopify — يستلزم webhook السلة المهجورة"
                            : "⚠️ This automation is available for Shopify stores only — requires abandoned checkout webhook"}
                    </div>
                ) : isDedicated ? (
                    /* ── الأتمتات ذات القالب المخصص الثابت ────────────────────────────── */
                    <>
                        <div className="mb-3">
                            <label className="text-[11px] text-gray-400 mb-1.5 block">
                                {lang === "ar" ? "القالب المخصص" : "Dedicated template"}
                            </label>
                            <DedicatedTemplateStatus
                                dedicatedTemplate={dedicatedTemplate}
                                expectedName={dedicatedName}
                                lang={lang}
                            />
                        </div>

                        {/* إحصائيات الإرسال */}
                        <div className="space-y-1.5">
                            {totalSent > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle className="w-3.5 h-3.5 text-[#25D366] flex-shrink-0" />
                                    <span className="text-[11px] text-gray-400">
                                        {totalSent.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}{" "}
                                        {lang === "ar" ? "رسالة أُرسلت" : "messages sent"}
                                    </span>
                                </div>
                            )}
                            {(automation.failedCount ?? 0) > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                                    <span className="text-[11px] text-gray-400">
                                        {(automation.failedCount ?? 0).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}{" "}
                                        {lang === "ar" ? "فشل" : "failed"}
                                    </span>
                                </div>
                            )}
                            {automation.lastSentAt && (
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                    <span className="text-[11px] text-gray-400">
                                        {lang === "ar" ? "آخر إرسال:" : "Last sent:"}{" "}
                                        {formatLastSent(automation.lastSentAt)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* ── العروض (promo): اختيار حر من القوالب المعتمدة ─────────────────── */
                    <>
                        <div>
                            <label className="text-[11px] text-gray-400 mb-1.5 block">
                                {lang === "ar" ? "القالب المستخدم" : "Used template"}
                            </label>
                            <select
                                value={templateId}
                                onChange={(e) => handleTemplateChange(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm px-3 py-2.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
                            >
                                <option value="">{lang === "ar" ? "— اختر قالب معتمد —" : "— Choose approved template —"}</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            {templates.length === 0 && (
                                <p className="text-[10px] text-orange-500 mt-1.5">
                                    {lang === "ar" ? "⚠️ لا توجد قوالب معتمدة — اذهب لصفحة القوالب" : "⚠️ No approved templates — go to Templates page"}
                                </p>
                            )}
                        </div>

                        {/* زر إرسال العروض */}
                        <button
                            onClick={() => {
                                if (!enabled || !templateId) {
                                    toast.error(lang === "ar" ? "فعّل الأتمتة واختر قالباً أولاً" : "Enable automation and choose a template first");
                                    return;
                                }
                                if (customers.length === 0) {
                                    toast.error(lang === "ar" ? "لا يوجد عملاء في المتجر" : "No store customers found");
                                    return;
                                }
                                setShowPromo(true);
                            }}
                            className={cn(
                                "mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                                enabled && templateId
                                    ? "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed border border-transparent"
                            )}
                        >
                            <Send className="w-4 h-4" />
                            {lang === "ar" ? "إرسال لعملاء المتجر" : "Send to store customers"}
                            {customers.length > 0 && (
                                <span className="text-[11px] bg-[#25D366]/20 text-[#25D366] px-1.5 py-0.5 rounded-full">
                                    {customers.length}
                                </span>
                            )}
                        </button>

                        {/* إحصائيات الإرسال */}
                        <div className="mt-3 space-y-1.5">
                            {totalSent > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle className="w-3.5 h-3.5 text-[#25D366] flex-shrink-0" />
                                    <span className="text-[11px] text-gray-400">
                                        {totalSent.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}{" "}
                                        {lang === "ar" ? "رسالة أُرسلت" : "messages sent"}
                                    </span>
                                </div>
                            )}
                            {(automation.failedCount ?? 0) > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                                    <span className="text-[11px] text-gray-400">
                                        {(automation.failedCount ?? 0).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}{" "}
                                        {lang === "ar" ? "فشل" : "failed"}
                                    </span>
                                </div>
                            )}
                            {automation.lastSentAt && (
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                    <span className="text-[11px] text-gray-400">
                                        {lang === "ar" ? "آخر إرسال:" : "Last sent:"}{" "}
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
                            {lang === "ar" ? "وقت الإرسال:" : "Send time:"}
                        </span>
                        <button
                            onClick={() => setShowDelayModal(true)}
                            className="text-xs font-semibold text-[#25D366] hover:text-[#1fba59] transition-colors flex items-center gap-1.5"
                        >
                            {getDelayLabel(automation.delayMinutes ?? 0)}
                            <span className="text-[9px] font-bold bg-[#25D366]/10 px-1.5 py-0.5 rounded-md">
                                {lang === "ar" ? "تعديل" : "Edit"}
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