import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { devError } from "@/lib/dev-errors";
import { requireCliSession } from "@/lib/dev-cli-auth";

// ─── GET /api/developers/cli/whoami ─────────────────────────────────────────
// Validates a CLI Bearer session (used by the future CLI after `wani login`
// to confirm the stored credential). Never returns secrets.
export async function GET(req: NextRequest) {
  const cli = await requireCliSession(req);
  if (!cli) return devError("Invalid or expired CLI session", "INVALID_SESSION", 401);

  const developer = await prisma.developerUser.findUnique({
    where: { id: cli.developerId },
    select: { id: true, email: true, firstName: true, lastName: true, status: true },
  });
  if (!developer) return devError("Invalid or expired CLI session", "INVALID_SESSION", 401);

  return NextResponse.json({ developer, device_name: cli.deviceName });
}
