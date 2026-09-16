/**
 * `wani otp send --phone <phone> (--template-id <id> | --template <name> [--language <code>]) [--expires <minutes>]`
 */
import { CliError } from "../../api/errors.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CommandContext } from "../context.js";
import { optString, type ParsedArgs } from "../../utils/args.js";
import { printJson } from "../../output/json.js";
import { printKeyValue, printLine } from "../../output/human.js";
import { makeOtpClient } from "./common.js";

export const OTP_SEND_HELP = `wani otp send --phone <phone> (--template-id <id> | --template <name> [--language <code>]) [--expires <minutes>] [--project <id>] [--api-key <key>]

Send a WhatsApp OTP. Needs a project API key: --api-key flag, WANI_API_KEY
env, or a key saved with \`wani project use --api-key\`.

  wani otp send --phone 201012345678 --template-id tpl_123
  wani otp send --phone 201012345678 --template otp_verification --language en_US --expires 10

--project selects which *stored* key to use (never sent to the API).
--expires is 1–60 minutes (default 10).
`;

export interface OtpSendResult {
  token: string;
  expiresAt: string;
  messagesLeft?: number;
}

function parseExpiryMinutes(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 60) {
    throw new CliError("--expires must be an integer between 1 and 60.", { kind: "usage" });
  }
  return parsed;
}

export async function otpSendCommand(ctx: CommandContext, args: ParsedArgs): Promise<void> {
  const phone = optString(args.options, "phone", "p")?.trim();
  if (!phone) {
    throw new CliError("Usage: wani otp send --phone <phone> (--template-id <id> | --template <name> [--language <code>])", { kind: "usage" });
  }
  const templateId = optString(args.options, "template-id", "templateId")?.trim();
  const templateName = optString(args.options, "template", "template-name", "templateName")?.trim();
  if (!templateId && !templateName) {
    throw new CliError("Provide --template-id <id> or --template <name> [--language <code>].", { kind: "usage" });
  }
  const language = optString(args.options, "language", "lang")?.trim();
  const expiryMinutes = parseExpiryMinutes(optString(args.options, "expires", "expiry-minutes"));

  const { client } = makeOtpClient(ctx, args);

  const body: Record<string, unknown> = { phone };
  if (templateId) {
    body["templateId"] = templateId;
  } else if (templateName) {
    body["templateName"] = templateName;
    if (language) body["language"] = language;
  }
  if (expiryMinutes !== undefined) body["expiryMinutes"] = expiryMinutes;

  const data = await client.post<Record<string, unknown>>(ENDPOINTS.otpSend, body);
  const token = data["token"];
  const expiresAt = data["expiresAt"];
  if (typeof token !== "string" || typeof expiresAt !== "string") {
    throw new CliError("Unexpected send response (missing token/expiresAt).", { kind: "http", details: data });
  }
  const result: OtpSendResult = { token, expiresAt };
  if (typeof data["messagesLeft"] === "number") result.messagesLeft = data["messagesLeft"];

  if (ctx.json) {
    printJson({ ok: true, ...result });
    return;
  }
  printKeyValue([
    ["Token", result.token],
    ["Expires", result.expiresAt],
    ...(result.messagesLeft !== undefined ? [["Messages left", String(result.messagesLeft)] as [string, string]] : []),
  ]);
  printLine(`Verify with: wani otp verify --token ${result.token} --code <6-digit-code>`);
}
