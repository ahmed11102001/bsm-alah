import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { loadConfig, resolveBaseUrl, saveConfig } from "../src/config/config.js";
import { configFilePath } from "../src/config/paths.js";

function isolatedHome(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wani-cli-test-"));
  process.env["WANI_CONFIG_HOME"] = dir;
  return dir;
}

describe("config", () => {
  beforeEach(() => {
    isolatedHome();
    delete process.env["WANI_BASE_URL"];
  });

  it("round-trips profile with 0600 file permissions", () => {
    saveConfig({
      version: 1,
      baseUrl: "https://example.test",
      sessionCookie: "abc",
      currentProjectId: "p1",
      apiKeys: { p1: "wani_live_x" },
    });
    const loaded = loadConfig();
    assert.equal(loaded.baseUrl, "https://example.test");
    assert.equal(loaded.sessionCookie, "abc");
    assert.equal(loaded.currentProjectId, "p1");
    assert.deepEqual(loaded.apiKeys, { p1: "wani_live_x" });
    if (process.platform !== "win32") {
      const mode = fs.statSync(configFilePath()).mode & 0o777;
      assert.equal(mode, 0o600);
    }
  });

  it("missing or corrupt file yields an empty profile", () => {
    assert.deepEqual(loadConfig().apiKeys, {});
    fs.mkdirSync(path.dirname(configFilePath()), { recursive: true });
    fs.writeFileSync(configFilePath(), "{not json", "utf8");
    const loaded = loadConfig();
    assert.equal(loaded.sessionCookie, undefined);
    assert.deepEqual(loaded.apiKeys, {});
  });

  it("drops non-string apiKeys entries", () => {
    fs.mkdirSync(path.dirname(configFilePath()), { recursive: true });
    fs.writeFileSync(
      configFilePath(),
      JSON.stringify({ version: 1, apiKeys: { p1: "k", p2: 42, p3: "" } }),
      "utf8"
    );
    assert.deepEqual(loadConfig().apiKeys, { p1: "k" });
  });

  it("resolveBaseUrl precedence: flag > env > stored > default", () => {
    const config = { version: 1 as const, apiKeys: {}, baseUrl: "https://stored.test" };
    assert.equal(
      resolveBaseUrl({ flag: "https://flag.test/", config, fallback: "https://d.test" }),
      "https://flag.test"
    );
    process.env["WANI_BASE_URL"] = "https://env.test/";
    assert.equal(resolveBaseUrl({ config, fallback: "https://d.test" }), "https://env.test");
    delete process.env["WANI_BASE_URL"];
    assert.equal(resolveBaseUrl({ config, fallback: "https://d.test" }), "https://stored.test");
    assert.equal(resolveBaseUrl({ fallback: "https://d.test" }), "https://d.test");
  });
});
