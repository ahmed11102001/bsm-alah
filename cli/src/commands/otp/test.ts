/**
 * `wani otp test` — guided end-to-end OTP check.
 *
 * Interactive by default (prompts for phone, template and code), fully
 * flaggable for scripts (`--phone`, `--template-id`/`--template`, `--code`),
 * and `--json` for machine output. Proves Wani + project + template +
 * WhatsApp delivery work together, without the multi-command dance.
 *
 * Template listing needs a login (`wani login`); sending/verifying only
 * needs a project API key (flag > env > stored), like `otp send`.
 */
import { CliError } from "../../api/errors.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CommandContext } from "../context.js";
import { optString, type ParsedArgs } from "../../utils/args.js";
import { printJson } from "../../output/json.js";
import { printLine } from "../../output/human.js";
import { promptText } from "../../utils/prompt.js";
import { makeOtpClient } from "./common.js";
import { fetchProjects } from "../project/list.js";
import {
  chooseTemplateIndex,
  fetchApprovedTemplates,
  type OtpTemplateOption,
} from "./templates.js";

interface TestFlags {
  phone?: string | undefined;
  templateId?: string | undefined;
  templateName?: string | undefined;
  language?: string | undefined;
  code?: string | undefined;
  expiryMinutes?: number | undefined;
  projectId?: string | undefined;
}

function parseExpiryMinutes(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 60) {
    throw new CliError("--expires must be an integer between 1 and 60.", { kind: "usage" });
  }
  return parsed;
}

function readFlags(args: ParsedArgs): TestFlags {
  return {
    phone: optString(args.options, "phone", "p")?.trim() || undefined,
    templateId: optString(args.options, "template-id", "templateId")?.trim() || undefined,
    templateName: optString(args.options, "template", "template-name", "templateName")?.trim() || undefined,
    language: optString(args.options, "language", "lang")?.trim() || undefined,
    code: optString(args.options, "code", "c")?.trim() || undefined,
    expiryMinutes: parseExpiryMinutes(optString(args.options, "expires", "expiry-minutes")),
    projectId: optString(args.options, "project")?.trim() || undefined,
  };
}

async function resolveTemplateId(
  ctx: CommandContext,
  flags: TestFlags,
  projectId: string | undefined
): Promise<{ templateId: string | undefined; templateName: string | undefined; language: string | undefined }> {
  if (flags.templateId) return { templateId: flags.templateId, templateName: undefined, language: undefined };
  if (flags.templateName) {
    return { templateId: undefined, templateName: flags.templateName, language: flags.language };
  }
  if (!projectId) {
    throw new CliError(
      "No project selected and no --template-id given. Run `wani project use <id>`, log in, or pass --template-id.",
      { kind: "usage" }
    );
  }
  const templates = await fetchApprovedTemplates(ctx, projectId);
  if (templates.length === 0) {
    throw new CliError(
      "No approved templates on this project. Create and approve one in the portal first, or pass --template-id.",
      { kind: "http" }
    );
  }
  if (templates.length === 1 || !process.stdin.isTTY) {
    const only = templates[0] as OtpTemplateOption;
    if (!ctx.json) printLine(`Template: ${only.name} (${only.language})`);
    return { templateId: only.id, templateName: undefined, language: undefined };
  }
  printLine("Template:");
  templates.forEach((t, i) => printLine(`  ${i + 1}) ${t.name} — ${t.language}`));
  const answer = await promptText(`Template [1]: `);
  const picked = templates[chooseTemplateIndex(answer, templates.length)] as OtpTemplateOption;
  return { templateId: picked.id, templateName: undefined, language: undefined };
}

async function resolveProjectName(ctx: CommandContext): Promise<string | null> {
  if (!ctx.config.cliAccessToken) return null;
  try {
    const projects = await fetchProjects(ctx);
    const current = ctx.config.currentProjectId;
    const found = current ? projects.find((p) => p.id === current) : undefined;
    if (found) return found.name;
    if (!current && projects.length === 1 && projects[0]) return (projects[0] as { name: string }).name;
    return null;
  } catch {
    return null; // offline / expired session: keep going with the id
  }
}

export async function otpTestCommand(ctx: CommandContext, args: ParsedArgs): Promise<void> {
  const flags = readFlags(args);
  const projectId = flags.projectId ?? ctx.config.currentProjectId;

  const { client, keySource } = makeOtpClient(ctx, args);

  // Header: what are we testing with?
  const projectName = await resolveProjectName(ctx);
  const projectLabel = projectName ?? projectId ?? null;
  if (!ctx.json) {
    printLine(projectLabel ? `✓ Project: ${projectLabel}` : "• Project: not selected (key decides server-side)");
    printLine(`✓ API Key: configured (${keySource})`);
  }

  let phone = flags.phone;
  if (!phone) {
    if (!process.stdin.isTTY) {
      throw new CliError("Usage: wani otp test --phone <phone> [--template-id <id>] [--code <code>]", { kind: "usage" });
    }
    phone = (await promptText("Phone: ")).trim();
  }
  if (!phone) {
    throw new CliError("Phone number is required (--phone).", { kind: "usage" });
  }

  const template = await resolveTemplateId(ctx, flags, projectId);

  const sendBody: Record<string, unknown> = { phone };
  if (template.templateId) sendBody["templateId"] = template.templateId;
  else if (template.templateName) {
    sendBody["templateName"] = template.templateName;
    if (template.language) sendBody["language"] = template.language;
  }
  if (flags.expiryMinutes !== undefined) sendBody["expiryMinutes"] = flags.expiryMinutes;

  if (!ctx.json) printLine("Sending OTP...");
  const sent = await client.post<Record<string, unknown>>(ENDPOINTS.otpSend, sendBody);
  const token = sent["token"];
  if (typeof token !== "string" || token === "") {
    throw new CliError("Unexpected send response (missing token).", { kind: "http", details: sent });
  }
  if (!ctx.json) printLine("✓ OTP sent");

  let code = flags.code;
  if (!code) {
    if (!process.stdin.isTTY) {
      throw new CliError("Pass --code <code> (non-interactive terminal).", { kind: "usage" });
    }
    code = (await promptText("Enter verification code: ")).trim();
  }
  if (!code) {
    throw new CliError("Verification code is required (--code).", { kind: "usage" });
  }

  const verified = await client.post<Record<string, unknown>>(ENDPOINTS.otpVerify, { token, code });
  if (verified["verified"] !== true) {
    throw new CliError("OTP verification failed (server reported verified: false).", {
      kind: "http",
      details: verified,
    });
  }

  if (ctx.json) {
    printJson({
      ok: true,
      project: projectLabel,
      phone,
      ...(template.templateId ? { templateId: template.templateId } : {}),
      ...(template.templateName ? { template: template.templateName } : {}),
      token,
      verified: true,
    });
    return;
  }
  printLine("✓ OTP verified");
}
