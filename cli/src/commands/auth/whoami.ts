/**
 * `wani whoami` — show the logged-in developer account.
 */
import { ApiClient } from "../../api/client.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import type { CommandContext } from "../context.js";
import { requireSession } from "../context.js";
import { printJson } from "../../output/json.js";
import { printKeyValue } from "../../output/human.js";

export const WHOAMI_HELP = `wani whoami

Show the logged-in developer account (name, email, phone, status).
Requires a login (\`wani login\`).
`;

interface MeResponse {
  developer?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
    phone?: string | null;
    status?: string;
  };
}

export async function whoamiCommand(ctx: CommandContext): Promise<void> {
  const accessToken = requireSession(ctx);
  const client = new ApiClient({
    baseUrl: ctx.baseUrl,
    timeoutMs: ctx.timeoutMs,
    fetchImpl: ctx.fetchImpl,
    accessToken,
  });
  const data = await client.get<MeResponse>(ENDPOINTS.authMe);
  const developer = data.developer ?? {};
  const name = [developer.firstName, developer.lastName].filter(Boolean).join(" ") || "-";

  if (ctx.json) {
    printJson({
      ok: true,
      id: developer.id ?? null,
      name,
      email: developer.email ?? null,
      phone: developer.phone ?? null,
      status: developer.status ?? null,
    });
    return;
  }
  printKeyValue([
    ["Name", name],
    ["Email", developer.email ?? "-"],
    ["Phone", developer.phone ?? "-"],
    ["Status", developer.status ?? "-"],
  ]);
}
