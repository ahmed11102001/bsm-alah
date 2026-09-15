/**
 * Shared command context: loaded profile, runtime flags, I/O seams.
 * Seams (`fetchImpl`, readers) exist so commands stay unit-testable.
 */
import type { CliConfig } from "../config/config.js";
import { CliError } from "../api/errors.js";

export interface CommandContext {
  config: CliConfig;
  saveConfig: (config: CliConfig) => void;
  baseUrl: string;
  timeoutMs: number;
  json: boolean;
  fetchImpl?: typeof fetch | undefined;
}

export function requireSession(ctx: CommandContext): string {
  const token = ctx.config.cliAccessToken;
  if (!token) {
    throw new CliError("Not logged in. Run `wani login` first.", { kind: "auth" });
  }
  return token;
}
