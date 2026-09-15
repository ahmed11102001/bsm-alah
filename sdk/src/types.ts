/**
 * Public types for @aiwni/sdk.
 *
 * These types describe Wani's PUBLIC HTTP API contract only.
 * They are intentionally decoupled from Wani's internal implementation
 * (no Prisma models, no database shapes, no provider payloads).
 */

/** Options accepted by the {@link Wani} client. */
export interface WaniClientOptions {
  /**
   * Developer API key (`wani_live_...`).
   * Sent as the `x-api-key` header. Keep it server-side — never expose it
   * to browsers or bundle it into client-side code.
   */
  apiKey: string;
  /**
   * Override the Wani API base URL (testing / self-hosted environments).
   * @default "https://developers.aiwni.com"
   */
  baseUrl?: string;
  /**
   * Per-request timeout in milliseconds applied when the caller does not
   * pass its own AbortSignal.
   * @default 15000
   */
  timeoutMs?: number;
  /**
   * Custom fetch implementation (testing, proxies, undici pinning).
   * Must behave like the global `fetch`.
   */
  fetch?: typeof fetch;
}

/** Parameters for `wani.otp.send(...)`. */
export interface OtpSendParams {
  /**
   * Recipient phone number. Accepts E.164 (`+2010...`, `2010...`)
   * or Egyptian national format (`010...`).
   */
  phone: string;
  /**
   * Local template record id (preferred — unambiguous, shown in the
   * Developer Portal next to each template).
   */
  templateId?: string;
  /**
   * Legacy alternative: approved template name as registered in Meta
   * (e.g. `"otp_verification"`). Kept for backwards compatibility with
   * existing integrations. Prefer `templateId` for new code.
   */
  templateName?: string;
  /**
   * Template language code (e.g. `"ar"`, `"en_US"`). Only meaningful
   * together with `templateName` when several languages share one name.
   */
  language?: string;
  /**
   * OTP validity in minutes.
   * @default 10
   */
  expiryMinutes?: number;
}

/** Successful response of `wani.otp.send(...)`. */
export interface OtpSendResult {
  /** Verification token — pass it to `verify` and `status`. */
  token: string;
  /** ISO-8601 expiry timestamp of the OTP. */
  expiresAt: string;
  /** Remaining trial messages, present only for trial projects. */
  messagesLeft?: number;
}

/** Parameters for `wani.otp.verify(...)`. */
export interface OtpVerifyParams {
  /** Verification token returned by `send`. */
  token: string;
  /** 6-digit code the end user received on WhatsApp. */
  code: string;
}

/** Successful response of `wani.otp.verify(...)`. */
export interface OtpVerifyResult {
  verified: boolean;
  /** Human-readable confirmation message (locale depends on server). */
  message?: string;
  /** E.164 phone the code was verified for. */
  phone?: string;
}

/** Delivery lifecycle of an OTP, as reported by the status endpoint. */
export type OtpStatusKind = "sent" | "pending" | "verified" | "expired" | "failed";

/** Successful response of `wani.otp.status(...)`. */
export interface OtpStatusResult {
  token: string;
  /** Lowercase lifecycle status. */
  status: OtpStatusKind | string;
  phone?: string | null;
  sentAt?: string | null;
  verifiedAt?: string | null;
  expiresAt?: string | null;
  /** Seconds until expiry (`0` when already expired, `null` when unknown). */
  secondsRemaining?: number | null;
  meta?: {
    messageId?: string | null;
    error?: string | null;
  };
}

/** Shape of a Wani API error body (`{ ok: false, ... }`). */
export interface WaniApiErrorBody {
  ok: false;
  error: string;
  /** Machine-readable failure reason (e.g. `"TEMPLATE_NOT_APPROVED"`). */
  code?: string;
  /** Seconds after which a rate-limited request may be retried. */
  retryAfter?: number;
  [key: string]: unknown;
}
