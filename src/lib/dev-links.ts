// src/lib/dev-links.ts
// ── Single source of truth for the Developers subdomain ─────────────────────
// قسم المطورين بيترندر على هوستين:
//   - developers.aiwni.com (production) / developers.localhost (local dev)
//     → المسارات من غير بادئة: /portal, /signin, /docs ...
//   - aiwni.com/developers/... (أي سياق تاني: local dev من غير subdomain, previews)
//     → المسارات بالبادئة الكاملة: /developers/portal ...
// الـ helpers دي بتبني المسار الصح حسب الهوست الحالي، من غير أي هاردكود مكرر.

export const DEVELOPERS_BASE_URL = "https://developers.aiwni.com";

// الدومين الرئيسي (قسم التسويق) — للروابط المتبادلة اللي بتتفتح في تاب جديد
export const MAIN_BASE_URL = "https://aiwni.com";

const DEV_HOSTNAMES = new Set([
  "developers.aiwni.com",
  "developers.localhost",
]);

/** بيشيل البورت ويوحّد الحالة قبل أي مقارنة (مهم لـ localhost:3000) */
export function normalizeHostname(host: string | null | undefined): string {
  return (host || "").split(":")[0].toLowerCase();
}

export function isDevHostname(host: string | null | undefined): boolean {
  return DEV_HOSTNAMES.has(normalizeHostname(host));
}

/**
 * يحوّل مسارًا منطقيًا (بالبادئة أو من غيرها، ومع query string لو فيه)
 * للمسار الصالح للاستخدام على الهوست الحالي.
 *   devPathForHost("/portal/settings", "developers.aiwni.com") → "/portal/settings"
 *   devPathForHost("/portal/settings", "aiwni.com")             → "/developers/portal/settings"
 *   devPathForHost("/developers/portal", "developers.aiwni.com") → "/portal"
 */
export function devPathForHost(
  path: string,
  host: string | null | undefined
): string {
  const withPrefix = path.startsWith("/developers")
    ? path
    : `/developers${path.startsWith("/") ? path : `/${path}`}`;
  if (isDevHostname(host)) {
    const stripped = withPrefix.slice("/developers".length);
    return stripped || "/";
  }
  return withPrefix;
}

/**
 * Hook للمكونات الـ client: يرجّع دالة تحوّل أي مسار منطقي للمسار
 * الصالح على الهوست اللي المتصفح فاتحه حاليًا.
 *   const devPath = useDevPath();
 *   <Link href={devPath("/portal/settings")}>
 */
export function useDevPath(): (path: string) => string {
  const host =
    typeof window !== "undefined" ? window.location.hostname : "";
  return (path: string) => devPathForHost(path, host);
}
