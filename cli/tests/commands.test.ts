import { describe, it, after } from "node:test";
import assert from "node:assert/strict";

import { CliError } from "../src/api/errors.js";
import type { CommandContext } from "../src/commands/context.js";
import type { CliConfig } from "../src/config/config.js";
import { otpSendCommand } from "../src/commands/otp/send.js";
import { otpVerifyCommand } from "../src/commands/otp/verify.js";
import { otpStatusCommand } from "../src/commands/otp/status.js";
import { projectUseCommand } from "../src/commands/project/use.js";
import { parseArgs } from "../src/utils/args.js";

interface Seen {
  url: string;
  init: any;
}

function jsonRes(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  };
}

function testContext(config: Partial<CliConfig> & { apiKeys: Record<string, string> }, seen: Seen[], behavior?: (url: string) => unknown): CommandContext {
  const fetchImpl = (async (url: any, init?: any) => {
    seen.push({ url: String(url), init });
    const body = behavior ? behavior(String(url)) : { ok: true, token: "tok", expiresAt: "2030-01-01T00:00:00.000Z" };
    return jsonRes(200, body);
  }) as any;
  return {
    config: { version: 1, ...config, apiKeys: config.apiKeys },
    saveConfig: () => undefined,
    baseUrl: "https://api.test",
    timeoutMs: 1000,
    json: true,
    fetchImpl,
    readEmail: async () => "a@b.c",
    readPassword: async () => "secret",
  };
}

function silenceOutput(): void {
  // Buffer command output so test logs stay readable; restored after the run.
}
const __origStdoutWrite = process.stdout.write.bind(process.stdout);
const __origStderrWrite = process.stderr.write.bind(process.stderr);
process.stdout.write = ((chunk: unknown) => true) as typeof process.stdout.write;
process.stderr.write = ((chunk: unknown) => true) as typeof process.stderr.write;
after(() => {
  process.stdout.write = __origStdoutWrite;
  process.stderr.write = __origStderrWrite;
});

describe("otp send", () => {
  it("builds the exact templateId payload (no Meta fields)", async () => {
    silenceOutput();
    const seen: Seen[] = [];
    const ctx = testContext({ apiKeys: {} }, seen);
    await otpSendCommand(ctx, parseArgs(["--phone", "2010", "--template-id", "tpl_1", "--expires", "10", "--api-key", "wani_live_k"]));
    assert.equal(seen[0].url, "https://api.test/api/developers/otp/send");
    assert.deepEqual(JSON.parse(seen[0].init.body), {
      phone: "2010",
      templateId: "tpl_1",
      expiryMinutes: 10,
    });
    assert.equal(seen[0].init.headers["x-api-key"], "wani_live_k");
  });

  it("builds the legacy templateName payload with language", async () => {
    silenceOutput();
    const seen: Seen[] = [];
    const ctx = testContext({ apiKeys: {} }, seen);
    await otpSendCommand(ctx, parseArgs(["--phone", "2010", "--template", "otp_verification", "--language", "en_US", "--api-key", "k"]));
    assert.deepEqual(JSON.parse(seen[0].init.body), {
      phone: "2010",
      templateName: "otp_verification",
      language: "en_US",
    });
  });

  it("rejects bad input without any request", async () => {
    silenceOutput();
    const seen: Seen[] = [];
    const ctx = testContext({ apiKeys: {} }, seen);
    await assert.rejects(
      otpSendCommand(ctx, parseArgs(["--phone", "2010", "--api-key", "k"])),
      (e: any) => e instanceof CliError && e.exitCode === 2
    );
    await assert.rejects(
      otpSendCommand(ctx, parseArgs(["--phone", "2010", "--template-id", "t", "--expires", "99", "--api-key", "k"])),
      (e: any) => e instanceof CliError && e.exitCode === 2
    );
    assert.equal(seen.length, 0);
  });

  it("uses the stored project key when no flag/env is given", async () => {
    silenceOutput();
    delete process.env["WANI_API_KEY"];
    const seen: Seen[] = [];
    const ctx = testContext({ apiKeys: { p1: "wani_live_stored" }, currentProjectId: "p1" }, seen);
    await otpSendCommand(ctx, parseArgs(["--phone", "2010", "--template-id", "t"]));
    assert.equal(seen[0].init.headers["x-api-key"], "wani_live_stored");
  });
});

describe("otp verify / status", () => {
  it("posts the exact verify payload", async () => {
    silenceOutput();
    const seen: Seen[] = [];
    const ctx = testContext({ apiKeys: {} }, seen, () => ({ ok: true, verified: true }));
    await otpVerifyCommand(ctx, parseArgs(["--token", "tok", "--code", "123456", "--api-key", "k"]));
    assert.equal(seen[0].url, "https://api.test/api/developers/otp/verify");
    assert.deepEqual(JSON.parse(seen[0].init.body), { token: "tok", code: "123456" });
  });

  it("encodes the status token in the path", async () => {
    silenceOutput();
    const seen: Seen[] = [];
    const ctx = testContext({ apiKeys: {} }, seen, () => ({ ok: true, status: "sent" }));
    await otpStatusCommand(ctx, parseArgs(["--token", "a/b+c", "--api-key", "k"]));
    assert.equal(seen[0].url, "https://api.test/api/developers/otp/status/a%2Fb%2Bc");
  });
});

describe("project use", () => {
  const projects = [
    { id: "cmu111", name: "Shop", viewerRole: "owner" },
    { id: "cmu222", name: "Shop 2", viewerRole: "developer" },
  ];

  it("matches by exact id, prefix and name; rejects ambiguity", async () => {
    silenceOutput();
    const seen: Seen[] = [];
    const saved: { config: CliConfig | null } = { config: null };
    const ctx = testContext({ apiKeys: {} }, seen, () => ({ projects }));
    ctx.saveConfig = (c) => {
      saved.config = c;
    };

    const useArgs = (pos: string[], options: Record<string, string | boolean> = {}): Parameters<typeof projectUseCommand>[1] => ({
      command: ["project", "use"],
      positional: pos,
      options,
    });
    const useCtx: CommandContext = { ...ctx, config: { ...ctx.config, sessionCookie: "sess" } };
    ctx.saveConfig = (c) => {
      saved.config = { ...c, sessionCookie: "sess" };
    };

    await projectUseCommand(useCtx, useArgs(["cmu111"]));
    assert.equal(saved.config?.currentProjectId, "cmu111");

    await projectUseCommand(useCtx, useArgs(["cmu222"], { "api-key": "wani_live_new" }));
    assert.equal(saved.config?.currentProjectId, "cmu222");
    assert.equal(saved.config?.apiKeys["cmu222"], "wani_live_new");

    await projectUseCommand(useCtx, useArgs(["shop"]));
    assert.equal(saved.config?.currentProjectId, "cmu111");

    await assert.rejects(projectUseCommand(useCtx, useArgs(["cmu"])), (e: any) => e instanceof CliError && e.exitCode === 2);
    await assert.rejects(projectUseCommand(useCtx, useArgs(["nope"])), (e: any) => e instanceof CliError && e.exitCode === 2);
  });
});
