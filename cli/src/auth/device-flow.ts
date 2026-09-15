/**
 * Browser-based device authorization (`wani login`).
 *
 * No email/password ever touches the terminal. The CLI obtains a short-lived
 * device request, shows the user code, opens the portal authorization page,
 * then polls until the developer approves (or the request expires).
 */
import { CliError } from "../api/errors.js";
import { ENDPOINTS } from "../api/endpoints.js";

export interface DeviceFlowDeps {
  timeoutMs: number;
  fetchImpl?: typeof fetch | undefined;
}

export interface DeviceCodeResult {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresInSecs: number;
}

export interface DeviceTokenResult {
  accessToken: string;
  expiresInSecs: number;
}

function safeJson(res: Response): Promise<unknown> {
  return res.json().catch(() => undefined);
}

function bodyError(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null) {
    const err = (body as Record<string, unknown>)["error"];
    if (typeof err === "string" && err !== "") return err;
  }
  return fallback;
}

function bodyCode(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null) {
    const code = (body as Record<string, unknown>)["code"];
    if (typeof code === "string") return code;
  }
  return undefined;
}

async function postJson(
  baseUrl: string,
  path: string,
  payload: Record<string, unknown>,
  deps: DeviceFlowDeps
): Promise<{ status: number; body: unknown }> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), deps.timeoutMs);
  try {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return { status: res.status, body: await safeJson(res) };
  } catch {
    throw new CliError("Network error — could not reach the Wani API.", { kind: "http", code: "NETWORK_ERROR" });
  } finally {
    clearTimeout(timeout);
  }
}

/** Step 1: create a device authorization request (public endpoint). */
export async function requestDeviceCode(
  baseUrl: string,
  deviceName: string | undefined,
  deps: DeviceFlowDeps
): Promise<DeviceCodeResult> {
  const { status, body } = await postJson(
    baseUrl,
    ENDPOINTS.cliDeviceCode,
    deviceName ? { device_name: deviceName } : {},
    deps
  );
  if (status !== 200 || typeof body !== "object" || body === null) {
    throw new CliError(bodyError(body, `Could not start login (HTTP ${status}).`), {
      kind: "http",
      status,
      code: bodyCode(body),
    });
  }
  const record = body as Record<string, unknown>;
  const deviceCode = record["device_code"];
  const userCode = record["user_code"];
  const verificationUri = record["verification_uri"];
  const expiresIn = record["expires_in"];
  if (
    typeof deviceCode !== "string" || deviceCode === "" ||
    typeof userCode !== "string" || userCode === "" ||
    typeof verificationUri !== "string" || verificationUri === "" ||
    typeof expiresIn !== "number"
  ) {
    throw new CliError("Login endpoint returned an unexpected response. Please try again.", { kind: "http" });
  }
  return { deviceCode, userCode, verificationUri, expiresInSecs: expiresIn };
}

export interface PollDeps extends DeviceFlowDeps {
  pollIntervalMs?: number | undefined;
  onPending?: (() => void) | undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Step 2: poll until approval, denial, expiry, or the request deadline. */
export async function pollDeviceToken(
  baseUrl: string,
  deviceCode: string,
  expiresInSecs: number,
  deps: PollDeps
): Promise<DeviceTokenResult> {
  const interval = deps.pollIntervalMs ?? 5000;
  const deadline = Date.now() + Math.min(Math.max(expiresInSecs, 60), 600) * 1000;
  for (;;) {
    const { status, body } = await postJson(
      baseUrl,
      ENDPOINTS.cliDeviceToken,
      { device_code: deviceCode },
      deps
    );
    if (status === 200 && typeof body === "object" && body !== null) {
      const record = body as Record<string, unknown>;
      if (typeof record["access_token"] === "string" && record["access_token"] !== "") {
        const expiresIn = typeof record["expires_in"] === "number" ? record["expires_in"] : 0;
        return { accessToken: record["access_token"] as string, expiresInSecs: expiresIn };
      }
      throw new CliError("Login endpoint returned an unexpected response. Please try again.", { kind: "http" });
    }
    const code = bodyCode(body);
    if (code === "AUTHORIZATION_PENDING") {
      if (Date.now() >= deadline) break;
      deps.onPending?.();
      await sleep(interval);
      continue;
    }
    if (code === "AUTHORIZATION_DENIED") {
      throw new CliError("Authorization was denied in the browser.", { kind: "auth", status, code });
    }
    if (code === "AUTHORIZATION_EXPIRED" || code === "AUTHORIZATION_INVALID") {
      throw new CliError("This login request expired. Run `wani login` again.", { kind: "auth", status, code });
    }
    if (status === 429) {
      // Transient rate limit while polling — back off and keep waiting.
      if (Date.now() >= deadline) break;
      await sleep(interval * 2);
      continue;
    }
    throw new CliError(bodyError(body, `Login failed with HTTP ${status}.`), {
      kind: status === 401 || status === 403 ? "auth" : "http",
      status,
      code,
    });
  }
  throw new CliError("Login timed out waiting for browser approval. Run `wani login` again.", {
    kind: "auth",
    code: "AUTHORIZATION_TIMEOUT",
  });
}
