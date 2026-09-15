import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
import { normalizeUserCode, sha256hex } from "@/lib/dev-cli-auth";

// ─── POST /api/developers/cli/authorize/lookup ──────────────────────────────
// Signed-in developer looks up a pending request by its user code (typed in
// the browser — never in a URL). Returns masked request info only: no hashes,
// no secrets, no other developer's data.
export async function POST(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return devError("غير مصرح", "AUTH_REQUIRED", 401);

  const body = await req.json().catch(() => ({}));
  const compact = normalizeUserCode(body?.user_code);
  if (!compact) return devError("رمز غير صالح", "INVALID_REQUEST", 400);

  const auth = await prisma.developerCliAuthorization.findUnique({
    where: { userCodeHash: sha256hex(compact) },
    select: {
      id: true,
      deviceName: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      developerId: true,
    },
  });
  if (!auth) return devError("رمز غير موجود أو منتهي", "AUTHORIZATION_INVALID", 404);
  if (auth.expiresAt.getTime() <= Date.now()) {
    return devError("انتهت صلاحية هذا الطلب — اطلب رمزًا جديدًا من الـ CLI", "AUTHORIZATION_EXPIRED", 410);
  }
  if (auth.developerId && auth.developerId !== session.id) {
    // Bound to a different developer — indistinguishable from invalid.
    return devError("رمز غير موجود أو منتهي", "AUTHORIZATION_INVALID", 404);
  }

  return NextResponse.json({
    status: auth.status,
    device_name: auth.deviceName,
    expires_at: auth.expiresAt.toISOString(),
    created_at: auth.createdAt.toISOString(),
  });
}
