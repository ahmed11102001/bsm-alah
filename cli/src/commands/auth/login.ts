/**
 * `wani login [--no-open]`
 *
 * Browser-based device authorization. No email/password ever touches the
 * terminal: the CLI shows a short code, opens the portal authorization page,
 * and polls until the developer approves (or the request expires).
 * The issued access token is stored locally (0600, encrypted at rest).
 */
import * as os from "node:os";
import { authorizePageUrl, openInBrowser } from "../../auth/browser-login.js";
import { pollDeviceToken, requestDeviceCode } from "../../auth/device-flow.js";
import { ApiClient } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CommandContext } from "../context.js";
import { printJson } from "../../output/json.js";
import { printLine } from "../../output/human.js";
import type { ParsedArgs } from "../../utils/args.js";

interface MeResponse {
  developer?: { email?: string };
}

export async function loginCommand(ctx: CommandContext, args: ParsedArgs): Promise<void> {
  const noOpen = args.options["no-open"] === true || args.options["noOpen"] === true;

  const deviceName = `${os.hostname()} (${process.platform})`.slice(0, 64);
  const started = await requestDeviceCode(ctx.baseUrl, deviceName, {
    timeoutMs: ctx.timeoutMs,
    fetchImpl: ctx.fetchImpl,
  });
  const url = authorizePageUrl(ctx.baseUrl, started.verificationUri);

  if (ctx.json) {
    printJson({ ok: true, user_code: started.userCode, verification_uri: url, expires_in: started.expiresInSecs });
  } else {
    printLine("Your login code:");
    printLine(`  ${started.userCode}`);
    printLine(`Open this page in your browser to approve:`);
    printLine(`  ${url}`);
  }

  if (!noOpen && !ctx.json) {
    if (!openInBrowser(url)) {
      printLine("Could not open a browser automatically — open the URL above manually.");
    }
  } else if (!noOpen && ctx.json) {
    openInBrowser(url);
  }

  if (!ctx.json) {
    printLine("Waiting for browser approval…");
  }
  const token = await pollDeviceToken(ctx.baseUrl, started.deviceCode, started.expiresInSecs, {
    timeoutMs: ctx.timeoutMs,
    fetchImpl: ctx.fetchImpl,
  });

  const expiresAt = token.expiresInSecs > 0
    ? new Date(Date.now() + token.expiresInSecs * 1000).toISOString()
    : undefined;
  const next = { ...ctx.config, cliAccessToken: token.accessToken };
  if (expiresAt) next.cliTokenExpiresAt = expiresAt;
  ctx.saveConfig(next);

  // Friendly confirmation with the account email (best-effort).
  let email: string | undefined;
  try {
    const client = new ApiClient({
      baseUrl: ctx.baseUrl,
      timeoutMs: ctx.timeoutMs,
      fetchImpl: ctx.fetchImpl,
      accessToken: token.accessToken,
    });
    const me = await client.get<MeResponse>(ENDPOINTS.authMe);
    if (typeof me.developer?.email === "string") email = me.developer.email;
  } catch {
    // approval already succeeded — a cosmetic lookup must not fail login
  }

  if (ctx.json) {
    printJson({ ok: true, email: email ?? null });
  } else {
    printLine(email ? `Logged in as ${email}.` : "Logged in.");
  }
}
