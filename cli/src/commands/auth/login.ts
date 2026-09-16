/**
 * `wani login [--no-open]`
 *
 * Seamless browser authorization (default): opens the portal approval page
 * with a short-lived single-use ticket embedded in the URL — no code typing.
 * The developer approves there; the CLI polls until approval and stores the
 * session token (0600, encrypted at rest). No email/password ever touches
 * the terminal.
 *
 * `wani login --no-open` (SSH/servers) prints the URL + backup code instead
 * of opening a browser — the manual device flow remains as fallback.
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

export const LOGIN_HELP = `wani login [--no-open]

Log in via the browser (device flow). No email or password is ever typed
in the terminal: the CLI shows a code, opens the portal approval page,
and waits until you approve (or the request expires).

  wani login              Open the browser and wait for approval
  wani login --no-open    Print the approval URL instead (SSH / servers)

The session token is stored encrypted in ~/.wani/config.json. Manage or
revoke it anytime from Portal Settings → CLI & Integrations, or with
\`wani logout\`.
`;

export interface LoginDeps {
  openBrowser?: ((url: string) => boolean) | undefined;
}

export async function loginCommand(
  ctx: CommandContext,
  args: ParsedArgs,
  deps?: LoginDeps
): Promise<void> {
  const noOpen = args.options["no-open"] === true || args.options["noOpen"] === true;
  const openBrowser = deps?.openBrowser ?? openInBrowser;

  const deviceName = `${os.hostname()} (${process.platform})`.slice(0, 64);
  const started = await requestDeviceCode(ctx.baseUrl, deviceName, {
    timeoutMs: ctx.timeoutMs,
    fetchImpl: ctx.fetchImpl,
  });
  const url = authorizePageUrl(ctx.baseUrl, started.verificationUri);

  if (ctx.json) {
    printJson({ ok: true, verification_uri: url, expires_in: started.expiresInSecs });
    openBrowser(url);
  } else if (noOpen) {
    printLine("Open this URL in your browser to approve:");
    printLine(`  ${url}`);
    printLine(`Backup code (if the link does not work): ${started.userCode}`);
  } else {
    printLine("Opening Wani in your browser...");
    if (!openBrowser(url)) {
      printLine("Could not open a browser automatically — open this URL manually:");
      printLine(`  ${url}`);
    }
  }

  if (!ctx.json && !noOpen) {
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
  } else if (noOpen) {
    printLine(email ? `Logged in as ${email}.` : "Logged in.");
  } else {
    printLine("✓ Browser authorization approved");
    printLine(email ? `✓ Logged in as ${email}.` : "✓ Logged in.");
  }
}
