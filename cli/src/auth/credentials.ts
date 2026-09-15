/**
 * Project API-key resolution for OTP commands.
 *
 * Precedence: `--api-key` flag > `WANI_API_KEY` env > key saved with
 * `wani project use --api-key` for the target project.
 */
import { API_KEY_ENV_VAR } from "../constants.js";
import { CliError } from "../api/errors.js";
import type { CliConfig } from "../config/config.js";

export interface ApiKeyResolution {
  apiKey: string;
  source: "flag" | "env" | "stored";
}

export function resolveProjectApiKey(args: {
  flag?: string | undefined;
  config: CliConfig;
  projectId?: string | undefined;
}): ApiKeyResolution {
  const fromFlag = args.flag?.trim();
  if (fromFlag) return { apiKey: fromFlag, source: "flag" };

  const fromEnv = process.env[API_KEY_ENV_VAR]?.trim();
  if (fromEnv) return { apiKey: fromEnv, source: "env" };

  if (args.projectId) {
    const stored = args.config.apiKeys[args.projectId];
    if (stored) return { apiKey: stored, source: "stored" };
  }

  throw new CliError(
    "No project API key available. Pass --api-key, set WANI_API_KEY, or save one with `wani project use <id> --api-key <key>`.",
    { kind: "auth" }
  );
}
