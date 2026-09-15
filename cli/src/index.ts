#!/usr/bin/env node
/**
 * `wani` — official Wani Developer CLI (server-side credentials only).
 */
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CliError } from "./api/errors.js";
import { assertTrustedBaseUrl } from "./api/trusted-hosts.js";
import { BASE_URL_ENV_VAR, CLI_NAME, CLI_VERSION, DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS } from "./constants.js";
import { loadConfig, resolveBaseUrl, saveConfig } from "./config/config.js";
import type { CommandContext } from "./commands/context.js";
import { loginCommand } from "./commands/auth/login.js";
import { logoutCommand } from "./commands/auth/logout.js";
import { whoamiCommand } from "./commands/auth/whoami.js";
import { projectListCommand } from "./commands/project/list.js";
import { projectUseCommand } from "./commands/project/use.js";
import { projectCurrentCommand } from "./commands/project/current.js";
import { otpSendCommand } from "./commands/otp/send.js";
import { otpVerifyCommand } from "./commands/otp/verify.js";
import { otpStatusCommand } from "./commands/otp/status.js";
import { otpTestCommand } from "./commands/otp/test.js";
import { otpInitCommand } from "./commands/init/init.js";
import { setupCommand } from "./commands/setup.js";
import { printError } from "./output/errors.js";
import { isHelpRequest, isJsonOutput, optString, parseArgs } from "./utils/args.js";

const HELP = `${CLI_NAME} — Wani Developer CLI (v${CLI_VERSION})

Usage:
  wani <command> [subcommand] [options]

Commands:
  login [--no-open]                     Log in via the browser (device flow) and store the session
                                        (--no-open prints the URL without opening it)
  logout                                Discard the stored session (--all also clears stored keys)
  whoami                                Show the logged-in account

  project list                          List your projects
  project use <id-or-name> [--api-key]  Select the working project (optionally save its API key)
  project current                       Show the selected project

  otp test [--phone <phone>] [--template-id <id>] [--code <code>]
                                         Guided end-to-end OTP check (interactive)
  init [--framework <id>] [--template-id <id>] [--force] [--no-install]
                                         Scaffold a Wani integration in this project
  setup                                  Interactive first-run menu (login → project → test)
  otp send --phone <phone> (--template-id <id> | --template <name> [--language <code>])
           [--expires <minutes>] [--project <id>] [--api-key <key>]
                                         Send a WhatsApp OTP
  otp verify --token <token> [--code <code>]
                                        Verify an OTP code
  otp status --token <token>            Check OTP delivery status

Global options:
  --base-url <url>      API base URL. Only https://developers.aiwni.com is
                        trusted; loopback URLs require --dev (explicit dev mode)
  --dev                 Development mode: allow loopback base URLs
  --timeout <ms>        Request timeout in milliseconds (default ${DEFAULT_TIMEOUT_MS})
  --json, -j            Machine-readable JSON output
  --help, -h            Show help
  --version             Show version

Auth model:
  Account commands (login/whoami/project) use your stored CLI session
  (browser device flow — no passwords in the terminal).
  OTP commands use a project API key: --api-key flag, WANI_API_KEY env,
  or a key saved with \`wani project use --api-key\`.
`;

const OTP_HELP = `wani otp — test the WhatsApp OTP API

  wani otp test [--phone 201012345678] [--template-id <id>] [--code 123456]
  wani otp send --phone 201012345678 --template-id <id> [--expires 10]
  wani otp send --phone 201012345678 --template otp_verification --language en_US
  wani otp verify --token <token> --code 123456
  wani otp status --token <token>

The project API key comes from --api-key, WANI_API_KEY, or the key saved
with \`wani project use <id> --api-key <key>\`. The project itself is always
resolved server-side from that key.
`;

function parseTimeoutMs(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CliError("--timeout must be a positive integer of milliseconds.", { kind: "usage" });
  }
  return parsed;
}

