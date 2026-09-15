/**
 * `wani logout [--all]` — revoke the stored CLI session server-side
 * (best-effort) and discard it locally. Stored project API keys are kept by
 * default (they are per-project secrets independent of the account session);
 * `--all` removes those too.
 */
import { ApiClient } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CommandContext } from "../context.js";
import type { ParsedArgs } from "../../utils/args.js";
import { printJson } from "../../output/json.js";
import { printLine } from "../../output/human.js";

export async function logoutCommand(ctx: CommandContext, args?: ParsedArgs): Promise<void> {
  const all = args?.options["all"] === true;
  const hadSession = Boolean(ctx.config.cliAccessToken);
  const hadKeys = Object.keys(ctx.config.apiKeys).length;

  if (hadSession && ctx.config.cliAccessToken) {
    try {
      const client = new ApiClient({
        baseUrl: ctx.baseUrl,
        timeoutMs: ctx.timeoutMs,
        fetchImpl: ctx.fetchImpl,
        accessToken: ctx.config.cliAccessToken,
      });
      await client.post(ENDPOINTS.cliRevokeCurrent);
    } catch {
      // Local logout must succeed even if the server is unreachable.
    }
  }

  const next = { ...ctx.config, apiKeys: { ...ctx.config.apiKeys } };
  delete next.cliAccessToken;
  delete next.cliTokenExpiresAt;
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
