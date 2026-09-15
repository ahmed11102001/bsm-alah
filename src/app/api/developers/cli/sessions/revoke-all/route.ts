import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
import { isSameOriginRequest } from "@/lib/dev-cli-auth";

// ─── POST /api/developers/cli/sessions/revoke-all ───────────────────────────
// Revokes ALL CLI sessions of the signed-in developer (logout everywhere).
// Web sessions are untouched.
export async function POST(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return devError("غير مصرح", "AUTH_REQUIRED", 401);
  if (!isSameOriginRequest(req)) {
    return devError("طلب مرفوض — تحقق من مصدر الطلب", "FORBIDDEN", 403);
  }

  const revoked = await prisma.developerCliSession.updateMany({
    where: { developerId: session.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true, revoked: revoked.count });
}
