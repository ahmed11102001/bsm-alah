import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
import { isSameOriginRequest } from "@/lib/dev-cli-auth";

// ─── POST /api/developers/cli/sessions/revoke ───────────────────────────────
// Revokes ONE CLI session owned by the signed-in developer. Ownership is
// enforced in the WHERE clause — another developer's id yields NOT_FOUND.
export async function POST(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return devError("غير مصرح", "AUTH_REQUIRED", 401);
  if (!isSameOriginRequest(req)) {
    return devError("طلب مرفوض — تحقق من مصدر الطلب", "FORBIDDEN", 403);
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return devError("id مطلوب", "INVALID_REQUEST", 400);

  const revoked = await prisma.developerCliSession.updateMany({
    where: { id, developerId: session.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (revoked.count === 0) return devError("الجلسة غير موجودة", "NOT_FOUND", 404);

  return NextResponse.json({ ok: true });
}
