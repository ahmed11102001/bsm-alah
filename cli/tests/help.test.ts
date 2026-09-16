import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

/**
 * Help routing tests. Help paths return before any network access, so they
 * are safe to exercise against the real built entrypoint via spawn.
 */
function distEntry(): string | null {
  const entry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../dist/index.js");
  if (!existsSync(entry)) {
    console.log("skip: dist/index.js not built");
    return null;
  }
  return entry;
}

function runHelp(entry: string, args: string[]): { status: number | null; stdout: string } {
  const res = spawnSync(process.execPath, [entry, ...args], { encoding: "utf8" });
  return { status: res.status, stdout: res.stdout ?? "" };
}

describe("wani --help routing", () => {
  const cases: { args: string[]; expect: RegExp }[] = [
    { args: ["--help"], expect: /Scaffold a Wani integration/ },
    { args: [], expect: /Usage:/ },
    { args: ["login", "--help"], expect: /device flow/ },
    { args: ["logout", "--help"], expect: /--all/ },
    { args: ["whoami", "--help"], expect: /logged-in developer account/ },
    { args: ["project", "--help"], expect: /project use/ },
    { args: ["init", "--help"], expect: /--force/ },
    { args: ["setup", "--help"], expect: /first-run/ },
    { args: ["otp", "--help"], expect: /wani otp test/ },
    { args: ["otp", "send", "--help"], expect: /--template-id/ },
    { args: ["otp", "verify", "--help"], expect: /--code/ },
    { args: ["otp", "status", "--help"], expect: /positionally/ },
    { args: ["otp", "test", "--help"], expect: /end-to-end/ },
    { args: ["help", "init"], expect: /--force/ },
    { args: ["frobnicate", "--help"], expect: /Usage:/ },
  ];

  for (const { args, expect } of cases) {
    it(`wani ${args.join(" ") || "(bare)"} prints the right topic`, () => {
      const entry = distEntry();
      if (!entry) return;
      const { status, stdout } = runHelp(entry, args);
      assert.equal(status, 0);
      assert.match(stdout, expect);
    });
  }
});
