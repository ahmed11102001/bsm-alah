import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { resolveProjectApiKey } from "../src/auth/credentials.js";
import { authorizePageUrl } from "../src/auth/browser-login.js";
import { CliError } from "../src/api/errors.js";
import type { CliConfig } from "../src/config/config.js";

const baseConfig: CliConfig = { version: 2, apiKeys: { projA: "wani_live_stored" } };

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

describe("authorizePageUrl", () => {
  it("strips the /developers prefix on dev-subdomain hosts", () => {
    assert.equal(
      authorizePageUrl("https://developers.aiwni.com", "/developers/cli/authorize"),
      "https://developers.aiwni.com/cli/authorize"
    );
    assert.equal(
      authorizePageUrl("http://developers.localhost:3000", "/developers/cli/authorize"),
      "http://developers.localhost:3000/cli/authorize"
    );
  });

  it("keeps the full path on other hosts", () => {
    assert.equal(
      authorizePageUrl("http://localhost:3000/", "/developers/cli/authorize"),
      "http://localhost:3000/developers/cli/authorize"
    );
  });

  it("passes absolute URLs through untouched", () => {
    assert.equal(
      authorizePageUrl("http://localhost:3000", "https://developers.aiwni.com/cli/authorize"),
      "https://developers.aiwni.com/cli/authorize"
    );
  });
});
