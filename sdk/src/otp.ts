/**
 * OTP resource for @aiwni/sdk.
 *
 * Thin typed wrapper over Wani's public OTP endpoints — nothing more:
 *
 * - POST /api/developers/otp/send
 * - POST /api/developers/otp/verify
 * - GET  /api/developers/otp/status/:token
 *
 * The SDK never builds Meta/WhatsApp payloads and never talks to Meta.
 * All provider work (credentials, templates, delivery, rate limits)
 * stays on Wani's backend.
 */

import type { Wani } from "./client.js";
import { SDK_ERROR_CODES, WaniError } from "./errors.js";
import type {
  OtpSendParams,
  OtpSendResult,
  OtpStatusResult,
  OtpVerifyParams,
  OtpVerifyResult,
} from "./types.js";

function requireNonEmpty(value: unknown, field: string, method: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new WaniError({
      message: `Wani: otp.${method} requires a non-empty \`${field}\`.`,
      code: SDK_ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  return value.trim();
}

export class OtpResource {
  /** @internal — constructed by {@link Wani}. */
  constructor(private readonly client: Wani) {}

  /**
   * Send a WhatsApp OTP.
   *
   * ```ts
   * const sent = await wani.otp.send({
   *   phone: "201012345678",
   *   templateId: "YOUR_TEMPLATE_ID",
   *   expiryMinutes: 10,
   * });
   * ```
   *
   * @param params.phone Recipient phone (E.164 or Egyptian national format).
   * @param params.templateId Preferred template reference (unambiguous).
   *   Either `templateId` or `templateName` is required.
   * @param params.templateName Legacy template name (e.g. `"otp_verification"`).
   * @param params.language Language code used with `templateName`
   *   when several languages share one name (e.g. `"en_US"`).
   * @param params.expiryMinutes OTP validity in minutes.
   */
  async send(params: OtpSendParams, opts?: { signal?: AbortSignal; timeoutMs?: number }): Promise<OtpSendResult> {
    if (!params || typeof params !== "object") {
      throw new WaniError({
        message: "Wani: otp.send requires a params object.",
        code: SDK_ERROR_CODES.INVALID_ARGUMENT,
      });
    }
    const phone = requireNonEmpty(params.phone, "phone", "send");

    const hasTemplateId = typeof params.templateId === "string" && params.templateId.trim() !== "";
    const hasTemplateName = typeof params.templateName === "string" && params.templateName.trim() !== "";
    if (!hasTemplateId && !hasTemplateName) {
      throw new WaniError({
        message: "Wani: otp.send requires `templateId` or `templateName`. Prefer `templateId`.",
        code: SDK_ERROR_CODES.INVALID_ARGUMENT,
      });
    }

    const body: Record<string, unknown> = { phone };
    if (hasTemplateId) {
      body["templateId"] = (params.templateId as string).trim();
    } else {
      body["templateName"] = (params.templateName as string).trim();
      if (typeof params.language === "string" && params.language.trim() !== "") {
        body["language"] = params.language.trim();
      }
    }
    if (params.expiryMinutes !== undefined) {
      if (!Number.isFinite(params.expiryMinutes) || params.expiryMinutes <= 0) {
        throw new WaniError({
          message: "Wani: otp.send `expiryMinutes` must be a positive number.",
          code: SDK_ERROR_CODES.INVALID_ARGUMENT,
        });
      }
      body["expiryMinutes"] = params.expiryMinutes;
    }

    const data = await this.client.request<Record<string, unknown>>({
      method: "POST",
      path: "/api/developers/otp/send",
      body,
      signal: opts?.signal,
      timeoutMs: opts?.timeoutMs,
    });

    const token = data["token"];
    const expiresAt = data["expiresAt"];
    if (typeof token !== "string" || token === "" || typeof expiresAt !== "string" || expiresAt === "") {
      throw new WaniError({
        message: "Wani: send returned an unexpected response shape (missing token/expiresAt).",
        code: SDK_ERROR_CODES.INVALID_RESPONSE,
        details: data,
      });
    }
    const result: OtpSendResult = { token, expiresAt };
    if (typeof data["messagesLeft"] === "number") {
      result.messagesLeft = data["messagesLeft"];
    }
    return result;
  }

  /**
   * Verify an OTP code against a token returned by {@link send}.
   *
   * ```ts
   * const res = await wani.otp.verify({ token: sent.token, code: "123456" });
   * ```
   */
  async verify(params: OtpVerifyParams, opts?: { signal?: AbortSignal; timeoutMs?: number }): Promise<OtpVerifyResult> {
    if (!params || typeof params !== "object") {
      throw new WaniError({
        message: "Wani: otp.verify requires a params object.",
        code: SDK_ERROR_CODES.INVALID_ARGUMENT,
      });
    }
    const token = requireNonEmpty(params.token, "token", "verify");
    const code = requireNonEmpty(params.code, "code", "verify");

    const data = await this.client.request<Record<string, unknown>>({
      method: "POST",
      path: "/api/developers/otp/verify",
      body: { token, code },
      signal: opts?.signal,
      timeoutMs: opts?.timeoutMs,
    });

    const result: OtpVerifyResult = { verified: data["verified"] === true };
    if (typeof data["message"] === "string") result.message = data["message"];
    if (typeof data["phone"] === "string") result.phone = data["phone"];
    return result;
  }

  /**
   * Check the delivery lifecycle of a token returned by {@link send}.
   *
   * ```ts
   * const st = await wani.otp.status(sent.token);
   * ```
   */
  async status(token: string, opts?: { signal?: AbortSignal; timeoutMs?: number }): Promise<OtpStatusResult> {
    const clean = requireNonEmpty(token, "token", "status");
    const data = await this.client.request<Record<string, unknown>>({
      method: "GET",
      path: `/api/developers/otp/status/${encodeURIComponent(clean)}`,
      signal: opts?.signal,
      timeoutMs: opts?.timeoutMs,
    });

    const status = data["status"];
    if (typeof status !== "string" || status === "") {
      throw new WaniError({
        message: "Wani: status returned an unexpected response shape (missing status).",
        code: SDK_ERROR_CODES.INVALID_RESPONSE,
        details: data,
      });
    }
    return {
      token: typeof data["token"] === "string" ? (data["token"] as string) : clean,
      status,
      phone: typeof data["phone"] === "string" ? (data["phone"] as string) : null,
      sentAt: typeof data["sentAt"] === "string" ? (data["sentAt"] as string) : null,
      verifiedAt: typeof data["verifiedAt"] === "string" ? (data["verifiedAt"] as string) : null,
      expiresAt: typeof data["expiresAt"] === "string" ? (data["expiresAt"] as string) : null,
      secondsRemaining: typeof data["secondsRemaining"] === "number" ? (data["secondsRemaining"] as number) : null,
      meta: {
        messageId: readMetaString(data, "messageId"),
        error: readMetaString(data, "error"),
      },
    };
  }

  /**
   * Convenience: send an OTP and immediately verify it with a user-supplied
   * code. Equivalent to `send(...)` followed by `verify(...)`.
   */
  async sendAndVerify(
    sendParams: OtpSendParams,
    code: string,
    opts?: { signal?: AbortSignal; timeoutMs?: number }
  ): Promise<{ sent: OtpSendResult; verification: OtpVerifyResult }> {
    const sent = await this.send(sendParams, opts);
    const verification = await this.verify({ token: sent.token, code }, opts);
    return { sent, verification };
  }
}

function readMetaString(data: Record<string, unknown>, key: string): string | null {
  const meta = data["meta"];
  if (typeof meta !== "object" || meta === null) return null;
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}
