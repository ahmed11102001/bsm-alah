import { describe, it, after } from "node:test";
import assert from "node:assert/strict";

import { setupCommand } from "../src/commands/setup.js";
import type { CommandContext } from "../src/commands/context.js";
import type { CliConfig } from "../src/config/config.js";
import { parseArgs } from "../src/utils/args.js";
import { CliError } from "../src/api/errors.js";

const __origStdoutWrite = process.stdout.write.bind(process.stdout);
let captured = "";
process.stdout.write = ((chunk: unknown) => {
  captured += String(chunk);
  return true;
}) as typeof process.stdout.write;
after(() => {
  process.stdout.write = __origStdoutWrite;
});

function testContext(): CommandContext {
  return {
    config: { version: 2, apiKeys: {} },
    saveConfig: () => undefined,
    baseUrl: "https://api.test",
    timeoutMs: 1000,
    json: false,
  };
}

describe("wani setup", () => {
  it("needs an interactive terminal", async () => {
    const orig = process.stdin.isTTY;
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });
    try {
      await assert.rejects(setupCommand(testContext(), parseArgs([])), (e: any) => e instanceof CliError);
    } finally {
      Object.defineProperty(process.stdin, "isTTY", { value: orig, configurable: true });
    }
  });

  it("shows the menu and exits on 5 (invalid choices re-prompt)", async () => {
    const orig = process.stdin.isTTY;
    Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
    const answers = ["9", "5"];
    try {
      captured = "";
      await setupCommand(testContext(), parseArgs([]), {
        prompt: async () => answers.shift() ?? "5",
      });
      assert.match(captured, /Welcome to Wani/);
      assert.match(captured, /Pick a number between 1 and 5/);
      assert.match(captured, /wani --help/);
    } finally {
      Object.defineProperty(process.stdin, "isTTY", { value: orig, configurable: true });
    }
  });
});
