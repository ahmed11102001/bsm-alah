/**
 * `wani logout [--all]` — discard the stored account session.
 * Stored project API keys are kept by default (they are per-project secrets
 * independent of the account session); `--all` removes those too.
 */
import type { CommandContext } from "../context.js";
import type { ParsedArgs } from "../../utils/args.js";
import { printJson } from "../../output/json.js";
import { printLine } from "../../output/human.js";

export async function logoutCommand(ctx: CommandContext, args?: ParsedArgs): Promise<void> {
  const all = args?.options["all"] === true;
  const hadSession = Boolean(ctx.config.sessionCookie);
  const hadKeys = Object.keys(ctx.config.apiKeys).length;
  const next = { ...ctx.config, apiKeys: { ...ctx.config.apiKeys } };
  delete next.sessionCookie;
  if (all) {
    next.apiKeys = {};
    delete next.currentProjectId;
  }
  ctx.saveConfig(next);

  if (ctx.json) {
    printJson({ ok: true, loggedOut: hadSession, clearedKeys: all ? hadKeys : 0 });
    return;
  }
  if (all) {
    printLine(hadSession || hadKeys > 0 ? `Logged out. Cleared session and ${hadKeys} stored project key(s).` : "Nothing stored — nothing to do.");
  } else {
    printLine(hadSession ? "Logged out. (Stored project keys kept — use `wani logout --all` to remove them too.)" : "Not logged in — nothing to do.");
  }
}
