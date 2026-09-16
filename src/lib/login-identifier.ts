// src/lib/login-identifier.ts
// ─── تمييز معرف الدخول: إيميل أم رقم واتساب ────────────────────────────────
// الـ backend يحدد تلقائيًا هل القيمة إيميل أم رقم، ثم يبحث عن الحساب بناءً عليها.

import { normalizePhone } from "@/lib/phone";

export type IdentifierKind = "email" | "phone";

export interface ParsedIdentifier {
  kind: IdentifierKind;
  /** إيميل normalized (lowercase) أو رقم E.164 بدون + */
  value: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * يحدد نوع المعرف ويرجّعه normalized.
 * - فيه @ وشكل إيميل → email
 * - غير كده → محاولة تفسيره كرقم (normalizePhone)، وفشلها = invalid
 */
export function parseIdentifier(raw: unknown): ParsedIdentifier | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (EMAIL_RE.test(trimmed)) {
    return { kind: "email", value: trimmed.toLowerCase() };
  }

  const phone = normalizePhone(trimmed);
  if (phone) return { kind: "phone", value: phone };
  return null;
}

/**
 * Dummy bcrypt hash بصيغة صالحة — للمقارنة الوهمية عند غياب الحساب
 * (anti-enumeration عبر توحيد زمن الاستجابة). لا يطابق أي باسورد حقيقي.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$10$ibsbZgA2x45ePNICtnGhxOosyODFRutjD35hEWo0raBUAT1Vs8khm";
