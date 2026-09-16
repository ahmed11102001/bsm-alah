/**
 * Minimal HTTP client over native fetch.
 *
 * Two credential modes (never mixed into logs):
 * - account mode: sends `Authorization: Bearer <cli-access-token>`
 *   (revocable CLI session from the browser device flow)
 * - api-key mode: sends `x-api-key: <key>` (project OTP auth)
 */
import { CliError } from "./errors.js";

export interface ApiClientOptions {
  baseUrl: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch | undefined;
  accessToken?: string | undefined;
  apiKey?: string | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly accessToken?: string | undefined;
  private readonly apiKey?: string | undefined;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.accessToken = options.accessToken;
    this.apiKey = options.apiKey;
  }

  async get<T = Record<string, unknown>>(path: string, signal?: AbortSignal): Promise<T> {
    return this.send<T>("GET", path, undefined, signal);
  }

  async post<T = Record<string, unknown>>(
    path: string,
    body?: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<T> {
    return this.send<T>("POST", path, body, signal);
  }

  private async send<T>(method: "GET" | "POST", path: string, body: Record<string, unknown> | undefined, signal: AbortSignal | undefined): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    // The terminal is English-only (Arabic garbles terminal output), so every
    // CLI request asks for English human messages. Machine `code` values are
    // unaffected, and the portal default stays Arabic for browser callers.
    const headers: Record<string, string> = { "Content-Type": "application/json", "Accept-Language": "en" };
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let onExternalAbort: (() => void) | undefined;
    if (signal) {
      if (signal.aborted) {
        throw new CliError("Request aborted.", { kind: "http", code: "ABORTED" });
      }
      onExternalAbort = () => controller.abort();
      signal.addEventListener("abort", onExternalAbort, { once: true });
    } else {
      timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    }

    let res: Response;
    try {
      const init: RequestInit = { method, headers, signal: controller.signal };
      if (body !== undefined) init.body = JSON.stringify(body);
      res = await this.fetchImpl(url, init);
    } catch (err) {
      if (controller.signal.aborted && !(signal?.aborted ?? false)) {
        throw new CliError(`Request timed out after ${this.timeoutMs}ms (raise it with --timeout <ms>).`, { kind: "http", code: "TIMEOUT" });
      }
      throw new CliError("Network error — the request did not complete.", { kind: "http", code: "NETWORK_ERROR" });
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
      if (onExternalAbort && signal) signal.removeEventListener("abort", onExternalAbort);
    }

    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      parsed = undefined;
    }

    if (!res.ok) {
      throw this.httpError(res.status, parsed);
    }
    if (isRecord(parsed) && parsed["ok"] === false) {
      throw this.apiError(res.status, parsed);
    }
    return parsed as T;
  }

  private httpError(status: number, body: unknown): CliError {
    if (isRecord(body) && body["ok"] === false) return this.apiError(status, body);
    const message = status === 401
      ? "Unauthorized (401). Your session may have expired — run `wani login` again."
      : `Request failed with HTTP ${status}.`;
    const details = isRecord(body) ? body : undefined;
    return new CliError(message, { kind: status === 401 ? "auth" : "http", status, details });
  }

  private apiError(status: number, body: Record<string, unknown>): CliError {
    const message = typeof body["error"] === "string" && body["error"] !== ""
      ? body["error"]
      : `Request failed with HTTP ${status}.`;
    const code = typeof body["code"] === "string" ? body["code"] : undefined;
    const details: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (key !== "error") details[key] = value;
    }
    return new CliError(message, { kind: status === 401 ? "auth" : "http", status, code, details });
  }
}

