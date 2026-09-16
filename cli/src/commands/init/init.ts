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
import { fetchProjects } from "../project/list.js";

export const INIT_HELP = `wani init [--framework <id>] [--template-id <id> | --template <name> [--language <code>]] [--project <id>] [--api-key <key>] [--force] [--no-install]

Scaffold a Wani OTP integration inside the current project directory:

  1. Detect the framework (Node.js, Next.js, React, Django, Flask,
     FastAPI, Laravel, Symfony, Shell) — override with --framework.
  2. Resolve an approved template (or pass --template-id).
  3. Fetch SDK-based integration code from the official portal API
     (the SDK owns all HTTP/auth/error handling — no raw fetch).
  4. Write the integration files (Next.js: shared helper + thin
     send/verify routes; never overwrites without --force).
  5. Install @aiwni/sdk for JS/TS projects (skip with --no-install).
  6. Configure WANI_API_KEY placeholder in the env file (a real key is
     written only when --api-key is passed explicitly) and ensure the
     env file is gitignored.

Requires a login (\`wani login\`). The key never goes into browser code.

  wani init
  wani init --framework next --template-id tpl_123 --force
`;

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

/**
 * Thin Next.js route wiring around the generated SDK helper — no API contract
 * lives here (paths, payloads and errors all come from @aiwni/sdk via the
 * helper module). `helperImport` is the relative import to lib/wani.
 */
function buildNextRouteFile(
  operation: "send" | "verify",
  appDir: string,
  typed: boolean
): { file: string; code: string } {
  const ext = typed ? "ts" : "js";
  const file = operation === "send"
    ? `${appDir}/api/otp/send/route.${ext}`
    : `${appDir}/api/otp/verify/route.${ext}`;
  // appDir/api/otp/<op>/route → lib is always three levels up (app/… or src/app/…).
  const helperImport = "../../../lib/wani";
  const reqParam = typed ? "request: Request" : "request";
  const bodyType = typed ? " as { phone?: unknown }" : "";
  const bodyTypeVerify = typed ? " as { token?: unknown; code?: unknown }" : "";
  const check = typed
    ? { phone: 'typeof phone !== "string" || phone === ""', tokenCode: 'typeof token !== "string" || !token || typeof code !== "string" || !code' }
    : { phone: "!phone", tokenCode: "!token || !code" };
  const call = operation === "send"
    ? `return Response.json(await sendOtp(phone));`
    : `return Response.json(await verifyOtp(token, code));`;
  const fn = operation === "send" ? "sendOtp" : "verifyOtp";
  const input = operation === "send"
    ? `let phone${typed ? ": unknown" : ""};
  try {
    ({ phone } = await request.json()${bodyType});
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (${check.phone}) return Response.json({ ok: false, error: "phone is required" }, { status: 400 });`
    : `let token${typed ? ": unknown" : ""}, code${typed ? ": unknown" : ""};
  try {
    ({ token, code } = await request.json()${bodyTypeVerify});
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (${check.tokenCode}) return Response.json({ ok: false, error: "token and code are required" }, { status: 400 });`;
  return {
    file,
    code: `// ${file} — thin Wani OTP route (server-only). All logic lives in lib/wani.ts.
import { ${fn} } from "${helperImport}";

export async function POST(${reqParam}) {
${input}
  try {
    ${call}
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Wani request failed" }, { status: 502 });
  }
}
`,
  };
}

function detectPackageManager(cwd: string): { name: string; addArgs: string[] } {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return { name: "pnpm", addArgs: ["add"] };
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return { name: "yarn", addArgs: ["add"] };
  return { name: "npm", addArgs: ["install"] };
}

/**
 * Shell-less child execution (no DEP0190 warning, no shell injection).
 * On Windows the package manager is a `.cmd` shim, which Node cannot exec
 * directly — so it is routed through `cmd /d /c` *without* the shell
 * option: argv stays an array, nothing is reinterpreted. Both the `cmd`
 * literal and every element are fixed internal constants here
 * (`packageManager` only ever comes from {@link detectPackageManager} —
 * npm/pnpm/yarn — and args are hardcoded subcommands), never user input,
 * so no quoting layer is needed at all.
 */
