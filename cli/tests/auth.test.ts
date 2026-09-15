import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { extractSessionCookieFromLogin } from "../src/auth/session.js";
import { resolveProjectApiKey } from "../src/auth/credentials.js";
import { apiKeysPageUrl } from "../src/auth/browser-login.js";
import { CliError } from "../src/api/errors.js";
import type { CliConfig } from "../src/config/config.js";

const baseConfig: CliConfig = { version: 1, apiKeys: { projA: "wani_live_stored" } };

describe("session cookie extraction", () => {
  it("handles single header, arrays and absence", () => {
    assert.equal(extractSessionCookieFromLogin("dev-session=tok123; Path=/; HttpOnly"), "tok123");
    assert.equal(extractSessionCookieFromLogin(["x=1", "dev-session=t2; Secure"]), "t2");
    assert.equal(extractSessionCookieFromLogin(null), undefined);
    assert.equal(extractSessionCookieFromLogin("other=1"), undefined);
  });
});

describe("resolveProjectApiKey", () => {
  it("precedence: flag > env > stored", () => {
    process.env["WANI_API_KEY"] = "wani_live_env";
    assert.deepEqual(
      resolveProjectApiKey({ flag: "wani_live_flag", config: baseConfig, projectId: "projA" }),
      { apiKey: "wani_live_flag", source: "flag" }
    );
    assert.deepEqual(
      resolveProjectApiKey({ config: baseConfig, projectId: "projA" }),
      { apiKey: "wani_live_env", source: "env" }
    );
    delete process.env["WANI_API_KEY"];
    assert.deepEqual(
      resolveProjectApiKey({ config: baseConfig, projectId: "projA" }),
      { apiKey: "wani_live_stored", source: "stored" }
    );
  });

  it("throws auth CliError when no key is available", () => {
    delete process.env["WANI_API_KEY"];
    assert.throws(
      () => resolveProjectApiKey({ config: baseConfig, projectId: "unknown" }),
      (err: any) => err instanceof CliError && err.kind === "auth"
    );
  });
});

describe("browser login helper", () => {
  it("points at the portal api-keys page", () => {
    assert.equal(apiKeysPageUrl("https://developers.aiwni.com"), "https://developers.aiwni.com/portal/api-keys");
    assert.equal(apiKeysPageUrl("http://localhost:3000/"), "http://localhost:3000/portal/api-keys");
  });
});
