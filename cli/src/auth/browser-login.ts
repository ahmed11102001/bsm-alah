/**
 * Browser-assisted login helper (`wani login`).
 *
 * Builds the portal authorization page URL for the current base URL and
 * opens it in the default browser (best-effort, never throws).
 */
import { spawn } from "node:child_process";

/**
 * Resolve a portal path (e.g. `/developers/cli/authorize`) against the CLI
 * base URL: dev-subdomain hosts serve it without the `/developers` prefix.
 */
export function authorizePageUrl(baseUrl: string, verificationUri = "/developers/cli/authorize"): string {
  if (/^https?:\/\//i.test(verificationUri)) return verificationUri;
  try {
    const url = new URL(baseUrl);
    if (url.hostname === "developers.aiwni.com" || url.hostname === "developers.localhost") {
      const stripped = verificationUri.startsWith("/developers")
        ? verificationUri.slice("/developers".length) || "/"
        : verificationUri;
      return `${url.origin}${stripped}`;
    }
  } catch {
    // fall through to base-relative URL
  }
  const path = verificationUri.startsWith("/") ? verificationUri : `/${verificationUri}`;
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

/** Best-effort: open a URL in the default browser. Never throws. */
export function openInBrowser(url: string): boolean {
  try {
    let child;
    if (process.platform === "darwin") {
      child = spawn("open", [url], { stdio: "ignore", detached: true });
    } else if (process.platform === "win32") {
      child = spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true, shell: false });
    } else {
      child = spawn("xdg-open", [url], { stdio: "ignore", detached: true });
    }
    child.unref();
    return true;
  } catch {
    return false;
  }
}
