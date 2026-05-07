import { parsePhoneNumberFromString } from "libphonenumber-js";

export type NormalizedPhone = string;

/**
 * Normalize Egyptian phone numbers to E.164 without "+".
 * Returns null for invalid or unsupported values.
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

  if (/^01\d{9}$/.test(digits)) {
    digits = `20${digits}`;
  } else if (/^201\d{9}$/.test(digits)) {
    // already in international form without plus
  } else {
    return null;
  }

  const parsed = parsePhoneNumberFromString(`+${digits}`, "EG");
  if (!parsed || !parsed.isValid() || parsed.countryCallingCode !== "20") {
    return null;
  }

  return parsed.number.replace(/^\+/, "");
}

