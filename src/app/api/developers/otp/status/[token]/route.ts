import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import { getOtp, updateOtpStatus } from "@/lib/otp-redis";

// ─── Verify API Key ───────────────────────────────────────────────────────────
async function verifyApiKey(raw: string): Promise<{ projectId: string; developerId: string } | null> {
  const hash = createHash("sha256").update(raw.trim()).digest("hex");
  const keyRecord = await prisma.developerApiKey.findUnique({
    where: { keyHash: hash },
    include: {
      project: { select: { developerId: true } },
    },
  });
  if (!keyRecord || keyRecord.status !== "ACTIVE") return null;
  return {
    projectId: keyRecord.projectId,
    developerId: keyRecord.project.developerId,
  };
}

// ─── Human-readable remaining time ───────────────────────────────────────────
function secondsRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/developers/otp/status/[token]
//
// Headers:  x-api-key: wani_live_xxxx
// Response: { token, status, phone, sentAt, verifiedAt, expiresAt, secondsRemaining }
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const rawKey = req.headers.get("x-api-key")?.trim();
  if (!rawKey) {
    return NextResponse.json(
      { ok: false, error: "x-api-key header مطلوب" },
      { status: 401 }
    );
  }

  const auth = await verifyApiKey(rawKey);
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: "API Key غير صحيح أو ملغي" },
      { status: 401 }
    );
  }

  // ── 2. Get token from params ──────────────────────────────────────────────
  const { token } = await params;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "token مطلوب في الـ URL" },
      { status: 400 }
    );
  }

  // ── 3. Try Redis first ────────────────────────────────────────────────────
  const otp = await getOtp(token);

  if (otp && otp.projectId === auth.projectId) {
    // Auto-mark expired if past expiry
    let currentStatus = otp.status;
    if (
      currentStatus === "SENT" &&
      otp.expiresAt &&
      new Date() > new Date(otp.expiresAt)
    ) {
      await updateOtpStatus(token, "EXPIRED");
      currentStatus = "EXPIRED";

      // Update DB log too (non-blocking)
      prisma.otpLog.updateMany({
        where: { token, projectId: auth.projectId, status: "SENT" },
        data: { status: "EXPIRED" },
      }).catch(() => {});
    }

    const secs = secondsRemaining(otp.expiresAt);

    return NextResponse.json({
      ok:              true,
      token,
      status:          currentStatus.toLowerCase(),
      phone:           otp.phone,
      sentAt:          otp.sentAt ?? null,
      verifiedAt:      otp.verifiedAt ?? null,
      expiresAt:       otp.expiresAt ?? null,
      secondsRemaining: secs,
      meta: {
        messageId: otp.metaMessageId ?? null,
        error:     otp.error ?? null,
      },
    });
  }

  // ── 4. Fallback to DB (for old OTPs or expired Redis entries) ─────────────
  const dbOtp = await prisma.otpLog.findFirst({
    where: { token, projectId: auth.projectId },
    select: {
      token:         true,
      status:        true,
      phone:         true,
      sentAt:        true,
      verifiedAt:    true,
      expiredAt:     true,
      createdAt:     true,
      metaMessageId: true,
      error:         true,
    },
  });

  if (!dbOtp) {
    return NextResponse.json(
      { ok: false, error: "Token غير موجود أو لا ينتمي لهذا الـ API Key" },
      { status: 404 }
    );
  }

  // Auto-mark expired
  let currentStatus = dbOtp.status;
  if (
    currentStatus === "SENT" &&
    dbOtp.expiredAt &&
    new Date() > dbOtp.expiredAt
  ) {
    await prisma.otpLog.updateMany({
      where: { token, projectId: auth.projectId, status: "SENT" },
      data:  { status: "EXPIRED" },
    });
    currentStatus = "EXPIRED";
  }

  const secs = dbOtp.expiredAt
    ? secondsRemaining(dbOtp.expiredAt.toISOString())
    : null;

  return NextResponse.json({
    ok:              true,
    token:           dbOtp.token,
    status:          currentStatus.toLowerCase(),
    phone:           dbOtp.phone,
    sentAt:          dbOtp.sentAt?.toISOString()      ?? null,
    verifiedAt:      dbOtp.verifiedAt?.toISOString()  ?? null,
    expiresAt:       dbOtp.expiredAt?.toISOString()   ?? null,
    secondsRemaining: secs,
    meta: {
      messageId: dbOtp.metaMessageId ?? null,
      error:     dbOtp.error         ?? null,
    },
  });
}