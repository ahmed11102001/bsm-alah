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

  // الـ CLI للمطورين فقط — الأونر (حساب عميل) مالوش أجهزة CLI
  try {
    const { isOwnerOnlyAccount } = await import("@/lib/dev-role");
    if (await isOwnerOnlyAccount(session.id)) {
      return NextResponse.json({ sessions: [] });
    }
  } catch {
    /* لو فشل الفحص كمّل عادي — الـ findMany هو الفيصل */
  }

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
