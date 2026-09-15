/**
 * Shared plumbing for OTP commands.
 *
 * The project is derived ONLY to look up a stored API key locally.
 * It is never sent to the API — the backend resolves the project
 * from the key itself.
 */
import { ApiClient } from "../../api/client.js";
import { resolveProjectApiKey } from "../../auth/credentials.js";
import type { CommandContext } from "../context.js";
import { optString, type ParsedArgs } from "../../utils/args.js";

export interface OtpCommandSetup {
  client: ApiClient;
  keySource: "flag" | "env" | "stored";
}

/** Project hint used solely for stored-key lookup (`--project` or current). */
export function resolveKeyProjectId(ctx: CommandContext, args: ParsedArgs): string | undefined {
  return optString(args.options, "project") ?? ctx.config.currentProjectId;
}

export function makeOtpClient(ctx: CommandContext, args: ParsedArgs): OtpCommandSetup {
  const projectId = resolveKeyProjectId(ctx, args);
  const { apiKey, source } = resolveProjectApiKey({
    flag: optString(args.options, "api-key", "apiKey"),
    config: ctx.config,
    projectId,
  });
  const client = new ApiClient({
    baseUrl: ctx.baseUrl,
    timeoutMs: ctx.timeoutMs,
    fetchImpl: ctx.fetchImpl,
    apiKey,
  });
  return { client, keySource: source };
}
