import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
import {
  normalizeUserCode,
  normalizeTicket,
  sha256hex,
  isSameOriginRequest,
  isDeveloperSuspended,
  CLI_AUTH_STATUS,
} from "@/lib/dev-cli-auth";

// ─── POST /api/developers/cli/authorize/approve ─────────────────────────────
// Browser approval: binds a PENDING request to the signed-in developer exactly
// once (atomic PENDING→APPROVED|DENIED). The developerId binding happens HERE,
// so a device_code observed by someone else can never be fixed to their
// account (anti fixation). Suspended developers cannot approve.
export async function POST(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return devError("غير مصرح", "AUTH_REQUIRED", 401);
  if (!isSameOriginRequest(req)) {
    return devError("طلب مرفوض — تحقق من مصدر الطلب", "FORBIDDEN", 403);
  }

  const body = await req.json().catch(() => ({}));
  const compact = normalizeUserCode(body?.user_code);
  const ticket = normalizeTicket(body?.ticket);
  const decision = body?.decision;
  // Exactly one identifier: typed user_code (manual flow) or browser ticket
  // (seamless flow). Both leave PENDING atomically and kill the ticket.
  if ((!compact && !ticket) || (compact && ticket) || (decision !== "allow" && decision !== "deny")) {
    return devError("بيانات غير صالحة", "INVALID_REQUEST", 400);
  }

  if (await isDeveloperSuspended(session.id)) {
    return devError("الحساب موقف، تواصل مع الدعم", "ACCOUNT_SUSPENDED", 403);
  }

  const next = decision === "allow" ? CLI_AUTH_STATUS.APPROVED : CLI_AUTH_STATUS.DENIED;
  const now = new Date();
  const claimed = ticket
    ? await prisma.developerCliAuthorization.updateMany({
      where: {
        browserTicketHash: sha256hex(ticket),
        status: CLI_AUTH_STATUS.PENDING,
        expiresAt: { gt: now },
        browserTicketExpiresAt: { gt: now },
      },
      data: {
        status: next,
        developerId: session.id,
        approvedAt: now,
        browserTicketHash: null,
        browserTicketExpiresAt: null,
      },
    })
    : await prisma.developerCliAuthorization.updateMany({
      where: {
        userCodeHash: sha256hex(compact as string),
        status: CLI_AUTH_STATUS.PENDING,
        expiresAt: { gt: now },
      },
      data: {
        status: next,
        developerId: session.id,
        approvedAt: now,
        browserTicketHash: null,
        browserTicketExpiresAt: null,
      },
    });

  if (claimed.count === 0) {
    if (!ticket) {
      const existing = await prisma.developerCliAuthorization.findUnique({
        where: { userCodeHash: sha256hex(compact as string) },
        select: { status: true, expiresAt: true },
      });
      if (existing && existing.expiresAt.getTime() <= Date.now()) {
        return devError("انتهت صلاحية هذا الطلب — اطلب رمزًا جديدًا من الـ CLI", "AUTHORIZATION_EXPIRED", 410);
      }
    }
    return devError("هذا الطلب غير صالح أو تم استخدامه بالفعل", "AUTHORIZATION_INVALID", 409);
  }

  return NextResponse.json({ ok: true, decision: next });
}
