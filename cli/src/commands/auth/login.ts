/**
 * `wani login [--email <email>] [--browser]`
 *
 * Interactive email/password login against the public auth endpoint.
 * Stores the session cookie locally (0600, encrypted at rest). `--browser`
 * does NOT log the CLI in (the backend has no device flow) — it opens the
 * portal so you can copy a project API key instead.
 */
import { apiKeysPageUrl, openInBrowser } from "../../auth/browser-login.js";
import { loginWithPassword } from "../../auth/session.js";
import type { CommandContext } from "../context.js";
import { printJson } from "../../output/json.js";
import { printLine } from "../../output/human.js";
import { optString } from "../../utils/args.js";
import type { ParsedArgs } from "../../utils/args.js";

export async function loginCommand(ctx: CommandContext, args: ParsedArgs): Promise<void> {
  if (optString(args.options, "browser") !== undefined && args.options["browser"] === true) {
    const url = apiKeysPageUrl(ctx.baseUrl);
    openInBrowser(url);
    if (ctx.json) {
      printJson({ ok: true, browser: true, url, loggedIn: false });
    } else {
      printLine(`Opening ${url}`);
      printLine("Note: this does not log the CLI in. Create a project API key there, then save it with:");
      printLine("  wani project use <project-id> --api-key <key>");
    }
    return;
  }

  const emailFlag = optString(args.options, "email", "e");
  const deps = {
    fetchImpl: ctx.fetchImpl,
    timeoutMs: ctx.timeoutMs,
    readEmail: async () => emailFlag ?? ctx.readEmail(),
    readPassword: () => ctx.readPassword(),
  };
  const { sessionCookie, result } = await loginWithPassword(ctx.baseUrl, deps);

  const next = { ...ctx.config, sessionCookie };
  ctx.saveConfig(next);

  if (ctx.json) {
    printJson({ ok: true, email: result.email });
  } else {
    printLine(`Logged in as ${result.email}.`);
  }
}
