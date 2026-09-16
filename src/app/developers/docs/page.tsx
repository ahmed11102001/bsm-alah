"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useLanguage } from "../_components/LanguageProvider";
import { generateIntegrationCode } from "@/lib/developer-code-generator";

// ─── Types ────────────────────────────────────────────────────────────────────
type HttpMethod = "POST" | "GET";

interface Param {
  name: string;
  type: string;
  required: boolean;
  desc: string;
  descAr?: string;
  example?: string;
}

interface ResponseField {
  name: string;
  type: string;
  desc: string;
  descAr?: string;
}

interface Endpoint {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string;
  summaryAr: string;
  desc: string;
  descAr: string;
  auth: boolean;
  headers: Param[];
  body: Param[];
  response: { success: object; error: object };
  fields: ResponseField[];
  notes?: string[];
  notesAr?: string[];
}

// ─── Endpoints definition (mirrors the real OTP routes) ─────────────────────
const ENDPOINTS: Endpoint[] = [
  {
    id: "send",
    method: "POST",
    path: "/api/developers/otp/send",
    summary: "Send OTP",
    summaryAr: "إرسال OTP",
    desc: "Generates a 6-digit OTP code server-side and sends it via WhatsApp using an OTP-ready AUTHENTICATION template. Wani builds the Meta payload — you only provide phone + template.",
    descAr: "يولد كود OTP من السيرفر ويرسله عبر WhatsApp باستخدام قالب AUTHENTICATION جاهز. Wani يبني payload الخاص بـ Meta — أنت تبعت الهاتف والقالب فقط.",
    auth: true,
    headers: [
      { name: "x-api-key", type: "string", required: true, desc: "Your project API key", descAr: "مفتاح الـ API الخاص بمشروعك", example: "wani_live_xxxx_yyyy" },
      { name: "Content-Type", type: "string", required: true, desc: "Content type", descAr: "نوع البيانات", example: "application/json" },
    ],
    body: [
      { name: "phone", type: "string", required: true, desc: "Phone number — E.164 or Egyptian format (01x/201x/+20)", descAr: "رقم الهاتف — E.164 أو الصيغة المصرية", example: "+201234567890 or 01234567890" },
      { name: "templateId", type: "string", required: true, desc: "Wani Template ID (preferred) — shown on each template card in OTP Templates. Wins over templateName when both are sent.", descAr: "معرف قالب Wani (مفضل) — ظاهر على كارت كل قالب. يتفوق على templateName عند إرسال الاثنين.", example: "cmxxxxxxxxxxxxxxxx" },
      { name: "templateName", type: "string", required: false, desc: "Legacy alternative to templateId — exact approved template name", descAr: "بديل قديم لـ templateId — اسم القالب المعتمد بالضبط", example: "otp_verification" },
      { name: "language", type: "string", required: false, desc: "With templateName only — required when one name exists in several languages", descAr: "مع templateName فقط — مطلوب عندما يوجد نفس الاسم بلغات متعددة", example: "en_US" },
      { name: "expiryMinutes", type: "number", required: false, desc: "Code validity in minutes — integer 1–60, default 10", descAr: "صلاحية الكود بالدقائق — عدد صحيح 1–60، الافتراضي 10", example: "10 (default)" },
    ],
    response: {
      success: { ok: true, token: "a3f9c2e1...64hex...", expiresAt: "2025-01-15T14:30:00.000Z" },
      error: { ok: false, error: "…", code: "TEMPLATE_NOT_APPROVED" },
    },
    fields: [
      { name: "ok", type: "boolean", desc: "true on success", descAr: "true عند النجاح" },
      { name: "token", type: "string", desc: "64-char hex token — save it for the verify step", descAr: "64-char hex token — احتفظ بيه لخطوة التحقق" },
      { name: "expiresAt", type: "string", desc: "ISO 8601 — code expiration time", descAr: "ISO 8601 — وقت انتهاء صلاحية الكود" },
      { name: "messagesLeft", type: "number", desc: "Remaining free messages (trial/monthly) or paid messages from balance", descAr: "الرسائل المتبقية (تجريبي/شهري) أو المدفوعة من الرصيد" },
      { name: "source", type: "string", desc: "trial_credit | monthly_free | paid_wallet | debt", descAr: "مصدر الخصم: تجريبي | شهري | مدفوع | مديونية" },
      { name: "paidBalanceEGP", type: "number", desc: "Paid balance after send (paid_wallet/debt only)", descAr: "الرصيد المدفوع بعد الإرسال (مدفوع/مديونية فقط)" },
      { name: "code", type: "string", desc: "Machine-readable error reason on failure", descAr: "سبب الخطأ بصيغة آلية عند الفشل" },
      { name: "retryAfter", type: "number", desc: "Only present on 429/503 — seconds to wait before retrying", descAr: "موجود فقط عند 429/503 — عدد الثواني المطلوب الانتظار قبل إعادة المحاولة" },
    ],
    notes: [
      "To use Wani OTP, create an OTP Authentication Template from Wani — Wani defines its structure, Meta reviews it, and only approved compatible templates can send",
      "Wani generates the OTP automatically — never send an OTP value in the request",
      "Rate limit: 5 messages per phone per hour, plus 15/min and 150/hour per IP (fail-closed: Redis outage returns 503, not a bypass)",
      "Template must be OTP READY (APPROVED + AUTHENTICATION + synced Meta metadata) before sending",
      "Phone number is automatically normalized to E.164 (Egyptian: 01x → 201x)",
      "No Meta API calls are required from the developer — the SDK never talks to Meta",
    ],
    notesAr: [
      "لاستخدام Wani OTP: أنشئ قالب OTP Authentication من Wani — Wani يحدد بنيته وMeta تراجعه، والقوالب المعتمدة المتوافقة فقط هي التي ترسل",
      "Wani يولد الـ OTP تلقائيًا — لا ترسل قيمة OTP في الطلب أبدًا",
      "Rate limit: 5 رسائل لكل رقم كل ساعة، و15/دقيقة و150/ساعة لكل IP (fail-closed: عطل Redis يرجع 503 وليس تجاوزًا)",
      "القالب يجب أن يكون OTP READY (معتمد + AUTHENTICATION + بيانات Meta متزامنة) قبل الإرسال",
      "الرقم يُطبَّع تلقائيًا لـ E.164 (مصري: 01x → 201x)",
      "لا حاجة لأي استدعاء لـ Meta API من المطور — الـ SDK لا يتصل بـ Meta أبدًا",
    ],
  },
  {
    id: "verify",
    method: "POST",
    path: "/api/developers/otp/verify",
    summary: "Verify Code",
    summaryAr: "التحقق من الكود",
    desc: "Verifies the entered code against the token issued from /send. Codes are single-use: a replayed token is rejected, it is never silently re-approved.",
    descAr: "يتحقق من صحة الكود المُدخل مقابل الـ token الصادر من /send. الأكواد أحادية الاستخدام: إعادة نفس الـ token تُرفض ولا تُقبَل ضمنيًا أبدًا.",
    auth: true,
    headers: [
      { name: "x-api-key", type: "string", required: true, desc: "API key", descAr: "مفتاح الـ API", example: "wani_live_xxxx_yyyy" },
      { name: "Content-Type", type: "string", required: true, desc: "Content type", descAr: "نوع البيانات", example: "application/json" },
    ],
    body: [
      { name: "token", type: "string", required: true, desc: "Token from /send response", descAr: "الـ token من استجابة /send", example: "a3f9c2e1..." },
      { name: "code", type: "string", required: true, desc: "6-digit code", descAr: "الكود المكوّن من 6 أرقام", example: "123456" },
    ],
    response: {
      success: { ok: true, verified: true, message: "OTP verified successfully", phone: "201234567890" },
      error: { ok: false, verified: false, error: "Invalid code", code: "CODE_MISMATCH" },
    },
    fields: [
      { name: "ok", type: "boolean", desc: "true on success", descAr: "true عند النجاح" },
      { name: "verified", type: "boolean", desc: "true if code is correct", descAr: "true لو الكود صحيح" },
      { name: "phone", type: "string", desc: "Verified phone number (on success only)", descAr: "رقم الهاتف المُتحقَّق منه (عند النجاح فقط)" },
      { name: "message", type: "string", desc: "Descriptive message", descAr: "رسالة نصية توضيحية" },
      { name: "code", type: "string", desc: "Machine-readable reason on failure (e.g. CODE_MISMATCH, OTP_EXPIRED)", descAr: "سبب آلي عند الفشل (مثل CODE_MISMATCH وOTP_EXPIRED)" },
      { name: "retryAfter", type: "number", desc: "Only present on 429 — seconds to wait before retrying", descAr: "موجود فقط عند 429 — عدد الثواني المطلوب الانتظار قبل إعادة المحاولة" },
    ],
    notes: [
      "Brute-force protection: 10 attempts per 15 minutes per token, plus 15/min and 150/hour per IP",
      "Single-use codes: verifying an already-verified token returns 400 ALREADY_VERIFIED — never a silent success",
      "Expired token → 400 OTP_EXPIRED — send a new code with POST /send",
    ],
    notesAr: [
      "Brute-force protection: 10 محاولات كل 15 دقيقة لكل token، و15/دقيقة و150/ساعة لكل IP",
      "الأكواد أحادية الاستخدام: التحقق من token سبق التحقق منه يرجع 400 ALREADY_VERIFIED — وليس نجاحًا ضمنيًا",
      "لو Token انتهت صلاحيته → 400 OTP_EXPIRED — أرسل كودًا جديدًا عبر POST /send",
    ],
  },
  {
    id: "status",
    method: "GET",
    path: "/api/developers/otp/status/:token",
    summary: "Check OTP Status",
    summaryAr: "فحص حالة الـ OTP",
    desc: "Returns the current status of a specific OTP with the remaining time before expiry. Read-only — no rate limit.",
    descAr: "يُرجع الحالة الحالية لـ OTP معين مع الوقت المتبقي قبل انتهاء الصلاحية. للقراءة فقط — بدون rate limit.",
    auth: true,
    headers: [
      { name: "x-api-key", type: "string", required: true, desc: "API key", descAr: "مفتاح الـ API", example: "wani_live_xxxx_yyyy" },
    ],
    body: [],
    response: {
      success: {
        ok: true, token: "a3f9c2e1...", status: "sent",
        phone: "201234567890",
        sentAt: "2025-01-15T14:20:00.000Z",
        verifiedAt: null,
        expiresAt: "2025-01-15T14:30:00.000Z",
        secondsRemaining: 423,
        meta: { messageId: "wamid.xxx", error: null },
      },
      error: { ok: false, error: "Token not found or does not belong to this API Key", code: "TOKEN_NOT_FOUND" },
    },
    fields: [
      { name: "status", type: "string", desc: "pending | sent | verified | expired | failed (lowercase)", descAr: "pending | sent | verified | expired | failed (بحروف صغيرة)" },
      { name: "secondsRemaining", type: "number | null", desc: "Seconds remaining before expiry (0 if expired)", descAr: "الثواني المتبقية قبل انتهاء الصلاحية (0 لو انتهت)" },
      { name: "sentAt", type: "string | null", desc: "Send time ISO 8601", descAr: "وقت الإرسال ISO 8601" },
      { name: "verifiedAt", type: "string | null", desc: "Verification time ISO 8601 (null if not yet)", descAr: "وقت التحقق ISO 8601 (null لو لسه)" },
      { name: "meta.messageId", type: "string | null", desc: "Meta WhatsApp message ID", descAr: "Meta WhatsApp message ID" },
      { name: "meta.error", type: "string | null", desc: "Failure reason if status = failed", descAr: "سبب الفشل لو status = failed" },
    ],
    notes: [
      "Token automatically becomes expired if it exceeds expiresAt",
      "Use this endpoint to build polling or progress indicators",
    ],
    notesAr: [
      "الـ token يُصبح expired تلقائيًا لو تجاوز expiresAt",
      "استخدم هذا الـ endpoint لبناء polling أو progress indicators",
    ],
  },
];

