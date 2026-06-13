import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthResult {
  projectId: string;
  developerId: string;
  metaConnection: {
    accessToken: string;
    phoneNumberId: string;
    wabaId: string;
    displayPhone: string;
    isVerified: boolean;
  };
}

// ─── Verify API Key ───────────────────────────────────────────────────────────
async function verifyApiKey(raw: string): Promise<AuthResult | null> {
  const hash = createHash("sha256").update(raw.trim()).digest("hex");

  const keyRecord = await prisma.developerApiKey.findUnique({
    where: { keyHash: hash },
    include: {
      project: {
        include: { metaConnection: true },
      },
    },
  });

  if (!keyRecord || keyRecord.status !== "ACTIVE") return null;

  const meta = keyRecord.project.metaConnection;
  if (!meta || !meta.isVerified) return null;

  // track last usage (non-blocking)
  prisma.developerApiKey
    .update({ where: { id: keyRecord.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    projectId: keyRecord.projectId,
    developerId: keyRecord.project.developerId,
    metaConnection: meta,
  };
}

// ─── Normalize phone → E.164 ──────────────────────────────────────────────────
function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  // مصري: 010/011/012/015
  const eg = cleaned.match(/^(?:\+?20)?0?(1[0125]\d{8})$/);
  if (eg) return `20${eg[1]}`;
  // دولي: +XXXXXXXXX
  const intl = cleaned.match(/^\+?(\d{7,15})$/);
  if (intl) return intl[1];
  return null;
}

// ─── Generate 6-digit OTP ─────────────────────────────────────────────────────
function generateOtp(): string {
  // cryptographically random
  const buf = randomBytes(3);
  const num = ((buf[0] << 16) | (buf[1] << 8) | buf[2]) % 900000 + 100000;
  return num.toString();
}

// ─── Resolve template: find APPROVED template by name ────────────────────────
async function resolveTemplate(projectId: string, templateName: string) {
  return prisma.developerOtpTemplate.findFirst({
    where: {
      projectId,
      name: templateName,
      status: "APPROVED",
    },
  });
}

// ─── Send OTP via Meta WhatsApp Cloud API ─────────────────────────────────────
async function sendWhatsAppOtp(opts: {
  accessToken: string;
  phoneNumberId: string;
  to: string;           // E.164 without +
  code: string;
  templateName: string;
  language: string;
  varCount: number;     // how many {{N}} in body
}): Promise<{ success: boolean; metaMessageId?: string; error?: string }> {
  const url = `https://graph.facebook.com/v21.0/${opts.phoneNumberId}/messages`;

  // Build body parameters — fill all vars with the OTP code (most templates use 1 var)
  const bodyParams = Array.from({ length: Math.max(opts.varCount, 1) }, () => ({
    type: "text",
    text: opts.code,
  }));

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: opts.to,
    type: "template",
    template: {
      name: opts.templateName,
      language: { code: opts.language },
      components: [
        { type: "body", parameters: bodyParams },
      ],
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const msg = data.error?.error_user_msg || data.error?.message || "Meta API error";
      return { success: false, error: msg };
    }

    return { success: true, metaMessageId: data.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/developers/otp/send
//
// Headers:  x-api-key: wani_live_xxxx
// Body:     { phone, templateName, expiryMinutes? }
// Response: { ok, token, expiresAt }
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const rawKey = req.headers.get("x-api-key")?.trim();
  if (!rawKey) {
    return NextResponse.json(
      { ok: false, error: "API Key مطلوب في header: x-api-key" },
      { status: 401 }
    );
  }

  const auth = await verifyApiKey(rawKey);
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: "API Key غير صحيح أو ملغي — تحقق من x-api-key" },
      { status: 401 }
    );
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Request body يجب أن يكون JSON صحيح" },
      { status: 400 }
    );
  }

  const { phone, templateName, expiryMinutes = 10 } = body;

  if (!phone) {
    return NextResponse.json(
      { ok: false, error: "phone مطلوب" },
      { status: 400 }
    );
  }
  if (!templateName) {
    return NextResponse.json(
      { ok: false, error: "templateName مطلوب — اسم القالب الـ APPROVED في Meta" },
      { status: 400 }
    );
  }

  // ── 3. Normalize phone ────────────────────────────────────────────────────
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return NextResponse.json(
      { ok: false, error: `رقم الهاتف غير صحيح: "${phone}" — استخدم E.164 أو الصيغة المصرية` },
      { status: 400 }
    );
  }

  // ── 4. Rate limit: 5 OTPs per phone per hour per developer ───────────────
  const rlKey = `otp-send:${auth.projectId}:${normalizedPhone}`;
  const rl = await rateLimit(rlKey, { limit: 5, windowSecs: 3600 });
  if (!rl.success) {
    return NextResponse.json(
      {
        ok: false,
        error: `Rate limit — وصلت للحد الأقصى (5 رسائل/ساعة) لهذا الرقم`,
        retryAfter: rl.retryAfter,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter ?? 60) },
      }
    );
  }

  // ── 5. Resolve template ───────────────────────────────────────────────────
  const template = await resolveTemplate(auth.projectId, templateName);
  if (!template) {
    return NextResponse.json(
      {
        ok: false,
        error: `القالب "${templateName}" مش موجود أو لسه ما اتوافقش من Meta (status يجب أن يكون APPROVED)`,
      },
      { status: 400 }
    );
  }

  // ── 6. Generate OTP + token ───────────────────────────────────────────────
  const otpCode = generateOtp();
  const token   = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + Number(expiryMinutes) * 60 * 1000);

  // Count vars in template body
  const varCount = (template.body.match(/\{\{\d+\}\}/g) ?? []).length;

  // ── 7. Send via Meta ──────────────────────────────────────────────────────
  const sendResult = await sendWhatsAppOtp({
    accessToken:   auth.metaConnection.accessToken,
    phoneNumberId: auth.metaConnection.phoneNumberId,
    to:            normalizedPhone,
    code:          otpCode,
    templateName:  template.name,
    language:      template.language,
    varCount,
  });

  // ── 8. Log to DB ──────────────────────────────────────────────────────────
  await prisma.otpLog.create({
    data: {
      developerId: auth.developerId,
      projectId: auth.projectId,
      phone:         normalizedPhone,
      token,
      code:          otpCode,
      status:        sendResult.success ? "SENT" : "FAILED",
      metaMessageId: sendResult.metaMessageId ?? null,
      error:         sendResult.error ?? null,
      sentAt:        sendResult.success ? new Date() : null,
      expiredAt:     expiresAt,
    },
  });

  // ── 9. Return ─────────────────────────────────────────────────────────────
  if (!sendResult.success) {
    return NextResponse.json(
      { ok: false, error: "فشل الإرسال عبر WhatsApp: " + sendResult.error },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    token,
    expiresAt: expiresAt.toISOString(),
  });
}