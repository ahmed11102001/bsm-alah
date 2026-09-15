/**
 * Typed errors for @aiwni/sdk.
 *
 * Every failure surfaced by the SDK — network failures, timeouts,
 * HTTP errors and Wani API errors — is a {@link WaniError}.
 * The API key is never included in messages, codes or details.
 */

export interface WaniErrorOptions {
  message: string;
  /** HTTP status code, when the failure came from an HTTP response. */
  status?: number | undefined;
  /** Machine-readable reason: Wani `code`, or an SDK-side code. */
  code?: string | undefined;
  /** Raw parsed body / extra context. Never contains credentials. */
  details?: unknown;
  /** Value of the `x-request-id` response header, when present. */
  requestId?: string | undefined;
  cause?: unknown;
}

/** SDK-side error codes (no HTTP response involved). */
export const SDK_ERROR_CODES = {
  INVALID_ARGUMENT: "INVALID_ARGUMENT",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  ABORTED: "ABORTED",
  INVALID_RESPONSE: "INVALID_RESPONSE",
} as const;

export class WaniError extends Error {
  readonly name = "WaniError";
  readonly status?: number | undefined;
  readonly code?: string | undefined;
  readonly details?: unknown;
  readonly requestId?: string | undefined;

  constructor(options: WaniErrorOptions) {
    super(options.message);
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
    if (options.cause !== undefined) {
      // `Error.cause` is ES2022 — assigned explicitly for clarity.
      (this as { cause?: unknown }).cause = options.cause;
    }
  }

  /** `true` for HTTP 401 responses (bad / revoked API key). */
  get isAuthenticationError(): boolean {
    return this.status === 401;
  }

  /** `true` for HTTP 429 responses (rate limited). */
  get isRateLimitError(): boolean {
    return this.status === 429;
  }

  /** `true` when the SDK's own request timeout fired. */
  get isTimeoutError(): boolean {
    return this.code === SDK_ERROR_CODES.TIMEOUT;
  }

  /** `true` when the request never got an HTTP response. */
  get isNetworkError(): boolean {
    return this.code === SDK_ERROR_CODES.NETWORK_ERROR;
  }
}
