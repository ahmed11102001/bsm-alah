import type { Locale } from "@/lib/i18n";

/**
 * Resolves a valid Locale ("ar" | "en") following strict priority:
 * 1. Explicit user/caller locale (if "ar" | "en")
 * 2. NEXT_LOCALE cookie value (if "ar" | "en")
 * 3. Accept-Language header (if any primary tag starts with "ar" -> "ar")
 * 4. Fallback -> "en"
 */
export function resolveLocale(params?: {
  userLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (params?.userLocale === "ar" || params?.userLocale === "en") {
    return params.userLocale;
  }

  if (params?.cookieLocale === "ar" || params?.cookieLocale === "en") {
    return params.cookieLocale;
  }

  if (params?.acceptLanguage) {
    const isArabic = params.acceptLanguage
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .some((part) => part.startsWith("ar"));
    if (isArabic) {
      return "ar";
    }
  }

  return "en";
}

/**
 * Helper to extract locale from standard Request headers and cookies.
 */
export function getRequestLocale(req: Request): Locale {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const cookieLocale = match ? decodeURIComponent(match[1].trim()) : null;
  const acceptLanguage = req.headers.get("accept-language");

  return resolveLocale({ cookieLocale, acceptLanguage });
}
