/**
 * `wani project current` — show the selected working project.
 */
import type { CommandContext } from "../context.js";
import { printJson } from "../../output/json.js";
import { printKeyValue, printLine } from "../../output/human.js";
import { fetchProjects } from "./list.js";

export async function projectCurrentCommand(ctx: CommandContext): Promise<void> {
  const currentProjectId = ctx.config.currentProjectId;
  if (!currentProjectId) {
    if (ctx.json) {
      printJson({ ok: true, project: null });
      return;
    }
    printLine("No project selected. Run `wani project list`, then `wani project use <id>`.");
    return;
  }

  let name: string | null = null;
  if (ctx.config.cliAccessToken) {
    try {
      const projects = await fetchProjects(ctx);
      name = projects.find((p) => p.id === currentProjectId)?.name ?? null;
    } catch {
      // offline / expired session: fall back to the stored id
    }
  }

  if (ctx.json) {
    printJson({ ok: true, project: { id: currentProjectId, name } });
    return;
  }
  printKeyValue([
    ["Project", name ?? "-"],
    ["ID", currentProjectId],
  ]);
}
