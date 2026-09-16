import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash } from "crypto";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { rateLimiterUnavailableResponse, lmsg, requestLocale } from "@/lib/dev-errors";
import { verifyOtp } from "@/lib/otp-redis";

// ─── Verify API Key ───────────────────────────────────────────────────────────
async function verifyApiKey(raw: string): Promise<{ projectId: string; developerId: string } | null> {
  const hash = createHash("sha256").update(raw.trim()).digest("hex");
  const keyRecord = await prisma.developerApiKey.findUnique({
    where: { keyHash: hash },
    include: {
      project: {
        select: {
          developerId: true,
          developer: { select: { status: true } },
          owner: { select: { status: true } },
        },
      },
    },
  });
  if (!keyRecord || keyRecord.status !== "ACTIVE") return null;

  // Suspended developer OR owner → key is unusable (same 401 as a bad key).
  if (
    keyRecord.project.developer?.status === "SUSPENDED" ||
    keyRecord.project.owner?.status === "SUSPENDED"
  ) {
    return null;
  }

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
      { ok: false, error: lmsg(req, "x-api-key header مطلوب", "x-api-key header is required"), code: "INVALID_API_KEY" },
      { status: 401 }
    );
  }

  const auth = await verifyApiKey(rawKey);
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: lmsg(req, "API Key غير صحيح أو ملغي", "Invalid or revoked API key"), code: "INVALID_API_KEY" },
      { status: 401 }
    );
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: any;
  try { body = await req.json(); }
  catch {
    return NextResponse.json(
      { ok: false, error: lmsg(req, "Request body يجب أن يكون JSON صحيح", "Request body must be valid JSON"), code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const { token, code } = body;

  if (!token || !code) {
    return NextResponse.json(
      { ok: false, error: lmsg(req, "token و code مطلوبين في body", "token and code are required in body"), code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  // ── 3. Rate limit: per token + per IP (distributed attacks) ───────────────
  // 10 محاولات كل 15 دقيقة لكل token
  // fail-closed: عطل Redis أثناء OTP ≠ سماح — نرفض بـ 503 بدل الـ bypass.
  const rl = await rateLimit(`otp-verify:${token}`, { limit: 10, windowSecs: 900 }, { failureMode: "closed" });
  if (!rl.success) {
    if (rl.unavailable) return rateLimiterUnavailableResponse(rl.retryAfter, undefined, req);
    return NextResponse.json(
      { ok: false, error: lmsg(req, "كثير من المحاولات — انتظر قبل إعادة المحاولة", "Too many attempts — wait before retrying"), code: "RATE_LIMITED", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  // Rate limit per IP — 15 req/min + 150 req/hr
  const ip = getIP(req);
  const rlIpMin = await rateLimit(`otp-verify-ip-min:${ip}`, { limit: 15, windowSecs: 60 }, { failureMode: "closed" });
  if (!rlIpMin.success) {
    if (rlIpMin.unavailable) return rateLimiterUnavailableResponse(rlIpMin.retryAfter, undefined, req);
    return NextResponse.json(
      { ok: false, error: lmsg(req, "كثير من الطلبات — حاول بعد شوية", "Too many requests — try again shortly"), code: "RATE_LIMITED", retryAfter: rlIpMin.retryAfter },
      { status: 429, headers: { "Retry-After": String(rlIpMin.retryAfter ?? 60) } }
    );
  }
  const rlIpHr = await rateLimit(`otp-verify-ip-hr:${ip}`, { limit: 150, windowSecs: 3600 }, { failureMode: "closed" });
  if (!rlIpHr.success) {
    if (rlIpHr.unavailable) return rateLimiterUnavailableResponse(rlIpHr.retryAfter, undefined, req);
    return NextResponse.json(
      { ok: false, error: lmsg(req, "تجاوزت حد الطلبات في الساعة — حاول لاحقاً", "Hourly request limit exceeded — try again later"), code: "RATE_LIMITED", retryAfter: rlIpHr.retryAfter },
      { status: 429, headers: { "Retry-After": String(rlIpHr.retryAfter ?? 60) } }
    );
  }

  // ── 4. Verify OTP from Redis (timing-safe comparison inside) ─────────────
  const result = await verifyOtp(token, String(code).trim(), auth.projectId, requestLocale(req));

  if (!result.success) {
    // 404 للغير موجود فقط — الباقي 400 مع code مخصص (بلا تخمين من النص)
    const statusCode = result.code === "TOKEN_NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      { ok: false, verified: false, error: result.error, code: result.code ?? "VERIFY_FAILED" },
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
    message:  result.alreadyVerified
      ? lmsg(req, "OTP تم التحقق منه مسبقاً", "OTP was already verified")
      : lmsg(req, "OTP تم التحقق بنجاح", "OTP verified successfully"),
    phone:    result.phone,
  });
}