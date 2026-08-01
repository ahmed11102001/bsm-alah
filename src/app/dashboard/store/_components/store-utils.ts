// src/app/dashboard/store/_components/store-utils.ts
// ─── دوال مساعدة للتنسيق ─────────────────────────────────────────────────────

import type { Lang } from "./types";

export function formatPhone(p: string): string {
  if (!p) return "";
  const clean = p.replace(/\D/g, "");
  return clean.startsWith("0") ? `+2${clean}` : `+${clean}`;
}

export function formatMoney(value: number, lang: Lang, currency = "EGP"): string {
  if (isNaN(value)) return "—";
  return value.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

export function formatDate(iso: string, lang: Lang): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
