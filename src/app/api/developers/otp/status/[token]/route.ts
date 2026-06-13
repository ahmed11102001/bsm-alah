import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import prisma from "@/lib/prisma";

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
function secondsRemaining(expiredAt: Date | null): number | null {
  if (!expiredAt) return null;
  const diff = Math.floor((expiredAt.getTime() - Date.now()) / 1000);
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

  // ── 3. Find OTP ───────────────────────────────────────────────────────────
  const otp = await prisma.otpLog.findFirst({
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

  if (!otp) {
    return NextResponse.json(
      { ok: false, error: "Token غير موجود أو لا ينتمي لهذا الـ API Key" },
      { status: 404 }
    );
  }

  // ── 4. Auto-mark expired if past expiry ───────────────────────────────────
  let currentStatus = otp.status;
  if (
    currentStatus === "SENT" &&
    otp.expiredAt &&
    new Date() > otp.expiredAt
  ) {
    await prisma.otpLog.updateMany({
      where: { token, projectId: auth.projectId, status: "SENT" },
      data:  { status: "EXPIRED" },
    });
    currentStatus = "EXPIRED";
  }

  // ── 5. Build response ─────────────────────────────────────────────────────
  const secs = secondsRemaining(otp.expiredAt);

  return NextResponse.json({
    ok:              true,
    token:           otp.token,
    status:          currentStatus.toLowerCase(),
    phone:           otp.phone,
    sentAt:          otp.sentAt?.toISOString()      ?? null,
    verifiedAt:      otp.verifiedAt?.toISOString()  ?? null,
    expiresAt:       otp.expiredAt?.toISOString()   ?? null,
    secondsRemaining: secs,
    meta: {
      messageId: otp.metaMessageId ?? null,
      error:     otp.error         ?? null,
    },
  });
}