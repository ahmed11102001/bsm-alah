import { parsePhoneNumberFromString } from "libphonenumber-js";

export type NormalizedPhone = string;

/**
 * Normalize phone numbers to E.164 without "+".
 *
 * - أرقام محلية مصرية بصيغة 01XXXXXXXXX بتتحول تلقائيًا لـ 20XXXXXXXXXX
 *   (الافتراض إن أي رقم محلي بدون كود دولة هو رقم مصري، لأن ده غالب استخدام المنصة).
 * - أي رقم دولي تاني (بكود دولة صريح، بـ + أو 00) بيتقبل برضه طول ما هو
 *   رقم صحيح حسب مكتبة libphonenumber-js — مش مقصور على مصر.
 *
 * Returns null for invalid or unparsable values.
 */
export function normalizePhone(phone: string): NormalizedPhone | null {
  if (typeof phone !== "string") return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/[^\d+]/g, "");
  if (!cleaned) return null;

  let digits = cleaned.replace(/^\+/, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // رقم محلي مصري بدون كود دولة (مثال: 01012345678) → ضيف 20
  if (/^01\d{9}$/.test(digits)) {
    digits = `20${digits}`;
  }

  // جرب تفسّر الرقم كرقم دولي عام (E.164)، مع مصر كـ default country
  // لأي رقم مكتوب بدون كود دولة صريح
  const parsed = parsePhoneNumberFromString(`+${digits}`, "EG");
  if (!parsed || !parsed.isValid()) {
    return null;
  }

  return parsed.number.replace(/^\+/, "");
}