import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { decryptSecret, encryptSecret, isEncryptedValue } from "../src/auth/secure-store.js";
import { loadConfig, saveConfig } from "../src/config/config.js";
import { configFilePath } from "../src/config/paths.js";

function isolatedHome(): void {
  process.env["WANI_CONFIG_HOME"] = fs.mkdtempSync(path.join(os.tmpdir(), "wani-cli-sec-"));
}

describe("secure-store", () => {
  beforeEach(() => {
    isolatedHome();
  });

  it("round-trips secrets and never double-wraps", () => {
    const enc = encryptSecret("wani_live_secret");
    assert.ok(isEncryptedValue(enc));
    assert.equal(decryptSecret(enc), "wani_live_secret");
    assert.equal(encryptSecret(enc), enc);
    assert.ok(!isEncryptedValue("wani_live_plain"));
  });

  it("ciphertext differs per encryption (random IV)", () => {
    assert.notEqual(encryptSecret("same"), encryptSecret("same"));
  });

  it("config file on disk contains no plaintext secrets", () => {
    saveConfig({
      version: 2,
      cliAccessToken: "cli-token-value",
      currentProjectId: "p1",
      apiKeys: { p1: "wani_live_keyvalue" },
    });
    const raw = fs.readFileSync(configFilePath(), "utf8");
    assert.ok(!raw.includes("cli-token-value"));
    assert.ok(!raw.includes("wani_live_keyvalue"));
    // ...but loading restores usable values
    const loaded = loadConfig();
    assert.equal(loaded.cliAccessToken, "cli-token-value");
    assert.deepEqual(loaded.apiKeys, { p1: "wani_live_keyvalue" });
  });

  it("migrates legacy plaintext configs transparently", () => {
    fs.mkdirSync(path.dirname(configFilePath()), { recursive: true });
    fs.writeFileSync(
      configFilePath(),
      JSON.stringify({ version: 2, cliAccessToken: "old-plain", apiKeys: { p: "wani_live_old" } }),
      "utf8"
    );
    const loaded = loadConfig();
    assert.equal(loaded.cliAccessToken, "old-plain");
    saveConfig(loaded);
    const raw = fs.readFileSync(configFilePath(), "utf8");
    assert.ok(!raw.includes("old-plain"));
    assert.ok(!raw.includes("wani_live_old"));
  });

  it("undecryptable values are dropped, not fatal", () => {
    fs.mkdirSync(path.dirname(configFilePath()), { recursive: true });
    fs.writeFileSync(
      configFilePath(),
      JSON.stringify({ version: 2, cliAccessToken: "enc:v1:bm90LXZhbGlk", apiKeys: {} }),
      "utf8"
    );
    assert.equal(loadConfig().cliAccessToken, undefined);
  });
});
