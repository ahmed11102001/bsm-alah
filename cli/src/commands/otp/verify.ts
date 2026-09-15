/**
 * `wani otp verify --token <token> [--code <6-digit-code>]`
 *
 * When `--code` is omitted in an interactive terminal, the code is prompted
 * for (hidden input is unnecessary for a one-time code, plain prompt is fine).
 */
import { CliError } from "../../api/errors.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CommandContext } from "../context.js";
import { optString, type ParsedArgs } from "../../utils/args.js";
import { printJson } from "../../output/json.js";
import { printKeyValue } from "../../output/human.js";
import { makeOtpClient } from "./common.js";
import { promptText } from "../../utils/prompt.js";

export async function otpVerifyCommand(ctx: CommandContext, args: ParsedArgs): Promise<void> {
  const token = optString(args.options, "token", "t")?.trim() ?? args.positional[0]?.trim();
  if (!token) {
    throw new CliError("Usage: wani otp verify --token <token> [--code <code>]", { kind: "usage" });
  }
  let code = optString(args.options, "code", "c")?.trim();
  if (!code && process.stdin.isTTY) {
    code = (await promptText("Code: ")).trim();
  }
  if (!code) {
    throw new CliError("Verification code is required (--code).", { kind: "usage" });
  }

  const { client } = makeOtpClient(ctx, args);
  const data = await client.post<Record<string, unknown>>(ENDPOINTS.otpVerify, { token, code });

  const verified = data["verified"] === true;
  if (ctx.json) {
    printJson({
      ok: true,
      verified,
      ...(typeof data["message"] === "string" ? { message: data["message"] } : {}),
      ...(typeof data["phone"] === "string" ? { phone: data["phone"] } : {}),
    });
    return;
  }
  printKeyValue([
    ["Verified", verified ? "yes" : "no"],
    ...(typeof data["message"] === "string" ? [["Message", data["message"]] as [string, string]] : []),
    ...(typeof data["phone"] === "string" ? [["Phone", data["phone"]] as [string, string]] : []),
  ]);
}
