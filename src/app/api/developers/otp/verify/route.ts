import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

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

  // ── 3. Rate limit: منع brute-force على نفس الـ token ─────────────────────
  // 10 محاولات كل 15 دقيقة لكل token
  const rl = await rateLimit(`otp-verify:${token}`, { limit: 10, windowSecs: 900 });
  if (!rl.success) {
    return NextResponse.json(
      { ok: false, error: "كثير من المحاولات — انتظر قبل إعادة المحاولة", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  // ── 4. Find OTP record ────────────────────────────────────────────────────
  const otp = await prisma.otpLog.findFirst({
    where: { token, projectId: auth.projectId },
  });

  if (!otp) {
    return NextResponse.json(
      { ok: false, verified: false, error: "Token غير موجود أو لا ينتمي لهذا الـ API Key" },
      { status: 404 }
    );
  }

  // ── 5. Already verified ───────────────────────────────────────────────────
  if (otp.status === "VERIFIED") {
    return NextResponse.json({
      ok: true,
      verified: true,
      message: "OTP تم التحقق منه مسبقاً",
    });
  }

  // ── 6. Failed OTP (never sent) ────────────────────────────────────────────
  if (otp.status === "FAILED") {
    return NextResponse.json(
      { ok: false, verified: false, error: "OTP لم يُرسل بنجاح، اطلب كود جديد" },
      { status: 400 }
    );
  }

  // ── 7. Expired ────────────────────────────────────────────────────────────
  const now = new Date();
  if (otp.expiredAt && now > otp.expiredAt) {
    // Update status to EXPIRED if not already
    if (otp.status !== "EXPIRED") {
      await prisma.otpLog.update({
        where: { id: otp.id },
        data: { status: "EXPIRED" },
      });
    }
    return NextResponse.json(
      { ok: false, verified: false, error: "OTP انتهت صلاحيته — اطلب كود جديد" },
      { status: 400 }
    );
  }

  // ── 8. Wrong code ─────────────────────────────────────────────────────────
  if (otp.code !== String(code).trim()) {
    return NextResponse.json(
      { ok: false, verified: false, error: "الكود غير صحيح" },
      { status: 400 }
    );
  }

  // ── 9. Success — mark verified ────────────────────────────────────────────
  await prisma.otpLog.update({
    where: { id: otp.id },
    data: {
      status:     "VERIFIED",
      verifiedAt: now,
    },
  });

  return NextResponse.json({
    ok:       true,
    verified: true,
    message:  "OTP تم التحقق بنجاح",
    phone:    otp.phone,
  });
}