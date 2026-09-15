import { describe, it, after } from "node:test";
import assert from "node:assert/strict";

import { otpTestCommand } from "../src/commands/otp/test.js";
import { chooseTemplateIndex } from "../src/commands/otp/templates.js";
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

function testContext(
  config: Partial<CliConfig> & { apiKeys: Record<string, string> },
  behavior: (url: string, init?: any) => unknown
): { ctx: CommandContext; seen: { url: string; init: any }[] } {
  const seen: { url: string; init: any }[] = [];
  const fetchImpl = (async (url: any, init?: any) => {
    seen.push({ url: String(url), init });
    return jsonRes(200, behavior(String(url), init));
  }) as any;
  const ctx: CommandContext = {
    config: { version: 2, ...config, apiKeys: config.apiKeys },
    saveConfig: () => undefined,
    baseUrl: "https://api.test",
    timeoutMs: 1000,
    json: false,
    fetchImpl,
  };
  return { ctx, seen };
}

const __origStdoutWrite = process.stdout.write.bind(process.stdout);
let captured = "";
process.stdout.write = ((chunk: unknown) => {
  captured += String(chunk);
  return true;
}) as typeof process.stdout.write;
after(() => {
  process.stdout.write = __origStdoutWrite;
});

describe("chooseTemplateIndex", () => {
  it("defaults empty input to the first template, validates range", () => {
    assert.equal(chooseTemplateIndex("", 3), 0);
    assert.equal(chooseTemplateIndex("2", 3), 1);
    assert.throws(() => chooseTemplateIndex("0", 3), (e: any) => e instanceof CliError && e.exitCode === 2);
    assert.throws(() => chooseTemplateIndex("4", 3), (e: any) => e instanceof CliError && e.exitCode === 2);
    assert.throws(() => chooseTemplateIndex("x", 3), (e: any) => e instanceof CliError && e.exitCode === 2);
  });
});

describe("wani otp test (flags-only)", () => {
  it("sends then verifies with the exact bodies", async () => {
    captured = "";
    const { ctx, seen } = testContext({ apiKeys: {} }, (url) => {
      if (url.endsWith("/otp/send")) return { ok: true, token: "tok-1", expiresAt: "2030-01-01T00:00:00.000Z" };
      if (url.endsWith("/otp/verify")) return { ok: true, verified: true };
      throw new Error(`unexpected request: ${url}`);
    });
    await otpTestCommand(
      ctx,
      parseArgs(["--phone", "2010", "--template-id", "tpl_1", "--code", "123456", "--api-key", "wani_live_k"])
    );
    assert.equal(seen[0].url, "https://api.test/api/developers/otp/send");
    assert.deepEqual(JSON.parse(seen[0].init.body), { phone: "2010", templateId: "tpl_1" });
    assert.equal(seen[1].url, "https://api.test/api/developers/otp/verify");
    assert.deepEqual(JSON.parse(seen[1].init.body), { token: "tok-1", code: "123456" });
    assert.match(captured, /✓ OTP verified/);
  });

  it("auto-picks the only approved template when logged in", async () => {
    captured = "";
    const { ctx, seen } = testContext(
      { apiKeys: {}, currentProjectId: "p1", cliAccessToken: "tok" },
      (url) => {
        if (url.endsWith("/otp-templates")) {
          return {
            templates: [
              { id: "tpl_9", name: "otp_login", language: "ar", status: "APPROVED" },
              { id: "tpl_8", name: "draft_one", language: "ar", status: "PENDING" },
            ],
          };
        }
        if (url.endsWith("/projects")) return { projects: [{ id: "p1", name: "My Store" }] };
        if (url.endsWith("/otp/send")) return { ok: true, token: "t", expiresAt: "2030-01-01T00:00:00.000Z" };
        if (url.endsWith("/otp/verify")) return { ok: true, verified: true };
        throw new Error(`unexpected request: ${url}`);
      }
    );
    await otpTestCommand(
      ctx,
      parseArgs(["--phone", "2010", "--code", "111111", "--api-key", "wani_live_k"])
    );
    const send = seen.find((s) => s.url.endsWith("/otp/send"));
    assert.deepEqual(JSON.parse(send?.init.body), { phone: "2010", templateId: "tpl_9" });
    assert.match(captured, /My Store/);
  });

  it("emits a single JSON document in --json mode", async () => {
    captured = "";
    const { ctx } = testContext({ apiKeys: {} }, (url) => {
      if (url.endsWith("/otp/send")) return { ok: true, token: "tok-j", expiresAt: "2030-01-01T00:00:00.000Z" };
      if (url.endsWith("/otp/verify")) return { ok: true, verified: true };
      throw new Error(`unexpected request: ${url}`);
    });
    ctx.json = true;
    await otpTestCommand(
      ctx,
      parseArgs(["--phone", "2010", "--template-id", "tpl_1", "--code", "1", "--api-key", "k"])
    );
    const data = JSON.parse(captured.trim());
    assert.equal(data.ok, true);
    assert.equal(data.token, "tok-j");
    assert.equal(data.verified, true);
    assert.equal(data.templateId, "tpl_1");
  });

  it("fails without any API key, and without login+template in non-TTY", async () => {
    delete process.env["WANI_API_KEY"];
    const t1 = testContext({ apiKeys: {} }, () => ({}));
    await assert.rejects(
      otpTestCommand(t1.ctx, parseArgs(["--phone", "2010", "--template-id", "t", "--code", "1"])),
      (e: any) => e instanceof CliError && e.kind === "auth"
    );

    const t2 = testContext({ apiKeys: {}, currentProjectId: "p1" }, () => ({}));
    await assert.rejects(
      otpTestCommand(
        t2.ctx,
        parseArgs(["--phone", "2010", "--code", "1", "--api-key", "wani_live_k"])
      ),
      (e: any) => e instanceof CliError
    );
  });

  it("verification failure exits non-zero", async () => {
    const { ctx } = testContext({ apiKeys: {} }, (url) => {
      if (url.endsWith("/otp/send")) return { ok: true, token: "t", expiresAt: "2030-01-01T00:00:00.000Z" };
      return { ok: true, verified: false };
    });
    await assert.rejects(
      otpTestCommand(
        ctx,
        parseArgs(["--phone", "2010", "--template-id", "t", "--code", "000000", "--api-key", "k"])
      ),
      (e: any) => e instanceof CliError && /verification failed/i.test(e.message)
    );
  });
});
