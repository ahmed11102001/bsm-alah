import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { devError } from "@/lib/dev-errors";
import { requireCliSession } from "@/lib/dev-cli-auth";

// ─── POST /api/developers/cli/sessions/revoke-current ────────────────────────
// Revokes the CLI session presenting the Bearer token itself (`wani logout`).
// Bearer-only: no cookie is read, and no Origin check is needed — Bearer is a
// non-ambient credential, so CSRF does not apply.
export async function POST(req: NextRequest) {
  const cli = await requireCliSession(req);
  if (!cli) return devError("Invalid or expired CLI session", "INVALID_SESSION", 401);

  await prisma.developerCliSession.updateMany({
    where: { id: cli.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