async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

  if (args.options["version"] === true) {
    process.stdout.write(`${CLI_NAME} ${CLI_VERSION}\n`);
    return;
  }

  const config = loadConfig();
  const devFlag = args.options["dev"] === true;
  const baseUrl = assertTrustedBaseUrl(
    resolveBaseUrl({
      flag: optString(args.options, "base-url", "baseUrl"),
      config,
      fallback: DEFAULT_BASE_URL,
    }),
    { dev: devFlag }
  );
  const timeoutMs = parseTimeoutMs(optString(args.options, "timeout", "timeoutMs"));
  const json = isJsonOutput(args.options);

  const ctx: CommandContext = {
    config,
    saveConfig,
    baseUrl,
    timeoutMs,
    json,
  };

  const [group, action, ...rest] = args.command;
  const positional = [...rest, ...args.positional];
  const scoped: typeof args = { command: args.command, positional, options: args.options };

  if (args.command.length === 0 || isHelpRequest(args.options, args.positional)) {
    if (group === "otp") {
      process.stdout.write(OTP_HELP);
      return;
    }
    // Bare `wani` in an interactive terminal starts guided setup;
    // scripts/pipes (non-TTY) keep the classic help output.
    if (args.command.length === 0 && process.stdin.isTTY && !isHelpRequest(args.options, args.positional)) {
      await setupCommand(ctx, scoped);
      return;
    }
    process.stdout.write(HELP);
    return;
  }

  switch (group) {
    case "login":
      await loginCommand(ctx, scoped);
      return;
    case "logout":
      await logoutCommand(ctx);
      return;
    case "whoami":
      await whoamiCommand(ctx);
      return;
    case "project":
      if (action === "list" || action === undefined) {
        await projectListCommand(ctx);
        return;
      }
      if (action === "use") {
        await projectUseCommand(ctx, scoped);
        return;
      }
      if (action === "current") {
        await projectCurrentCommand(ctx);
        return;
      }
      throw new CliError(`Unknown project command: ${action ?? "(none)"}. Try: list, use, current.`, { kind: "usage" });
    case "init":
      await otpInitCommand(ctx, scoped);
      return;
    case "setup":
      await setupCommand(ctx, scoped);
      return;
    case "otp":
      if (action === "test") {
        await otpTestCommand(ctx, scoped);
        return;
      }
      if (action === "send") {
        await otpSendCommand(ctx, scoped);
        return;
      }
      if (action === "verify") {
        await otpVerifyCommand(ctx, scoped);
        return;
      }
      if (action === "status") {
        await otpStatusCommand(ctx, scoped);
        return;
      }
      throw new CliError(`Unknown otp command: ${action ?? "(none)"}. Try: test, send, verify, status.`, { kind: "usage" });
    default:
      throw new CliError(`Unknown command: ${args.command.join(" ")}. Run \`wani --help\`.`, { kind: "usage" });
  }
}

/**
 * Robust ESM entrypoint detection.
 *
 * Compares canonical real paths (not URL strings): `process.argv[1]` may
 * point at the file through an npm link symlink, a global-shim path, or a
 * relative path, while `import.meta.url` is already symlink-resolved. Plain
 * string/URL comparison therefore fails exactly in the installed cases
 * (`npm link`, global shims on Windows/macOS/Linux).
 */
export function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const thisFile = realpathSync(fileURLToPath(import.meta.url));
    const entryFile = realpathSync(resolve(entry));
    // Windows/macOS filesystems are case-insensitive — normalize the drive
    // letter and casing there so `C:\…` and `c:\…` compare equal.
    if (process.platform === "win32" || process.platform === "darwin") {
      return thisFile.toLowerCase() === entryFile.toLowerCase();
    }
    return thisFile === entryFile;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main(process.argv.slice(2)).then(
    () => undefined,
    (err: unknown) => {
      const wantsJson = process.argv.includes("--json") || process.argv.includes("-j");
      process.exitCode = printError(err, wantsJson);
    }
  );
}

export { main };
