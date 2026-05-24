"use client";

import { X, AlertTriangle, Info, AlertCircle } from "lucide-react";
import type { AssistantRule, RuleContext, Severity } from "@/lib/assistant-rules";
import { resolveText } from "@/lib/assistant-rules";

interface Props {
  rule:      AssistantRule;
  ctx:       RuleContext;
  locale:    "ar" | "en";
  onDismiss: (id: string) => void;
  onAction:  (target: string, type: "navigate" | "link") => void;
}

const STYLES: Record<Severity, {
  wrap: string; icon: string; iconBg: string; btn: string;
}> = {
  critical: {
    wrap:   "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    icon:   "text-red-600 dark:text-red-400",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    btn:    "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    wrap:   "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
    icon:   "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    btn:    "bg-amber-500 hover:bg-amber-600 text-white",
  },
  info: {
    wrap:   "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
    icon:   "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    btn:    "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

const SeverityIcon = ({ s }: { s: Severity }) => {
  if (s === "critical") return <AlertCircle   className="w-4 h-4" />;
  if (s === "warning")  return <AlertTriangle className="w-4 h-4" />;
  return                       <Info          className="w-4 h-4" />;
};

export default function RuleBanner({ rule, ctx, locale, onDismiss, onAction }: Props) {
  const s   = STYLES[rule.severity];
  const dir = locale === "ar" ? "rtl" : "ltr";

  // البانر يستخدم النص المختصر لو موجود — وإلا الـ title العادي
  const title   = rule.shortTitle?.[locale]
    ?? resolveText(rule.title as any, locale, ctx);
  const message = rule.shortMessage?.[locale]
    ?? resolveText(rule.message as any, locale, ctx);

  return (
    <div
      dir={dir}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${s.wrap}`}
      style={{ animation: "wpSlideDown .25s ease forwards" }}
    >
      <style>{`
        @keyframes wpSlideDown {
          from { opacity:0; transform:translateY(-6px) }
          to   { opacity:1; transform:translateY(0)    }
        }
      `}</style>

      {/* Icon */}
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
        <span className={s.icon}><SeverityIcon s={rule.severity} /></span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <span className="text-gray-900 dark:text-white font-semibold text-sm">{title}</span>
        <span className="text-gray-500 dark:text-gray-400 text-xs mx-2">—</span>
        <span className="text-gray-600 dark:text-gray-300 text-xs">{message}</span>
      </div>

      {/* Action button */}
      {rule.action && (
        <button
          onClick={() => onAction(rule.action!.target, rule.action!.type)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition active:scale-95 ${s.btn}`}
        >
          {rule.action.label[locale]}
        </button>
      )}

      {/* Dismiss */}
      {rule.cooldownHours > 0 && (
        <button
          onClick={() => onDismiss(rule.id)}
          className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 transition flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}