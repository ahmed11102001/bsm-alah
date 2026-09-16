import { NextResponse } from "next/server";

// ─── Unified Developer API error envelope ───────────────────────────────────
// Every Developer API error uses:
//
//   { ok: false, error: "Human readable message", code: "MACHINE_READABLE_CODE" }
//
// `error` keeps its exact historical message (Portal reads data.error; SDK/CLI
// read error+code) — adding `ok`/`code` is purely additive, never breaking.
// Success payloads are intentionally untouched.
//
// Conventional codes (reuse existing OTP codes where they exist):
//   401 → AUTH_REQUIRED (no/invalid session) | INVALID_API_KEY | INVALID_SESSION
//   403 → ACCOUNT_SUSPENDED | FORBIDDEN
//   404 → NOT_FOUND (+ legacy specific codes like TEMPLATE_NOT_FOUND)
//   400 → INVALID_REQUEST (+ legacy specific codes)
//   409 → CONFLICT
//   429 → RATE_LIMITED (+ legacy specific codes like RATE_LIMIT_PHONE)
//   502 → UPSTREAM_ERROR
//   503 → UNAVAILABLE | RATE_LIMITER_UNAVAILABLE
//   500 → INTERNAL

export function devError(
  error: string,
  code: string,
  status: number,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ ok: false, error, code, ...extra }, { status });
}

/** 429 with the standard envelope + Retry-After header. */
export function devRateLimited(
  error: string,
  code: string,
  retryAfter?: number
): NextResponse {
  const ra = retryAfter ?? 60;
  return NextResponse.json(
    { ok: false, error, code, retryAfter: ra },
    { status: 429, headers: { "Retry-After": String(ra) } }
  );
}

/**
 * 503 for fail-closed rate limiting (Redis down on a sensitive endpoint).
 * Arabic default matches the OTP routes' language; pass `message` to override,
 * or `req` to pick the default by the client's Accept-Language.
 */
export function rateLimiterUnavailableResponse(
  retryAfter?: number,
  message?: string,
  req?: Request
): NextResponse {
  const ra = retryAfter ?? 60;
  const fallback =
    req && requestLocale(req) === "en"
      ? "Abuse-protection service is temporarily unavailable — try again shortly"
      : "خدمة الحماية من الإساءة غير متاحة مؤقتًا — حاول بعد شوية";
  return NextResponse.json(
    {
      ok: false,
      error: message ?? fallback,
      code: "RATE_LIMITER_UNAVAILABLE",
      retryAfter: ra,
    },
    { status: 503, headers: { "Retry-After": String(ra) } }
  );
}

// ─── Response language ──────────────────────────────────────────────────────
// OTP + CLI device routes serve two audiences: the (Arabic-default) portal
// and English-only API consumers (CLI/SDK/scripts). The default stays Arabic
// — portal behavior is byte-for-byte unchanged — unless the client sends
// `Accept-Language: en…`, in which case human messages switch to English.
// Machine `code` values never change, so no consumer breaks either way.
export type ApiLocale = "ar" | "en";

export function requestLocale(req: Request): ApiLocale {
  const header = req.headers?.get?.("accept-language") ?? "";
  return header.trim().toLowerCase().startsWith("en") ? "en" : "ar";
}

/** Pick the human message for this request: `lmsg(req, "…ar…", "…en…")`. */
export function lmsg(req: Request, ar: string, en: string): string {
  return requestLocale(req) === "en" ? en : ar;
}
