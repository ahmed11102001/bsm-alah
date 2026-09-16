import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DEVELOPERS_BASE_URL } from "@/lib/dev-links";
import { createHash, randomBytes } from "crypto";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { rateLimiterUnavailableResponse, lmsg, requestLocale, type ApiLocale } from "@/lib/dev-errors";
import { decryptToken } from "@/lib/crypto";
import { storeOtp } from "@/lib/otp-redis";
import { GRAPH_API_VERSION } from "@/lib/meta-graph";
import {
  buildAuthenticationComponents,
  validateOtpTemplateContract,
  OTP_CONTRACT_ERRORS,
  type MetaTemplateComponent,
  type OtpVariableDefinition,
} from "@/lib/developer-template-contract";

interface AuthResult {
  projectId: string;
  developerId: string;
  ownerId: string | null;
  plan: string;
  planRenewsAt: Date | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  trialMessagesUsed: number;
  trialWarningNotifiedAt: Date | null;
  metaConnection: {
    accessToken: string;   // encrypted in DB
    phoneNumberId: string;
    wabaId: string;
    displayPhone: string;
    isVerified: boolean;
  };
}

// ─── Verify API Key ───────────────────────────────────────────────────────────
// يُرجع projectId من الـ API Key — المصدر الوحيد الموثوق للمشروع.
// لا يُعتمد على أي projectId قادم من الـ client.
async function verifyApiKey(raw: string): Promise<AuthResult | { error: "INVALID_KEY" | "NO_META_CONNECTION" } | null> {
  const hash = createHash("sha256").update(raw.trim()).digest("hex");

  const keyRecord = await prisma.developerApiKey.findUnique({
    where: { keyHash: hash },
    include: {
      project: {
        include: {
          metaConnection: true,
          developer: { select: { status: true } },
          owner: { select: { status: true } },
        },
      },
    },
  });

  if (!keyRecord || keyRecord.status !== "ACTIVE") return { error: "INVALID_KEY" };

  // Suspended developer OR owner → key is unusable (same 401 as a bad key).
  if (
    keyRecord.project.developer?.status === "SUSPENDED" ||
    keyRecord.project.owner?.status === "SUSPENDED"
  ) {
    return { error: "INVALID_KEY" };
  }

  const meta = keyRecord.project.metaConnection;
  // ربط Meta غير مكتمل أو غير مفعّل → خطأ مخصص (مش 401 عام)
  if (!meta || !meta.isVerified || !meta.accessToken || !meta.phoneNumberId || !meta.wabaId) {
    return { error: "NO_META_CONNECTION" };
  }

  // track last usage (non-blocking)
  prisma.developerApiKey
    .update({ where: { id: keyRecord.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    projectId: keyRecord.projectId,
    developerId: keyRecord.project.developerId,
    ownerId: keyRecord.project.ownerId,
    plan: keyRecord.project.plan,
    planRenewsAt: keyRecord.project.planRenewsAt,
    trialStartedAt: keyRecord.project.trialStartedAt,
    trialEndsAt: keyRecord.project.trialEndsAt,
    trialMessagesUsed: keyRecord.project.trialMessagesUsed,
    trialWarningNotifiedAt: keyRecord.project.trialWarningNotifiedAt,
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

// ─── Template resolution ────────────────────────────────────────────────────
// القاعدة: المشروع يؤخذ من الـ API Key فقط. القالب يجب أن ينتمي لنفس المشروع.
//
// المسار الأساسي: templateId (يستخدمه Live Tester) — لا غموض فيه.
// المسار المتوافق (legacy): templateName [+ language] — للـ clients الخارجية
// (quick-start/docs). عند تعدد اللغات لنفس الاسم يُرفض مع طلب التحديد.
//
// لا يوجد أي fallback خارج المشروع، ولا أي تجاوز للـ APPROVED.
type TemplateResolution =
  | { ok: true; template: { id: string; name: string; language: string; body: string; category: string; metaTemplateId: string; variables: OtpVariableDefinition[]; metaComponents: MetaTemplateComponent[] } }
  | { ok: false; code: string; error: string; status: number };

async function resolveTemplateById(
  projectId: string,
  templateId: string,
  lang: ApiLocale = "ar"
): Promise<TemplateResolution> {
  const en = lang === "en";
  const template = await prisma.developerOtpTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return { ok: false, code: "TEMPLATE_NOT_FOUND", error: en ? "Template not found in this project" : "القالب غير موجود في هذا المشروع", status: 404 };
  }
  // القالب موجود لكن لمشروع آخر → رفض صريح (لا تسريب وجود/حالة)
  if (template.projectId !== projectId) {
    return { ok: false, code: "TEMPLATE_WRONG_PROJECT", error: en ? "Template does not belong to this project" : "القالب لا ينتمي إلى هذا المشروع", status: 403 };
  }
  return assertTemplateUsable(template, projectId, lang);
}

async function resolveTemplateByName(
  projectId: string,
  rawName: string,
  rawLanguage?: unknown,
  lang: ApiLocale = "ar"
): Promise<TemplateResolution> {
  const en = lang === "en";
  const sep = en ? ", " : "، ";
  const name = rawName.trim().toLowerCase();
  const language = typeof rawLanguage === "string" && rawLanguage.trim()
    ? rawLanguage.trim()
    : undefined;

  const candidates = await prisma.developerOtpTemplate.findMany({
    where: { projectId, name },
    orderBy: { createdAt: "asc" },
  });

  if (candidates.length === 0) {
    return {
      ok: false,
      code: "TEMPLATE_NOT_FOUND",
      error: en
        ? `Template "${name}" not found in this project — make sure it is synced with Meta from the templates page`
        : `القالب "${name}" غير موجود في هذا المشروع — تأكد من مزامنته مع Meta من صفحة القوالب`,
      status: 404,
    };
  }

  let match = candidates;
  if (language) {
    match = match.filter((t) => t.language === language);
    if (match.length === 0) {
      const available = [...new Set(candidates.map((t) => t.language))].join(sep);
      return {
        ok: false,
        code: "TEMPLATE_LANGUAGE_MISMATCH",
        error: en
          ? `Template "${name}" does not exist in language "${language}" — available languages: ${available}`
          : `القالب "${name}" غير موجود باللغة "${language}" — اللغات المتاحة: ${available}`,
        status: 404,
      };
    }
  }

  if (match.length > 1) {
    const available = [...new Set(match.map((t) => t.language))].join(sep);
    return {
      ok: false,
      code: "TEMPLATE_AMBIGUOUS",
      error: en
        ? `Multiple versions of template "${name}" exist — specify the language or use templateId (languages: ${available})`
        : `يوجد أكثر من نسخة للقالب "${name}" — حدد اللغة أو استخدم templateId (اللغات: ${available})`,
      status: 400,
    };
  }

  return assertTemplateUsable(match[0], projectId, lang);
}

// ─── Usability gate — المفوّض الوحيد: validateOtpTemplateContract ──────────
// لا تُستدعى إلا على قالب مؤكد الانتماء للمشروع. أي فشل = لا إرسال (fail closed).
// رسائل العرض العربية هنا فقط (presentation) — القرار نفسه في الـ contract.
function assertTemplateUsable(template: {
  id: string; projectId: string; name: string; language: string; body: string; category: string;
  metaTemplateId: string | null; status: string; variables?: unknown; metaComponents?: unknown;
}, expectedProjectId: string, lang: ApiLocale = "ar"): TemplateResolution {
  const en = lang === "en";
  // رسالة مخصصة لكل حالة عدم اعتماد (لتجربة المطور)
  if (template.status !== "APPROVED") {
    const statusMsg: Record<string, string> = en ? {
      LOCAL_DRAFT: `Template "${template.name}" is a local draft — create an OTP template from the templates page, submit it to Meta, get it approved, then sync`,
      PENDING: `Template "${template.name}" is under Meta review — sync templates after approval, then retry`,
      REJECTED: `Template "${template.name}" was rejected by Meta — check the rejection reason on the templates page`,
      DISABLED: `Template "${template.name}" is currently disabled in Meta`,
    } : {
      LOCAL_DRAFT: `القالب "${template.name}" مسودة محلية — أنشئ قالب OTP من صفحة القوالب وأرسله لـ Meta واعتمده أولًا ثم زامن`,
      PENDING: `القالب "${template.name}" قيد مراجعة Meta — زامن القوالب بعد الموافقة ثم أعد المحاولة`,
      REJECTED: `القالب "${template.name}" مرفوض من Meta — راجع سبب الرفض في صفحة القوالب`,
      DISABLED: `القالب "${template.name}" معطّل حاليًا في Meta`,
    };
    return {
      ok: false,
      code: "TEMPLATE_NOT_APPROVED",
      error: statusMsg[template.status] ?? (en
        ? `Template "${template.name}" is not currently approved (status: ${template.status})`
        : `القالب "${template.name}" غير معتمد حاليًا (الحالة: ${template.status})`),
      status: 400,
    };
  }

  const check = validateOtpTemplateContract({
    id: template.id,
    projectId: template.projectId,
    expectedProjectId,
    name: template.name,
    language: template.language,
    category: template.category,
    status: template.status,
    metaTemplateId: template.metaTemplateId,
    metaComponents: template.metaComponents,
  });
  // ملحوظة: الوجود/الملكية/الحالة فُحصت قبل الوصول هنا — الـ contract يعيد
  // التأكيد عليها كشبكة أمان ثانية بنفس القرار.
  if (!check.ok) {
    switch (check.code) {
      case OTP_CONTRACT_ERRORS.TEMPLATE_NO_META_ID:
        return {
          ok: false,
          code: "TEMPLATE_NO_META_ID",
          error: en
            ? `Template "${template.name}" is approved but not linked to a Meta template — sync templates with Meta first`
            : `القالب "${template.name}" معتمد لكن غير مرتبط بقالب Meta — زامن القوالب مع Meta أولًا`,
          status: 400,
        };
      case OTP_CONTRACT_ERRORS.OTP_TEMPLATE_NOT_COMPATIBLE:
        return {
          ok: false,
          code: "OTP_TEMPLATE_NOT_COMPATIBLE",
          error: en
            ? `Template "${template.name}" is not OTP-compatible (approved AUTHENTICATION required) — ${check.reason}`
            : `القالب "${template.name}" غير متوافق مع OTP (مطلوب AUTHENTICATION معتمد) — ${check.reason}`,
          status: 400,
        };
      default:
        return {
          ok: false,
          code: "OTP_TEMPLATE_METADATA_INVALID",
          error: en
            ? `Template "${template.name}" is not valid for sending — ${check.reason}`
            : `القالب "${template.name}" غير صالح للإرسال — ${check.reason}`,
          status: 409,
        };
    }
  }

  const definitions = Array.isArray(template.variables) ? template.variables as OtpVariableDefinition[] : [];
  return {
    ok: true,
    template: {
      id: template.id,
      name: template.name,
      language: template.language,
      body: template.body,
      category: template.category,
      metaTemplateId: template.metaTemplateId as string,
      variables: definitions,
      metaComponents: template.metaComponents as MetaTemplateComponent[],
    },
  };
}

// ─── Send OTP via Meta WhatsApp Cloud API ─────────────────────────────────────
async function sendWhatsAppOtp(opts: {
  projectId: string;
  templateId: string;
  metaTemplateId: string;
  accessToken: string;
  phoneNumberId: string;
  to: string;           // E.164 without +
  code: string;
  templateName: string;
  language: string;
  expiryMinutes: number;
  category: string;
  variables: OtpVariableDefinition[];
  metaComponents: MetaTemplateComponent[];
}): Promise<{ success: boolean; metaMessageId?: string; error?: string; metaCode?: string; statusCode?: number }> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${opts.phoneNumberId}/messages`;

  // AUTHENTICATION فقط — لا مسار UTILITY/MARKETING هنا إطلاقًا (PHASE 7/20).
  // الـ validator المركزي يمنع غير المتوافق قبل الوصول؛ هذا خط دفاع أخير.
  if (opts.category !== "AUTHENTICATION") {
    return { success: false, error: "OTP_TEMPLATE_NOT_COMPATIBLE: OTP requires an AUTHENTICATION template.", statusCode: 400 };
  }
  const authenticationResult = buildAuthenticationComponents(opts.metaComponents, opts.code);
  if (!authenticationResult.ok) {
    return { success: false, error: "OTP_TEMPLATE_METADATA_INVALID: validated metadata could not build a payload. Please sync templates again.", statusCode: 409 };
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: opts.to,
    type: "template",
    template: {
      name: opts.templateName,
      language: { code: opts.language },
      components: authenticationResult.components,
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
      const metaCode = data.error?.code ? String(data.error.code) : undefined;
      // PHASE 15: structured failure log — sanitized diagnostics only.
      // Never: api keys, access tokens, OTP plaintext, full tokens, phone numbers.
      console.error("[developer-otp-meta]", {
        event: "META_REQUEST_FAILED",
        projectId: opts.projectId,
        templateId: opts.templateId,
        metaTemplateId: opts.metaTemplateId,
        templateName: opts.templateName,
        language: opts.language,
        category: opts.category,
        componentTypes: opts.metaComponents.map((component) => String(component.type ?? "").toUpperCase()),
        parameters: payload.template.components.map((component: any) => ({
          type: component.type,
          index: component.index ?? null,
          count: Array.isArray(component.parameters) ? component.parameters.length : 0,
        })),
        metaCode,
        metaMessage: msg,
      });
      return {
        success: false,
        error: msg,
        metaCode,
        statusCode: metaCode === "131008" ? 422 : res.status >= 500 ? 502 : 400,
      };
    }

    return { success: true, metaMessageId: data.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error", statusCode: 502 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/developers/otp/send
//
// Headers:  x-api-key: wani_live_xxxx  → يحدد المشروع (لا يُقبل projectId من client)
// Body:     { phone, templateId?, templateName?, language?, expiryMinutes? }
//           - templateId: المسار الأساسي (Live Tester) — سجل القالب المحلي
//           - templateName [+ language]: legacy متوافق للـ clients الخارجية
// Response: { ok, token, expiresAt } | { ok: false, error, code }
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const rawKey = req.headers.get("x-api-key")?.trim();
  if (!rawKey) {
    return NextResponse.json(
      { ok: false, error: lmsg(req, "API Key مطلوب في header: x-api-key", "API key is required in the x-api-key header"), code: "INVALID_API_KEY" },
      { status: 401 }
    );
  }

  const auth = await verifyApiKey(rawKey);
  if (!auth || "error" in auth) {
    if (auth && auth.error === "NO_META_CONNECTION") {
      return NextResponse.json(
        { ok: false, error: lmsg(req, "ربط Meta غير مكتمل لهذا المشروع — اربط Meta من صفحة Overview أولًا", "Meta connection is incomplete for this project — connect Meta from the project Overview first"), code: "NO_META_CONNECTION" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: lmsg(req, "API Key غير صحيح أو ملغي — تحقق من x-api-key", "Invalid or revoked API key — check x-api-key"), code: "INVALID_API_KEY" },
      { status: 401 }
    );
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: lmsg(req, "Request body يجب أن يكون JSON صحيح", "Request body must be valid JSON"), code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const { phone, templateId, templateName, language, expiryMinutes = 10 } = body;

  if (!phone) {
    return NextResponse.json(
      { ok: false, error: lmsg(req, "phone مطلوب", "phone is required"), code: "PHONE_REQUIRED" },
      { status: 400 }
    );
  }
  // المسار الأساسي templateId (Live Tester) — والـ legacy templateName للتوافق
  if (!templateId && !templateName) {
    return NextResponse.json(
      { ok: false, error: lmsg(req, "templateId مطلوب — أو templateName للقوالب المعتمدة", "templateId is required — or templateName for approved templates"), code: "TEMPLATE_REF_REQUIRED" },
      { status: 400 }
    );
  }
  // مدة الصلاحية: عدد صحيح موجب بحد أقصى 60 دقيقة — قيمة فاسدة كانت
  // تنتج NaN ثم 500 بعد الإرسال (Invalid Date → toISOString يرمي).
  const expiryMins = Number(expiryMinutes);
  if (!Number.isFinite(expiryMins) || !Number.isInteger(expiryMins) || expiryMins < 1 || expiryMins > 60) {
    return NextResponse.json(
      { ok: false, error: lmsg(req, "expiryMinutes يجب أن يكون عددًا صحيحًا بين 1 و 60", "expiryMinutes must be an integer between 1 and 60"), code: "EXPIRY_INVALID" },
      { status: 400 }
    );
  }

  // ── 3. Normalize phone ────────────────────────────────────────────────────
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return NextResponse.json(
      { ok: false, error: lmsg(req, `رقم الهاتف غير صحيح: "${phone}" — استخدم E.164 أو الصيغة المصرية`, `Invalid phone number: "${phone}" — use E.164 or the Egyptian format`), code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  // ── 4. Plan & Trial enforcement (Project-level) ───────────────────────────
  // قبل الـ rate limit: طلب مرفوض (باقة/قالب) لا يجب أن يستهلك حصة الرقم —
  // وإلا مهاجم يعرف رقم الضحية يستنزف حصتها (5/ساعة) بطلبات فاشلة.
  let isAllowed = false;
  let incrementField = false;

  if (auth.plan === "OWNER_PLAN") {
    // Check if subscription expired
    if (auth.planRenewsAt && new Date() > auth.planRenewsAt) {
      return NextResponse.json(
        { ok: false, error: lmsg(req, "انتهى اشتراك باقة الأونر — يرجى التجديد للاستمرار", "Owner plan subscription has expired — please renew to continue"), code: "NO_ACTIVE_PLAN" },
        { status: 403 }
      );
    }
    isAllowed = true;
  } else {
    // Trial logic
    if (!auth.trialStartedAt) {
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await prisma.developerProject.update({
        where: { id: auth.projectId },
        data: { trialStartedAt: new Date(), trialEndsAt },
      });
      auth.trialStartedAt = new Date();
      auth.trialEndsAt = trialEndsAt;
    } else if (new Date() > auth.trialEndsAt! || auth.trialMessagesUsed >= 50) {
      return NextResponse.json(
        {
          ok: false,
          error: lmsg(req, "انتهت فترة الـ Trial (أو وصلت للحد الأقصى) — اشترك في باقة الأونر للاستمرار", "Trial period has ended (or limit reached) — subscribe to the owner plan to continue"),
          code: "TRIAL_EXPIRED",
          upgradeUrl: `${DEVELOPERS_BASE_URL}/portal/projects/${auth.projectId}/billing`,
        },
        { status: 403 }
      );
    }

    if (auth.trialMessagesUsed === 40 && !auth.trialWarningNotifiedAt) {
      await prisma.developerNotification.create({
        data: {
          developerId: auth.developerId,
          type: "TRIAL_WARNING",
          title: "تنبيه استهلاك الباقة المجانية",
          message: "وصلت لـ 80% من رصيد الرسائل المجانية (40 من 50) لمشروعك.",
          link: `${DEVELOPERS_BASE_URL}/portal/projects/${auth.projectId}/billing`
        }
      });
      await prisma.developerProject.update({
        where: { id: auth.projectId },
        data: { trialWarningNotifiedAt: new Date() },
      });
    }

    isAllowed = true;
    incrementField = true;
  }

  // ── 5. Resolve template (المشروع من الـ API Key فقط) ────────────────────
  // لا يُقبل أي projectId من الـ client — ولا يُجبر الـ backend على اسم مختلف.
  // قبل الـ rate limit لنفس السبب: طلب مرفوض لا يستهلك حصة الرقم.
  const lang = requestLocale(req);
  const resolution = templateId
    ? await resolveTemplateById(auth.projectId, String(templateId), lang)
    : await resolveTemplateByName(auth.projectId, String(templateName), language, lang);
  if (!resolution.ok) {
    return NextResponse.json(
      { ok: false, error: resolution.error, code: resolution.code },
      { status: resolution.status }
    );
  }
  const template = resolution.template;

  // ── 6. Rate limit: per phone + per IP (بعد كل التحققات — قبل أي أثر جانبي)
  const rlPhone = `otp-send:${auth.projectId}:${normalizedPhone}`;
  // fail-closed: عطل Redis أثناء OTP ≠ سماح — نرفض بـ 503 بدل الـ bypass.
  const rl = await rateLimit(rlPhone, { limit: 5, windowSecs: 3600 }, { failureMode: "closed" });
  if (!rl.success) {
    if (rl.unavailable) return rateLimiterUnavailableResponse(rl.retryAfter, undefined, req);
    return NextResponse.json(
      {
        ok: false,
        error: lmsg(req, `Rate limit — وصلت للحد الأقصى (5 رسائل/ساعة) لهذا الرقم`, `Rate limit — maximum reached (5 messages/hour) for this number`),
        code: "RATE_LIMIT_PHONE",
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
  const rlIpMin = await rateLimit(`otp-send-ip-min:${ip}`, { limit: 15, windowSecs: 60 }, { failureMode: "closed" });
  if (!rlIpMin.success) {
    if (rlIpMin.unavailable) return rateLimiterUnavailableResponse(rlIpMin.retryAfter, undefined, req);
    return NextResponse.json(
      { ok: false, error: lmsg(req, "كثير من الطلبات — حاول بعد شوية", "Too many requests — try again shortly"), code: "RATE_LIMIT_IP", retryAfter: rlIpMin.retryAfter },
      { status: 429, headers: { "Retry-After": String(rlIpMin.retryAfter ?? 60) } }
    );
  }
  const rlIpHr = await rateLimit(`otp-send-ip-hr:${ip}`, { limit: 150, windowSecs: 3600 }, { failureMode: "closed" });
  if (!rlIpHr.success) {
    if (rlIpHr.unavailable) return rateLimiterUnavailableResponse(rlIpHr.retryAfter, undefined, req);
    return NextResponse.json(
      { ok: false, error: lmsg(req, "تجاوزت حد الطلبات في الساعة — حاول لاحقاً", "Hourly request limit exceeded — try again later"), code: "RATE_LIMIT_IP", retryAfter: rlIpHr.retryAfter },
      { status: 429, headers: { "Retry-After": String(rlIpHr.retryAfter ?? 60) } }
    );
  }

  // ── 7. Generate OTP + token (server-side فقط — الـ client لا يرسل OTP) ────
  const otpCode = generateOtp();
  const token   = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + expiryMins * 60 * 1000);
  // correlation id للّوجز — أول 8 أحرف فقط، بلا phone/code/token كامل/secrets
  const correlationId = token.slice(0, 8);
  console.log("[developer-otp]", {
    event: "OTP_SEND_STARTED",
    correlationId,
    projectId: auth.projectId,
    templateId: template.id,
    metaTemplateId: template.metaTemplateId,
    category: template.category,
    language: template.language,
  });

  // ── 8. فك تشفير الـ accessToken من DB ────────────────────────────────────
  const plainAccessToken = decryptToken(auth.metaConnection.accessToken);

  // ── 9. Send via Meta ──────────────────────────────────────────────────────
  const sendResult = await sendWhatsAppOtp({
    projectId:      auth.projectId,
    templateId:     template.id,
    metaTemplateId: template.metaTemplateId,
    accessToken:   plainAccessToken,
    phoneNumberId: auth.metaConnection.phoneNumberId,
    to:            normalizedPhone,
    code:          otpCode,
    templateName:  template.name,
    language:      template.language,
    expiryMinutes: Number(expiryMinutes),
    category: template.category,
    variables: template.variables,
    metaComponents: template.metaComponents,
  });

  // ── 10. Persist OTP state (Redis + DB) ────────────────────────────────────
  // حرج: لو الحفظ فشل بعد نجاح Meta، الكود وصل للمستخدم لكن لا يمكن التحقق
  // منه (500 صامتة كانت تُرجع بلا token ولا تفسير). أي فشل هنا = 502 صريح
  // "اطلب كود جديد" + لا يُحتسب من الـ trial.
  let persistOk = true;
  try {
    // ── 10a. Store in Redis (code hash only — no plain code stored) ─────────
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
      expiryMinutes: expiryMins,
    });

    // ── 10b. Log to DB (without code — for analytics only) ──────────────────
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
  } catch (persistErr) {
    persistOk = false;
    console.error("[developer-otp]", {
      event: "OTP_PERSIST_FAILED",
      correlationId,
      projectId: auth.projectId,
      templateId: template.id,
      metaDelivered: sendResult.success,
      error: persistErr instanceof Error ? persistErr.message : "persistence failure",
    });
  }

  if (sendResult.success && !persistOk) {
    // الكود اتبعت لكن لا يمكن التحقق منه — لا نرجع token يعطي إحساسًا كاذبًا
    // بالنجاح، ولا نحتسبه من الـ trial.
    return NextResponse.json(
      {
        ok: false,
        error: lmsg(req, "تم إرسال الكود لكن تعذر حفظه للتحقق — اطلب كودًا جديدًا", "The code was sent but could not be stored for verification — request a new code"),
        code: "OTP_STORE_FAILED",
      },
      { status: 502 }
    );
  }

  // ── 12. Increment trial counter (non-blocking) ────────────────────────────
  if (sendResult.success && incrementField) {
    prisma.developerProject
      .update({
        where: { id: auth.projectId },
        data: { trialMessagesUsed: { increment: 1 } },
      })
      .catch(() => {});
  }

  // ── 13. Return ────────────────────────────────────────────────────────────
  if (!sendResult.success) {
    const isPayloadMismatch = sendResult.metaCode === "131008";
    if (isPayloadMismatch) {
      console.error("[developer-otp]", {
        event: "OTP_SEND_FAILED",
        correlationId,
        projectId: auth.projectId,
        templateId: template.id,
        metaCode: sendResult.metaCode,
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: isPayloadMismatch
          ? lmsg(req, `القالب "${template.name}" مرفوض من Meta (parameters mismatch) — زامن القوالب من صفحة القوالب ثم أعد المحاولة. لو تكرر، راجع تعريف القالب في Meta.`, `Template "${template.name}" was rejected by Meta (parameters mismatch) — sync templates from the templates page and retry. If it persists, review the template definition in Meta.`)
          : "WhatsApp send failed: " + sendResult.error,
        code: isPayloadMismatch ? "META_131008" : "META_SEND_FAILED",
        ...(sendResult.metaCode ? { metaCode: sendResult.metaCode } : {}),
      },
      { status: sendResult.statusCode ?? 502 }
    );
  }

  console.log("[developer-otp]", {
    event: "OTP_SEND_SUCCESS",
    correlationId,
    projectId: auth.projectId,
    templateId: template.id,
  });

  const remaining = incrementField
    ? { messagesLeft: 50 - (auth.trialMessagesUsed + 1) }
    : {};

  return NextResponse.json({
    ok: true,
    token,
    expiresAt: expiresAt.toISOString(),
    ...remaining,
  });
}
