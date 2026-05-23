"use client";

import { useState } from "react";
import { Bot, X, ChevronRight } from "lucide-react";
import type { AssistantRule, RuleContext } from "@/lib/assistant-rules";
import { resolveText } from "@/lib/assistant-rules";

interface Props {
  rules:     AssistantRule[];
  ctx:       RuleContext;
  locale:    "ar" | "en";
  onDismiss: (id: string) => void;
  onAction:  (target: string, type: "navigate" | "link") => void;
}

const T = {
  ar: { title: "المساعد الذكي", close: "إغلاق", noTips: "كل حاجة تمام! 🎉", noTipsDesc: "مفيش تحذيرات أو اقتراحات دلوقتي.", badge: "نصيحة" },
  en: { title: "Smart Assistant", close: "Close", noTips: "All good! 🎉", noTipsDesc: "No warnings or suggestions right now.", badge: "tip" },
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  warning:  "bg-amber-400",
  info:     "bg-blue-400",
};

export default function FloatingHelper({ rules, ctx, locale, onDismiss, onAction }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const t   = T[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  const criticalCount = rules.filter(r => r.severity === "critical").length;
  const totalCount    = rules.length;

  return (
    <>
      {/* Panel */}
      {isOpen && (
        <div
          dir={dir}
          className="fixed bottom-20 right-6 z-50 w-80 bg-white dark:bg-gray-900
                     border border-gray-100 dark:border-gray-700 rounded-3xl shadow-2xl
                     overflow-hidden"
          style={{ animation: "wpSlideUp .25s ease forwards" }}
        >
          <style>{`
            @keyframes wpSlideUp {
              from { opacity:0; transform:translateY(12px) scale(.97) }
              to   { opacity:1; transform:translateY(0) scale(1) }
            }
            @keyframes wpPulse {
              0%,100% { box-shadow: 0 0 0 0 rgba(37,211,102,.5) }
              50%      { box-shadow: 0 0 0 10px rgba(37,211,102,0) }
            }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#25D366] to-[#128C7E]">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <span className="text-white font-semibold text-sm">{t.title}</span>
              {totalCount > 0 && (
                <span className="bg-white/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {totalCount}
                </span>
              )}
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Rules list */}
          <div className="max-h-80 overflow-y-auto">
            {rules.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-gray-800 dark:text-gray-200 font-semibold text-sm">{t.noTips}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{t.noTipsDesc}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {rules.map(rule => {
                  const title   = resolveText(rule.title   as any, locale, ctx);
                  const message = resolveText(rule.message as any, locale, ctx);
                  return (
                    <div key={rule.id} className="px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <div className="flex items-start gap-2.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${SEVERITY_DOT[rule.severity]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white text-xs font-semibold leading-tight">{title}</p>
                          <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5 leading-relaxed line-clamp-2">{message}</p>
                          {rule.action && (
                            <button
                              onClick={() => { onAction(rule.action!.target, rule.action!.type); setIsOpen(false); }}
                              className="mt-1.5 text-[#25D366] text-[11px] font-semibold flex items-center gap-0.5 hover:opacity-80 transition"
                            >
                              {rule.action.label[locale]}
                              <ChevronRight className="w-3 h-3" style={{ transform: locale === "ar" ? "rotate(180deg)" : "none" }} />
                            </button>
                          )}
                        </div>
                        {rule.cooldownHours > 0 && (
                          <button
                            onClick={() => onDismiss(rule.id)}
                            className="text-gray-300 hover:text-gray-500 transition flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
                   bg-gradient-to-br from-[#25D366] to-[#128C7E]
                   flex items-center justify-center
                   hover:scale-110 active:scale-95 transition-transform duration-200
                   shadow-lg shadow-green-500/30"
        style={{ animation: criticalCount > 0 ? "wpPulse 2.5s ease-in-out infinite" : "none" }}
      >
        <Bot className="w-6 h-6 text-white" />
        {/* Badge */}
        {totalCount > 0 && (
          <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white
                           text-white text-[9px] font-bold flex items-center justify-center
                           ${criticalCount > 0 ? "bg-red-500" : "bg-amber-400"}`}>
            {totalCount}
          </span>
        )}
      </button>
    </>
  );
}