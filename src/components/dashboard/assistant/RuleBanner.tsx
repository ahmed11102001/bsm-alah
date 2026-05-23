"use client";

import { X, AlertTriangle, Info, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { AssistantRule, RuleContext, Severity } from "@/lib/assistant-rules";
import { resolveText } from "@/lib/assistant-rules";

interface Props {
  rule:      AssistantRule;
  ctx:       RuleContext;
  locale:    "ar" | "en";
  onDismiss: (id: string) => void;
  onAction:  (target: string, type: "navigate" | "link") => void;
}

const SEVERITY_STYLES: Record<Severity, {
  bg: string; border: string; icon: string; iconBg: string; btnBg: string; btnText: string;
}> = {
  critical: {
    bg:      "bg-red-50 dark:bg-red-950/30",
    border:  "border-red-200 dark:border-red-800",
    icon:    "text-red-600 dark:text-red-400",
    iconBg:  "bg-red-100 dark:bg-red-900/40",
    btnBg:   "bg-red-600 hover:bg-red-700",
    btnText: "text-white",
  },
  warning: {
    bg:      "bg-amber-50 dark:bg-amber-950/20",
    border:  "border-amber-200 dark:border-amber-800",
    icon:    "text-amber-600 dark:text-amber-400",
    iconBg:  "bg-amber-100 dark:bg-amber-900/40",
    btnBg:   "bg-amber-500 hover:bg-amber-600",
    btnText: "text-white",
  },
  info: {
    bg:      "bg-blue-50 dark:bg-blue-950/20",
    border:  "border-blue-200 dark:border-blue-800",
    icon:    "text-blue-600 dark:text-blue-400",
    iconBg:  "bg-blue-100 dark:bg-blue-900/40",
    btnBg:   "bg-blue-600 hover:bg-blue-700",
    btnText: "text-white",
  },
};

const SeverityIcon = ({ s }: { s: Severity }) => {
  if (s === "critical") return <AlertCircle  className="w-5 h-5" />;
  if (s === "warning")  return <AlertTriangle className="w-5 h-5" />;
  return                       <Info          className="w-5 h-5" />;
};

export default function RuleBanner({ rule, ctx, locale, onDismiss, onAction }: Props) {
  const [showTip, setShowTip] = useState(false);
  const s   = SEVERITY_STYLES[rule.severity];
  const dir = locale === "ar" ? "rtl" : "ltr";

  const title   = resolveText(rule.title   as any, locale, ctx);
  const message = resolveText(rule.message as any, locale, ctx);
  const tip     = rule.tip ? resolveText(rule.tip as any, locale, ctx) : null;

  return (
    <div
      dir={dir}
      className={`rounded-2xl border px-4 py-3.5 mb-3 ${s.bg} ${s.border} transition-all duration-300`}
      style={{ animation: "wpSlideDown .25s ease forwards" }}
    >
      <style>{`
        @keyframes wpSlideDown {
          from { opacity:0; transform:translateY(-8px) }
          to   { opacity:1; transform:translateY(0)    }
        }
      `}</style>

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${s.iconBg}`}>
          <span className={s.icon}><SeverityIcon s={rule.severity} /></span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 dark:text-white font-semibold text-sm leading-tight">{title}</p>
          <p className="text-gray-600 dark:text-gray-300 text-xs mt-1 leading-relaxed">{message}</p>

          {/* Tip (collapsible) */}
          {tip && (
            <div className="mt-2">
              <button
                onClick={() => setShowTip(v => !v)}
                className={`text-xs flex items-center gap-1 font-medium ${s.icon} hover:opacity-80 transition`}
              >
                {locale === "ar" ? "💡 نصيحة احترافية" : "💡 Pro tip"}
                {showTip ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showTip && (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2">
                  {tip}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          {(rule.action || rule.secondaryAction) && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {rule.action && (
                <button
                  onClick={() => onAction(rule.action!.target, rule.action!.type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${s.btnBg} ${s.btnText} active:scale-95`}
                >
                  {rule.action.label[locale]}
                </button>
              )}
              {rule.secondaryAction && (
                <button
                  onClick={() => onAction(rule.secondaryAction!.target, rule.secondaryAction!.type)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border border-current text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition active:scale-95"
                >
                  {rule.secondaryAction.label[locale]}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dismiss */}
        {rule.cooldownHours > 0 && (
          <button
            onClick={() => onDismiss(rule.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}