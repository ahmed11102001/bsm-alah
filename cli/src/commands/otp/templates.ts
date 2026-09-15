/**
 * Shared template helpers for OTP commands.
 *
 * Template listing needs a login (Bearer session); sending only needs a
 * project API key. `chooseTemplateIndex` is pure and unit-tested.
 */
import { ApiClient } from "../../api/client.js";
import { CliError } from "../../api/errors.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CommandContext } from "../context.js";

export interface OtpTemplateOption {
  id: string;
  name: string;
  language: string;
  status: string;
}

/** Pure selection helper: 1-based input, empty defaults to the first. */
export function chooseTemplateIndex(input: string, count: number): number {
  const trimmed = input.trim();
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > count) {
    throw new CliError(`Pick a template number between 1 and ${count}.`, { kind: "usage" });
  }
  return n - 1;
}

/** Approved templates of a project (throws when login is missing). */
export async function fetchApprovedTemplates(
  ctx: CommandContext,
  projectId: string
): Promise<OtpTemplateOption[]> {
  const accessToken = ctx.config.cliAccessToken;
  if (!accessToken) {
    throw new CliError(
      "Template listing needs a login (`wani login`), or pass --template-id directly.",
      { kind: "auth" }
    );
  }
  const client = new ApiClient({
    baseUrl: ctx.baseUrl,
    timeoutMs: ctx.timeoutMs,
    fetchImpl: ctx.fetchImpl,
    accessToken,
  });
  const data = await client.get<{ templates?: OtpTemplateOption[] }>(ENDPOINTS.otpTemplates(projectId));
  const templates = Array.isArray(data.templates) ? data.templates : [];
  return templates.filter(
    (t) => t && typeof t.id === "string" && typeof t.name === "string" && t.status === "APPROVED"
  );
}
