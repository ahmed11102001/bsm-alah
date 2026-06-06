import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import prisma from "@/lib/prisma";

async function verifyApiKey(apiKey: string): Promise<string | null> {
  const hash = createHash("sha256").update(apiKey).digest("hex");
  const keyRecord = await prisma.developerApiKey.findUnique({
    where: { keyHash: hash },
  });
  if (!keyRecord || keyRecord.status !== "ACTIVE") return null;
  return keyRecord.developerId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "API Key مطلوب" }, { status: 401 });
    }

    const developerId = await verifyApiKey(apiKey);
    if (!developerId) {
      return NextResponse.json({ error: "API Key غير صحيح" }, { status: 401 });
    }

    const { token } = params;

    const otp = await prisma.otpLog.findFirst({
      where: { token, developerId },
    });

    if (!otp) {
      return NextResponse.json({ error: "Token مش موجود" }, { status: 404 });
    }

    return NextResponse.json({
      token: otp.token,
      status: otp.status.toLowerCase(),
      phone: otp.phone,
      sentAt: otp.sentAt?.toISOString() || null,
      verifiedAt: otp.verifiedAt?.toISOString() || null,
      expiresAt: otp.expiredAt?.toISOString() || null,
    });
  } catch (err: any) {
    console.error("[otp-status]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}
