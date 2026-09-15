/**
 * `wani init` — scaffold a Wani OTP integration inside the developer's project.
 *
 *   wani init [--framework <id>] [--template-id <id> | --template <name>]
 *             [--api-key <key>] [--force] [--no-install] [--json]
 *
 * Flow: detect framework → resolve template → fetch generated integration
 * from the official portal codegen API (single source of truth, same
 * generator the portal Quick Start uses) → write one integration file →
 * install @aiwni/sdk (JS/TS only) → configure env placeholder → gitignore
 * check. Never writes a real key unless --api-key is passed explicitly, and
 * never overwrites without --force. React/browser code never receives the key.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { ApiClient } from "../../api/client.js";
import { CliError } from "../../api/errors.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CommandContext } from "../context.js";
import { optString, type ParsedArgs } from "../../utils/args.js";
import { printJson } from "../../output/json.js";
import { printLine } from "../../output/human.js";
import { promptText } from "../../utils/prompt.js";
import {
  detectStacks,
  realFsProbe,
  stackFromFrameworkId,
  FRAMEWORK_CHOICES,
  type DetectedStack,
  type InitFramework,
} from "./detect.js";
import {
  chooseTemplateIndex,
  fetchApprovedTemplates,
  type OtpTemplateOption,
} from "../otp/templates.js";

export interface InitDeps {
  cwd?: string | undefined;
  install?: ((packageManager: string, args: string[]) => { ok: boolean; error?: string }) | undefined;
  prompt?: ((question: string) => Promise<string>) | undefined;
}

interface Target {
  file: string;
  envFile: string | null;
  needsSdkInstall: boolean;
  tsExtension: "ts" | "tsx" | "js" | "jsx" | "mjs" | "py" | "php" | "sh";
}

function targetFor(stack: DetectedStack): Target {
  switch (stack.framework) {
    case "next":
      return { file: stack.typescript ? "lib/wani.ts" : "lib/wani.js", envFile: ".env.local", needsSdkInstall: true, tsExtension: stack.typescript ? "ts" : "js" };
    case "react":
      return { file: stack.typescript ? "src/wani-otp.tsx" : "src/wani-otp.jsx", envFile: ".env.local", needsSdkInstall: true, tsExtension: stack.typescript ? "tsx" : "jsx" };
    case "node":
      return { file: "wani.mjs", envFile: ".env", needsSdkInstall: true, tsExtension: "mjs" };
    case "django":
    case "flask":
    case "fastapi":
      return { file: "wani_otp.py", envFile: ".env", needsSdkInstall: false, tsExtension: "py" };
    case "laravel":
      return { file: "app/Http/Controllers/OtpController.php", envFile: ".env", needsSdkInstall: false, tsExtension: "php" };
    case "symfony":
      return { file: "src/Controller/OtpController.php", envFile: ".env", needsSdkInstall: false, tsExtension: "php" };
    case "shell":
      return { file: "wani-otp.sh", envFile: null, needsSdkInstall: false, tsExtension: "sh" };
  }
}

function detectPackageManager(cwd: string): { name: string; addArgs: string[] } {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return { name: "pnpm", addArgs: ["add"] };
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return { name: "yarn", addArgs: ["add"] };
  return { name: "npm", addArgs: ["install"] };
}

function defaultInstall(packageManager: string, args: string[]): { ok: boolean; error?: string } {
  const res = spawnSync(packageManager, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (res.status === 0) return { ok: true };
  const detail = typeof res.error?.message === "string" ? res.error.message : `exit code ${res.status}`;
  return { ok: false, error: detail };
}

async function pickStack(
  candidates: DetectedStack[],
  prompt: (question: string) => Promise<string>
): Promise<DetectedStack> {
  if (candidates.length === 1 && candidates[0]) {
    printLine(`Detected ${candidates[0].display} (${candidates[0].reason}).`);
    return candidates[0];
  }
  if (!process.stdin.isTTY) {
    const names = candidates.length > 0
      ? candidates.map((c) => c.framework).join(", ")
      : FRAMEWORK_CHOICES.map((c) => c.id).join(", ");
    throw new CliError(
      `Could not pick a single framework automatically. Re-run with --framework <id> (detected: ${names}).`,
      { kind: "usage" }
    );
  }
  const options = candidates.length > 0
    ? candidates.map((c) => ({ framework: c.framework as InitFramework, display: c.display }))
    : FRAMEWORK_CHOICES.map((c) => ({ framework: c.id, display: c.label }));
  printLine("What are you building with?");
  options.forEach((o, i) => printLine(`  ${i + 1}) ${o.display}`));
  const answer = await prompt(`Framework [1]: `);
  const idx = answer.trim() === "" ? 0 : Number(answer.trim()) - 1;
  if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
    throw new CliError(`Pick a number between 1 and ${options.length}.`, { kind: "usage" });
  }
  const picked = options[idx] as { framework: InitFramework; display: string };
  const typescript = candidates.find((c) => c.framework === picked.framework)?.typescript
    ?? fs.existsSync("tsconfig.json");
  return {
    language: FRAMEWORK_CHOICES.find((c) => c.id === picked.framework)?.language ?? "javascript",
    framework: picked.framework,
    typescript,
    display: picked.display,
    reason: "interactive choice",
  };
}

async function resolveInitTemplateId(
  ctx: CommandContext,
  args: ParsedArgs,
  prompt: (question: string) => Promise<string>
): Promise<string | undefined> {
  const templateId = optString(args.options, "template-id", "templateId")?.trim();
  if (templateId) return templateId;
  const templateName = optString(args.options, "template", "template-name", "templateName")?.trim();
  const language = optString(args.options, "language", "lang")?.trim();
  const projectId = optString(args.options, "project")?.trim() || ctx.config.currentProjectId;
  if (!projectId && !templateName) {
    throw new CliError(
      "No project selected and no --template-id given. Run `wani project use <id>` or pass --template-id.",
      { kind: "usage" }
    );
  }
  if (!projectId) {
    throw new CliError("Template lookup needs a project. Run `wani project use <id>` first.", { kind: "usage" });
  }
  const templates = await fetchApprovedTemplates(ctx, projectId);
  if (templates.length === 0) {
    throw new CliError("No approved templates on this project — approve one in the portal first.", { kind: "http" });
  }
  if (templateName) {
    const matches = templates.filter(
      (t) => t.name === templateName && (!language || t.language === language)
    );
    if (matches.length === 1 && matches[0]) return matches[0].id;
    if (matches.length === 0) {
      throw new CliError(`Template "${templateName}" not found among approved templates.`, { kind: "usage" });
    }
    throw new CliError(
      `Template "${templateName}" exists in multiple languages — re-run with --language <code>.`,
      { kind: "usage" }
    );
  }
  if (templates.length === 1 && templates[0]) {
    printLine(`Template: ${templates[0].name} (${templates[0].language})`);
    return templates[0].id;
  }
  if (!process.stdin.isTTY) {
    throw new CliError("Multiple approved templates — re-run with --template-id <id>.", { kind: "usage" });
  }
  printLine("Template:");
  templates.forEach((t: OtpTemplateOption, i: number) => printLine(`  ${i + 1}) ${t.name} — ${t.language}`));
  const answer = await prompt(`Template [1]: `);
  const picked = templates[chooseTemplateIndex(answer, templates.length)] as OtpTemplateOption;
  return picked.id;
}

function ensureGitignored(cwd: string, envFile: string): "ok" | "added" {
  const gitignorePath = path.join(cwd, ".gitignore");
  let current = "";
  try {
    current = fs.readFileSync(gitignorePath, "utf8");
  } catch {
    fs.writeFileSync(gitignorePath, `${envFile}\n`, "utf8");
    return "added";
  }
  const lines = current.split(/\r?\n/).map((l) => l.trim());
  if (lines.includes(envFile)) return "ok";
  const suffix = current.endsWith("\n") || current === "" ? "" : "\n";
  fs.appendFileSync(gitignorePath, `${suffix}${envFile}\n`, "utf8");
  return "added";
}

function writeEnvFile(cwd: string, envFile: string, explicitKey: string | undefined): "created" | "updated" | "skipped" {
  const target = path.join(cwd, envFile);
  let current: string | null = null;
  try {
    current = fs.readFileSync(target, "utf8");
  } catch {
    current = null;
  }
  if (current !== null) {
    if (/^\s*WANI_API_KEY\s*=/m.test(current)) return "skipped";
    fs.appendFileSync(target, `${current.endsWith("\n") || current === "" ? "" : "\n"}WANI_API_KEY=${explicitKey ?? "your_project_api_key"}\n`, "utf8");
    return "updated";
  }
  fs.writeFileSync(target, `WANI_API_KEY=${explicitKey ?? "your_project_api_key"}\n`, "utf8");
  return "created";
}

export async function runInit(
  ctx: CommandContext,
  args: ParsedArgs,
  deps?: InitDeps
): Promise<void> {
  const cwd = deps?.cwd ?? process.cwd();
  const prompt = deps?.prompt ?? promptText;
  const install = deps?.install ?? defaultInstall;

  const frameworkFlag = optString(args.options, "framework")?.trim();
  const force = args.options["force"] === true;
  const noInstall = args.options["no-install"] === true || args.options["noInstall"] === true;
  const explicitKey = optString(args.options, "api-key", "apiKey")?.trim() || undefined;

  // 1. Framework.
  let stack: DetectedStack;
  if (frameworkFlag) {
    const probeTs = realFsProbe(cwd).exists("tsconfig.json");
    const resolved = stackFromFrameworkId(frameworkFlag, probeTs);
    if (!resolved) {
      throw new CliError(
        `Unknown --framework "${frameworkFlag}". Choose one of: ${FRAMEWORK_CHOICES.map((c) => c.id).join(", ")}.`,
        { kind: "usage" }
      );
    }
    stack = resolved;
    if (!ctx.json) printLine(`Framework: ${stack.display} (--framework).`);
  } else {
    stack = await pickStack(detectStacks(realFsProbe(cwd)), prompt);
  }
  const target = targetFor(stack);

  // 2. Template (send snippet needs a real template id when available).
  const accessToken = ctx.config.cliAccessToken;
  if (!accessToken) {
    throw new CliError("Not logged in. Run `wani login` first.", { kind: "auth" });
  }
  const templateId = await resolveInitTemplateId(ctx, args, prompt);

  // 3. Generated integration from the official portal API (single source).
  const client = new ApiClient({
    baseUrl: ctx.baseUrl,
    timeoutMs: ctx.timeoutMs,
    fetchImpl: ctx.fetchImpl,
    accessToken,
  });
  const generated = await client.post<{ code?: unknown; endpoint?: unknown }>(ENDPOINTS.cliCodegen, {
    language: stack.language,
    framework: stack.framework,
    operation: "send",
    ...(templateId ? { templateId } : {}),
  });
  if (typeof generated.code !== "string" || generated.code === "") {
    throw new CliError("Code generation returned an unexpected response.", { kind: "http" });
  }

  // 4. Write the integration file (never overwrite without --force).
  const filePath = path.join(cwd, target.file);
  if (fs.existsSync(filePath) && !force) {
    throw new CliError(`Refusing to overwrite existing ${target.file} (re-run with --force).`, { kind: "usage" });
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, generated.code.endsWith("\n") ? generated.code : generated.code + "\n", "utf8");
  if (target.tsExtension === "sh") {
    try {
      fs.chmodSync(filePath, 0o755);
    } catch {
      // best effort (e.g. filesystems without unix modes)
    }
  }
  if (!ctx.json) printLine(`✓ Created ${target.file}`);

  // 5. Install the SDK (JS/TS ecosystems only).
  let installed = false;
  if (target.needsSdkInstall && !noInstall) {
    const pm = detectPackageManager(cwd);
    const result = install(pm.name, [...pm.addArgs, "@aiwni/sdk"]);
    if (result.ok) {
      installed = true;
      if (!ctx.json) printLine(`✓ Installed @aiwni/sdk (${pm.name})`);
    } else if (!ctx.json) {
      printLine(`⚠ SDK install failed (${result.error ?? "unknown error"}) — run manually: ${pm.name} ${[...pm.addArgs, "@aiwni/sdk"].join(" ")}`);
    }
  }

  // 6. Environment placeholder (+ explicit key only with --api-key).
  let envState: string | null = null;
  if (target.envFile) {
    envState = writeEnvFile(cwd, target.envFile, explicitKey);
    if (!ctx.json) {
      if (envState === "created") printLine(`✓ Added WANI_API_KEY to ${target.envFile}`);
      else if (envState === "updated") printLine(`✓ Added WANI_API_KEY to existing ${target.envFile}`);
      else printLine(`• ${target.envFile} already defines WANI_API_KEY — left untouched`);
    }
    if (!explicitKey && !ctx.json) {
      printLine(`  Paste your project key into ${target.envFile} (Portal → API Keys).`);
    }
  }

  // 7. Security check: env file must be gitignored (the key never belongs in git,
  // and React/browser code never receives it — generated snippets are server-only).
  let gitignored: string | null = null;
  if (target.envFile) {
    gitignored = ensureGitignored(cwd, target.envFile);
    if (!ctx.json) {
      printLine(gitignored === "ok" ? `✓ ${target.envFile} is gitignored` : `✓ Added ${target.envFile} to .gitignore`);
    }
  }

  if (ctx.json) {
    printJson({
      ok: true,
      framework: stack.framework,
      language: stack.language,
      file: target.file,
      envFile: target.envFile,
      installed,
      templateId: templateId ?? null,
    });
    return;
  }
  printLine("Integration ready.");
}

export async function otpInitCommand(ctx: CommandContext, args: ParsedArgs): Promise<void> {
  return runInit(ctx, args);
}
