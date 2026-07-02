"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bot, X, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import type { AssistantRule, RuleContext } from "@/lib/assistant-rules";
import { resolveText } from "@/lib/assistant-rules";

interface Props {
  rules:     AssistantRule[];
  ctx:       RuleContext;
  locale:    "ar" | "en";
  onDismiss: (id: string) => void;
  onAction:  (target: string, type: "navigate" | "link") => void;
  mountId?:  string;
  isOpen?:   boolean;
  onOpenChange?: (open: boolean) => void;
}

const T = {
  ar: { title: "المساعد الذكي", noTips: "كل حاجة تمام! 🎉", noTipsDesc: "مفيش تحذيرات أو اقتراحات دلوقتي.", tip: "💡 نصيحة احترافية" },
  en: { title: "Smart Assistant", noTips: "All good! 🎉", noTipsDesc: "No warnings or suggestions right now.", tip: "💡 Pro tip" },
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  warning:  "bg-amber-400",
  info:     "bg-blue-400",
};

const SEVERITY_LABEL_COLOR: Record<string, string> = {
  critical: "text-red-500 dark:text-red-400",
  warning:  "text-amber-500 dark:text-amber-400",
  info:     "text-blue-500 dark:text-blue-400",
};

function RuleRow({
  rule, ctx, locale, onDismiss, onAction,
}: {
  rule: AssistantRule; ctx: RuleContext; locale: "ar" | "en";
  onDismiss: (id: string) => void; onAction: (t: string, type: "navigate"|"link") => void;
}) {
  const [showTip, setShowTip] = useState(false);
  const t       = T[locale];
  const title   = resolveText(rule.title   as any, locale, ctx);
  const message = resolveText(rule.message as any, locale, ctx);
  const tip     = rule.tip ? resolveText(rule.tip as any, locale, ctx) : null;

  return (
    <div className="px-4 py-3.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div className="flex items-start gap-2.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${SEVERITY_DOT[rule.severity]}`} />
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-gray-900 dark:text-white text-xs font-semibold leading-tight">{title}</p>
          {/* Full message */}
          <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-1 leading-relaxed">{message}</p>

          {/* Tip toggle */}
          {tip && (
            <div className="mt-2">
              <button
                onClick={() => setShowTip(v => !v)}
                className={`text-[11px] flex items-center gap-0.5 font-medium ${SEVERITY_LABEL_COLOR[rule.severity]}`}
              >
                {t.tip}
                {showTip ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showTip && (
                <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-lg px-2.5 py-2">
                  {tip}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          {rule.action && (
            <button
              onClick={() => { onAction(rule.action!.target, rule.action!.type); }}
              className="mt-2 text-[#25D366] text-[11px] font-semibold flex items-center gap-0.5 hover:opacity-80 transition"
            >
              {rule.action.label[locale]}
              <ChevronRight className="w-3 h-3" style={{ transform: locale === "ar" ? "rotate(180deg)" : "none" }} />
            </button>
          )}
        </div>

        {/* Dismiss */}
        {rule.cooldownHours > 0 && (
          <button onClick={() => onDismiss(rule.id)} className="text-gray-300 hover:text-gray-500 transition flex-shrink-0 mt-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function FloatingHelper({ rules, ctx, locale, onDismiss, onAction, mountId, isOpen: controlledOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [mountEl, setMountEl] = useState<HTMLElement | null>(null);
  const t   = T[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  // ── موضع ديناميكي — عكس الـ sidebar دايماً ─────────────────────────────
  // Sidebar في العربي على اليمين → الـ helper على اليسار
  // Sidebar في الإنجليزي على اليسار → الـ helper على اليمين
  const side = locale === "ar" ? "left-4 sm:left-6 lg:left-[calc(16rem+1.5rem)]" : "right-4 sm:right-6";

  const criticalCount = rules.filter(r => r.severity === "critical").length;
  const totalCount    = rules.length;

  useEffect(() => {
    if (!mountId) return;
    setMountEl(document.getElementById(mountId));
  }, [mountId]);

  const renderPanel = () => (
    isOpen && (
      <div
        dir={dir}
        className={`
          fixed top-16 ${side} z-50 w-80 bg-white dark:bg-gray-900
          border border-gray-100 dark:border-gray-700 rounded-3xl shadow-2xl overflow-hidden
          lg:absolute lg:top-full lg:mt-3 lg:left-auto lg:right-auto
          ${locale === "ar" ? "lg:-left-2" : "lg:-right-2"}
        `}
        style={{ animation: "wpAssistSlideUp .25s ease forwards" }}
      >
        <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#25D366] to-[#128C7E]">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-sm">{t.title}</span>
            {totalCount > 0 && (
              <span className="bg-white/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{totalCount}</span>
            )}
          </div>
          <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {rules.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-gray-800 dark:text-gray-200 font-semibold text-sm">{t.noTips}</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{t.noTipsDesc}</p>
            </div>
          ) : (
            rules.map(rule => (
              <RuleRow
                key={rule.id}
                rule={rule} ctx={ctx} locale={locale}
                onDismiss={onDismiss}
                onAction={(target, type) => { onAction(target, type); setOpen(false); }}
              />
            ))
          )}
        </div>
      </div>
    )
  );

  return (
    <>
      <style>{`
        @keyframes wpAssistSlideUp {
          from { opacity:0; transform:translateY(12px) scale(.97) }
          to   { opacity:1; transform:translateY(0) scale(1) }
        }
        @keyframes wpAssistPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(37,211,102,.5) }
          50%      { box-shadow: 0 0 0 10px rgba(37,211,102,0) }
        }
      `}</style>

      {mountEl ? createPortal(
        <div className="relative flex items-center">
          {renderPanel()}
          <button
            onClick={() => setOpen(!isOpen)}
            className="relative h-9 w-9 rounded-xl
                      flex items-center justify-center
                      hover:scale-[1.03] active:scale-95 transition-transform duration-200
                      hover:bg-gray-100 dark:hover:bg-gray-700"
            style={{ animation: criticalCount > 0 ? "wpAssistPulse 2.5s ease-in-out infinite" : "none" }}
          >
            <img src="/wani.svg" alt="WANI" className="w-6 h-6 rounded-md object-cover" />
            {totalCount > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white
                                text-white text-[9px] font-bold flex items-center justify-center
                                ${criticalCount > 0 ? "bg-red-500" : "bg-amber-400"}`}>
                {totalCount}
              </span>
            )}
          </button>
        </div>,
        mountEl
      ) : (
        <>
          {renderPanel()}
          <button
            onClick={() => setOpen(!isOpen)}
            className={`fixed top-3 ${side} z-[60] h-9 w-9 rounded-xl
                        flex items-center justify-center
                        hover:scale-[1.03] active:scale-95 transition-transform duration-200
                        hover:bg-gray-100 dark:hover:bg-gray-700`}
            style={{ animation: criticalCount > 0 ? "wpAssistPulse 2.5s ease-in-out infinite" : "none" }}
          >
            <img src="/wani.svg" alt="WANI" className="w-6 h-6 rounded-md object-cover" />
            {totalCount > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white
                                text-white text-[9px] font-bold flex items-center justify-center
                                ${criticalCount > 0 ? "bg-red-500" : "bg-amber-400"}`}>
                {totalCount}
              </span>
            )}
          </button>
        </>
      )}
    </>
  );
}
