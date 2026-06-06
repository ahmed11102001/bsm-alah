import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash } from "crypto";

// ── Verify API Key ──────────────────────────────────────────────────────────
async function verifyApiKey(apiKey: string): Promise<string | null> {
  const hash = createHash("sha256").update(apiKey).digest("hex");
  const keyRecord = await prisma.developerApiKey.findUnique({
    where: { keyHash: hash },
  });
  if (!keyRecord || keyRecord.status !== "ACTIVE") return null;

  await prisma.developerApiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return keyRecord.developerId;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/otp/verify
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key مطلوب في header: x-api-key" },
        { status: 401 }
      );
    }

    const developerId = await verifyApiKey(apiKey);
    if (!developerId) {
      return NextResponse.json(
        { error: "API Key غير صحيح" },
        { status: 401 }
      );
    }

    // 2. Parse body
    const { token, code } = await req.json();

    if (!token || !code) {
      return NextResponse.json(
        { error: "token و code مطلوبين" },
        { status: 400 }
      );
    }

    // 3. Find OTP by token + developerId
    const otp = await prisma.otpLog.findFirst({
      where: { token, developerId },
    });

    if (!otp) {
      return NextResponse.json(
        { error: "Token مش موجود" },
        { status: 404 }
      );
    }

    // 4. Check if already verified
    if (otp.status === "VERIFIED") {
      return NextResponse.json({
        ok: true,
        verified: true,
        message: "OTP already verified",
      });
    }

    // 5. Check if expired
    if (otp.expiredAt && new Date() > otp.expiredAt) {
      await prisma.otpLog.update({
        where: { id: otp.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "OTP expired", verified: false },
        { status: 400 }
      );
    }

    // 6. Check if failed
    if (otp.status === "FAILED") {
      return NextResponse.json(
        { error: "OTP failed to send", verified: false },
        { status: 400 }
      );
    }

    // 7. Compare code
    if (otp.code !== code) {
      return NextResponse.json(
        { error: "كود غير صحيح", verified: false },
        { status: 400 }
      );
    }

    // 8. Mark as verified
    await prisma.otpLog.update({
      where: { id: otp.id },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      verified: true,
      message: "OTP verified successfully",
    });
  } catch (err: any) {
    console.error("[otp-verify]", err);
    return NextResponse.json(
      { error: "حصل خطأ: " + (err.message || "unknown") },
      { status: 500 }
    );
  }
}
