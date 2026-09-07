// src/lib/shopify-domain.ts
// ─── تنظيف وتوحيد دومين متجر Shopify — منطق مشترك ───────────────────────────
// يقبل "mystore" أو "mystore.myshopify.com" أو URL كامل، ويرجع الدومين
// الموحد أو null لو غير صالح. مستخدم في install/route.ts و auth/route.ts.

export function normalizeShopDomain(input: string): string | null {
  const clean = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split("/")[0];

  const domain = clean.includes(".")
    ? clean
    : `${clean}.myshopify.com`;

  if (!/^[a-z0-9-]+\.myshopify\.com$/.test(domain)) return null;
  return domain;
}
