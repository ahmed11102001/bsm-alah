// src/lib/dev-otp-sender.ts
// ══════════════════════════════════════════════════════════════════════════════
//  محرك إرسال OTP الموحد — المصدر الوحيد المعتمد للإرسال.
//
//  يستخدمه:
//    - POST /api/developers/otp/send (HTTP — الـ Portal والـ CLI)
//    - فلو التسجيل (داخليًا — OTP التحقق من رقم وني عبر مشروع السيستم)
//
//  القاعدة: أي إرسال OTP في المنظومة يمر من هنا — نفس الفوترة (ledger) ونفس
//  الـ rate limits ونفس التخزين (Redis) ونفس التحقق من القوالب.
//  لا يوجد أي مسار إرسال موازٍ.
// ══════════════════════════════════════════════════════════════════════════════

import prisma from "@/lib/prisma";
import { DEVELOPERS_BASE_URL } from "@/lib/dev-links";
import { createHash, randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import type { ApiLocale } from "@/lib/dev-errors";
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
import type { BillingSource } from "@/lib/portal-billing";

export interface SendProjectOtpInput {
  /** الـ API Key الخام — المصدر الوحيد الموثوق للمشروع. لا يُقبل projectId. */
  apiKey: string | null;
  body: any;
  /** true لو فشل parse الـ JSON (للحفاظ على كود INVALID_REQUEST) */
  bodyParseError?: boolean;
  ip: string;
  locale: ApiLocale;
  /** للمناداة الداخلية الموثوقة فقط — يُرجع الكود الصريح (لا يظهر في json أبدًا) */
  revealCode?: boolean;
}

export interface SendProjectOtpResult {
  status: number;
  json: Record<string, unknown>;
  headers?: Record<string, string>;
  /** موجود فقط عند revealCode=true ونجاح الإرسال */
  plainCode?: string;
}

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
  trialCreditsTotal: number;
  trialCreditsUsed: number;
  monthlyFreeTotal: number;
  monthlyFreeUsed: number;
  monthlyPeriodStart: Date | null;
  monthlyPeriodEnd: Date | null;
  paidBalanceEGP: number;
  projectCreatedAt: Date;
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
    trialCreditsTotal: keyRecord.project.trialCreditsTotal,
    trialCreditsUsed: keyRecord.project.trialCreditsUsed,
    monthlyFreeTotal: keyRecord.project.monthlyFreeTotal,
    monthlyFreeUsed: keyRecord.project.monthlyFreeUsed,
    monthlyPeriodStart: keyRecord.project.monthlyPeriodStart,
    monthlyPeriodEnd: keyRecord.project.monthlyPeriodEnd,
    paidBalanceEGP: keyRecord.project.paidBalanceEGP,
    projectCreatedAt: keyRecord.project.createdAt,
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
// sendProjectOtp — نفس فلو POST /api/developers/otp/send بالظبط، بدون HTTP.
// ═══════════════════════════════════════════════════════════════════════════
export async function sendProjectOtp(input: SendProjectOtpInput): Promise<SendProjectOtpResult> {
  const { apiKey: rawKey, body, ip, locale, revealCode } = input;
  const lang = locale;
  const en = lang === "en";
  const msg = (ar: string, enMsg: string) => (en ? enMsg : ar);
  const fail = (status: number, json: Record<string, unknown>, headers?: Record<string, string>): SendProjectOtpResult =>
    ({ status, json, headers });
  const unavailable = (retryAfter?: number): SendProjectOtpResult => {
    const ra = retryAfter ?? 60;
    return {
      status: 503,
      json: {
        ok: false,
        error: en
          ? "Abuse-protection service is temporarily unavailable — try again shortly"
          : "خدمة الحماية من الإساءة غير متاحة مؤقتًا — حاول بعد شوية",
        code: "RATE_LIMITER_UNAVAILABLE",
        retryAfter: ra,
      },
      headers: { "Retry-After": String(ra) },
    };
  };

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const raw = rawKey?.trim();
  if (!raw) {
    return fail(401, {
      ok: false, error: msg("API Key مطلوب في header: x-api-key", "API key is required in the x-api-key header"), code: "INVALID_API_KEY",
    });
  }

  const auth = await verifyApiKey(raw);
  if (!auth || "error" in auth) {
    if (auth && auth.error === "NO_META_CONNECTION") {
      return fail(400, {
        ok: false, error: msg("ربط Meta غير مكتمل لهذا المشروع — اربط Meta من صفحة Overview أولًا", "Meta connection is incomplete for this project — connect Meta from the project Overview first"), code: "NO_META_CONNECTION",
      });
    }
    return fail(401, {
      ok: false, error: msg("API Key غير صحيح أو ملغي — تحقق من x-api-key", "Invalid or revoked API key — check x-api-key"), code: "INVALID_API_KEY",
    });
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  if (input.bodyParseError) {
    return fail(400, {
      ok: false, error: msg("Request body يجب أن يكون JSON صحيح", "Request body must be valid JSON"), code: "INVALID_REQUEST",
    });
  }
  const { phone, templateId, templateName, language, expiryMinutes = 10 } = body ?? {};

  if (!phone) {
    return fail(400, {
      ok: false, error: msg("phone مطلوب", "phone is required"), code: "PHONE_REQUIRED",
    });
  }
  // المسار الأساسي templateId (Live Tester) — والـ legacy templateName للتوافق
  if (!templateId && !templateName) {
    return fail(400, {
      ok: false, error: msg("templateId مطلوب — أو templateName للقوالب المعتمدة", "templateId is required — or templateName for approved templates"), code: "TEMPLATE_REF_REQUIRED",
    });
  }
  // مدة الصلاحية: عدد صحيح موجب بحد أقصى 60 دقيقة — قيمة فاسدة كانت
  // تنتج NaN ثم 500 بعد الإرسال (Invalid Date → toISOString يرمي).
  const expiryMins = Number(expiryMinutes);
  if (!Number.isFinite(expiryMins) || !Number.isInteger(expiryMins) || expiryMins < 1 || expiryMins > 60) {
    return fail(400, {
      ok: false, error: msg("expiryMinutes يجب أن يكون عددًا صحيحًا بين 1 و 60", "expiryMinutes must be an integer between 1 and 60"), code: "EXPIRY_INVALID",
    });
  }

  // ── 3. Normalize phone ────────────────────────────────────────────────────
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return fail(400, {
      ok: false, error: msg(`رقم الهاتف غير صحيح: "${phone}" — استخدم E.164 أو الصيغة المصرية`, `Invalid phone number: "${phone}" — use E.164 or the Egyptian format`), code: "INVALID_REQUEST",
    });
  }

  // ── 4. Prepaid wallet enforcement (Project-level) ───────────────────────────
  // ترتيب الخصم: trial → monthly_free → paid_wallet → debt (حتى -10 صارم).
  // قبل الـ rate limit: طلب مرفوض (رصيد/قالب) لا يجب أن يستهلك حصة الرقم —
  // وإلا مهاجم يعرف رقم الضحية يستنزف حصتها (5/ساعة) بطلبات فاشلة.
  // لا يوجد اشتراك شهري — OWNER_PLAN القديمة تعامل كمشروع عادي (trial ثم wallet).
  const { TRIAL_CREDITS } = await import("@/lib/portal-billing");
  const {
    ensureTrialStarted: ensureTrial,
    renewMonthlyIfNeeded: renewMonthly,
    decideSource: decideBillingSource,
  } = await import("@/lib/portal-billing");

  // قراءة جديدة لحالة الفوترة (auth snapshot قد يكون قديمًا)
  const billingState = await prisma.developerProject.findUnique({
    where: { id: auth.projectId },
    select: {
      id: true, ownerId: true,
      trialCreditsTotal: true, trialCreditsUsed: true,
      trialStartedAt: true, trialEndsAt: true,
      monthlyFreeTotal: true, monthlyFreeUsed: true,
      monthlyPeriodStart: true, monthlyPeriodEnd: true,
      paidBalanceEGP: true, createdAt: true,
      trialWarningNotifiedAt: true, lowBalanceNotifiedAt: true, debtNotifiedAt: true,
    },
  });
  if (!billingState) {
    return fail(401, {
      ok: false, error: msg("المشروع غير موجود", "Project not found"), code: "INVALID_API_KEY",
    });
  }

  let billing = await ensureTrial(billingState);
  billing = await renewMonthly(billing);
  const decision = decideBillingSource(billing);

  if (!decision.allowed) {
    return fail(403, {
      ok: false,
      error: msg(decision.error ?? "انتهى رصيد المشروع — اشحن الرصيد للاستمرار", "Project balance exhausted — top up to continue"),
      code: decision.code ?? "INSUFFICIENT_BALANCE",
      upgradeUrl: `${DEVELOPERS_BASE_URL}/portal/projects/${auth.projectId}/billing`,
    });
  }
  const billingSource: BillingSource = decision.source!;

  // تحذير Trial عند 80% (24 من 30)
  if (
    billingSource === "trial_credit" &&
    billing.trialCreditsUsed >= Math.floor(TRIAL_CREDITS * 0.8) &&
    !billingState.trialWarningNotifiedAt
  ) {
    const { notifyDeveloper } = await import("@/lib/dev-notifications");
    await notifyDeveloper(auth.developerId, {
      type: "TRIAL_WARNING",
      title: "تنبيه استهلاك الرصيد التجريبي",
      message: `وصلت لـ 80% من الرصيد التجريبي (${billing.trialCreditsUsed} من ${billing.trialCreditsTotal}) لمشروعك.`,
      link: `${DEVELOPERS_BASE_URL}/portal/projects/${auth.projectId}/billing`,
      dedupHours: 24,
    });
    await prisma.developerProject.update({
      where: { id: auth.projectId },
      data: { trialWarningNotifiedAt: new Date() },
    });
  }

  const notifyTargetId = auth.ownerId ?? auth.developerId;

  // ── 5. Resolve template (المشروع من الـ API Key فقط) ────────────────────
  // لا يُقبل أي projectId من الـ client — ولا يُجبر الـ backend على اسم مختلف.
  // قبل الـ rate limit لنفس السبب: طلب مرفوض لا يستهلك حصة الرقم.
  const resolution = templateId
    ? await resolveTemplateById(auth.projectId, String(templateId), lang)
    : await resolveTemplateByName(auth.projectId, String(templateName), language, lang);
  if (!resolution.ok) {
    return fail(resolution.status, {
      ok: false, error: resolution.error, code: resolution.code,
    });
  }
  const template = resolution.template;

  // ── 6. Rate limit: per phone + per IP (بعد كل التحققات — قبل أي أثر جانبي)
  const rlPhone = `otp-send:${auth.projectId}:${normalizedPhone}`;
  // fail-closed: عطل Redis أثناء OTP ≠ سماح — نرفض بـ 503 بدل الـ bypass.
  const rl = await rateLimit(rlPhone, { limit: 5, windowSecs: 3600 }, { failureMode: "closed" });
  if (!rl.success) {
    if (rl.unavailable) return unavailable(rl.retryAfter);
    return fail(429, {
      ok: false,
      error: msg(`Rate limit — وصلت للحد الأقصى (5 رسائل/ساعة) لهذا الرقم`, `Rate limit — maximum reached (5 messages/hour) for this number`),
      code: "RATE_LIMIT_PHONE",
      retryAfter: rl.retryAfter,
    }, { "Retry-After": String(rl.retryAfter ?? 60) });
  }

  // Rate limit per IP — حماية من distributed attacks
  const rlIpMin = await rateLimit(`otp-send-ip-min:${ip}`, { limit: 15, windowSecs: 60 }, { failureMode: "closed" });
  if (!rlIpMin.success) {
    if (rlIpMin.unavailable) return unavailable(rlIpMin.retryAfter);
    return fail(429, {
      ok: false, error: msg("كثير من الطلبات — حاول بعد شوية", "Too many requests — try again shortly"), code: "RATE_LIMIT_IP", retryAfter: rlIpMin.retryAfter,
    }, { "Retry-After": String(rlIpMin.retryAfter ?? 60) });
  }
  const rlIpHr = await rateLimit(`otp-send-ip-hr:${ip}`, { limit: 150, windowSecs: 3600 }, { failureMode: "closed" });
  if (!rlIpHr.success) {
    if (rlIpHr.unavailable) return unavailable(rlIpHr.retryAfter);
    return fail(429, {
      ok: false, error: msg("تجاوزت حد الطلبات في الساعة — حاول لاحقاً", "Hourly request limit exceeded — try again later"), code: "RATE_LIMIT_IP", retryAfter: rlIpHr.retryAfter,
    }, { "Retry-After": String(rlIpHr.retryAfter ?? 60) });
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
    return fail(502, {
      ok: false,
      error: msg("تم إرسال الكود لكن تعذر حفظه للتحقق — اطلب كودًا جديدًا", "The code was sent but could not be stored for verification — request a new code"),
      code: "OTP_STORE_FAILED",
    });
  }

  // ── 12. Consume billing credit AFTER Meta success only ───────────────────
  // حرج: الفشل قبل هذه النقطة (Meta فشل / حفظ فشل) لا يخصم أي رصيد.
  let consumedBalance = billing.paidBalanceEGP;
  if (sendResult.success) {
    const { consumeAfterSuccess } = await import("@/lib/portal-billing");
    try {
      const consumed = await consumeAfterSuccess(auth.projectId, billingSource, {
        wabaId: auth.metaConnection.wabaId,
        phoneNumberId: auth.metaConnection.phoneNumberId,
        metaMessageId: sendResult.metaMessageId ?? null,
      });
      consumedBalance = consumed.paidBalanceEGP;

      // تنبيهات الرصيد المنخفض / المديونية (مرة واحدة لكل حالة)
      const { messagesFromBalance, LOW_BALANCE_MSGS, MAX_DEBT_EGP } = await import("@/lib/portal-billing");
      const { notifyDeveloper } = await import("@/lib/dev-notifications");
      const billingLink = `${DEVELOPERS_BASE_URL}/portal/projects/${auth.projectId}/billing`;
      const fresh = await prisma.developerProject.findUnique({
        where: { id: auth.projectId },
        select: { paidBalanceEGP: true, lowBalanceNotifiedAt: true, debtNotifiedAt: true },
      });
      if (fresh) {
        if (
          billingSource !== "trial_credit" &&
          billingSource !== "monthly_free" &&
          messagesFromBalance(fresh.paidBalanceEGP) < LOW_BALANCE_MSGS &&
          fresh.paidBalanceEGP >= 0 &&
          !billingState.lowBalanceNotifiedAt
        ) {
          await notifyDeveloper(notifyTargetId, {
            type: "BALANCE_LOW",
            title: "رصيد المشروع قرب يخلص",
            message: `متبقي ${messagesFromBalance(fresh.paidBalanceEGP)} رسالة تقريبًا (الرصيد ${fresh.paidBalanceEGP.toFixed(2)}ج) — اشحن من صفحة الفوترة.`,
            link: billingLink,
            dedupHours: 24,
          });
          await prisma.developerProject.update({
            where: { id: auth.projectId },
            data: { lowBalanceNotifiedAt: new Date() },
          }).catch(() => {});
        }
        if (fresh.paidBalanceEGP < 0 && !billingState.debtNotifiedAt) {
          await notifyDeveloper(notifyTargetId, {
            type: "BILLING",
            title: "المشروع دخل مديونية",
            message: `رصيد المشروع ${fresh.paidBalanceEGP.toFixed(2)}ج (الحد الأقصى ${MAX_DEBT_EGP}ج) — اشحن الرصيد قبل توقف الإرسال.`,
            link: billingLink,
            dedupHours: 24,
          });
          await prisma.developerProject.update({
            where: { id: auth.projectId },
            data: { debtNotifiedAt: new Date() },
          }).catch(() => {});
        }
      }
    } catch {
      // الخصم فشل بعد نجاح Meta — لا نفشل الطلب (الكود وصل فعلًا)، نسجل فقط.
      console.error("[developer-otp]", { event: "BILLING_CONSUME_FAILED", projectId: auth.projectId });
    }
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
    return fail(sendResult.statusCode ?? 502, {
      ok: false,
      error: isPayloadMismatch
        ? msg(`القالب "${template.name}" مرفوض من Meta (parameters mismatch) — زامن القوالب من صفحة القوالب ثم أعد المحاولة. لو تكرر، راجع تعريف القالب في Meta.`, `Template "${template.name}" was rejected by Meta (parameters mismatch) — sync templates from the templates page and retry. If it persists, review the template definition in Meta.`)
        : "WhatsApp send failed: " + sendResult.error,
      code: isPayloadMismatch ? "META_131008" : "META_SEND_FAILED",
      ...(sendResult.metaCode ? { metaCode: sendResult.metaCode } : {}),
    });
  }

  console.log("[developer-otp]", {
    event: "OTP_SEND_SUCCESS",
    correlationId,
    projectId: auth.projectId,
    templateId: template.id,
  });

  const { messagesFromBalance: msgsFromBal } = await import("@/lib/portal-billing");
  const remaining =
    billingSource === "trial_credit"
      ? { messagesLeft: billing.trialCreditsTotal - billing.trialCreditsUsed - 1, source: billingSource }
      : billingSource === "monthly_free"
        ? { messagesLeft: billing.monthlyFreeTotal - billing.monthlyFreeUsed - 1, source: billingSource }
        : { messagesLeft: msgsFromBal(consumedBalance), paidBalanceEGP: consumedBalance, source: billingSource };

  return {
    status: 200,
    json: {
      ok: true,
      token,
      expiresAt: expiresAt.toISOString(),
      ...remaining,
    },
    // للمناداة الداخلية الموثوقة فقط — الكود الصريح لا يظهر في json أبدًا
    ...(revealCode ? { plainCode: otpCode } : {}),
  };
}
