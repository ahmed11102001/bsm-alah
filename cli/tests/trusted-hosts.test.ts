import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { CliError } from "../src/api/errors.js";
import { assertTrustedBaseUrl } from "../src/api/trusted-hosts.js";

describe("assertTrustedBaseUrl", () => {
  it("accepts the official production host (https only)", () => {
    assert.equal(assertTrustedBaseUrl("https://developers.aiwni.com"), "https://developers.aiwni.com");
    assert.equal(assertTrustedBaseUrl("https://developers.aiwni.com/"), "https://developers.aiwni.com");
    assert.throws(() => assertTrustedBaseUrl("http://developers.aiwni.com"), (e: any) => e instanceof CliError);
  });

  it("rejects arbitrary external hosts (credential-leak guard)", () => {
    for (const url of [
      "https://attacker.example",
      "https://developers-aiwni.com",
      "https://developers.aiwni.com.evil.test",
      "http://192.168.1.10",
      "not-a-url",
    ]) {
      assert.throws(() => assertTrustedBaseUrl(url), (e: any) => e instanceof CliError, url);
    }
  });

  it("rejects loopback without explicit dev mode", () => {
    delete process.env["WANI_DEV"];
    assert.throws(() => assertTrustedBaseUrl("http://localhost:3000"), (e: any) => e instanceof CliError);
    assert.throws(() => assertTrustedBaseUrl("http://127.0.0.1:3000"), (e: any) => e instanceof CliError);
  });

  it("allows loopback with --dev flag or WANI_DEV=1", () => {
    delete process.env["WANI_DEV"];
    assert.equal(
      assertTrustedBaseUrl("http://localhost:3000/", { dev: true }),
      "http://localhost:3000"
    );
    process.env["WANI_DEV"] = "1";
    assert.equal(assertTrustedBaseUrl("http://127.0.0.1:4000"), "http://127.0.0.1:4000");
    delete process.env["WANI_DEV"];
  });
});
