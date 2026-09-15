/**
 * `wani project list` — list developer projects visible to the account.
 */
import { ApiClient } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CommandContext } from "../context.js";
import { requireSession } from "../context.js";
import { printJson } from "../../output/json.js";
import { printProjects } from "../../output/human.js";

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

export async function projectListCommand(ctx: CommandContext): Promise<void> {
  const projects = await fetchProjects(ctx);
  if (ctx.json) {
    printJson({ ok: true, projects });
    return;
  }
  printProjects(projects.map((p) => ({ id: p.id, name: p.name, viewerRole: p.viewerRole })));
}