// ─── Machine-readable error codes (from the real routes) ────────────────────
interface ErrorCodeRow { code: string; http: number; en: string; ar: string; action: string; actionAr: string }
const ERROR_CODE_ROWS: ErrorCodeRow[] = [
  { code: "PHONE_REQUIRED", http: 400, en: "Missing phone in /send body", ar: "رقم الهاتف مفقود في /send", action: "Send phone", actionAr: "أرسل phone" },
  { code: "TEMPLATE_REF_REQUIRED", http: 400, en: "Neither templateId nor templateName was sent", ar: "لم يُرسَل templateId ولا templateName", action: "Send templateId (preferred)", actionAr: "أرسل templateId (مفضل)" },
  { code: "EXPIRY_INVALID", http: 400, en: "expiryMinutes is not an integer 1–60", ar: "expiryMinutes ليس عددًا صحيحًا 1–60", action: "Send 1–60 or omit (default 10)", actionAr: "أرسل 1–60 أو احذفه (الافتراضي 10)" },
  { code: "INVALID_REQUEST", http: 400, en: "Malformed JSON, bad phone format, or missing token/code", ar: "JSON غير صالح أو رقم خاطئ أو token/code ناقص", action: "Validate input client-side first", actionAr: "تحقق من المدخلات أولًا" },
  { code: "TEMPLATE_NOT_FOUND", http: 404, en: "Template id/name does not exist in this project", ar: "القالب غير موجود في هذا المشروع", action: "Copy the exact templateId from OTP Templates", actionAr: "انسخ templateId بالضبط من صفحة القوالب" },
  { code: "TEMPLATE_WRONG_PROJECT", http: 403, en: "Template belongs to another project", ar: "القالب يخص مشروعًا آخر", action: "Use a template of the same project as the API key", actionAr: "استخدم قالبًا من نفس مشروع الـ API key" },
  { code: "TEMPLATE_LANGUAGE_MISMATCH", http: 404, en: "Name exists but not in the requested language", ar: "الاسم موجود لكن ليس بهذه اللغة", action: "Pass language or use templateId", actionAr: "مرر language أو استخدم templateId" },
  { code: "TEMPLATE_AMBIGUOUS", http: 400, en: "Name exists in several languages, none specified", ar: "الاسم موجود بلغات متعددة ولم تُحدد واحدة", action: "Pass language or use templateId", actionAr: "مرر language أو استخدم templateId" },
  { code: "TEMPLATE_NOT_APPROVED", http: 400, en: "Template is not Meta-APPROVED", ar: "القالب غير معتمد من Meta", action: "Wait for approval or sync templates", actionAr: "انتظر الاعتماد أو زامن القوالب" },
  { code: "TEMPLATE_NO_META_ID", http: 400, en: "Template is not linked to a Meta template", ar: "القالب غير مربوط بقالب Meta", action: "Sync templates with Meta", actionAr: "زامن القوالب مع Meta" },
  { code: "OTP_TEMPLATE_NOT_COMPATIBLE", http: 400, en: "Template is not an AUTHENTICATION OTP template", ar: "القالب ليس قالب OTP من نوع AUTHENTICATION", action: "Create an OTP Authentication template", actionAr: "أنشئ قالب OTP من نوع Authentication" },
  { code: "OTP_TEMPLATE_METADATA_INVALID", http: 409, en: "Template metadata is incomplete", ar: "بيانات القالب غير مكتملة", action: "Re-sync the template from Meta", actionAr: "أعد مزامنة القالب من Meta" },
  { code: "INVALID_API_KEY", http: 401, en: "Missing, revoked, or suspended key", ar: "مفتاح مفقود أو ملغي أو موقف", action: "Check x-api-key; create a new key if needed", actionAr: "تحقق من x-api-key؛ أنشئ مفتاحًا جديدًا عند الحاجة" },
  { code: "NO_META_CONNECTION", http: 400, en: "Project WhatsApp number is not connected", ar: "رقم WhatsApp للمشروع غير مربوط", action: "Connect Meta from the project Overview", actionAr: "اربط Meta من نظرة عامة للمشروع" },
  { code: "INSUFFICIENT_BALANCE", http: 403, en: "Free quotas + balance exhausted (debt at -10 EGP cap)", ar: "الحصص المجانية والرصيد خلصوا (مديونية عند حد -10 جنيه)", action: "Top up the project balance from the Billing page", actionAr: "اشحن رصيد المشروع من صفحة الفوترة" },
  { code: "TOKEN_NOT_FOUND", http: 404, en: "Token unknown or belongs to another key", ar: "Token غير معروف أو يخص key آخر", action: "Use the token returned by /send with the same key", actionAr: "استخدم الـ token الراجع من /send بنفس الـ key" },
  { code: "TOKEN_WRONG_PROJECT", http: 400, en: "Token belongs to another project", ar: "الـ token يخص مشروعًا آخر", action: "Verify with the key of the sending project", actionAr: "تحقق بنفس key مشروع الإرسال" },
  { code: "CODE_MISMATCH", http: 400, en: "Wrong code (attempts are limited per token)", ar: "كود خاطئ (المحاولات محدودة لكل token)", action: "Ask the user to retry carefully, then send a fresh code", actionAr: "اطلب إعادة المحاولة بحذر ثم أرسل كودًا جديدًا" },
  { code: "OTP_EXPIRED", http: 400, en: "Code lifetime passed", ar: "انتهت صلاحية الكود", action: "POST /send again for a fresh code", actionAr: "اعمل POST /send جديدة لكود جديد" },
  { code: "ALREADY_VERIFIED", http: 400, en: "Token was already verified (single-use)", ar: "تم التحقق من الـ token مسبقًا (أحادي الاستخدام)", action: "Treat the user as verified — never re-verify", actionAr: "اعتبر المستخدم متحققًا — لا تعيد التحقق" },
  { code: "OTP_NOT_SENT", http: 400, en: "Token never reached sent state", ar: "الـ token لم يصل لحالة الإرسال", action: "Start over with POST /send", actionAr: "ابدأ من جديد بـ POST /send" },
  { code: "RATE_LIMIT_PHONE / RATE_LIMIT_IP / RATE_LIMITED", http: 429, en: "Quota exceeded — honor Retry-After", ar: "تجاوزت الحصة — التزم بـ Retry-After", action: "Back off for Retry-After seconds; never spin", actionAr: "انتظر قيمة Retry-After؛ لا تكرر الطلب بلا توقف" },
  { code: "META_131008", http: 422, en: "Meta rejected the template parameters (payload mismatch)", ar: "رفض Meta باراميترات القالب (mismatch)", action: "Sync templates, then retry; fix the template definition if it repeats", actionAr: "زامن القوالب ثم أعد المحاولة؛ أصلح تعريف القالب عند التكرار" },
  { code: "META_SEND_FAILED", http: 400, en: "Meta rejected the send (see metaCode)", ar: "رفض Meta الإرسال (راجع metaCode)", action: "Inspect metaCode and fix the underlying cause", actionAr: "افحص metaCode وأصلح السبب" },
  { code: "OTP_STORE_FAILED", http: 502, en: "Sent on WhatsApp but could not be stored for verify", ar: "أُرسل على WhatsApp لكن تعذر حفظه للتحقق", action: "Ask the user for a fresh code via POST /send", actionAr: "اطلب كودًا جديدًا عبر POST /send" },
  { code: "RATE_LIMITER_UNAVAILABLE", http: 503, en: "Protection layer down — request refused (fail-closed)", ar: "طبقة الحماية متعطلة — رُفض الطلب (fail-closed)", action: "Retry shortly; do not treat as success", actionAr: "أعد المحاولة بعد قليل؛ لا تعتبره نجاحًا" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────
function CopyBtn({ text, small, lang }: { text: string; small?: boolean; lang: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} style={{
      padding: small ? "3px 10px" : "5px 12px",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.1)",
      background: copied ? "rgba(32,211,120,0.1)" : "rgba(255,255,255,0.04)",
      color: copied ? "#20d378" : "rgba(255,255,255,0.45)",
      fontSize: 11, cursor: "pointer", fontFamily: "inherit",
      display: "flex", alignItems: "center", gap: 4, transition: "all .2s",
    }}>
      {copied ? (lang === 'ar' ? "✓ تم" : "✓ Copied") : (lang === 'ar' ? "نسخ" : "Copy")}
    </button>
  );
}

