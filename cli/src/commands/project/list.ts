/**
 * `wani project list` — list developer projects visible to the account.
 */
import { ApiClient } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CommandContext } from "../context.js";
import { requireSession } from "../context.js";
import { printJson } from "../../output/json.js";
import { printProjects } from "../../output/human.js";

export const PROJECT_HELP = `wani project <list | use | current>

  wani project list
      List your projects (id, name, role).

  wani project use [id-or-name] [--api-key <key>]
      Select the working project. With no argument, shows an
      interactive picker (↑/↓ + Enter). Otherwise matches by exact
      id, id prefix, or exact name. With --api-key, verifies the key
      belongs to the project (when the server supports it) and saves
      it for OTP commands.

      wani project use
      wani project use my-store
      wani project use cmu123abc --api-key wani_live_xxxx

  wani project current
      Show the selected project.
`;

export interface ProjectSummary {
  id: string;
  name: string;
  viewerRole?: string;
  status?: string;
  createdAt?: string;
}

export async function fetchProjects(ctx: CommandContext): Promise<ProjectSummary[]> {
  const accessToken = requireSession(ctx);
  const client = new ApiClient({
    baseUrl: ctx.baseUrl,
    timeoutMs: ctx.timeoutMs,
    fetchImpl: ctx.fetchImpl,
    accessToken,
  });
  const data = await client.get<{ projects?: ProjectSummary[] }>(ENDPOINTS.projects);
  const projects = Array.isArray(data.projects) ? data.projects : [];
  return projects.filter((p) => typeof p?.id === "string" && typeof p?.name === "string");
}

/**
 * Best-effort display name of the currently selected project (null when
 * logged out, offline, or nothing selected). Never throws — callers that
 * only want a friendly label use this instead of failing the whole flow.
 */
export async function resolveCurrentProjectName(ctx: CommandContext): Promise<string | null> {
  if (!ctx.config.cliAccessToken) return null;
  try {
    const projects = await fetchProjects(ctx);
    const current = ctx.config.currentProjectId;
    const found = current ? projects.find((p) => p.id === current) : undefined;
    if (found) return found.name;
    if (!current && projects.length === 1 && projects[0]) return projects[0].name;
    return null;
  } catch {
    return null;
  }
}

export async function projectListCommand(ctx: CommandContext): Promise<void> {
  const projects = await fetchProjects(ctx);
  if (ctx.json) {
    printJson({ ok: true, projects });
    return;
  }
  printProjects(projects.map((p) => ({ id: p.id, name: p.name, viewerRole: p.viewerRole })));
}