export function spawnWithoutShell(
  cmd: string,
  args: string[],
  stdio: "inherit" | "pipe" = "inherit"
): { status: number | null; error?: string; stdout?: string; stderr?: string } {
  const res = process.platform === "win32"
    ? spawnSync("cmd", ["/d", "/c", cmd, ...args], { stdio, encoding: "utf8" })
    : spawnSync(cmd, args, { stdio, encoding: "utf8" });
  const out: { status: number | null; error?: string; stdout?: string; stderr?: string } = {
    status: res.status,
  };
  if (typeof res.error?.message === "string") out.error = res.error.message;
  if (stdio === "pipe") {
    if (typeof res.stdout === "string") out.stdout = res.stdout;
    if (typeof res.stderr === "string") out.stderr = res.stderr;
  }
  return out;
}

function defaultInstall(packageManager: string, args: string[]): { ok: boolean; error?: string } {
  const res = spawnWithoutShell(packageManager, args, "inherit");
  if (res.status === 0) return { ok: true };
  return { ok: false, error: res.error ?? `exit code ${res.status}` };
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

interface ResolvedTemplate {
  id: string | undefined;
  /** Display name when known (picked from the project list); id otherwise. */
  name: string | null;
}

async function resolveInitTemplate(
  ctx: CommandContext,
  args: ParsedArgs,
  prompt: (question: string) => Promise<string>
): Promise<ResolvedTemplate> {
  const templateId = optString(args.options, "template-id", "templateId")?.trim();
  if (templateId) return { id: templateId, name: null };
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
    if (matches.length === 1 && matches[0]) return { id: matches[0].id, name: matches[0].name };
    if (matches.length === 0) {
      throw new CliError(`Template "${templateName}" not found among approved templates.`, { kind: "usage" });
    }
    throw new CliError(
      `Template "${templateName}" exists in multiple languages — re-run with --language <code>.`,
      { kind: "usage" }
    );
  }
  if (templates.length === 1 && templates[0]) {
    return { id: templates[0].id, name: templates[0].name };
  }
  if (!process.stdin.isTTY) {
    throw new CliError("Multiple approved templates — re-run with --template-id <id>.", { kind: "usage" });
  }
  printLine("Template:");
  templates.forEach((t: OtpTemplateOption, i: number) => printLine(`  ${i + 1}) ${t.name} — ${t.language}`));
  const answer = await prompt(`Template [1]: `);
  const picked = templates[chooseTemplateIndex(answer, templates.length)] as OtpTemplateOption;
  return { id: picked.id, name: picked.name };
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

async function fetchGeneratedCode(
  ctx: CommandContext,
  accessToken: string,
  stack: DetectedStack,
  frameworkOverride: string,
  operation: "send" | "verify" | "send-verify" | "status",
  templateId: string | undefined
): Promise<string> {
  const client = new ApiClient({
    baseUrl: ctx.baseUrl,
    timeoutMs: ctx.timeoutMs,
    fetchImpl: ctx.fetchImpl,
    accessToken,
  });
  const generated = await client.post<{ code?: unknown }>(ENDPOINTS.cliCodegen, {
    language: stack.language,
    framework: frameworkOverride,
    operation,
    ...(templateId ? { templateId } : {}),
  });
  if (typeof generated.code !== "string" || generated.code === "") {
    throw new CliError("Code generation returned an unexpected response.", { kind: "http" });
  }
  return generated.code;
}

function writeInitFile(cwd: string, rel: string, code: string, force: boolean, executable: boolean): void {
  const filePath = path.join(cwd, rel);
  if (fs.existsSync(filePath) && !force) {
    throw new CliError(`Refusing to overwrite existing ${rel} (re-run with --force).`, { kind: "usage" });
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, code.endsWith("\n") ? code : code + "\n", "utf8");
  if (executable) {
    try {
      fs.chmodSync(filePath, 0o755);
    } catch {
      // best effort (e.g. filesystems without unix modes)
    }
  }
}

async function resolveInitProjectName(ctx: CommandContext, args: ParsedArgs): Promise<string | null> {
  const flag = optString(args.options, "project")?.trim();
  if (!ctx.config.cliAccessToken) return flag ?? ctx.config.currentProjectId ?? null;
  try {
    const projects = await fetchProjects(ctx);
    const wanted = flag ?? ctx.config.currentProjectId;
    const found = wanted ? projects.find((p) => p.id === wanted || p.name === wanted) : undefined;
    if (found) return found.name;
    return wanted ?? null;
  } catch {
    return flag ?? ctx.config.currentProjectId ?? null;
  }
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

  // 0. Login gate.
  const accessToken = ctx.config.cliAccessToken;
  if (!accessToken) {
    throw new CliError("Not logged in. Run `wani login` first.", { kind: "auth" });
  }

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
  } else {
    stack = await pickStack(detectStacks(realFsProbe(cwd)), prompt);
  }
  const target = targetFor(stack);
  if (!ctx.json) {
    printLine(frameworkFlag ? `✓ Detected ${stack.display} (--framework).` : `✓ Detected ${stack.display}`);
  }

  // 2. Project + template (names resolved for display; ids drive generation).
  const projectName = await resolveInitProjectName(ctx, args);
  if (!ctx.json) {
    printLine(projectName ? `✓ Connected to Wani project: ${projectName}` : "• Project: using current selection");
  }
  const template = await resolveInitTemplate(ctx, args, prompt);
  if (!ctx.json) {
    if (template.name) printLine(`✓ Selected OTP template: ${template.name}`);
    else if (template.id) printLine(`✓ Using template: ${template.id}`);
    else printLine("• Template: using default reference");
  }

  // 3. Generated integration(s) from the official portal API (single source).
  // Next.js gets a shared SDK helper plus thin send/verify routes; Node.js
  // gets the full SDK helper module; every other framework gets its single
  // SDK-based (or manual, for non-JS) module.
  const createdFiles: string[] = [];
  if (stack.framework === "next") {
    const useSrcDir = realFsProbe(cwd).exists("src/app");
    const appDir = useSrcDir ? "src/app" : "app";
    const helperFile = `${useSrcDir ? "src/lib" : "lib"}/wani.${stack.typescript ? "ts" : "js"}`;
    const helperLanguage = stack.typescript ? "typescript" : "javascript";
    const helper = await fetchGeneratedCode(ctx, accessToken,
      { ...stack, language: helperLanguage }, "node", "send-verify", template.id);
    writeInitFile(cwd, helperFile, helper, force, false);
    createdFiles.push(helperFile);
    for (const op of ["send", "verify"] as const) {
      const route = buildNextRouteFile(op, appDir, stack.typescript);
      writeInitFile(cwd, route.file, route.code, force, false);
      createdFiles.push(route.file);
    }
  } else {
    // Node.js starts from the complete send+verify SDK module; other
    // frameworks start from their focused send snippet.
    const operation = stack.framework === "node" ? "send-verify" : "send";
    const generated = await fetchGeneratedCode(ctx, accessToken, stack, stack.framework, operation, template.id);
    writeInitFile(cwd, target.file, generated, force, target.tsExtension === "sh");
    createdFiles.push(target.file);
  }
  if (!ctx.json) {
    printLine("✓ Created:");
    for (const f of createdFiles) printLine(`  ${f}`);
  }

  // 4. Install the SDK (JS/TS ecosystems only).
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

  // 5. Environment placeholder (+ explicit key only with --api-key).
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

  // 6. Security check: env file must be gitignored (the key never belongs in git,
  // and React/browser code never receives it — generated snippets are server-only).
  if (target.envFile) {
    const gitignored = ensureGitignored(cwd, target.envFile);
    if (!ctx.json) {
      printLine(gitignored === "ok" ? `✓ ${target.envFile} is gitignored` : `✓ Added ${target.envFile} to .gitignore`);
    }
  }

  if (ctx.json) {
    printJson({
      ok: true,
      framework: stack.framework,
      language: stack.language,
      files: createdFiles,
      envFile: target.envFile,
      installed,
      templateId: template.id ?? null,
    });
    return;
  }
  printLine("");
  printLine("Integration ready.");
  printLine("");
  printLine("Next:");
  if (stack.framework === "next") printLine("  npm run dev");
  printLine("Test your integration:");
  printLine("  wani otp test");
}

export async function otpInitCommand(ctx: CommandContext, args: ParsedArgs): Promise<void> {
  return runInit(ctx, args);
}
