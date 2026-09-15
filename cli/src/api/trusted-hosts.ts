/**
 * Base-URL allowlist — credentials must never go to an arbitrary host.
 *
 * Production rule: only `https://developers.aiwni.com` is trusted.
 * Loopback URLs (`localhost`, `127.*`, `::1`, any scheme) are trusted
 * ONLY in explicit development mode (`--dev` flag or `WANI_DEV=1`).
 * Everything else — including plain `http://` remotes — is rejected
 * before any session cookie or API key leaves the machine.
 */
import { CliError } from "./errors.js";

export const TRUSTED_PROD_HOST = "developers.aiwni.com";
export const DEV_MODE_ENV_VAR = "WANI_DEV";

export function isDevMode(devFlag?: boolean): boolean {
  if (devFlag === true) return true;
  const env = process.env[DEV_MODE_ENV_VAR]?.trim().toLowerCase();
  return env === "1" || env === "true";
}

function isLoopback(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "::1" ||
    host === "[::1]" ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

/**
 * Validate a resolved base URL. Returns the normalized URL (no trailing
 * slash) or throws a usage CliError. Never sends anything anywhere.
 */
export function assertTrustedBaseUrl(raw: string, opts?: { dev?: boolean }): string {
  const value = raw.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CliError(`Invalid base URL: "${raw}". Expected ${TRUSTED_PROD_HOST}.`, { kind: "usage" });
  }
  const dev = isDevMode(opts?.dev);

  if (url.hostname.toLowerCase() === TRUSTED_PROD_HOST) {
    if (url.protocol !== "https:") {
      throw new CliError(`Refusing insecure scheme for ${TRUSTED_PROD_HOST} — use https://.`, { kind: "usage" });
    }
    return url.toString().replace(/\/+$/, "");
  }

  if (isLoopback(url.hostname)) {
    if (!dev) {
      throw new CliError(
        `Loopback base URLs require explicit development mode. Re-run with --dev (or ${DEV_MODE_ENV_VAR}=1).`,
        { kind: "usage" }
      );
    }
    return url.toString().replace(/\/+$/, "");
  }

  throw new CliError(
    `Refusing to send credentials to untrusted host "${url.host}". ` +
      `Expected https://${TRUSTED_PROD_HOST}. For local development use --dev with a localhost URL.`,
    { kind: "usage" }
  );
}
