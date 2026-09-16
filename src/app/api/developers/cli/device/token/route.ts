import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { devRateLimited, devError } from "@/lib/dev-errors";
import {
  sha256hex,
  newCliSessionToken,
  isDeveloperSuspended,
  CLI_AUTH_STATUS,
  CLI_SESSION_TTL_SECS,
  CLI_MAX_ACTIVE_SESSIONS,
} from "@/lib/dev-cli-auth";

// ─── POST /api/developers/cli/device/token ──────────────────────────────────
// Polled by the future CLI with its device_code. On APPROVED it atomically
// consumes the authorization (APPROVED→CONSUMED, exactly once) and mints a
// long-lived CLI session token — returned once, hashed at rest.
export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const rl = await rateLimit(`cli-device-token:${ip}`, { limit: 60, windowSecs: 300 });
  if (!rl.success) {
    return devRateLimited("كثير من المحاولات، حاول بعد شوية", "RATE_LIMITED", rl.retryAfter);
  }

  const body = await req.json().catch(() => ({}));
  const deviceCode = typeof body?.device_code === "string" ? body.device_code.trim() : "";
  if (!deviceCode) return devError("device_code مطلوب", "INVALID_REQUEST", 400);

  const auth = await prisma.developerCliAuthorization.findUnique({
    where: { deviceCodeHash: sha256hex(deviceCode) },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      developerId: true,
      deviceName: true,
    },
  });
  if (!auth) return devError("طلب غير صالح", "AUTHORIZATION_INVALID", 404);
  if (auth.expiresAt.getTime() <= Date.now()) {
    return devError("انتهت صلاحية هذا الطلب — ابدأ تسجيل الدخول من جديد", "AUTHORIZATION_EXPIRED", 410);
  }
  if (auth.status === CLI_AUTH_STATUS.PENDING) {
    return devError("بانتظار الموافقة من المتصفح", "AUTHORIZATION_PENDING", 400);
  }
  if (auth.status === CLI_AUTH_STATUS.DENIED) {
    return devError("تم رفض هذا الطلب", "AUTHORIZATION_DENIED", 403);
  }
  if (auth.status !== CLI_AUTH_STATUS.APPROVED || !auth.developerId) {
    return devError("طلب غير صالح أو تم استخدامه بالفعل", "AUTHORIZATION_INVALID", 400);
  }

  if (await isDeveloperSuspended(auth.developerId)) {
    return devError("الحساب موقف، تواصل مع الدعم", "ACCOUNT_SUSPENDED", 403);
  }

  // Atomic single-use consume — a concurrent poll loses the race (count 0).
  const consumed = await prisma.developerCliAuthorization.updateMany({
    where: { id: auth.id, status: CLI_AUTH_STATUS.APPROVED },
    data: {
      status: CLI_AUTH_STATUS.CONSUMED,
      consumedAt: new Date(),
      browserTicketHash: null,
      browserTicketExpiresAt: null,
    },
  });
  if (consumed.count === 0) {
    return devError("طلب غير صالح أو تم استخدامه بالفعل", "AUTHORIZATION_INVALID", 400);
  }

  // Cap active sessions: revoke the oldest beyond the limit (deterministic).
  const activeCount = await prisma.developerCliSession.count({
    where: { developerId: auth.developerId, revokedAt: null, expiresAt: { gt: new Date() } },
  });
  if (activeCount >= CLI_MAX_ACTIVE_SESSIONS) {
    const oldest = await prisma.developerCliSession.findMany({
      where: { developerId: auth.developerId, revokedAt: null },
      orderBy: { createdAt: "asc" },
      take: activeCount - CLI_MAX_ACTIVE_SESSIONS + 1,
      select: { id: true },
    });
    if (oldest.length > 0) {
      await prisma.developerCliSession.updateMany({
        where: { id: { in: oldest.map((s) => s.id) } },
        data: { revokedAt: new Date() },
      });
    }
  }

  const token = newCliSessionToken();
  const userAgent = req.headers.get("user-agent")?.slice(0, 256) ?? null;
  await prisma.developerCliSession.create({
    data: {
      developerId: auth.developerId,
      tokenHash: token.hash,
      tokenPrefix: token.prefix,
      deviceName: auth.deviceName,
      userAgent,
      ip,
      expiresAt: new Date(Date.now() + CLI_SESSION_TTL_SECS * 1000),
    },
  });

  return NextResponse.json({
    access_token: token.raw,
    token_type: "Bearer",
    expires_in: CLI_SESSION_TTL_SECS,
  });
}
