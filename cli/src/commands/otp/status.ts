/**
 * `wani otp status --token <token>` (token also accepted positionally).
 */
import { CliError } from "../../api/errors.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CommandContext } from "../context.js";
import { optString, type ParsedArgs } from "../../utils/args.js";
import { printJson } from "../../output/json.js";
import { printKeyValue } from "../../output/human.js";
import { makeOtpClient } from "./common.js";

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export async function otpStatusCommand(ctx: CommandContext, args: ParsedArgs): Promise<void> {
  const token = optString(args.options, "token", "t")?.trim() ?? args.positional[0]?.trim();
  if (!token) {
    throw new CliError("Usage: wani otp status --token <token>", { kind: "usage" });
  }

  const { client } = makeOtpClient(ctx, args);
  const data = await client.get<Record<string, unknown>>(ENDPOINTS.otpStatus(token));

  if (ctx.json) {
    printJson({ ok: true, ...data });
    return;
  }
  const meta = typeof data["meta"] === "object" && data["meta"] !== null
    ? (data["meta"] as Record<string, unknown>)
    : {};
  printKeyValue([
    ["Status", asString(data["status"]) ?? "-"],
    ["Phone", asString(data["phone"]) ?? "-"],
    ["Sent", asString(data["sentAt"]) ?? "-"],
    ["Verified", asString(data["verifiedAt"]) ?? "-"],
    ["Expires", asString(data["expiresAt"]) ?? "-"],
    ["Seconds left", typeof data["secondsRemaining"] === "number" ? String(data["secondsRemaining"]) : "-"],
    ...(typeof meta["error"] === "string" && meta["error"] !== "" ? [["Error", meta["error"]] as [string, string]] : []),
  ]);
}
