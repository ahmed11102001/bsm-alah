/**
 * Browser-assisted login helper (`wani login --browser`).
 *
 * The Developer API has no OAuth/token-exchange endpoint, so the browser
 * cannot hand a session back to the CLI (the cookie is HttpOnly). Instead
 * this opens the portal's API-keys page where the user copies a project
 * key, then saves it with `wani project use --api-key`.
 */
import { spawn } from "node:child_process";
import { PORTAL_URL } from "../constants.js";

export function apiKeysPageUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    if (url.hostname === "developers.aiwni.com") return `${PORTAL_URL}/portal/api-keys`;
  } catch {
    // fall through to base-relative URL
  }
  return `${baseUrl.replace(/\/+$/, "")}/portal/api-keys`;
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
