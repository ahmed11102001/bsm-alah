import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { decryptToken } from "@/lib/crypto";
import { storeOtp } from "@/lib/otp-redis";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthResult {
  projectId: string;
  developerId: string;
  ownerId: string | null;
  metaConnection: {
    accessToken: string;   // encrypted in DB
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
    ownerId: keyRecord.project.ownerId,
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

  // ── 4. Rate limit: per phone + per IP (distributed attack protection) ─────
  const rlPhone = `otp-send:${auth.projectId}:${normalizedPhone}`;
  const rl = await rateLimit(rlPhone, { limit: 5, windowSecs: 3600 });
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

  // Rate limit per IP — حماية من distributed attacks
  const ip = getIP(req);
  const rlIpMin = await rateLimit(`otp-send-ip-min:${ip}`, { limit: 15, windowSecs: 60 });
  if (!rlIpMin.success) {
    return NextResponse.json(
      { ok: false, error: "كثير من الطلبات — حاول بعد شوية", retryAfter: rlIpMin.retryAfter },
      { status: 429, headers: { "Retry-After": String(rlIpMin.retryAfter ?? 60) } }
    );
  }
  const rlIpHr = await rateLimit(`otp-send-ip-hr:${ip}`, { limit: 150, windowSecs: 3600 });
  if (!rlIpHr.success) {
    return NextResponse.json(
      { ok: false, error: "تجاوزت حد الطلبات في الساعة — حاول لاحقاً", retryAfter: rlIpHr.retryAfter },
      { status: 429, headers: { "Retry-After": String(rlIpHr.retryAfter ?? 60) } }
    );
  }

  // ── 5. Trial enforcement ──────────────────────────────────────────────────
  const billingUserId = auth.ownerId ?? auth.developerId;
  const developer = await prisma.developerUser.findUnique({
    where: { id: billingUserId },
    select: { plan: true, trialEndsAt: true, trialMessagesUsed: true },
  });

  if (!developer) {
    return NextResponse.json({ ok: false, error: "حساب المطور غير موجود" }, { status: 401 });
  }

  if (developer.plan === "TRIAL") {
    const now = new Date();

    if (developer.trialEndsAt && now > developer.trialEndsAt) {
      return NextResponse.json(
        {
          ok: false,
          error: "انتهت فترة الـ Trial (14 يوم) — اشترك في خطة Developer للاستمرار",
          code: "TRIAL_EXPIRED",
          upgradeUrl: "/developers/upgrade",
        },
        { status: 403 }
      );
    }

    if (developer.trialMessagesUsed >= 50) {
      return NextResponse.json(
        {
          ok: false,
          error: "وصلت للحد الأقصى للـ Trial (50 رسالة) — اشترك في خطة Developer للاستمرار",
          code: "TRIAL_MESSAGES_EXHAUSTED",
          upgradeUrl: "/developers/upgrade",
        },
        { status: 403 }
      );
    }
  }

  // ── 6. Resolve template ───────────────────────────────────────────────────
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

  // ── 7. Generate OTP + token ───────────────────────────────────────────────
  const otpCode = generateOtp();
  const token   = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + Number(expiryMinutes) * 60 * 1000);

  // Count vars in template body
  const varCount = (template.body.match(/\{\{\d+\}\}/g) ?? []).length;

  // ── 8. فك تشفير الـ accessToken من DB ────────────────────────────────────
  const plainAccessToken = decryptToken(auth.metaConnection.accessToken);

  // ── 9. Send via Meta ──────────────────────────────────────────────────────
  const sendResult = await sendWhatsAppOtp({
    accessToken:   plainAccessToken,
    phoneNumberId: auth.metaConnection.phoneNumberId,
    to:            normalizedPhone,
    code:          otpCode,
    templateName:  template.name,
    language:      template.language,
    varCount,
  });

  // ── 10. Store in Redis (code hash only — no plain code stored) ────────────
  await storeOtp({
    token,
    code:          otpCode,
    phone:         normalizedPhone,
    projectId:     auth.projectId,
    developerId:   auth.developerId,
    status:        sendResult.success ? "SENT" : "FAILED",
    metaMessageId: sendResult.metaMessageId ?? null,
    error:         sendResult.error ?? null,
    sentAt:        sendResult.success ? new Date() : null,
    expiryMinutes: Number(expiryMinutes),
  });

  // ── 11. Log to DB (without code — for analytics only) ─────────────────────
  await prisma.otpLog.create({
    data: {
      developerId: auth.developerId,
      projectId:   auth.projectId,
      phone:       normalizedPhone,
      token,
      code:        "REDACTED", // الكود مش بيتخزن في DB — موجود في Redis فقط
      status:      sendResult.success ? "SENT" : "FAILED",
      metaMessageId: sendResult.metaMessageId ?? null,
      error:       sendResult.error ?? null,
      sentAt:      sendResult.success ? new Date() : null,
      expiredAt:   expiresAt,
    },
  });

  // ── 12. Increment trial counter (non-blocking) ────────────────────────────
  if (sendResult.success && developer.plan === "TRIAL") {
    prisma.developerUser
      .update({
        where: { id: billingUserId },
        data: { trialMessagesUsed: { increment: 1 } },
      })
      .catch(() => {});
  }

  // ── 13. Return ────────────────────────────────────────────────────────────
  if (!sendResult.success) {
    return NextResponse.json(
      { ok: false, error: "فشل الإرسال عبر WhatsApp: " + sendResult.error },
      { status: 502 }
    );
  }

  const remaining = developer.plan === "TRIAL"
    ? { messagesLeft: 50 - (developer.trialMessagesUsed + 1) }
    : {};

  return NextResponse.json({
    ok: true,
    token,
    expiresAt: expiresAt.toISOString(),
    ...remaining,
  });
}