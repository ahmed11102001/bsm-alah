import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
import { normalizeTicket, sha256hex, CLI_AUTH_STATUS } from "@/lib/dev-cli-auth";

// ─── POST /api/developers/cli/authorize/lookup-ticket ───────────────────────
// Resolves a seamless-flow browser ticket (?ticket=…) to the pending request.
// Same masked response as lookup — no hashes, no secrets, no other developer's data.
// Tickets are single-use: anything but a live PENDING request is rejected,
// and the ticket dies the moment the request leaves PENDING.
export async function POST(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return devError("غير مصرح", "AUTH_REQUIRED", 401);

  const body = await req.json().catch(() => ({}));
  const ticket = normalizeTicket(body?.ticket);
  if (!ticket) return devError("رابط غير صالح", "INVALID_REQUEST", 400);

  const auth = await prisma.developerCliAuthorization.findUnique({
    where: { browserTicketHash: sha256hex(ticket) },
    select: {
      id: true,
      deviceName: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      developerId: true,
      browserTicketExpiresAt: true,
    },
  });
  if (!auth) return devError("رابط غير صالح أو مستخدم بالفعل", "AUTHORIZATION_INVALID", 404);
  if (
    auth.status !== CLI_AUTH_STATUS.PENDING ||
    auth.expiresAt.getTime() <= Date.now() ||
    !auth.browserTicketExpiresAt ||
    auth.browserTicketExpiresAt.getTime() <= Date.now()
  ) {
    return devError("انتهت صلاحية هذا الرابط — ابدأ تسجيل الدخول من جديد", "AUTHORIZATION_EXPIRED", 410);
  }
  if (auth.developerId && auth.developerId !== session.id) {
    return devError("رابط غير صالح أو مستخدم بالفعل", "AUTHORIZATION_INVALID", 404);
  }

  return NextResponse.json({
    status: auth.status,
    device_name: auth.deviceName,
    expires_at: auth.expiresAt.toISOString(),
    created_at: auth.createdAt.toISOString(),
  });
}
