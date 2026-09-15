/**
 * Shared plumbing for OTP commands.
 *
 * The project is derived ONLY to look up a stored API key locally.
 * It is never sent to the API — the backend resolves the project
 * from the key itself.
 */
import { ApiClient } from "../../api/client.js";
import { CliError } from "../../api/errors.js";
import { resolveProjectApiKey } from "../../auth/credentials.js";
import type { CommandContext } from "../context.js";
import { optString, type ParsedArgs } from "../../utils/args.js";

export interface OtpCommandSetup {
  client: ApiClient;
  keySource: "flag" | "env" | "stored";
}

export function makeOtpClient(ctx: CommandContext, args: ParsedArgs): OtpCommandSetup {
  // --project only selects WHICH stored key to use. Combined with --api-key
  // it is meaningless (the key decides the project server-side), so reject
  // the combination explicitly instead of silently ignoring --project.
  const projectFlag = optString(args.options, "project");
  const apiKeyFlag = optString(args.options, "api-key", "apiKey");
  if (projectFlag !== undefined && apiKeyFlag !== undefined) {
    throw new CliError(
      "Do not combine --project with --api-key: the project is always resolved server-side from the key. " +
        "Use --api-key alone, or omit it to use the stored key of --project.",
      { kind: "usage" }
    );
  }
  const projectId = projectFlag ?? ctx.config.currentProjectId;
  const { apiKey, source } = resolveProjectApiKey({
    flag: apiKeyFlag,
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
