// src/app/crm/types.ts — أنواع مشتركة + مساعد الترجمة المحلي (ar/en)
export type CrmLocale = "ar" | "en";
export type CrmChannel = "all" | "phone" | "email" | "both";

export const tx = (ar: string, en: string, locale: string) =>
  locale === "ar" ? ar : en;

export interface CrmContact {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  tags: string[];
  notes: string | null;
  birthDate: string | null;
  city: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmStats {
  total: number;
  phoneOnly: number;
  emailOnly: number;
  both: number;
}

export interface CrmListResponse {
  items: CrmContact[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  stats: CrmStats;
}

export interface ImportSummary {
  total: number;
  added: number;
  updated: number;
  skipped: number;
  skippedSamples: Array<{ row: number; reason: string }>;
  invalidBirthDates?: number;
  invalidBirthDateRows?: number[];
}

/** YYYY-MM-DD لعرض تاريخ الميلاد في input type=date */
export function birthDateToInput(v: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export interface SheetPreview {
  headers: Array<{ index: number; value: string }>;
  rows: string[][];
  rowCount: number;
}
