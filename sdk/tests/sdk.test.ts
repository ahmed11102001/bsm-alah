/**
 * Contract tests for @aiwni/sdk — fetch is fully mocked, nothing hits production.
 *
 * Covers: initialization, auth header, exact request payloads/paths for the
 * three public OTP endpoints, error normalization, timeout/abort handling,
 * argument validation, and a regression guard proving the SDK never builds
 * or sends a Meta/WhatsApp payload itself.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { Wani, WaniError, DEFAULT_BASE_URL } from "../src/index.js";

// ─── Fetch mock ─────────────────────────────────────────────────────────────
interface SeenCall {
  url: string;
  init: any;
}

let seen: SeenCall[] = [];
let behavior: (url: string, init: any) => any = () =>
  jsonRes(200, { ok: true, token: "tok", expiresAt: "2030-01-01T00:00:00.000Z" });

function jsonRes(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}

function mockFetch(url: any, init?: any): Promise<any> {
  seen.push({ url: String(url), init });
  return Promise.resolve(behavior(String(url), init));
}

const client = () =>
  new Wani({ apiKey: "wani_live_test_key", fetch: mockFetch as any });

beforeEach(() => {
  seen = [];
  behavior = () =>
    jsonRes(200, { ok: true, token: "tok", expiresAt: "2030-01-01T00:00:00.000Z" });
});

// ─── 1-2. Initialization ────────────────────────────────────────────────────
describe("initialization", () => {
  it("creates a client with apiKey and exposes wani.otp", () => {
    const wani = client();
    assert.ok(wani.otp);
    assert.equal(typeof wani.otp.send, "function");
    assert.equal(typeof wani.otp.verify, "function");
    assert.equal(typeof wani.otp.status, "function");
  });

  it("missing apiKey throws WaniError (INVALID_ARGUMENT)", () => {
    assert.throws(() => new Wani({ apiKey: "" } as any), (err: any) => {
      assert.ok(err instanceof WaniError);
      assert.equal(err.code, "INVALID_ARGUMENT");
      return true;
    });
    assert.throws(() => new Wani(undefined as any), (err: any) => err instanceof WaniError);
  });

  it("defaults to the official base URL", async () => {
    behavior = () => jsonRes(200, { ok: true, token: "tok", status: "sent" });
    await client().otp.status("tok");
    assert.ok(seen[0].url.startsWith(`${DEFAULT_BASE_URL}/api/developers/otp/status/`));
    assert.equal(DEFAULT_BASE_URL, "https://developers.aiwni.com");
  });
});

// ─── 3-7. send ──────────────────────────────────────────────────────────────
describe("otp.send", () => {
  it("sends x-api-key header to POST /api/developers/otp/send", async () => {
    await client().otp.send({ phone: "201012345678", templateId: "tpl_1" });
    assert.equal(seen.length, 1);
    assert.equal(seen[0].init.method, "POST");
    assert.equal(seen[0].url, `${DEFAULT_BASE_URL}/api/developers/otp/send`);
    assert.equal(seen[0].init.headers["x-api-key"], "wani_live_test_key");
  });

  it("exact payload for templateId (no extra fields)", async () => {
    await client().otp.send({ phone: "201012345678", templateId: "tpl_1", expiryMinutes: 10 });
    assert.deepEqual(JSON.parse(seen[0].init.body), {
      phone: "201012345678",
      templateId: "tpl_1",
      expiryMinutes: 10,
    });
  });

  it("templateName (+language) payload for legacy integrations", async () => {
    await client().otp.send({ phone: "201012345678", templateName: "otp_verification", language: "en_US" });
    assert.deepEqual(JSON.parse(seen[0].init.body), {
      phone: "201012345678",
      templateName: "otp_verification",
      language: "en_US",
    });
  });

  it("omits expiryMinutes when not provided", async () => {
    await client().otp.send({ phone: "201012345678", templateId: "tpl_1" });
    assert.deepEqual(JSON.parse(seen[0].init.body), {
      phone: "201012345678",
      templateId: "tpl_1",
    });
  });

  it("returns typed send result", async () => {
    behavior = () =>
      jsonRes(200, { ok: true, token: "abc", expiresAt: "2030-01-01T00:00:00.000Z", messagesLeft: 49 });
    const res = await client().otp.send({ phone: "201012345678", templateId: "tpl_1" });
    assert.deepEqual(res, { token: "abc", expiresAt: "2030-01-01T00:00:00.000Z", messagesLeft: 49 });
  });

  it("requires phone and a template reference", async () => {
    await assert.rejects(client().otp.send({ phone: "", templateId: "t" }), (e: any) => e.code === "INVALID_ARGUMENT");
    await assert.rejects(
      client().otp.send({ phone: "201012345678" } as any),
      (e: any) => e.code === "INVALID_ARGUMENT"
    );
    assert.equal(seen.length, 0);
  });
});

// ─── 8-9. verify / status ───────────────────────────────────────────────────
describe("otp.verify", () => {
  it("posts the exact verify payload", async () => {
    behavior = () => jsonRes(200, { ok: true, verified: true, message: "ok", phone: "201012345678" });
    const res = await client().otp.verify({ token: "tok", code: "123456" });
    assert.equal(seen[0].url, `${DEFAULT_BASE_URL}/api/developers/otp/verify`);
    assert.deepEqual(JSON.parse(seen[0].init.body), { token: "tok", code: "123456" });
    assert.deepEqual(res, { verified: true, message: "ok", phone: "201012345678" });
  });

  it("rejects missing token/code without any request", async () => {
    await assert.rejects(client().otp.verify({ token: "", code: "1" }), (e: any) => e.code === "INVALID_ARGUMENT");
    await assert.rejects(client().otp.verify({ token: "t", code: "" }), (e: any) => e.code === "INVALID_ARGUMENT");
    assert.equal(seen.length, 0);
  });
});

describe("otp.status", () => {
  it("GETs the status path with URL-encoded token", async () => {
    behavior = () =>
      jsonRes(200, { ok: true, token: "a/b+c?d", status: "sent", phone: "2010", secondsRemaining: 600 });
    const res = await client().otp.status("a/b+c?d");
    assert.equal(seen[0].init.method, "GET");
    assert.equal(seen[0].url, `${DEFAULT_BASE_URL}/api/developers/otp/status/${encodeURIComponent("a/b+c?d")}`);
    assert.equal(res.status, "sent");
    assert.equal(res.secondsRemaining, 600);
  });

  it("rejects empty token without any request", async () => {
    await assert.rejects(client().otp.status("  "), (e: any) => e.code === "INVALID_ARGUMENT");
    assert.equal(seen.length, 0);
  });
});

// ─── 10-11. errors ──────────────────────────────────────────────────────────
describe("errors", () => {
  it("401 → WaniError with isAuthenticationError", async () => {
    behavior = () => jsonRes(401, { ok: false, error: "bad key" });
    await assert.rejects(client().otp.status("t"), (e: any) => {
      assert.ok(e instanceof WaniError);
      assert.equal(e.status, 401);
      assert.ok(e.isAuthenticationError);
      assert.ok(!e.isRateLimitError);
      return true;
    });
  });

  it("429 → WaniError with isRateLimitError", async () => {
    behavior = () => jsonRes(429, { ok: false, error: "slow down", retryAfter: 30 });
    await assert.rejects(client().otp.send({ phone: "2010", templateId: "t" }), (e: any) => {
      assert.ok(e instanceof WaniError && e.isRateLimitError);
      return true;
    });
  });

  it("API error code propagates (e.g. TEMPLATE_NOT_APPROVED)", async () => {
    behavior = () =>
      jsonRes(400, { ok: false, error: "not approved", code: "TEMPLATE_NOT_APPROVED" });
    await assert.rejects(client().otp.send({ phone: "2010", templateId: "t" }), (e: any) => {
      assert.ok(e instanceof WaniError);
      assert.equal(e.status, 400);
      assert.equal(e.code, "TEMPLATE_NOT_APPROVED");
      assert.equal(e.message, "not approved");
      return true;
    });
  });

  it("non-JSON HTTP error becomes a WaniError with status", async () => {
    behavior = () => ({
      ok: false,
      status: 503,
      headers: { get: () => null },
      json: async () => {
        throw new Error("bad json");
      },
    });
    await assert.rejects(client().otp.status("t"), (e: any) => {
      assert.ok(e instanceof WaniError && e.status === 503);
      return true;
    });
  });

  it("error never contains the api key", async () => {
    behavior = () => jsonRes(500, { ok: false, error: "boom" });
    await assert.rejects(client().otp.status("t"), (e: any) => {
      assert.ok(!JSON.stringify(e).includes("wani_live_test_key"));
      return true;
    });
  });
});

// ─── 12. timeout / abort ────────────────────────────────────────────────────
describe("timeout & abort", () => {
  it("own timeout fires → TIMEOUT + isTimeoutError", async () => {
    const hanging = new Wani({
      apiKey: "k",
      timeoutMs: 20,
      // Simulates real fetch: rejects when its signal aborts.
      fetch: ((_url: any, init: any) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const err: any = new Error("This operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        })) as any,
    });
    await assert.rejects(hanging.otp.status("t"), (e: any) => {
      assert.ok(e instanceof WaniError);
      assert.equal(e.code, "TIMEOUT");
      assert.ok(e.isTimeoutError);
      return true;
    });
  });

  it("caller AbortSignal aborts → ABORTED", async () => {
    const controller = new AbortController();
    const wani = new Wani({
      apiKey: "k",
      fetch: ((_url: any, init: any) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const err: any = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        })) as any,
    });
    const pending = wani.otp.status("t", { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, (e: any) => {
      assert.ok(e instanceof WaniError && e.code === "ABORTED");
      return true;
    });
  });
});

// ─── Regression: never a Meta client ────────────────────────────────────────
describe("no-Meta-payload regression", () => {
  it("never calls graph.facebook.com and never sends provider fields", async () => {
    behavior = (url: string) => {
      if (url.endsWith("/otp/send")) {
        return jsonRes(200, { ok: true, token: "tok", expiresAt: "2030-01-01T00:00:00.000Z" });
      }
      if (url.endsWith("/otp/verify")) {
        return jsonRes(200, { ok: true, verified: true });
      }
      return jsonRes(200, { ok: true, token: "tok", status: "sent" });
    };
    const wani = client();
    await wani.otp.send({ phone: "201012345678", templateId: "tpl_1", expiryMinutes: 10 });
    await wani.otp.verify({ token: "t", code: "1" });
    await wani.otp.status("t");

    for (const call of seen) {
      assert.ok(call.url.startsWith(DEFAULT_BASE_URL), `unexpected host: ${call.url}`);
      assert.ok(!call.url.includes("graph.facebook.com"), `meta host leaked: ${call.url}`);
      const rawBody: string | undefined = call.init.body;
      if (rawBody) {
        const parsed = JSON.parse(rawBody);
        for (const forbidden of [
          "messaging_product",
          "recipient_type",
          "accessToken",
          "access_token",
          "phoneNumberId",
          "components",
          "template_id",
        ]) {
          assert.ok(!(forbidden in parsed), `provider field leaked into SDK payload: ${forbidden}`);
        }
      }
    }
  });

  it("sendAndVerify only touches Wani endpoints", async () => {
    let n = 0;
    behavior = () => {
      n += 1;
      return n === 1
        ? jsonRes(200, { ok: true, token: "tok", expiresAt: "2030-01-01T00:00:00.000Z" })
        : jsonRes(200, { ok: true, verified: true });
    };
    const wani = client();
    const res = await wani.otp.sendAndVerify({ phone: "2010", templateId: "t" }, "123456");
    assert.equal(res.sent.token, "tok");
    assert.equal(res.verification.verified, true);
    assert.deepEqual(
      seen.map((s) => s.url),
      [`${DEFAULT_BASE_URL}/api/developers/otp/send`, `${DEFAULT_BASE_URL}/api/developers/otp/verify`]
    );
  });
});
