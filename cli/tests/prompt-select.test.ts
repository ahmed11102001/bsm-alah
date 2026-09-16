import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { renderSelectFrame, promptSelect } from "../src/utils/prompt.js";

describe("renderSelectFrame (pure)", () => {
  const options = [
    { label: "wani_otp", detail: "cmu4kx1 · developer" },
    { label: "نتت", detail: "cmtoiuof · developer" },
  ];

  it("marks the selected row with ❯ and highlights it", () => {
    const frame = renderSelectFrame("Select a project", options, 1);
    const rows = frame.split("\n");
    assert.equal(rows[0], "Select a project");
    assert.ok(rows[1]?.startsWith("  "), "first row unselected");
    assert.ok(rows[2]?.startsWith("❯"), "second row selected");
    assert.ok(rows[2]?.includes("نتت"));
    assert.ok(frame.includes("Enter to select"));
  });

  it("shows details dimmed after the label", () => {
    const frame = renderSelectFrame("Q", options, 0);
    assert.ok(frame.includes("cmu4kx1 · developer"));
  });

  it("selection wraps visually on first row", () => {
    const frame = renderSelectFrame("Q", options, 0);
    const rows = frame.split("\n");
    assert.ok(rows[1]?.startsWith("❯"));
    assert.ok(rows[2]?.startsWith("  "));
  });
});

describe("promptSelect (edge cases, no TTY needed)", () => {
  it("empty options → null without prompting", async () => {
    assert.equal(await promptSelect("Q", []), null);
  });

  it("single option → 0 without prompting", async () => {
    assert.equal(await promptSelect("Q", [{ label: "only" }]), 0);
  });
});