function MethodBadge({ method }: { method: HttpMethod }) {
  const cfg = {
    POST: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.25)" },
    GET: { bg: "rgba(56,189,248,0.12)", color: "#38bdf8", border: "rgba(56,189,248,0.25)" },
  }[method];
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 6,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontSize: 11, fontWeight: 700, fontFamily: "Fira Code, monospace", flexShrink: 0,
    }}>
      {method}
    </span>
  );
}

function JsonBlock({ data }: { data: object }) {
  const lines = JSON.stringify(data, null, 2).split("\n");
  return (
    <pre style={{ margin: 0, fontFamily: "Fira Code, monospace", fontSize: 12, lineHeight: 1.7 }}>
      {lines.map((line, i) => {
        let color = "rgba(255,255,255,0.75)";
        if (/"(ok|verified)":\s*true/.test(line)) color = "#20d378";
        if (/"(ok|verified)":\s*false/.test(line)) color = "#f87171";
        if (/"error":/.test(line)) color = "#f87171";
        else if (/:\s*"/.test(line)) color = "#86efac";
        else if (/:\s*\d/.test(line)) color = "#93c5fd";
        else if (/:\s*(true|false|null)/.test(line)) color = "#f9a8d4";
        return <div key={i} style={{ color }}>{line || " "}</div>;
      })}
    </pre>
  );
}

function CodeBlock({ code, lang, label }: { code: string; lang: string; label?: string }) {
  return (
    <div style={{
      background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, overflow: "hidden", margin: "12px 0", direction: "ltr",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "Fira Code, monospace" }}>{label ?? ""}</span>
        <CopyBtn text={code} small lang={lang} />
      </div>
      <pre style={{ margin: 0, padding: "14px 16px", overflowX: "auto", fontFamily: "Fira Code, monospace", fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.78)", whiteSpace: "pre" }}>
        {code}
      </pre>
    </div>
  );
}

// ─── Endpoint Card ────────────────────────────────────────────────────────────
function EndpointCard({ ep, lang, t }: { ep: Endpoint; lang: string; t: (en: string, ar: string) => string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"success" | "error">("success");

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${open ? "rgba(32,211,120,0.2)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 16, overflow: "hidden",
      transition: "border-color .2s",
    }}>
      {/* Header — click to expand */}
      <button
        className="endpoint-header"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "18px 22px",
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 14,
          textAlign: lang === 'ar' ? "right" : "left", direction: lang === 'ar' ? "rtl" : "ltr",
        }}
      >
        <MethodBadge method={ep.method} />
        <span className="endpoint-path" style={{ fontFamily: "Fira Code, monospace", fontSize: 13, color: "rgba(255,255,255,0.7)", direction: "ltr", textAlign: "left" }}>
          {ep.path}
        </span>
        <span className="endpoint-summary" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", flex: 1 }}>{lang === 'ar' ? ep.summaryAr : ep.summary}</span>
        {ep.auth && (
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)", flexShrink: 0 }}>
            🔑 {t("Auth Required", "يحتاج Auth")}
          </span>
        )}
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 16, transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}>
          ▾
        </span>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="endpoint-content" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Description */}
          <div style={{ padding: "16px 22px", background: "rgba(255,255,255,0.01)" }}>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{lang === 'ar' ? ep.descAr : ep.desc}</p>
          </div>

          <div className="endpoint-grid" style={{ padding: "0 22px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Left: Params */}
            <div>
              {/* Headers */}
              <SectionLabel>Headers</SectionLabel>
              <ParamTable params={ep.headers} lang={lang} />

              {/* Body */}
              {ep.body.length > 0 && (
                <>
                  <SectionLabel style={{ marginTop: 18 }}>Request Body (JSON)</SectionLabel>
                  <ParamTable params={ep.body} lang={lang} />
                </>
              )}

              {/* Response fields */}
              <SectionLabel style={{ marginTop: 18 }}>Response Fields</SectionLabel>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <tbody>
                  {ep.fields.map(f => (
                    <tr key={f.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "7px 0", fontFamily: "Fira Code, monospace", color: "#86efac", paddingLeft: 0 }}>{f.name}</td>
                      <td style={{ padding: "7px 8px", color: "#93c5fd", fontFamily: "Fira Code, monospace" }}>{f.type}</td>
                      <td style={{ padding: "7px 0", color: "rgba(255,255,255,0.4)", textAlign: lang === 'ar' ? "right" : "left" }}>{lang === 'ar' ? (f.descAr || f.desc) : f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Notes */}
              {ep.notes && ep.notes.length > 0 && (
                <>
                  <SectionLabel style={{ marginTop: 18 }}>{t("Notes", "ملاحظات")}</SectionLabel>
                  <ul style={{ margin: 0, paddingRight: lang === 'ar' ? 18 : 0, paddingLeft: lang === 'en' ? 18 : 0, listStyle: "disc" }}>
                    {(lang === 'ar' ? (ep.notesAr || ep.notes) : ep.notes).map((n, i) => (
                      <li key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, lineHeight: 1.6 }}>{n}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Right: Response preview */}
            <div>
              <div className="response-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 8 }}>
                <SectionLabel style={{ margin: 0 }}>Response Example</SectionLabel>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["success", "error"] as const).map(t2 => (
                    <button key={t2} onClick={() => setTab(t2)} style={{
                      padding: "3px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                      background: tab === t2 ? (t2 === "success" ? "rgba(32,211,120,0.12)" : "rgba(239,68,68,0.12)") : "transparent",
                      border: `1px solid ${tab === t2 ? (t2 === "success" ? "rgba(32,211,120,0.25)" : "rgba(239,68,68,0.25)") : "rgba(255,255,255,0.08)"}`,
                      color: tab === t2 ? (t2 === "success" ? "#20d378" : "#f87171") : "rgba(255,255,255,0.35)",
                    }}>
                      {t2 === "success" ? t("✓ Success", "✓ نجاح") : t("✗ Error", "✗ خطأ")}
                    </button>
                  ))}
                  <CopyBtn text={JSON.stringify(ep.response[tab], null, 2)} small lang={lang} />
                </div>
              </div>
              <div style={{
                background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "16px",
                border: "1px solid rgba(255,255,255,0.06)", direction: "ltr",
              }}>
                <JsonBlock data={ep.response[tab]} />
              </div>

              {/* Full URL example */}
              <SectionLabel style={{ marginTop: 18 }}>{t("Request Example", "مثال الطلب")}</SectionLabel>
              <div style={{
                background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "12px 14px",
                border: "1px solid rgba(255,255,255,0.05)", direction: "ltr",
                fontFamily: "Fira Code, monospace", fontSize: 11,
                color: "rgba(255,255,255,0.6)", lineHeight: 1.7,
              }}>
                <div><span style={{ color: "#f59e0b" }}>{ep.method}</span> <span style={{ color: "#86efac" }}>{ep.path.replace(":token", "[token]")}</span></div>
                <div style={{ color: "rgba(255,255,255,0.3)" }}>x-api-key: wani_live_xxxx</div>
                {ep.body.length > 0 && (
                  <div style={{ marginTop: 6, color: "rgba(255,255,255,0.4)" }}>
                    {ep.body.filter(b => b.required).map(b => (
                      <div key={b.name}><span style={{ color: "#93c5fd" }}>{b.name}</span>: {b.example ?? `"${b.name}"`}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)",
      textTransform: "uppercase", letterSpacing: ".8px",
      marginBottom: 10, marginTop: 8, ...style,
    }}>
      {children}
    </div>
  );
}

function ParamTable({ params, lang }: { params: Param[]; lang: string }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <tbody>
        {params.map(p => (
          <tr key={p.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <td style={{ padding: "7px 0" }}>
              <span style={{ fontFamily: "Fira Code, monospace", color: "#86efac" }}>{p.name}</span>
              {p.required && <span style={{ color: "#f87171", marginLeft: 4, fontSize: 10 }}>*</span>}
            </td>
            <td style={{ padding: "7px 8px", color: "#93c5fd", fontFamily: "Fira Code, monospace" }}>{p.type}</td>
            <td style={{ padding: "7px 0", color: "rgba(255,255,255,0.4)", textAlign: lang === 'ar' ? "right" : "left" }}>{lang === 'ar' ? (p.descAr || p.desc) : p.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Checklist({ items }: { items: { en: string; ar: string }[] }) {
  const { language } = useLanguage();
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
          <span style={{ color: "#20d378", flexShrink: 0, marginTop: 1 }}><Check size={14} /></span>
          <span>{language === "ar" ? item.ar : item.en}</span>
        </li>
      ))}
    </ul>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════
type GuideSection = "start" | "templates" | "integration" | "auth" | "reference" | "errors" | "production" | "examples";

const EXAMPLE_OPTIONS = [
  { id: "node", label: "Node.js", language: "javascript", framework: "node" },
  { id: "next", label: "Next.js", language: "typescript", framework: "next" },
  { id: "python", label: "Python", language: "python", framework: "django" },
  { id: "php", label: "PHP", language: "php", framework: "laravel" },
  { id: "curl", label: "cURL", language: "curl", framework: "shell" },
  { id: "cli", label: "CLI" },
] as const;

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);
  const [section, setSection] = useState<GuideSection>("start");
  const [example, setExample] = useState<string>("node");
  const { language, t } = useLanguage();
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  const sections: { id: GuideSection; label: string }[] = [
    { id: "start", label: t("Getting Started", "البداية") },
    { id: "templates", label: t("OTP Templates", "قوالب OTP") },
    { id: "integration", label: t("Integration", "الدمج") },
    { id: "auth", label: t("Authentication", "المصادقة") },
    { id: "reference", label: t("API Reference", "مرجع API") },
    { id: "errors", label: t("Errors", "الأخطاء") },
    { id: "production", label: t("Production", "الإنتاج") },
    { id: "examples", label: t("Examples", "أمثلة") },
  ];

  // ─── Status values reference ──────────────────────────────────────────────────
  const STATUS_VALUES = [
    { value: "pending", color: "#94a3b8", desc: t("Reserved initial state — live OTPs start at sent after /send", "حالة ابتدائية محجوزة — OTPs الحية تبدأ من sent بعد /send") },
    { value: "sent", color: "#f59e0b", desc: t("Sent via WhatsApp — awaiting verification", "تم الإرسال عبر WhatsApp — ينتظر التحقق") },
    { value: "verified", color: "#20d378", desc: t("Successfully verified", "تم التحقق بنجاح") },
    { value: "expired", color: "#6b7280", desc: t("Code lifetime passed", "انتهت صلاحية الكود") },
    { value: "failed", color: "#ef4444", desc: t("Failed to send via Meta", "فشل الإرسال عبر Meta") },
  ];

  // ─── HTTP status reference (Errors section uses ERROR_CODE_ROWS for codes) ────
  const HTTP_ROWS = [
    { code: 400, label: "Bad Request", desc: t("Validation or template problem — read code in the body", "مشكلة تحقق أو قالب — اقرأ code في الـ body") },
    { code: 401, label: "Unauthorized", desc: t("x-api-key missing, invalid, revoked, or suspended", "x-api-key مفقود أو غير صحيح أو ملغي أو موقف") },
    { code: 403, label: "Forbidden", desc: t("Valid key, disallowed action (wrong project, plan exhausted)", "مفتاح صالح لكن إجراء مرفوض (مشروع خاطئ أو باقة منتهية)") },
    { code: 404, label: "Not Found", desc: t("Token or template unknown to this key", "Token أو قالب غير معروف لهذا الـ key") },
    { code: 409, label: "Conflict", desc: t("Incomplete template metadata", "بيانات القالب غير مكتملة") },
    { code: 422, label: "Unprocessable", desc: t("Meta rejected the template parameters (META_131008)", "رفض Meta باراميترات القالب (META_131008)") },
    { code: 429, label: "Too Many Req.", desc: t("Quota exceeded — honor Retry-After and retryAfter", "تجاوزت الحصة — التزم بـ Retry-After وretryAfter") },
    { code: 502, label: "Bad Gateway", desc: t("Meta-side or storage failure during send", "فشل من جهة Meta أو التخزين أثناء الإرسال") },
    { code: 503, label: "Unavailable", desc: t("Protection layer down — fail-closed, retry shortly", "طبقة الحماية متعطلة — fail-closed، أعد المحاولة قريبًا") },
    { code: 500, label: "Server Error", desc: t("Internal error — contact support", "خطأ داخلي — تواصل مع الدعم") },
  ];

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  const exampleCode = useMemo(() => {
    if (example === "cli") {
      return [
        "npm install -g @aiwni/cli",
        "wani login",
        "wani project list",
        "wani project use <project>",
                    "wani otp test --phone 201012345678 --template-id YOUR_TEMPLATE_ID --code 123456",
                    "wani init  # scaffold the SDK integration in your project",
                  ].join("\n");
    }
    const opt = EXAMPLE_OPTIONS.find(o => o.id === example);
    if (!opt || opt.id === "cli") return "";
    return generateIntegrationCode({
      operation: "send",
      language: opt.language as "javascript" | "typescript" | "python" | "php" | "curl",
      framework: opt.framework as string,
      templateId: "YOUR_TEMPLATE_ID",
      baseUrl: `${baseUrl}/api/developers/otp`,
    });
  }, [example, baseUrl]);

  const align = language === "ar" ? "right" : "left";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

        .docs-root { height:100%; overflow-y:auto; overflow-x:hidden; background:#060810; font-family:'IBM Plex Sans Arabic',sans-serif; direction:${language === 'ar' ? 'rtl' : 'ltr'}; color:#fff; }
        .docs-root::before { content:''; position:fixed; inset:0; background-image:linear-gradient(rgba(32,211,120,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(32,211,120,0.025) 1px,transparent 1px); background-size:48px 48px; pointer-events:none; z-index:0; }
        .docs-inner { max-width:1000px; margin:0 auto; padding:40px 32px; position:relative; z-index:1; opacity:0; transform:translateY(10px); transition:opacity .4s,transform .4s; }
        .docs-inner.visible { opacity:1; transform:translateY(0); }

        .docs-header { margin-bottom:32px; }
        .docs-title { font-size:26px; font-weight:600; }
        .docs-subtitle { font-size:14px; color:rgba(255,255,255,0.4); margin-top:4px; }
        .docs-back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500;
          padding: 7px 14px; border-radius: 8px; cursor: pointer;
          margin-bottom: 20px; transition: all 0.15s ease;
        }
        .docs-back-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }

        /* Section tabs */
        .tabs { display:flex; gap:4px; padding:4px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px; width:fit-content; max-width:100%; flex-wrap:wrap; margin-bottom:32px; }
        .tab { padding:8px 16px; border-radius:9px; border:none; background:none; color:rgba(255,255,255,0.4); font-size:13px; font-family:inherit; cursor:pointer; transition:all .2s; white-space:nowrap; }
        .tab:hover { color:rgba(255,255,255,0.7); }
        .tab.active { background:rgba(32,211,120,0.12); color:#20d378; font-weight:500; }

        /* Endpoint list */
        .ep-list { display:flex; flex-direction:column; gap:12px; }

        /* Auth section */
        .auth-section { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:28px; }
        .auth-section h3 { font-size:16px; font-weight:600; margin-bottom:12px; }
        .auth-section p { font-size:14px; color:rgba(255,255,255,0.5); line-height:1.7; margin-bottom:16px; }
        .code-inline { font-family:'Fira Code',monospace; background:rgba(255,255,255,0.07); padding:2px 8px; border-radius:5px; font-size:13px; color:#86efac; }
        .code-block { background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; margin:12px 0; direction:ltr; font-family:'Fira Code',monospace; font-size:12px; line-height:1.7; color:rgba(255,255,255,0.7); }
        .code-block .cm { color:#6b7280; }
        .code-block .kw { color:#c084fc; }
        .code-block .st { color:#86efac; }
        .code-block .nu { color:#93c5fd; }

        /* Guide path cards */
        .path-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:16px 0 8px; }
        .path-card { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:18px; }
        .path-card h4 { margin:0 0 4px; font-size:14px; font-weight:600; color:#fff; display:flex; align-items:center; gap:8px; }
        .path-card p { margin:0 0 10px; font-size:12px; color:rgba(255,255,255,0.45); line-height:1.6; }
        .path-num { width:22px; height:22px; border-radius:50%; background:rgba(32,211,120,0.12); border:1px solid rgba(32,211,120,0.3); color:#20d378; font-size:11px; font-weight:700; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }

        /* Status table */
        .ref-table { width:100%; border-collapse:collapse; font-size:13px; }
        .ref-table th { padding:10px 14px; background:rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.4); font-size:11px; text-transform:uppercase; letter-spacing:.5px; font-weight:600; text-align:${language === 'ar' ? 'right' : 'left'}; }
        .ref-table td { padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.05); color:rgba(255,255,255,0.65); vertical-align:middle; }
        .ref-table tr:last-child td { border-bottom:none; }
        .ref-table tr:hover td { background:rgba(255,255,255,0.02); }
        .status-pill { display:inline-flex; align-items:center; gap:6px; font-family:'Fira Code',monospace; font-size:12px; }
        .status-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .code-num { font-family:'Fira Code',monospace; font-size:13px; font-weight:700; }
        .ref-panel { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:14px; overflow:hidden; }

        /* Base URL banner */
        .base-url-banner {
          display:flex; align-items:center; gap:12px; padding:14px 18px;
          background:rgba(32,211,120,0.06); border:1px solid rgba(32,211,120,0.15);
          border-radius:12px; margin-bottom:24px; direction:ltr;
        }
        .base-url-label { font-size:11px; color:rgba(32,211,120,0.7); font-weight:600; letter-spacing:.5px; text-transform:uppercase; }
        .base-url-value { font-family:'Fira Code',monospace; font-size:13px; color:rgba(255,255,255,0.8); flex:1; }

        .endpoint-header { min-width:0; }
        .endpoint-path { min-width:0; overflow-wrap:anywhere; }
        .endpoint-summary { min-width:0; }
        .endpoint-content, .endpoint-grid { min-width:0; }
        .endpoint-grid table { table-layout:fixed; }
        .endpoint-grid td { overflow-wrap:anywhere; vertical-align:top; }
        .response-toolbar { flex-wrap:wrap; gap:8px; }
        .code-block { overflow-x:auto; white-space:pre; }

        @media(max-width:700px) {
          .docs-inner { padding:20px 12px 32px; }
          .docs-header { margin-bottom:20px; }
          .docs-title { font-size:22px; }
          .docs-subtitle { font-size:13px; line-height:1.6; }
          .tabs { width:100%; flex-wrap:wrap; margin-bottom:20px; }
          .tab { flex:1 1 calc(50% - 4px); padding:9px 8px; font-size:12px; }
          .base-url-banner { align-items:flex-start; flex-wrap:wrap; padding:12px; gap:8px; }
          .base-url-value { flex:1 1 calc(100% - 88px); min-width:0; font-size:11px; overflow-wrap:anywhere; }
          .base-url-banner > button { margin-inline-start:auto; }
          .auth-section { padding:18px 14px; }
          .path-grid { grid-template-columns:1fr; }
          .endpoint-header { padding:14px 12px !important; gap:8px !important; flex-wrap:wrap; }
          .endpoint-path { order:2; flex:1 1 calc(100% - 72px); font-size:11px !important; }
          .endpoint-summary { order:3; flex:1 1 100%; font-size:13px !important; }
          .endpoint-header > span:last-child { order:4; margin-inline-start:auto; }
          .endpoint-content > div:first-child { padding:13px 14px !important; }
          .endpoint-grid { grid-template-columns:1fr !important; gap:18px !important; padding:0 14px 16px !important; }
          .endpoint-grid table { display:block; width:100% !important; font-size:11px !important; }
          .endpoint-grid tbody { display:block; width:100%; }
          .endpoint-grid tr { display:block; width:100%; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
          .endpoint-grid td { display:block; min-width:0; width:100% !important; padding:6px 3px !important; overflow-wrap:anywhere; word-break:break-word; }
          .response-toolbar { align-items:flex-start !important; }
          .response-toolbar > div { flex-wrap:wrap; }
          .ref-panel { overflow:hidden; }
          .ref-table { display:block; width:100%; min-width:0; }
          .ref-table thead, .ref-table tbody { display:block; width:100%; }
          .ref-table tr { display:block; width:100%; border-bottom:1px solid rgba(255,255,255,0.05); }
          .ref-table th, .ref-table td { display:block; min-width:0; width:100%; padding:9px 7px; overflow-wrap:anywhere; word-break:break-word; }
          .auth-section > div[style*="justify-content"] { flex-wrap:wrap; gap:6px; }
          .auth-section > div[style*="justify-content"] > span { max-width:100%; overflow-wrap:anywhere; }
        }
      `}</style>


      <div className="docs-root">
        <div className={`docs-inner ${mounted ? "visible" : ""}`}>

          <button className="docs-back-btn" onClick={() => router.back()}>
            {language === "ar" ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
            {t("Back", "رجوع")}
          </button>

          <div className="docs-header">
            <h1 className="docs-title">{t("Wani OTP Guide", "دليل Wani OTP")}</h1>
            <p className="docs-subtitle">{t("The complete developer guide — same journey as Quick Start: CLI, SDK, or REST API", "دليل المطور الكامل — نفس رحلة Quick Start: CLI أو SDK أو REST API")}</p>
          </div>

          {/* Base URL */}
          <div className="base-url-banner">
            <span className="base-url-label">Base URL</span>
            <span className="base-url-value">
              {baseUrl}/api/developers/otp
            </span>
            <CopyBtn text={`${baseUrl}/api/developers/otp`} lang={language} />
          </div>

          {/* Section tabs */}
          <div className="tabs">
            {sections.map(s => (
              <button key={s.id} className={`tab ${section === s.id ? "active" : ""}`}
                onClick={() => setSection(s.id)}>
                {s.label}
              </button>
            ))}
          </div>

          {/* ── 1. Getting Started ── */}
          {section === "start" && (
            <div className="auth-section">
              <h3>🚀 {t("Pick your path — same journey as Quick Start", "اختر طريقك — نفس رحلة Quick Start")}</h3>
              <p>{t(
                "Three ways to build with Wani. All of them run the same flow: send OTP → user receives it on WhatsApp → enter code → verify.",
                "ثلاث طرق للبناء مع Wani. كلها تنفذ نفس التدفق: إرسال OTP ← استلامه على WhatsApp ← إدخال الكود ← التحقق."
              )}</p>
              <div className="path-grid">
                <div className="path-card">
                  <h4><span className="path-num">1</span> CLI</h4>
                  <p>{t("Fastest way to test and onboard.", "أسرع طريقة للاختبار والبدء.")}</p>
                  <CodeBlock lang={language} label="terminal" code={[
                    "npm install -g @aiwni/cli",
                    "wani login",
                    "wani project list",
                    "wani project use <project>",
                    "wani otp test",
                  ].join("\n")} />
                  <p>{t("wani otp test runs the full flow: send → receive → enter code → verify.", "أمر wani otp test ينفذ التدفق كاملًا: إرسال ← استلام ← إدخال الكود ← تحقق.")}</p>
                </div>
                <div className="path-card">
                  <h4><span className="path-num">2</span> SDK</h4>
                  <p>{t("To embed Wani inside your project backend (Node.js 18+, server-side only).", "لدمج Wani داخل backend مشروعك (Node.js 18+، للسيرفر فقط).")}</p>
                  <CodeBlock lang={language} label="terminal" code="npm install @aiwni/sdk" />
                  <CodeBlock lang={language} label="server.js" code={[
                    'import { Wani } from "@aiwni/sdk";',
                    "",
                    "const wani = new Wani({ apiKey: process.env.WANI_API_KEY });",
                    "",
                    "const sent = await wani.otp.send({",
                    '  phone: "201012345678",',
                    '  templateId: "YOUR_TEMPLATE_ID",',
                    "  expiryMinutes: 10,",
                    "});",
                    "",
                    "const res = await wani.otp.verify({ token: sent.token, code: \"123456\" });",
                    "const st = await wani.otp.status(sent.token);",
                  ].join("\n")} />
                </div>
                <div className="path-card">
                  <h4><span className="path-num">3</span> REST API</h4>
                  <p>{t("For any other language or runtime. Three endpoints:", "لأي لغة أو بيئة أخرى. ثلاثة endpoints:")}</p>
                  <CodeBlock lang={language} label="http" code={[
                    "POST /api/developers/otp/send",
                    "POST /api/developers/otp/verify",
                    "GET  /api/developers/otp/status/:token",
                  ].join("\n")} />
                  <p>{t("Header x-api-key on every call. Full contract in API Reference.", "هيدر x-api-key مع كل استدعاء. العقد الكامل في مرجع API.")}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── 2. OTP Templates ── */}
          {section === "templates" && (
            <div className="auth-section">
              <h3>📄 {t("OTP Templates", "قوالب OTP")}</h3>
              <p>{t(
                "Wani never sends OTP as plain WhatsApp text. Every OTP goes out through an approved WhatsApp OTP template — an AUTHENTICATION template whose structure Wani defines and Meta reviews.",
                "لا يرسل Wani الـ OTP كنص WhatsApp عادي أبدًا. كل OTP يخرج عبر قالب WhatsApp OTP معتمد — قالب AUTHENTICATION يحدد Wani بنيته وتراجعه Meta."
              )}</p>

              <h3 style={{ marginTop: 24 }}>🛠 {t("Where to create one", "أين تنشئ واحدًا")}</h3>
              <p>{t(
                "Developer Portal → your project → OTP Templates → create, then sync with Meta and wait for APPROVED. Only OTP READY templates can send: APPROVED status + AUTHENTICATION category + linked Meta template id + valid metadata.",
                "بورتال المطور ← مشروعك ← قوالب OTP ← أنشئ، ثم زامن مع Meta وانتظر APPROVED. القوالب الجاهزة للإرسال فقط هي: حالة APPROVED + تصنيف AUTHENTICATION + معرف قالب Meta مربوط + بيانات سليمة."
              )}</p>

              <h3 style={{ marginTop: 24 }}>🆔 {t("templateId vs templateName", "templateId مقابل templateName")}</h3>
              <p>{t(
                "Prefer templateId — the exact Wani record id shown on each template card. It is unambiguous and always wins when both are sent. templateName is a legacy path: the exact approved name, lowercased; add language when one name exists in several languages, otherwise you get TEMPLATE_AMBIGUOUS or TEMPLATE_LANGUAGE_MISMATCH.",
                "فضل templateId دائمًا — معرف سجل Wani الدقيق الظاهر على كارت كل قالب. لا غموض فيه ويتفوق عند إرسال الاثنين. أما templateName فمسار قديم: الاسم المعتمد بالضبط بأحرف صغيرة؛ أضف language عندما يوجد نفس الاسم بلغات متعددة وإلا ستحصل على TEMPLATE_AMBIGUOUS أو TEMPLATE_LANGUAGE_MISMATCH."
              )}</p>

              <h3 style={{ marginTop: 24 }}>🧱 {t("Required template shape", "البنية المطلوبة للقالب")}</h3>
              <p>{t(
                "BODY (Meta generates the standard text — no custom text) + FOOTER with code_expiration_minutes (1–90) + BUTTONS with one OTP COPY_CODE button. The code itself always travels as the single {{1}} parameter, injected server-side by Wani.",
                "نص BODY قياسي تولده Meta (بلا نص مخصص) + FOOTER فيه code_expiration_minutes (1–90) + أزرار فيها زر OTP من نوع COPY_CODE. الكود نفسه يُرسَل دائمًا كباراميتر {{1}} الوحيد، ويحقنه Wani من السيرفر."
              )}</p>

              <h3 style={{ marginTop: 24 }}>🌍 {t("Supported languages", "اللغات المدعومة")}</h3>
              <p>
                {["ar", "en_US", "en_GB", "fr", "de", "es", "tr", "ur"].map(l => (
                  <span key={l} className="code-inline" style={{ marginInlineEnd: 6 }}>{l}</span>
                ))}
              </p>
              <p>{t("Real body examples generated by Wani:", "أمثلة حقيقية للنص يولدها Wani:")}</p>
              <CodeBlock lang={language} label="ar" code="{{1}} هو رمز التحقق الخاص بك. لا تشاركه مع أحد." />
              <CodeBlock lang={language} label="en_US" code="{{1}} is your verification code. For your security, do not share this code." />

              <h3 style={{ marginTop: 24 }}>⚠️ {t("Common template errors", "أخطاء القوالب الشائعة")}</h3>
              <div className="ref-panel">
                <table className="ref-table">
                  <tbody>
                    {[
                      { c: "TEMPLATE_NOT_APPROVED", d: t("Not Meta-APPROVED yet — wait or sync", "غير معتمد من Meta بعد — انتظر أو زامن") },
                      { c: "TEMPLATE_NO_META_ID", d: t("Not linked to a Meta template — sync first", "غير مربوط بقالب Meta — زامن أولًا") },
                      { c: "OTP_TEMPLATE_NOT_COMPATIBLE", d: t("Not an AUTHENTICATION template", "ليس قالب AUTHENTICATION") },
                      { c: "OTP_TEMPLATE_METADATA_INVALID (409)", d: t("Incomplete metadata — re-sync from Meta", "بيانات غير مكتملة — أعد المزامنة من Meta") },
                      { c: "META_131008 (422)", d: t("Meta rejected the template parameters (payload mismatch) — sync templates, retry; fix the template definition if it repeats", "رفض Meta باراميترات القالب — زامن القوالب وأعد المحاولة؛ أصلح تعريف القالب عند التكرار") },
                    ].map(r => (
                      <tr key={r.c}>
                        <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12, color: "#f59e0b", whiteSpace: "nowrap" }}>{r.c}</td>
                        <td>{r.d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 3. Integration Guide ── */}
          {section === "integration" && (
            <div className="auth-section">
              <h3>🧩 {t("Integration guide — Install → Auth → Send → Verify → Status → Errors", "دليل الدمج — تثبيت ← مصادقة ← إرسال ← تحقق ← حالة ← أخطاء")}</h3>
              <div className="ref-panel" style={{ marginTop: 16 }}>
                <table className="ref-table">
                  <thead>
                    <tr>
                      <th>{t("Method", "الطريقة")}</th>
                      <th>Install</th>
                      <th>{t("Auth", "المصادقة")}</th>
                      <th>Send</th>
                      <th>Verify</th>
                      <th>Status</th>
                      <th>{t("Errors", "الأخطاء")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600, color: "#fff" }}>CLI</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>npm i -g @aiwni/cli</td>
                      <td style={{ fontSize: 12 }}>wani login (browser)</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>wani otp test</td>
                      <td style={{ fontSize: 12 }}>{t("inside the test flow", "داخل تدفق الاختبار")}</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>wani otp status</td>
                      <td style={{ fontSize: 12 }}>{t("printed + codes", "مطبوعة + codes")}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, color: "#fff" }}>SDK</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>npm i @aiwni/sdk</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>new Wani({`{apiKey}`})</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>otp.send()</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>otp.verify()</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>otp.status()</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>WaniError.code + retryAfter</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, color: "#fff" }}>REST</td>
                      <td style={{ fontSize: 12 }}>—</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>x-api-key</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>POST /send</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>POST /verify</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>GET /status/:token</td>
                      <td style={{ fontFamily: "Fira Code, monospace", fontSize: 12 }}>{"{ok:false, code}"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: 16 }}>{t(
                "Rule of thumb: CLI for the fastest first test, SDK to embed Wani in your Node backend, REST for any other language or runtime.",
                "القاعدة: CLI لأسرع اختبار أول، SDK لدمج Wani داخل backend مشروعك (Node)، وREST لأي لغة أو بيئة أخرى."
              )}</p>
            </div>
          )}

          {/* ── 4. Authentication ── */}
          {section === "auth" && (
            <div className="auth-section">
              <h3>🔑 {t("Two credentials, two jobs", "بيانات اعتماد مختلفة لمهمتين مختلفتين")}</h3>
              <div className="path-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="path-card">
                  <h4><span className="path-num">A</span>{t("CLI Account Session", "جلسة حساب CLI")}</h4>
                  <CodeBlock lang={language} label="terminal" code={["wani login", "# → browser authorization", "wani project list"].join("\n")} />
                  <p>{t(
                    "Proves who you are. Browser device flow, revocable from Settings → CLI & Integrations, account scope — project access is resolved server-side, never granted by the token itself.",
                    "تثبت هويتك. تدفق متصفح قابل للإلغاء من الإعدادات، بصلاحية الحساب — والوصول للمشاريع يُحسم من السيرفر وليس من التوكن نفسه."
                  )}</p>
                </div>
                <div className="path-card">
                  <h4><span className="path-num">B</span>{t("Project API Key", "مفتاح API للمشروع")}</h4>
                  <CodeBlock lang={language} label="http" code={["x-api-key: wani_live_xxxx", "POST /api/developers/otp/send"].join("\n")} />
                  <p>{t(
                    "Authorizes OTP calls for one project. Starts with wani_live_, created per project in API Keys, sent as x-api-key on every OTP request.",
                    "يصرّح استدعاءات OTP لمشروع واحد. يبدأ بـ wani_live_ ويُنشأ لكل مشروع في API Keys ويُرسل كـ x-api-key مع كل طلب OTP."
                  )}</p>
                </div>
              </div>

              <h3 style={{ marginTop: 24 }}>⚠️ {t("API Key Security", "أمان الـ API Key")}</h3>
              <p>{t("Server environment only — never browsers, never git:", "بيئة السيرفر فقط — لا المتصفح ولا git أبدًا:")}</p>
              <div className="code-block">
                <span className="cm"># .env</span>{"\n"}
                <span className="kw">WANI_API_KEY</span>=<span className="st">wani_live_xxxx_yyyy</span>{"\n\n"}
                <span className="cm"># Node.js (server only)</span>{"\n"}
                <span className="kw">const</span> apiKey = process.env.<span className="st">WANI_API_KEY</span>;{"\n\n"}
                <span className="cm"># Python (server only)</span>{"\n"}
                <span className="kw">import</span> os{"\n"}
                api_key = os.environ[<span className="st">&quot;WANI_API_KEY&quot;</span>]
              </div>

              <h3 style={{ marginTop: 24 }}>🚦 Rate Limiting</h3>
              <p>
                {t(
                  <>Exceeded quotas return <span className="code-inline">429</span> with a <span className="code-inline">Retry-After</span> header and a <span className="code-inline">retryAfter</span> body field. If the protection layer itself is down, sensitive calls fail closed with <span className="code-inline">503 RATE_LIMITER_UNAVAILABLE</span> — never a bypass.</>,
                  <>تجاوز الحصص يرجع <span className="code-inline">429</span> مع <span className="code-inline">Retry-After</span> وحقل <span className="code-inline">retryAfter</span>. ولو طبقة الحماية نفسها متعطلة، الاستدعاءات الحساسة تُرفض بـ <span className="code-inline">503 RATE_LIMITER_UNAVAILABLE</span> — وليس تجاوزًا أبدًا.</>
                )}
              </p>
              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "14px 16px",
                border: "1px solid rgba(255,255,255,0.07)", marginTop: 12,
              }}>
                {[
                  { action: "POST /otp/send", limit: t("5/hour per phone · 15/min + 150/hour per IP", "5/ساعة لكل رقم · 15/دقيقة + 150/ساعة لكل IP") },
                  { action: "POST /otp/verify", limit: t("10/15 min per token · 15/min + 150/hour per IP", "10/15 دقيقة لكل token · 15/دقيقة + 150/ساعة لكل IP") },
                  { action: "GET /otp/status", limit: t("No limit (read-only)", "بدون حد (read-only)") },
                ].map(r => (
                  <div key={r.action} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                    <span style={{ fontFamily: "Fira Code, monospace", color: "#86efac", fontSize: 12 }}>{r.action}</span>
                    <span style={{ color: "rgba(255,255,255,0.45)" }}>{r.limit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 5. API Reference ── */}
          {section === "reference" && (
            <div className="ep-list">
              <div className="ref-panel" style={{ padding: "14px 18px", marginBottom: 4 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                  {t("Method summary:", "ملخص الطرق:")} <span style={{ fontFamily: "Fira Code, monospace", fontSize: 12, color: "#86efac" }}>POST /otp/send</span>
                  {" · "}<span style={{ fontFamily: "Fira Code, monospace", fontSize: 12, color: "#86efac" }}>POST /otp/verify</span>
                  {" · "}<span style={{ fontFamily: "Fira Code, monospace", fontSize: 12, color: "#86efac" }}>GET /otp/status/:token</span>
                </div>
              </div>
              {ENDPOINTS.map(ep => <EndpointCard key={ep.id} ep={ep} lang={language} t={t} />)}
            </div>
          )}

          {/* ── 6. Errors ── */}
          {section === "errors" && (
            <div>
              <div className="auth-section" style={{ marginBottom: 12 }}>
                <p style={{ margin: 0 }}>{t(
                  "Every error answers three questions: HTTP status (what happened), code (why, machine-readable), and error (human message). Handle code, not text.",
                  "كل خطأ يجيب عن ثلاثة أسئلة: حالة HTTP (ماذا حدث) وcode (لماذا، بصيغة آلية) وerror (رسالة بشرية). تعامل مع code وليس النص."
                )}</p>
              </div>
              <div className="ref-panel">
                <table className="ref-table">
                  <thead>
                    <tr>
                      <th>code</th>
                      <th>HTTP</th>
                      <th>{t("Meaning", "المعنى")}</th>
                      <th>{t("Do this", "افعل هذا")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ERROR_CODE_ROWS.map(r => (
                      <tr key={r.code}>
                        <td style={{ fontFamily: "Fira Code, monospace", fontSize: 11.5, color: "#f59e0b", whiteSpace: "nowrap" }}>{r.code}</td>
                        <td>
                          <span className="code-num" style={{ color: r.http >= 500 ? "#f87171" : r.http >= 400 ? "#f59e0b" : "#20d378" }}>
                            {r.http}
                          </span>
                        </td>
                        <td>{language === "ar" ? r.ar : r.en}</td>
                        <td style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{language === "ar" ? r.actionAr : r.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="auth-section" style={{ marginTop: 12 }}>
                <h3>{t("Statuses", "الحالات")}</h3>
                <div className="ref-panel">
                  <table className="ref-table">
                    <tbody>
                      {STATUS_VALUES.map(s => (
                        <tr key={s.value}>
                          <td>
                            <div className="status-pill">
                              <div className="status-dot" style={{ background: s.color }} />
                              <span style={{ color: s.color, fontFamily: "Fira Code, monospace", fontSize: 12 }}>{s.value}</span>
                            </div>
                          </td>
                          <td>{s.desc}</td>
                          <td style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                            {s.value === "sent" && t("Request code from user → POST /verify", "اطلب الكود من المستخدم → POST /verify")}
                            {s.value === "pending" && t("Reserved — live OTPs report sent", "محجوزة — OTPs الحية تبلغ sent")}
                            {s.value === "verified" && t("Proceed with login or complete the flow", "اعمل login أو أكمل الـ flow")}
                            {s.value === "expired" && t("Send a new POST /send", "اعمل POST /send جديدة")}
                            {s.value === "failed" && t("Check Meta connection — send a new /send", "تحقق من ربط Meta — اعمل /send جديدة")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── 7. Production Checklist ── */}
          {section === "production" && (
            <div className="auth-section">
              <h3>✅ {t("Before you go live", "قبل الإطلاق")}</h3>
              <p>{t("Every item below maps to real API behavior — not generic advice.", "كل بند أدناه مرتبط بسلوك API حقيقي — وليس نصائح عامة.")}</p>
              <Checklist items={[
                { en: "API key lives in a server environment variable (WANI_API_KEY) — never in git, logs, or responses.", ar: "مفتاح API في متغير بيئة على السيرفر (WANI_API_KEY) — لا في git ولا اللوجز ولا الردود." },
                { en: "Backend only: the SDK and the key never ship to browsers or client bundles.", ar: "Backend فقط: الـ SDK والمفتاح لا يخرجان للمتصفح أو حزم العميل أبدًا." },
                { en: "All calls over HTTPS to https://developers.aiwni.com.", ar: "كل الاستدعاءات عبر HTTPS إلى https://developers.aiwni.com." },
                { en: "Pick an OTP expiry that fits your UX (1–60 min, default 10) and show the countdown from expiresAt.", ar: "اختر مدة صلاحية تناسب تجربتك (1–60 دقيقة، الافتراضي 10) واعرض العد التنازلي من expiresAt." },
                { en: "Handle 429 with Retry-After backoff — and 503 RATE_LIMITER_UNAVAILABLE with a short retry, never as success.", ar: "تعامل مع 429 بانتظار Retry-After — ومع 503 بإعادة قريبة، وليس كنجاح أبدًا." },
                { en: "Never log the API key, the OTP code, or tokens (Wani stores REDACTED server-side).", ar: "لا تسجل المفتاح أو كود OTP أو الـ tokens أبدًا (Wani يخزن REDACTED)." },
                { en: "On OTP_EXPIRED send a fresh code; on ALREADY_VERIFIED treat the user as verified — never re-verify or spin.", ar: "عند OTP_EXPIRED أرسل كودًا جديدًا؛ وعند ALREADY_VERIFIED اعتبر المستخدم متحققًا — لا تعيد التحقق ولا تكرر." },
                { en: "Never auto-resend in a loop: 5 sends/hour/phone is enforced, and failed attempts still cost attention.", ar: "لا تعيد الإرسال تلقائيًا في حلقة: حد 5/ساعة/رقم مطبق، والمحاولات الفاشلة مكلفة." },
                { en: "Verify is attempt-limited (10 per 15 min per token) — surface CODE_MISMATCH calmly instead of hammering.", ar: "التحقق محدود المحاولات (10 لكل 15 دقيقة لكل token) — اعرض CODE_MISMATCH بهدوء بدل الضغط." },
                { en: "Watch messagesLeft on trial plans to warn before the free quota ends.", ar: "راقب messagesLeft في خطط التجربة للتحذير قبل انتهاء الحصة المجانية." },
              ]} />
            </div>
          )}

          {/* ── 8. Examples (generated from the same source as Quick Start) ── */}
          {section === "examples" && (
            <div className="auth-section">
              <h3>💡 {t("Copy-paste examples", "أمثلة جاهزة للنسخ")}</h3>
              <p>{t(
                "Generated live from the same code generator Quick Start uses — pick a language and copy. Template: YOUR_TEMPLATE_ID.",
                "مولدة لحظيًا من نفس مولد الأكواد الذي يستخدمه Quick Start — اختر اللغة وانسخ. القالب: YOUR_TEMPLATE_ID."
              )}</p>
              <div className="tabs" style={{ marginBottom: 8 }}>
                {EXAMPLE_OPTIONS.map(o => (
                  <button key={o.id} className={`tab ${example === o.id ? "active" : ""}`}
                    onClick={() => setExample(o.id)}>
                    {o.label}
                  </button>
                ))}
              </div>
              <CodeBlock lang={language} label={EXAMPLE_OPTIONS.find(o => o.id === example)?.label ?? ""} code={exampleCode} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
