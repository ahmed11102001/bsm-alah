import { describe, it, after } from "node:test";
import assert from "node:assert/strict";

import { pollDeviceToken, requestDeviceCode } from "../src/auth/device-flow.js";
import { loginCommand } from "../src/commands/auth/login.js";
import { logoutCommand } from "../src/commands/auth/logout.js";
import type { CommandContext } from "../src/commands/context.js";
import type { CliConfig } from "../src/config/config.js";
import { parseArgs } from "../src/utils/args.js";
import { CliError } from "../src/api/errors.js";

function jsonRes(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  };
}

const __origStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = ((chunk: unknown) => true) as typeof process.stdout.write;
after(() => {
  process.stdout.write = __origStdoutWrite;
});

function baseCtx(overrides: Partial<CommandContext> & { config: CliConfig }): CommandContext {
  return {
    saveConfig: () => undefined,
    baseUrl: "https://api.test",
    timeoutMs: 1000,
    json: false,
    ...overrides,
  };
}

describe("requestDeviceCode", () => {
  it("returns the device/user codes and validates the shape", async () => {
    const seen: any[] = [];
    const fetchImpl = (async (url: any, init?: any) => {
      seen.push({ url: String(url), init });
      return jsonRes(200, {
        device_code: "dev-1",
        user_code: "ABCD-1234",
        verification_uri: "/developers/cli/authorize",
        expires_in: 600,
      });
    }) as any;
    const res = await requestDeviceCode("https://api.test", "my machine", { timeoutMs: 1000, fetchImpl });
    assert.equal(res.deviceCode, "dev-1");
    assert.equal(res.userCode, "ABCD-1234");
    assert.deepEqual(JSON.parse(seen[0].init.body), { device_name: "my machine" });
  });

  it("rejects malformed responses without leaking", async () => {
    const fetchImpl = (async () => jsonRes(200, { ok: true })) as any;
    await assert.rejects(
      requestDeviceCode("https://api.test", undefined, { timeoutMs: 1000, fetchImpl }),
      (e: any) => e instanceof CliError
    );
  });
});

describe("pollDeviceToken", () => {
  it("waits through PENDING then returns the token", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      if (calls === 1) return jsonRes(400, { ok: false, error: "wait", code: "AUTHORIZATION_PENDING" });
      return jsonRes(200, { access_token: "wani_cli_tok", token_type: "Bearer", expires_in: 100 });
    }) as any;
    const res = await pollDeviceToken("https://api.test", "dev-1", 600, {
      timeoutMs: 1000,
      fetchImpl,
      pollIntervalMs: 5,
    });
    assert.equal(res.accessToken, "wani_cli_tok");
    assert.equal(calls, 2);
  });

  it("denied and expired requests throw auth errors", async () => {
    const denied = (async () => jsonRes(403, { ok: false, error: "no", code: "AUTHORIZATION_DENIED" })) as any;
    await assert.rejects(
      pollDeviceToken("https://api.test", "d", 600, { timeoutMs: 1000, fetchImpl: denied, pollIntervalMs: 5 }),
      (e: any) => e instanceof CliError && e.kind === "auth"
    );
    const expired = (async () => jsonRes(410, { ok: false, error: "old", code: "AUTHORIZATION_EXPIRED" })) as any;
    await assert.rejects(
      pollDeviceToken("https://api.test", "d", 600, { timeoutMs: 1000, fetchImpl: expired, pollIntervalMs: 5 }),
      (e: any) => e instanceof CliError && /again/.test(e.message)
    );
  });

  it("times out when approval never arrives", async () => {
    const pending = (async () => jsonRes(400, { ok: false, error: "wait", code: "AUTHORIZATION_PENDING" })) as any;
    await assert.rejects(
      pollDeviceToken("https://api.test", "d", 60, { timeoutMs: 1000, fetchImpl: pending, pollIntervalMs: 5 }),
      (e: any) => e instanceof CliError && e.code === "AUTHORIZATION_TIMEOUT"
    );
  });
});

describe("loginCommand (device flow, no passwords)", () => {
  it("completes login and stores the access token", async () => {
    const seen: any[] = [];
    let tokenCalls = 0;
    const fetchImpl = (async (url: any) => {
      seen.push(String(url));
      const u = String(url);
      if (u.endsWith("/cli/device/code")) {
        return jsonRes(200, {
          device_code: "dev-9",
          user_code: "WXYZ-9876",
          verification_uri: "/developers/cli/authorize",
          expires_in: 600,
        });
      }
      if (u.endsWith("/cli/device/token")) {
        tokenCalls++;
        if (tokenCalls === 1) return jsonRes(400, { ok: false, error: "wait", code: "AUTHORIZATION_PENDING" });
        return jsonRes(200, { access_token: "wani_cli_saved", token_type: "Bearer", expires_in: 100 });
      }
      return jsonRes(200, { developer: { email: "dev@x.com" } });
    }) as any;
    const saved: { config: CliConfig | null } = { config: null };
    const ctx = baseCtx({
      config: { version: 2, apiKeys: {} },
      fetchImpl,
      saveConfig: (c) => { saved.config = c; },
    });
    await loginCommand(ctx, parseArgs(["--no-open"]));
    assert.equal(saved.config?.cliAccessToken, "wani_cli_saved");
    assert.ok(seen.some((u) => u.endsWith("/cli/device/code")));
    assert.ok(seen.some((u) => u.endsWith("/auth/me")));
  });
});

describe("logoutCommand", () => {
  it("revokes server-side then clears local state", async () => {
    const seen: any[] = [];
    const fetchImpl = (async (url: any, init?: any) => {
      seen.push({ url: String(url), init });
      return jsonRes(200, { ok: true });
    }) as any;
    const saved: { config: CliConfig | null } = { config: null };
    const ctx = baseCtx({
      config: { version: 2, apiKeys: { p1: "k" }, cliAccessToken: "tok" },
      fetchImpl,
      saveConfig: (c) => { saved.config = c; },
    });
    await logoutCommand(ctx, { command: ["logout"], positional: [], options: {} });
    assert.ok(seen.some((s) => s.url.endsWith("/cli/sessions/revoke-current")));
    assert.equal(seen[0].init.headers["Authorization"], "Bearer tok");
    assert.equal(saved.config?.cliAccessToken, undefined);
    assert.deepEqual(saved.config?.apiKeys, { p1: "k" });
  });

  it("local logout succeeds even when the server is unreachable", async () => {
    const fetchImpl = (async () => {
      throw new Error("down");
    }) as any;
    const saved: { config: CliConfig | null } = { config: null };
    const ctx = baseCtx({
      config: { version: 2, apiKeys: {}, cliAccessToken: "tok" },
      fetchImpl,
      saveConfig: (c) => { saved.config = c; },
    });
    await logoutCommand(ctx, { command: ["logout"], positional: [], options: {} });
    assert.equal(saved.config?.cliAccessToken, undefined);
  });
});


