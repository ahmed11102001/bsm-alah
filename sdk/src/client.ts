/**
 * Core HTTP client for @aiwni/sdk.
 *
 * Thin wrapper over native `fetch` bound to Wani's public API contract:
 * `x-api-key` authentication, safe JSON parsing and normalized errors.
 * It never imports or depends on Wani's internal implementation.
 */

import { SDK_ERROR_CODES, WaniError } from "./errors.js";
import type { WaniApiErrorBody, WaniClientOptions } from "./types.js";
import { OtpResource } from "./otp.js";

/** Official Wani Developer API base URL. */
export const DEFAULT_BASE_URL = "https://developers.aiwni.com";

/** Default per-request timeout (ms) when no AbortSignal is supplied. */
export const DEFAULT_TIMEOUT_MS = 15_000;

export interface RequestOptions {
  method: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class Wani {
  /** OTP resource: `wani.otp.send(...)`, `.verify(...)`, `.status(...)`. */
  readonly otp: OtpResource;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WaniClientOptions) {
    if (!options || typeof options.apiKey !== "string" || options.apiKey.trim() === "") {
      throw new WaniError({
        message: "Wani: `apiKey` is required. Pass your developer API key (wani_live_...) server-side.",
        code: SDK_ERROR_CODES.INVALID_ARGUMENT,
      });
    }
    if (options.baseUrl !== undefined && typeof options.baseUrl !== "string") {
      throw new WaniError({
        message: "Wani: `baseUrl` must be a string URL.",
        code: SDK_ERROR_CODES.INVALID_ARGUMENT,
      });
    }
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new WaniError({
        message: "Wani: `timeoutMs` must be a positive number.",
        code: SDK_ERROR_CODES.INVALID_ARGUMENT,
      });
    }
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = timeoutMs;
    this.fetchImpl = options.fetch ?? fetch;
    this.otp = new OtpResource(this);
  }

  /**
   * Low-level request helper used by API resources.
   * @internal
   */
  async request<T>(opts: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${opts.path}`;
    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let externalListener: (() => void) | undefined;

    if (opts.signal) {
      if (opts.signal.aborted) {
        throw new WaniError({ message: "Wani: request aborted before it started.", code: SDK_ERROR_CODES.ABORTED });
      }
      externalListener = () => controller.abort();
      opts.signal.addEventListener("abort", externalListener, { once: true });
    } else {
      timeout = setTimeout(() => controller.abort(), timeoutMs);
    }

    let res: Response;
    try {
      const init: RequestInit = {
        method: opts.method,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        signal: controller.signal,
      };
      if (opts.body !== undefined) {
        init.body = JSON.stringify(opts.body);
      }
      res = await this.fetchImpl(url, init);
    } catch (err) {
      if (controller.signal.aborted && !opts.signal?.aborted) {
        throw new WaniError({
          message: `Wani: request timed out after ${timeoutMs}ms.`,
          code: SDK_ERROR_CODES.TIMEOUT,
          cause: err,
        });
      }
      if (err instanceof WaniError) throw err;
      throw new WaniError({
        message: "Wani: network error — the request did not complete.",
        code: opts.signal?.aborted ? SDK_ERROR_CODES.ABORTED : SDK_ERROR_CODES.NETWORK_ERROR,
        cause: err,
      });
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
      if (externalListener && opts.signal) {
        opts.signal.removeEventListener("abort", externalListener);
      }
    }

    const requestId = res.headers?.get("x-request-id") ?? undefined;
    const parsed: unknown = await this.parseJsonSafely(res);

    if (!res.ok) {
      throw this.toHttpError(res.status, parsed, requestId, opts.path);
    }

    // Wani may answer HTTP 200 with `{ ok: false, ... }` — normalize it too.
    if (isRecord(parsed) && parsed["ok"] === false) {
      throw this.toApiError(res.status, parsed, requestId);
    }

    return parsed as T;
  }

  private async parseJsonSafely(res: Response): Promise<unknown> {
    try {
      return (await res.json()) as unknown;
    } catch {
      return undefined;
    }
  }

  private toHttpError(status: number, body: unknown, requestId: string | undefined, path: string): WaniError {
    if (isRecord(body) && body["ok"] === false) {
      return this.toApiError(status, body, requestId);
    }
    const suffix = requestId ? ` (requestId: ${requestId})` : "";
    return new WaniError({
      message: `Wani: request to ${path} failed with HTTP ${status}.${suffix}`,
      status,
      requestId,
      details: body,
    });
  }

  private toApiError(status: number, body: Record<string, unknown>, requestId: string | undefined): WaniError {
    const maybe = body as Partial<WaniApiErrorBody>;
    const message = typeof maybe.error === "string" && maybe.error !== ""
      ? maybe.error
      : `Wani: request failed with HTTP ${status}.`;
    const code = typeof maybe.code === "string" ? maybe.code : undefined;
    const retryAfter = typeof maybe.retryAfter === "number" ? maybe.retryAfter : undefined;
    const details: Record<string, unknown> = { ...body };
    return new WaniError({ message, status, code, details, requestId, retryAfter });
  }
}
