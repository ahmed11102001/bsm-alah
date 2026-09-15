/**
 * @aiwni/sdk — official server-side Node.js client for Wani's public OTP API.
 *
 * Server-side only: the API key is a secret. Never expose it to browsers
 * or bundle this package into client-side code.
 *
 * The SDK talks to Wani's public HTTP API exclusively. It never imports
 * Wani internals and never communicates with Meta/WhatsApp directly.
 */

export { Wani, DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS } from "./client.js";
export type { RequestOptions } from "./client.js";
export { OtpResource } from "./otp.js";
export { SDK_ERROR_CODES, WaniError } from "./errors.js";
export type { WaniErrorOptions } from "./errors.js";
export type {
  WaniApiErrorBody,
  WaniClientOptions,
  OtpSendParams,
  OtpSendResult,
  OtpVerifyParams,
  OtpVerifyResult,
  OtpStatusKind,
  OtpStatusResult,
} from "./types.js";
