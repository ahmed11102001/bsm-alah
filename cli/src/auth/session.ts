/**
 * Account session management (`wani login` / `logout` / `whoami`).
 *
 * Login POSTs email+password to the public auth endpoint and stores the
 * returned `dev-session` cookie value locally (0600). No backend change.
 */
import { ENDPOINTS } from "../api/endpoints.js";
import { CliError } from "../api/errors.js";
import { API_KEY_ENV_VAR } from "../constants.js";

export interface LoginDeps {
  fetchImpl?: typeof fetch | undefined;
  readEmail: () => Promise<string>;
  readPassword: () => Promise<string>;
}

export interface LoginResult {
  email: string;
  redirect: string;
}

function safeJson(res: Response): Promise<unknown> {
  return res.json().catch(() => undefined);
}

/** Read a raw `Set-Cookie` value from a fetch Response (node + undici). */
function getSetCookie(res: Response): string | string[] | null {
  const headers = res.headers as unknown as {
    getSetCookie?: () => string[];
    get?: (name: string) => string | null;
  };
  if (typeof headers.getSetCookie === "function") {
    try {
      const all = headers.getSetCookie();
      if (all.length > 0) return all;
    } catch {
      // fall through to single-header read
    }
  }
  return headers.get?.("set-cookie") ?? null;
}

export function extractSessionCookieFromLogin(
  setCookie: string | string[] | null | undefined
): string | undefined {
  if (!setCookie) return undefined;
  const headers = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const header of headers) {
    const first = header.split(";")[0]?.trim() ?? "";
    if (first.startsWith("dev-session=")) {
      const value = first.slice("dev-session=".length);
      if (value) return value;
    }
  }
  return undefined;
}

export async function loginWithPassword(
  baseUrl: string,
  deps: LoginDeps & { timeoutMs: number }
): Promise<{ sessionCookie: string; result: LoginResult }> {
  const email = (await deps.readEmail()).trim();
  if (!email) {
    throw new CliError("Email is required.", { kind: "usage" });
  }
  const password = await deps.readPassword();
  if (!password) {
    throw new CliError("Password is required.", { kind: "usage" });
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), deps.timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(`${baseUrl}${ENDPOINTS.authLogin}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
  } catch {
    throw new CliError("Network error — could not reach the Wani API.", { kind: "http", code: "NETWORK_ERROR" });
  } finally {
    clearTimeout(timeout);
  }

  const body: unknown = await safeJson(res);
  if (!res.ok) {
    const message =
      typeof body === "object" && body !== null && typeof (body as Record<string, unknown>)["error"] === "string"
        ? (body as Record<string, unknown>)["error"] as string
        : `Login failed with HTTP ${res.status}.`;
    throw new CliError(message, { kind: res.status === 401 ? "auth" : "http", status: res.status });
  }

  const sessionCookie = extractSessionCookieFromLogin(getSetCookie(res));
  if (!sessionCookie) {
    throw new CliError("Login succeeded but no session was returned. Please try again.", { kind: "http" });
  }
  const redirect =
    typeof body === "object" && body !== null && typeof (body as Record<string, unknown>)["redirect"] === "string"
      ? ((body as Record<string, unknown>)["redirect"] as string)
      : "/portal";
  return { sessionCookie, result: { email, redirect } };
}

/** Masked hint so users know which env var feeds OTP commands. */
export function apiKeyEnvHint(): string {
  return `Set ${API_KEY_ENV_VAR} or pass --api-key (or save one via \`wani project use --api-key\`).`;
}
