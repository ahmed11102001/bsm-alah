import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

// ── Verify API Key from header ──────────────────────────────────────────────
async function verifyApiKey(apiKey: string): Promise<{ developerId: string; metaConnection: any } | null> {
  const hash = createHash("sha256").update(apiKey).digest("hex");
  const keyRecord = await prisma.developerApiKey.findUnique({
    where: { keyHash: hash },
    include: { developer: { include: { metaConnection: true } } },
  });

  if (!keyRecord || keyRecord.status !== "ACTIVE") return null;
  if (!keyRecord.developer.metaConnection) return null;

  // Update lastUsedAt
  await prisma.developerApiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    developerId: keyRecord.developerId,
    metaConnection: keyRecord.developer.metaConnection,
  };
}

// ── Generate 6-digit OTP ────────────────────────────────────────────────────
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Send via Meta WhatsApp API ──────────────────────────────────────────────
async function sendWhatsAppOtp(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  code: string,
  templateName?: string
): Promise<{ success: boolean; metaMessageId?: string; error?: string }> {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const body: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/\+/g, ""),
    type: "template",
    template: {
      name: templateName || "otp_verification",
      language: { code: "ar" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: code }],
        },
      ],
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || "Meta API error",
      };
    }

    return { success: true, metaMessageId: data.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/otp/send
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

    const auth = await verifyApiKey(apiKey);
    if (!auth) {
      return NextResponse.json(
        { error: "API Key غير صحيح أو ملغي" },
        { status: 401 }
      );
    }

    // 2. Parse body
    const { phone, templateName, code: userCode, expiryMinutes = 10 } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { error: "رقم التليفون (phone) مطلوب" },
        { status: 400 }
      );
    }

    // 3. Rate limit: 5 per phone per hour (using Upstash/redis rate limiter)
    const rateLimitKey = `otp-send:${auth.developerId}:${phone}`;
    const rl = await rateLimit(rateLimitKey, { limit: 5, windowSecs: 3600 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit: 5 رسائل بس في الساعة لنفس الرقم" },
        { status: 429 }
      );
    }

    // 4. Generate or use provided code
    const otpCode = userCode || generateOtp();
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // 5. Send via Meta
    const sendResult = await sendWhatsAppOtp(
      auth.metaConnection.accessToken,
      auth.metaConnection.phoneNumberId,
      phone,
      otpCode,
      templateName
    );

    // 6. Save to DB
    await prisma.otpLog.create({
      data: {
        developerId: auth.developerId,
        phone,
        token,
        code: otpCode,
        status: sendResult.success ? "SENT" : "FAILED",
        metaMessageId: sendResult.metaMessageId || null,
        error: sendResult.error || null,
        sentAt: sendResult.success ? new Date() : null,
        expiredAt: expiresAt,
      },
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { error: "فشل الإرسال: " + sendResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      token,
      expiresAt: expiresAt.toISOString(),
      message: "OTP sent successfully",
    });
  } catch (err: any) {
    console.error("[otp-send]", err);
    return NextResponse.json(
      { error: "حصل خطأ: " + (err.message || "unknown") },
      { status: 500 }
    );
  }
}
