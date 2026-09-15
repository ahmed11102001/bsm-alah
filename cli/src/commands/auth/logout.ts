/**
 * `wani logout` — discard the stored account session.
 * Stored project API keys are kept (they are per-project secrets, and
 * removing them silently would be surprising).
 */
import type { CommandContext } from "../context.js";
import { printJson } from "../../output/json.js";
import { printLine } from "../../output/human.js";

export async function logoutCommand(ctx: CommandContext): Promise<void> {
  const hadSession = Boolean(ctx.config.sessionCookie);
  const next = { ...ctx.config };
  delete next.sessionCookie;
  ctx.saveConfig(next);

  if (ctx.json) {
    printJson({ ok: true, loggedOut: hadSession });
  } else {
    printLine(hadSession ? "Logged out." : "Not logged in — nothing to do.");
  }
}
