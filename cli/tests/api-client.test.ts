import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { ApiClient } from "../src/api/client.js";
import { CliError } from "../src/api/errors.js";

interface Seen {
  url: string;
  init: any;
}

function jsonRes(status: number, body: unknown, setCookie?: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name === "set-cookie" ? setCookie ?? null : null) },
    json: async () => body,
  };
}

describe("ApiClient", () => {
  it("sends Bearer token and x-api-key headers (never cookies)", async () => {
    const seen: Seen[] = [];
    const fetchImpl = (async (url: any, init?: any) => {
      seen.push({ url: String(url), init });
      return jsonRes(200, { ok: true });
    }) as any;
    const client = new ApiClient({
      baseUrl: "https://api.test/",
      timeoutMs: 1000,
      fetchImpl,
      accessToken: "tok123",
      apiKey: "wani_live_x",
    });
    await client.post("/api/x", { a: 1 });
    assert.equal(seen[0].url, "https://api.test/api/x");
    assert.equal(seen[0].init.headers["Authorization"], "Bearer tok123");
    assert.equal(seen[0].init.headers["Cookie"], undefined);
    assert.equal(seen[0].init.headers["x-api-key"], "wani_live_x");
    assert.deepEqual(JSON.parse(seen[0].init.body), { a: 1 });
  });

  it("maps 401 to an auth CliError and propagates API codes", async () => {
    const fetchImpl = (async () =>
      jsonRes(401, { ok: false, error: "bad", code: "INVALID_API_KEY" })) as any;
    const client = new ApiClient({ baseUrl: "https://api.test", timeoutMs: 1000, fetchImpl });
    await assert.rejects(client.get("/x"), (err: any) => {
      assert.ok(err instanceof CliError);
      assert.equal(err.status, 401);
      assert.equal(err.kind, "auth");
      assert.equal(err.code, "INVALID_API_KEY");
      return true;
    });
  });

  it("normalizes {ok:false} on HTTP 200", async () => {
    const fetchImpl = (async () => jsonRes(200, { ok: false, error: "nope", code: "X" })) as any;
    const client = new ApiClient({ baseUrl: "https://api.test", timeoutMs: 1000, fetchImpl });
    await assert.rejects(client.get("/x"), (err: any) => err instanceof CliError && err.code === "X");
  });

  it("own timeout produces a timeout CliError", async () => {
    const fetchImpl = ((_: any, init?: any) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
      })) as any;
    const client = new ApiClient({ baseUrl: "https://api.test", timeoutMs: 20, fetchImpl });
    await assert.rejects(client.get("/x"), (err: any) => err instanceof CliError && err.code === "TIMEOUT");
  });

  it("sends no auth headers when no credentials are set", async () => {
    const seen: Seen[] = [];
    const fetchImpl = (async (url: any, init?: any) => {
      seen.push({ url: String(url), init });
      return jsonRes(200, { ok: true });
    }) as any;
    const client = new ApiClient({ baseUrl: "https://api.test", timeoutMs: 1000, fetchImpl });
    await client.get("/x");
    assert.equal(seen[0].init.headers["Authorization"], undefined);
    assert.equal(seen[0].init.headers["Cookie"], undefined);
  });
});
