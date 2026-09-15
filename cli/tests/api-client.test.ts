import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { ApiClient, extractSessionCookie } from "../src/api/client.js";
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
  it("sends session cookie and x-api-key headers", async () => {
    const seen: Seen[] = [];
    const fetchImpl = (async (url: any, init?: any) => {
      seen.push({ url: String(url), init });
      return jsonRes(200, { ok: true });
    }) as any;
    const client = new ApiClient({
      baseUrl: "https://api.test/",
      timeoutMs: 1000,
      fetchImpl,
      sessionCookie: "sess123",
      apiKey: "wani_live_x",
    });
    await client.post("/api/x", { a: 1 });
    assert.equal(seen[0].url, "https://api.test/api/x");
    assert.equal(seen[0].init.headers["Cookie"], "dev-session=sess123");
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

  it("extractSessionCookie parses single and array headers", () => {
    assert.equal(extractSessionCookie("dev-session=abc; Path=/; HttpOnly"), "abc");
    assert.equal(extractSessionCookie(["a=1", "dev-session=xyz; Secure"]), "xyz");
    assert.equal(extractSessionCookie(null), undefined);
    assert.equal(extractSessionCookie("other=1"), undefined);
  });
});
