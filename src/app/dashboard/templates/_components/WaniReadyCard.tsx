"use client";

import { useState } from "react";
import {
    CheckCircle2, Clock, RefreshCw, Loader2, Zap, Eye, AlertCircle, Pencil,
} from "lucide-react";
import { T } from "./i18n";
import { StatusBadge } from "./StatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import type { Template, Lang } from "./types";

// matchedTemplate = القالب الحقيقي من الـ API لو موجود (اسمه مطابق للـ wani template)
// الحالات:
//   APPROVED  → زر معطّل "معتمد ✓" أخضر
//   PENDING   → زر معطّل "قيد المراجعة..." أصفر
//   REJECTED  → زر مفعّل "إعادة الإرسال" أحمر خفيف
//   null      → لم يُرسل بعد → زر "إرسال للمراجعة" أخضر
export function WaniReadyCard({ template, lang, onView, onSend, onCustomize, matchedTemplate }: {
    template: Template;
    lang: Lang;
    onView: () => void;
    onSend: (tpl: Template) => Promise<boolean>;
    onCustomize: (tpl: Template) => void;
    matchedTemplate: Template | null;
}) {
    const t = T[lang];
    const tw = (t as any).waniEdit;
    const [loading, setLoading] = useState(false);

    const varCount = (template.body?.match(/\{\{\d+\}\}/g) ?? []).length;

    // استنتج الحالة من الـ DB مش من local state
    const liveStatus = matchedTemplate?.status ?? null;
    const isPending = liveStatus === "PENDING";
    const isApproved = liveStatus === "APPROVED";
    const isRejected = liveStatus === "REJECTED" || liveStatus === "PAUSED";
    const isLocked = isPending || isApproved;   // لا يُعاد الإرسال

    const handleSend = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLocked) return;
        setLoading(true);
        await onSend(template);
        setLoading(false);
    };

    // ── تحديد شكل الزر بناءً على الحالة الحقيقية ─────────────────────────────
    const btnConfig = (() => {
        if (isApproved) return {
            cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default",
            content: <><CheckCircle2 className="w-3.5 h-3.5" /> {lang === "ar" ? "معتمد ✓" : "Approved ✓"}</>,
        };
        if (isPending) return {
            cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 cursor-not-allowed",
            content: <><Clock className="w-3.5 h-3.5 animate-pulse" /> {lang === "ar" ? "قيد المراجعة..." : "Under Review..."}</>,
        };
        if (isRejected) return {
            cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40",
            content: loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <><RefreshCw className="w-3.5 h-3.5" /> {lang === "ar" ? "إعادة الإرسال" : "Resubmit"}</>,
        };
        // لم يُرسل بعد
        return {
            cls: "bg-[#25D366] hover:bg-[#1fb956] text-white shadow-sm hover:shadow-md",
            content: loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : (lang === "ar" ? "إرسال للمراجعة" : "Send for Review"),
        };
    })();

    return (
        <div
            className="group relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700
        rounded-2xl p-4 hover:shadow-md hover:border-[#25D366]/40 dark:hover:border-[#25D366]/30
        transition-all duration-200 cursor-pointer"
            onClick={onView}
        >
            {/* Wani badge */}
            <div className="absolute -top-2 left-4 flex items-center gap-1 bg-gradient-to-r from-[#25D366] to-[#1fb956]
        text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                <Zap className="w-2.5 h-2.5" /> Wani Ready
            </div>

            {/* Status pill — يظهر فقط لو القالب موجود في الـ DB */}
            {liveStatus && (
                <div className="absolute -top-2 right-4">
                    <StatusBadge status={liveStatus} label={T[lang].status[liveStatus]} />
                </div>
            )}

            <div className="flex items-start justify-between gap-3 mt-1">
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white truncate">{template.name}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <CategoryBadge category={template.category} lang={lang} />
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{template.language === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}</span>
                        {varCount > 0 && (
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-md font-mono">
                                {varCount} {lang === "ar" ? "متغير" : "vars"}
                            </span>
                        )}
                    </div>
                </div>
                <Eye className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors mt-0.5 flex-shrink-0" />
            </div>

            {/* Body preview */}
            <div className="mt-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-600">
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                    {template.body}
                </p>
            </div>

            {/* Rejection reason hint */}
            {isRejected && matchedTemplate?.rejectedReason && (
                <div className="mt-2 flex items-start gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-2.5 py-1.5">
                    <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-600 dark:text-red-400 leading-snug line-clamp-2">
                        {matchedTemplate.rejectedReason}
                    </p>
                </div>
            )}

            {/* Buttons row: Customize + Send */}
            <div className="mt-3 flex gap-2">
                {/* زر التخصيص — يظهر دايماً ما لم يكن معتمد */}
                {!isApproved && (
                    <button
                        onClick={e => { e.stopPropagation(); onCustomize(template); }}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-[#25D366] hover:text-[#25D366] dark:hover:border-[#25D366] dark:hover:text-[#25D366] flex items-center justify-center gap-1.5 transition-all bg-white dark:bg-gray-800"
                    >
                        <Pencil className="w-3 h-3" />
                        {(tw as any)?.customize ?? (lang === 'ar' ? 'تخصيص' : 'Customize')}
                    </button>
                )}
                {/* زر الإرسال */}
                <button
                    onClick={handleSend}
                    disabled={isLocked || loading}
                    className={`${isApproved ? 'w-full' : 'flex-1'} py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 ${btnConfig.cls}`}
                >
                    {btnConfig.content}
                </button>
            </div>
        </div>
    );
}