import { tr } from "./i18n";
import type { Lang, Campaign } from "./types";

export const cleanNumber = (raw: string): string => {
  let n = raw.replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "20" + n.slice(1);
  if (!n.startsWith("20") && n.length === 10) n = "20" + n;
  return n;
};
export const isValidPhone = (n: string) => /^20\d{10}$/.test(n);
export const safeRate = (num: number, den: number) => den > 0 ? Math.round((num / den) * 100) : 0;

// ─── Egypt WhatsApp Conversation Pricing (USD) ────────────────────────────────
// المصدر: Meta Business Help Center — أسعار تقديرية، راجع Meta للأسعار الدقيقة
export const EG_PRICES: Record<string, number> = {
  MARKETING: 0.0125,
  UTILITY: 0.0040,
  AUTHENTICATION: 0.0175,
  SERVICE: 0.0000, // مجاني من المستخدم
};

export function estimateCost(count: number, category: string): number {
  const price = EG_PRICES[category?.toUpperCase()] ?? EG_PRICES.MARKETING;
  return count * price;
}

export const statusConfig = (lang: Lang): Record<Campaign["status"], { label: string; color: string; dot: string }> => ({
  draft: { label: tr("statusDraft", lang), color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300", dot: "bg-gray-400" },
  scheduled: { label: tr("statusScheduled", lang), color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-400" },
  running: { label: tr("statusRunning", lang), color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  completed: { label: tr("statusCompleted", lang), color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300", dot: "bg-green-500" },
  failed: { label: tr("statusFailed", lang), color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300", dot: "bg-red-500" },
});