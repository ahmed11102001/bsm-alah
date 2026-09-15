import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

import { isMainModule } from "../src/index.js";
import { CLI_NAME, CLI_VERSION } from "../src/constants.js";

/**
 * Regression tests for ESM entrypoint detection.
 *
 * The old implementation compared `import.meta.url` against a hand-built
 * `file://` URL from `process.argv[1]`. That breaks whenever argv[1] reaches
 * the file through a symlink (npm link / global shims): argv keeps the link
 * path while import.meta.url is already realpath-resolved — so `main()` never
 * ran and `wani --version` printed nothing.
 */
describe("isMainModule", () => {
  it("is false for a non-entrypoint import (this test file)", () => {
    // Under `node --test`, argv[1] is the test runner/file — never index.js.
    assert.equal(isMainModule(), false);
  });

  it("is true when argv[1] is the defining module's own file", () => {
    // isMainModule compares the file of the module that *defines* it
    // (src/index.js) against argv[1] by canonical real path.
    const here = path.dirname(fileURLToPath(import.meta.url));
    const indexFile = path.resolve(here, "../src/index.js");
    const original = process.argv[1];
    try {
      process.argv[1] = indexFile;
      assert.equal(isMainModule(), true);
      process.argv[1] = path.join(here, "definitely-not-index.js");
      assert.equal(isMainModule(), false);
    } finally {
      process.argv[1] = original;
    }
  });
});

describe("built CLI entrypoint", () => {
  it("node dist/index.js --version prints the version", () => {
    const distEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../dist/index.js");
    if (!existsSync(distEntry)) {
      console.log("skip: dist/index.js not built");
      return;
    }
    const res = spawnSync(process.execPath, [distEntry, "--version"], { encoding: "utf8" });
    assert.equal(res.status, 0);
    assert.match(res.stdout, new RegExp(`${CLI_NAME} ${CLI_VERSION}`));
  });
});
