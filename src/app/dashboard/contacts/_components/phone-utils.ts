const INTL_RE = /^\d{7,15}$/;
const EG_RE = /^20[0-9]{10}$/;

export function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-().+]/g, "").replace(/^00/, "");
  if (cleaned.startsWith("0") && cleaned.length === 11)
    return "20" + cleaned.slice(1);
  return cleaned;
}

export function isValidPhone(n: string): boolean {
  return EG_RE.test(n) || INTL_RE.test(n);
}