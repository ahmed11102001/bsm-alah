import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";

// ─── GET /api/developers/cli/sessions ───────────────────────────────────────
// Lists the signed-in developer's OWN active CLI devices (Settings →
// CLI & Integrations). Token hashes are never exposed — only metadata the
// developer already knows.
export async function GET(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return devError("غير مصرح", "AUTH_REQUIRED", 401);

  const now = new Date();
  const sessions = await prisma.developerCliSession.findMany({
    where: { developerId: session.id, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { lastUsedAt: "desc" },
    select: {
      id: true,
      deviceName: true,
      userAgent: true,
      ip: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json({ sessions });
}
