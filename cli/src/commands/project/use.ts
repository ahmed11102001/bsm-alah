/**
 * `wani project use <id-or-name> [--api-key <key>]`
 *
 * Selects the working project (persisted locally) and optionally stores
 * that project's API key for OTP commands.
 */
import { CliError } from "../../api/errors.js";
import { ApiClient } from "../../api/client.js";
import type { CommandContext } from "../context.js";
import type { ParsedArgs } from "../../utils/args.js";
import { optString } from "../../utils/args.js";
import { printJson } from "../../output/json.js";
import { printLine } from "../../output/human.js";
import { fetchProjects, type ProjectSummary } from "./list.js";

function matchProject(projects: ProjectSummary[], ref: string): ProjectSummary {
  const exact = projects.find((p) => p.id === ref);
  if (exact) return exact;

  const byPrefix = projects.filter((p) => p.id.startsWith(ref));
  if (byPrefix.length === 1 && byPrefix[0]) return byPrefix[0];

  const lowered = ref.toLowerCase();
  const byName = projects.filter((p) => p.name.toLowerCase() === lowered);
  if (byName.length === 1 && byName[0]) return byName[0];

  const candidates = [...byPrefix, ...byName];
  if (candidates.length > 1) {
    const ids = candidates.map((p) => `  - ${p.id} (${p.name})`).join("\n");
    throw new CliError(`"${ref}" is ambiguous. Be more specific:\n${ids}`, { kind: "usage" });
  }
  throw new CliError(
    `"${ref}" matches no project. Run \`wani project list\` to see available projects.`,
    { kind: "usage" }
  );
}

export async function projectUseCommand(ctx: CommandContext, args: ParsedArgs): Promise<void> {
  const ref = args.positional[0];
  if (!ref) {
    throw new CliError("Usage: wani project use <project-id-or-name> [--api-key <key>]", { kind: "usage" });
  }
  const apiKeyFlag = optString(args.options, "api-key", "apiKey");

  const projects = await fetchProjects(ctx);
  const project = matchProject(projects, ref);

  let keyValidated = false;
  let keyWarning: string | undefined;
  if (apiKeyFlag !== undefined) {
    // Verify the key actually belongs to the selected project before saving.
    // A mismatch is rejected; an unreachable/legacy server falls back to a
    // loud warning (the key is still verified on first OTP request).
    const probe = new ApiClient({
      baseUrl: ctx.baseUrl,
      timeoutMs: ctx.timeoutMs,
      fetchImpl: ctx.fetchImpl,
      apiKey: apiKeyFlag,
    });
    try {
      const info = await probe.get<{ projectId?: string; projectName?: string }>("/api/developers/otp/key-info");
      if (typeof info.projectId !== "string" || info.projectId === "") {
        keyWarning = "Key server returned an unexpected shape — saved anyway; it will be verified on first OTP request.";
      } else if (info.projectId !== project.id) {
        throw new CliError(
          `API key belongs to another project (${info.projectName ?? info.projectId}) — not saved.`,
          { kind: "usage" }
        );
      } else {
        keyValidated = true;
      }
    } catch (err) {
      if (err instanceof CliError && err.message.startsWith("API key belongs to another project")) {
        throw err;
      }
      keyWarning = "Could not validate key ownership (server too old?) — saved anyway; it will be verified on first OTP request.";
    }
  }

  const next = { ...ctx.config, currentProjectId: project.id, apiKeys: { ...ctx.config.apiKeys } };
  if (apiKeyFlag !== undefined) {
    next.apiKeys[project.id] = apiKeyFlag;
  }
  ctx.saveConfig(next);

  if (ctx.json) {
    printJson({ ok: true, project: { id: project.id, name: project.name }, apiKeySaved: apiKeyFlag !== undefined, keyValidated, ...(keyWarning ? { warning: keyWarning } : {}) });
    return;
  }
  printLine(`Using project "${project.name}" (${project.id}).`);
  if (apiKeyFlag !== undefined) {
    printLine(keyValidated ? "Project API key verified and saved for OTP commands." : `Project API key saved. ${keyWarning ?? ""}`);
  }
}
