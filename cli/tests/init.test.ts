import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { runInit, spawnWithoutShell } from "../src/commands/init/init.js";
import type { CommandContext } from "../src/commands/context.js";
import type { CliConfig } from "../src/config/config.js";
import { parseArgs } from "../src/utils/args.js";
import { CliError } from "../src/api/errors.js";

function jsonRes(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  };
}

const __origStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = ((chunk: unknown) => true) as typeof process.stdout.write;
after(() => {
  process.stdout.write = __origStdoutWrite;
});

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wani-init-test-"));
}

function testContext(
  config: Partial<CliConfig> & { apiKeys: Record<string, string> },
  behavior: (url: string, init?: any) => unknown
): CommandContext {
  const fetchImpl = (async (url: any, init?: any) => jsonRes(200, behavior(String(url), init))) as any;
  return {
    config: { version: 2, ...config, apiKeys: config.apiKeys },
    saveConfig: () => undefined,
    baseUrl: "https://api.test",
    timeoutMs: 1000,
    json: false,
    fetchImpl,
  };
}

function codegenBehavior(url: string) {
  if (url.endsWith("/cli/codegen")) {
    return { ok: true, language: "javascript", framework: "node", operation: "send", endpoint: "/api/developers/otp/send", code: "// generated\n" };
  }
  throw new Error(`unexpected request: ${url}`);
}

describe("spawnWithoutShell (no DEP0190, no shell injection)", () => {
  it("runs node --version cleanly without a shell", () => {
    const res = spawnWithoutShell(process.execPath, ["--version"], "pipe");
    assert.equal(res.status, 0);
    assert.match(res.stdout ?? "", /^v\d+\./);
    assert.ok(!(res.stderr ?? "").includes("DEP0190"));
  });
});

describe("wani init", () => {
  it("detects Next.js, writes lib/wani.ts, installs SDK, configures env+gitignore", async () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ dependencies: { next: "^14.0.0" } }));
    fs.writeFileSync(path.join(cwd, "tsconfig.json"), "{}");
    const installs: string[][] = [];
    const ctx = testContext({ apiKeys: {}, currentProjectId: "p1", cliAccessToken: "tok" }, codegenBehavior);

    await runInit(ctx, parseArgs(["--template-id", "tpl_1"]), {
      cwd,
      install: (pm, args) => {
        installs.push([pm, ...args]);
        return { ok: true };
      },
    });

    assert.equal(fs.readFileSync(path.join(cwd, "lib", "wani.ts"), "utf8"), "// generated\n");
    // Thin SDK routes are generated locally (no extra fetches).
    const sendRoute = fs.readFileSync(path.join(cwd, "app", "api", "otp", "send", "route.ts"), "utf8");
    const verifyRoute = fs.readFileSync(path.join(cwd, "app", "api", "otp", "verify", "route.ts"), "utf8");
    assert.match(sendRoute, /from "\.\.\/\.\.\/\.\.\/lib\/wani"/);
    assert.match(sendRoute, /sendOtp/);
    assert.match(verifyRoute, /verifyOtp/);
    assert.match(verifyRoute, /Response\.json/);
    assert.deepEqual(installs, [["npm", "install", "@aiwni/sdk"]]);
    assert.match(fs.readFileSync(path.join(cwd, ".env.local"), "utf8"), /WANI_API_KEY=your_project_api_key/);
    assert.match(fs.readFileSync(path.join(cwd, ".gitignore"), "utf8"), /\.env\.local/);
  });

  it("honors src/ layout for Next.js projects", async () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ dependencies: { next: "^14.0.0" } }));
    fs.mkdirSync(path.join(cwd, "src", "app"), { recursive: true });
    const ctx = testContext({ apiKeys: {}, cliAccessToken: "tok" }, codegenBehavior);

    await runInit(ctx, parseArgs(["--template-id", "t", "--no-install"]), {
      cwd,
      install: () => ({ ok: true }),
    });

    assert.ok(fs.existsSync(path.join(cwd, "src", "lib", "wani.js")));
    assert.ok(fs.existsSync(path.join(cwd, "src", "app", "api", "otp", "send", "route.js")));
    assert.ok(!fs.existsSync(path.join(cwd, "lib", "wani.js")));
  });

  it("prints project, template, files and next steps", async () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ dependencies: {} }));
    const lines: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown) => { lines.push(String(chunk)); return true; }) as typeof process.stdout.write;
    try {
      const ctx = testContext(
        { apiKeys: {}, currentProjectId: "p1", cliAccessToken: "tok" },
        (url) => {
          if (url.endsWith("/projects")) return { projects: [{ id: "p1", name: "My Store" }] };
          if (url.endsWith("/otp-templates")) {
            return { templates: [{ id: "tpl_9", name: "wani_otp_test", language: "ar", status: "APPROVED" }] };
          }
          return codegenBehavior(url);
        }
      );
      await runInit(ctx, parseArgs(["--no-install"]), {
        cwd,
        install: () => ({ ok: true }),
      });
    } finally {
      process.stdout.write = origWrite;
    }
    const out = lines.join("");
    assert.match(out, /Detected Node\.js/);
    assert.match(out, /Connected to Wani project: My Store/);
    assert.match(out, /Selected OTP template: wani_otp_test/);
    assert.match(out, /Created:\s+wani\.mjs/);
    assert.match(out, /Integration ready\./);
    assert.match(out, /wani otp test/);
  });

  it("refuses to overwrite without --force, overwrites with it", async () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ dependencies: {} }));
    fs.writeFileSync(path.join(cwd, "wani.mjs"), "// existing\n");
    const ctx = testContext({ apiKeys: {}, cliAccessToken: "tok" }, codegenBehavior);

    await assert.rejects(
      runInit(ctx, parseArgs(["--template-id", "t", "--no-install"]), { cwd, install: () => ({ ok: true }) }),
      (e: any) => e instanceof CliError && /--force/.test(e.message)
    );
    assert.equal(fs.readFileSync(path.join(cwd, "wani.mjs"), "utf8"), "// existing\n");

    await runInit(ctx, parseArgs(["--template-id", "t", "--no-install", "--force"]), {
      cwd,
      install: () => {
        throw new Error("must not install with --no-install");
      },
    });
    assert.equal(fs.readFileSync(path.join(cwd, "wani.mjs"), "utf8"), "// generated\n");
  });

  it("writes an explicit --api-key value, never invents one", async () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ dependencies: {} }));
    const ctx = testContext({ apiKeys: {}, cliAccessToken: "tok" }, codegenBehavior);
    await runInit(ctx, parseArgs(["--template-id", "t", "--no-install", "--api-key", "wani_live_real"]), {
      cwd,
      install: () => ({ ok: true }),
    });
    assert.match(fs.readFileSync(path.join(cwd, ".env"), "utf8"), /WANI_API_KEY=wani_live_real/);
  });

  it("requires login before generating", async () => {
    const cwd = tmpDir();
    const ctx = testContext({ apiKeys: {} }, codegenBehavior);
    await assert.rejects(
      runInit(ctx, parseArgs(["--framework", "node", "--template-id", "t", "--no-install"]), { cwd }),
      (e: any) => e instanceof CliError && e.kind === "auth"
    );
  });

  it("rejects unknown --framework values", async () => {
    const cwd = tmpDir();
    const ctx = testContext({ apiKeys: {}, cliAccessToken: "tok" }, codegenBehavior);
    await assert.rejects(
      runInit(ctx, parseArgs(["--framework", "cobol", "--template-id", "t"]), { cwd }),
      (e: any) => e instanceof CliError && e.exitCode === 2
    );
  });
});
