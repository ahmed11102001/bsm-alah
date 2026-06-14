import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash } from "crypto";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { verifyOtp } from "@/lib/otp-redis";

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

  prisma.developerApiKey
    .update({ where: { id: keyRecord.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    projectId: keyRecord.projectId,
    developerId: keyRecord.project.developerId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/developers/otp/verify
//
// Headers:  x-api-key: wani_live_xxxx
// Body:     { token, code }
// Response: { ok, verified, message }
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
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

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: any;
  try { body = await req.json(); }
  catch {
    return NextResponse.json(
      { ok: false, error: "Request body يجب أن يكون JSON صحيح" },
      { status: 400 }
    );
  }

  const { token, code } = body;

  if (!token || !code) {
    return NextResponse.json(
      { ok: false, error: "token و code مطلوبين في body" },
      { status: 400 }
    );
  }

  // ── 3. Rate limit: per token + per IP (distributed attacks) ───────────────
  // 10 محاولات كل 15 دقيقة لكل token
  const rl = await rateLimit(`otp-verify:${token}`, { limit: 10, windowSecs: 900 });
  if (!rl.success) {
    return NextResponse.json(
      { ok: false, error: "كثير من المحاولات — انتظر قبل إعادة المحاولة", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  // Rate limit per IP — 15 req/min + 150 req/hr
  const ip = getIP(req);
  const rlIpMin = await rateLimit(`otp-verify-ip-min:${ip}`, { limit: 15, windowSecs: 60 });
  if (!rlIpMin.success) {
    return NextResponse.json(
      { ok: false, error: "كثير من الطلبات — حاول بعد شوية", retryAfter: rlIpMin.retryAfter },
      { status: 429, headers: { "Retry-After": String(rlIpMin.retryAfter ?? 60) } }
    );
  }
  const rlIpHr = await rateLimit(`otp-verify-ip-hr:${ip}`, { limit: 150, windowSecs: 3600 });
  if (!rlIpHr.success) {
    return NextResponse.json(
      { ok: false, error: "تجاوزت حد الطلبات في الساعة — حاول لاحقاً", retryAfter: rlIpHr.retryAfter },
      { status: 429, headers: { "Retry-After": String(rlIpHr.retryAfter ?? 60) } }
    );
  }

  // ── 4. Verify OTP from Redis (timing-safe comparison inside) ─────────────
  const result = await verifyOtp(token, String(code).trim(), auth.projectId);

  if (!result.success) {
    const statusCode = result.error?.includes("غير موجود") ? 404 : 400;
    return NextResponse.json(
      { ok: false, verified: false, error: result.error },
      { status: statusCode }
    );
  }

  // ── 5. Update DB log (for analytics) ──────────────────────────────────────
  if (!result.alreadyVerified) {
    prisma.otpLog.updateMany({
      where: { token, projectId: auth.projectId },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    }).catch((err) => {
      console.error("[otp-verify] Failed to update DB log:", err);
    });
  }

  return NextResponse.json({
    ok:       true,
    verified: true,
    message:  result.alreadyVerified ? "OTP تم التحقق منه مسبقاً" : "OTP تم التحقق بنجاح",
    phone:    result.phone,
  });
}