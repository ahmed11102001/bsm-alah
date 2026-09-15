import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isHelpRequest, isJsonOutput, optString, parseArgs } from "../src/utils/args.js";

describe("parseArgs", () => {
  it("parses command path, flags and positionals", () => {
    const parsed = parseArgs(["otp", "send", "--phone", "2010", "--template-id", "t1", "extra"]);
    assert.deepEqual(parsed.command, ["otp", "send"]);
    assert.deepEqual(parsed.positional, ["extra"]);
    assert.equal(parsed.options["phone"], "2010");
    assert.equal(parsed.options["template-id"], "t1");
  });

  it("supports --flag=value and boolean flags", () => {
    const parsed = parseArgs(["project", "list", "--json", "--timeout=5000"]);
    assert.equal(parsed.options["json"], true);
    assert.equal(parsed.options["timeout"], "5000");
    assert.ok(isJsonOutput(parsed.options));
  });

  it("supports -j shorthand and help detection", () => {
    assert.ok(isJsonOutput(parseArgs(["otp", "status", "-j"]).options));
    assert.ok(isHelpRequest(parseArgs(["--help"]).options, []));
    assert.ok(isHelpRequest(parseArgs(["otp"]).options, ["help"]));
    assert.ok(!isHelpRequest(parseArgs(["otp", "send"]).options, []));
  });

  it("optString tries aliases in order", () => {
    assert.equal(optString({ "template-id": "a" }, "template-id", "templateId"), "a");
    assert.equal(optString({ templateId: "b" }, "template-id", "templateId"), "b");
    assert.equal(optString({}, "template-id", "templateId"), undefined);
    assert.equal(optString({ json: true }, "json"), undefined);
  });
});
