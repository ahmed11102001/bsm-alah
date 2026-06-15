"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "../../_components/LanguageProvider";

// ─── Types ────────────────────────────────────────────────────────────────────
type HttpMethod = "POST" | "GET";

interface Param {
  name:     string;
  type:     string;
  required: boolean;
  desc:     string;
  descAr?:  string;
  example?: string;
}

interface ResponseField {
  name: string;
  type: string;
  desc: string;
  descAr?: string;
}

interface Endpoint {
  id:       string;
  method:   HttpMethod;
  path:     string;
  summary:  string;
  summaryAr: string;
  desc:     string;
  descAr:   string;
  auth:     boolean;
  headers:  Param[];
  body:     Param[];
  response: { success: object; error: object };
  fields:   ResponseField[];
  notes?:   string[];
  notesAr?: string[];
}

// ─── Endpoints definition ─────────────────────────────────────────────────────
const ENDPOINTS: Endpoint[] = [
  {
    id:      "send",
    method:  "POST",
    path:    "/api/developers/otp/send",
    summary: "Send OTP",
    summaryAr: "إرسال OTP",
    desc:    "Generates an OTP code and sends it to the user via WhatsApp using a Meta-approved template.",
    descAr:  "يولد كود OTP ويرسله للمستخدم عبر WhatsApp باستخدام قالب مُوافق عليه من Meta.",
    auth:    true,
    headers: [
      { name: "x-api-key",     type: "string", required: true,  desc: "Your project API key",       descAr: "مفتاح الـ API الخاص بمشروعك",       example: "wani_live_xxxx_yyyy" },
      { name: "Content-Type",  type: "string", required: true,  desc: "Content type",                descAr: "نوع البيانات",                        example: "application/json" },
    ],
    body: [
      { name: "phone",          type: "string",  required: true,  desc: "Phone number — E.164 or Egyptian format", descAr: "رقم الهاتف — E.164 أو الصيغة المصرية", example: "+201234567890 or 01234567890" },
      { name: "templateName",   type: "string",  required: true,  desc: "APPROVED template name in Meta",       descAr: "اسم القالب الـ APPROVED في Meta",       example: "otp_verification" },
      { name: "expiryMinutes",  type: "number",  required: false, desc: "Code validity duration in minutes",             descAr: "مدة صلاحية الكود بالدقائق",             example: "10 (default)" },
    ],
    response: {
      success: { ok: true, token: "a3f9c2e1...64hex...", expiresAt: "2025-01-15T14:30:00.000Z" },
      error:   { ok: false, error: "Template \"otp_verification\" not found or not yet approved" },
    },
    fields: [
      { name: "ok",         type: "boolean", desc: "true on success", descAr: "true عند النجاح" },
      { name: "token",      type: "string",  desc: "64-char hex token — save it for the verify step", descAr: "64-char hex token — احتفظ بيه لخطوة التحقق" },
      { name: "expiresAt",  type: "string",  desc: "ISO 8601 — code expiration time", descAr: "ISO 8601 — وقت انتهاء صلاحية الكود" },
      { name: "retryAfter", type: "number",  desc: "Only present on 429 — seconds to wait before retrying", descAr: "موجود فقط عند 429 — عدد الثواني المطلوب الانتظار قبل إعادة المحاولة" },
    ],
    notes: [
      "Rate limit: 5 messages per phone per developer per hour",
      "Template must be APPROVED by Meta before sending",
      "Phone number is automatically normalized to E.164 (Egyptian: 01x → 201x)",
    ],
    notesAr: [
      "Rate limit: 5 رسائل لكل رقم لكل مبرمج كل ساعة",
      "القالب يجب أن يكون بحالة APPROVED من Meta قبل الإرسال",
      "الرقم يُطبَّع تلقائيًا لـ E.164 (مصري: 01x → 201x)",
    ],
  },
  {
    id:      "verify",
    method:  "POST",
    path:    "/api/developers/otp/verify",
    summary: "Verify Code",
    summaryAr: "التحقق من الكود",
    desc:    "Verifies the entered code against the token issued from /send.",
    descAr:  "يتحقق من صحة الكود المُدخل مقابل الـ token الصادر من /send.",
    auth:    true,
    headers: [
      { name: "x-api-key",    type: "string", required: true, desc: "API key",  descAr: "مفتاح الـ API",  example: "wani_live_xxxx_yyyy" },
      { name: "Content-Type", type: "string", required: true, desc: "Content type",   descAr: "نوع البيانات",   example: "application/json" },
    ],
    body: [
      { name: "token", type: "string", required: true, desc: "Token from /send response",      descAr: "الـ token من استجابة /send",      example: "a3f9c2e1..." },
      { name: "code",  type: "string", required: true, desc: "6-digit code",         descAr: "الكود المكوّن من 6 أرقام",         example: "123456" },
    ],
    response: {
      success: { ok: true, verified: true, message: "OTP verified successfully", phone: "+201234567890" },
      error:   { ok: false, verified: false, error: "Invalid code" },
    },
    fields: [
      { name: "ok",         type: "boolean", desc: "true on success", descAr: "true عند النجاح" },
      { name: "verified",   type: "boolean", desc: "true if code is correct", descAr: "true لو الكود صحيح" },
      { name: "phone",      type: "string",  desc: "Verified phone number (on success only)", descAr: "رقم الهاتف المُتحقَّق منه (عند النجاح فقط)" },
      { name: "message",    type: "string",  desc: "Descriptive message", descAr: "رسالة نصية توضيحية" },
      { name: "retryAfter", type: "number",  desc: "Only present on 429 — seconds to wait before retrying", descAr: "موجود فقط عند 429 — عدد الثواني المطلوب الانتظار قبل إعادة المحاولة" },
    ],
    notes: [
      "Brute-force protection: 10 attempts per 15 minutes per token",
      "If the token was already verified, any subsequent /verify call with the same token returns verified: true automatically (\"previously verified\") without checking the code again",
      "Expired token → error: OTP has expired",
    ],
    notesAr: [
      "Brute-force protection: 10 محاولات كل 15 دقيقة لكل token",
      "لو الـ token اتحقق منه قبل كده، أي استدعاء تالٍ لـ /verify بنفس الـ token هيرجع verified: true تلقائيًا (\"تم التحقق منه مسبقاً\") بدون التحقق من الكود تاني",
      "لو Token انتهت صلاحيته → error: OTP انتهت صلاحيته",
    ],
  },
  {
    id:      "status",
    method:  "GET",
    path:    "/api/developers/otp/status/:token",
    summary: "Check OTP Status",
    summaryAr: "فحص حالة الـ OTP",
    desc:    "Returns the current status of a specific OTP with the remaining time before expiry.",
    descAr:  "يُرجع الحالة الحالية لـ OTP معين مع الوقت المتبقي قبل انتهاء الصلاحية.",
    auth:    true,
    headers: [
      { name: "x-api-key", type: "string", required: true, desc: "API key", descAr: "مفتاح الـ API", example: "wani_live_xxxx_yyyy" },
    ],
    body: [],
    response: {
      success: {
        ok: true, token: "a3f9c2e1...", status: "sent",
        phone: "+201234567890",
        sentAt: "2025-01-15T14:20:00.000Z",
        verifiedAt: null,
        expiresAt: "2025-01-15T14:30:00.000Z",
        secondsRemaining: 423,
        meta: { messageId: "wamid.xxx", error: null },
      },
      error: { ok: false, error: "Token not found or does not belong to this API Key" },
    },
    fields: [
      { name: "status",           type: "string",        desc: "pending | sent | verified | expired | failed", descAr: "pending | sent | verified | expired | failed" },
      { name: "secondsRemaining", type: "number | null", desc: "Seconds remaining before expiry (0 if expired)", descAr: "الثواني المتبقية قبل انتهاء الصلاحية (0 لو انتهت)" },
      { name: "sentAt",           type: "string | null", desc: "Send time ISO 8601", descAr: "وقت الإرسال ISO 8601" },
      { name: "verifiedAt",       type: "string | null", desc: "Verification time ISO 8601 (null if not yet)", descAr: "وقت التحقق ISO 8601 (null لو لسه)" },
      { name: "meta.messageId",   type: "string | null", desc: "Meta WhatsApp message ID", descAr: "Meta WhatsApp message ID" },
      { name: "meta.error",       type: "string | null", desc: "Failure reason if status = failed", descAr: "سبب الفشل لو status = failed" },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
    GET:  { bg: "rgba(56,189,248,0.12)", color: "#38bdf8", border: "rgba(56,189,248,0.25)" },
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
        if (/"(ok|verified)":\s*true/.test(line))   color = "#20d378";
        if (/"(ok|verified)":\s*false/.test(line))  color = "#f87171";
        if (/"error":/.test(line))                  color = "#f87171";
        else if (/:\s*"/.test(line))                color = "#86efac";
        else if (/:\s*\d/.test(line))               color = "#93c5fd";
        else if (/:\s*(true|false|null)/.test(line))color = "#f9a8d4";
        return <div key={i} style={{ color }}>{line || " "}</div>;
      })}
    </pre>
  );
}

// ─── Endpoint Card ────────────────────────────────────────────────────────────
function EndpointCard({ ep, lang, t }: { ep: Endpoint; lang: string; t: (en: string, ar: string) => string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState<"success" | "error">("success");

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${open ? "rgba(32,211,120,0.2)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 16, overflow: "hidden",
      transition: "border-color .2s",
    }}>
      {/* Header — click to expand */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "18px 22px",
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 14,
          textAlign: lang === 'ar' ? "right" : "left", direction: lang === 'ar' ? "rtl" : "ltr",
        }}
      >
        <MethodBadge method={ep.method} />
        <span style={{ fontFamily: "Fira Code, monospace", fontSize: 13, color: "rgba(255,255,255,0.7)", direction: "ltr", textAlign: "left" }}>
          {ep.path}
        </span>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", flex: 1 }}>{lang === 'ar' ? ep.summaryAr : ep.summary}</span>
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
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Description */}
          <div style={{ padding: "16px 22px", background: "rgba(255,255,255,0.01)" }}>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{lang === 'ar' ? ep.descAr : ep.desc}</p>
          </div>

          <div style={{ padding: "0 22px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 8 }}>
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

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════
export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);
  const [section, setSection] = useState<"endpoints" | "statuses" | "errors" | "auth">("endpoints");
  const { language, t } = useLanguage();

  useEffect(() => { setMounted(true); }, []);

  const sections = [
    { id: "endpoints" as const, label: t("Endpoints", "الـ Endpoints") },
    { id: "auth" as const,      label: t("Authentication", "المصادقة") },
    { id: "statuses" as const,  label: t("OTP Statuses", "حالات الـ OTP") },
    { id: "errors" as const,    label: t("Error Codes", "أكواد الأخطاء") },
  ];

  // ─── Status values reference ──────────────────────────────────────────────────
  const STATUS_VALUES = [
    { value: "pending", color: "#94a3b8", desc: t("OTP created but not yet sent", "OTP أُنشئ لكن لم يُرسَل بعد") },
    { value: "sent",    color: "#f59e0b", desc: t("Sent via WhatsApp — awaiting verification", "تم الإرسال عبر WhatsApp — ينتظر التحقق") },
    { value: "verified",color: "#20d378", desc: t("Successfully verified", "تم التحقق بنجاح") },
    { value: "expired", color: "#6b7280", desc: t("Code has expired", "انتهت صلاحية الكود") },
    { value: "failed",  color: "#ef4444", desc: t("Failed to send via Meta", "فشل الإرسال عبر Meta") },
  ];

  // ─── Error codes reference ────────────────────────────────────────────────────
  const ERROR_CODES = [
    { code: 400, label: "Bad Request",    desc: t("Missing or invalid data in the request body", "بيانات ناقصة أو غير صحيحة في الـ body") },
    { code: 401, label: "Unauthorized",   desc: t("x-api-key missing, invalid, or revoked", "x-api-key مفقود أو غير صحيح أو ملغي") },
    { code: 404, label: "Not Found",      desc: t("Token not found or does not belong to this Key", "Token غير موجود أو لا ينتمي لهذا الـ Key") },
    { code: 429, label: "Too Many Req.",  desc: t("Rate limit — wait before retrying (Retry-After header)", "Rate limit — انتظر قبل المحاولة مجددًا (Retry-After header)") },
    { code: 502, label: "Bad Gateway",    desc: t("Failed to send via Meta WhatsApp API", "فشل الإرسال عبر Meta WhatsApp API") },
    { code: 500, label: "Server Error",   desc: t("Internal error — contact support", "خطأ داخلي — تواصل مع الدعم") },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

        .docs-root { min-height:100vh; background:#060810; font-family:'IBM Plex Sans Arabic',sans-serif; direction:${language === 'ar' ? 'rtl' : 'ltr'}; color:#fff; }
        .docs-root::before { content:''; position:fixed; inset:0; background-image:linear-gradient(rgba(32,211,120,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(32,211,120,0.025) 1px,transparent 1px); background-size:48px 48px; pointer-events:none; z-index:0; }
        .docs-inner { max-width:1000px; margin:0 auto; padding:40px 32px; position:relative; z-index:1; opacity:0; transform:translateY(10px); transition:opacity .4s,transform .4s; }
        .docs-inner.visible { opacity:1; transform:translateY(0); }

        .docs-header { margin-bottom:32px; }
        .docs-title { font-size:26px; font-weight:600; }
        .docs-subtitle { font-size:14px; color:rgba(255,255,255,0.4); margin-top:4px; }

        /* Section tabs */
        .tabs { display:flex; gap:4px; padding:4px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px; width:fit-content; margin-bottom:32px; }
        .tab { padding:8px 18px; border-radius:9px; border:none; background:none; color:rgba(255,255,255,0.4); font-size:13px; font-family:inherit; cursor:pointer; transition:all .2s; white-space:nowrap; }
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

        @media(max-width:700px) {
          .docs-inner { padding:20px 16px; }
          .tabs { flex-wrap:wrap; }
        }
      `}</style>

      <div className="docs-root">
        <div className={`docs-inner ${mounted ? "visible" : ""}`}>

          <div className="docs-header">
            <h1 className="docs-title">API Reference</h1>
            <p className="docs-subtitle">{t("Complete documentation for OTP API — all endpoints, parameters, and responses", "توثيق كامل لـ OTP API — كل الـ endpoints والـ parameters والـ responses")}</p>
          </div>

          {/* Base URL */}
          <div className="base-url-banner">
            <span className="base-url-label">Base URL</span>
            <span className="base-url-value">
              {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}
              /api/developers/otp
            </span>
            <CopyBtn text={`${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/developers/otp`} lang={language} />
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

          {/* ── Endpoints ── */}
          {section === "endpoints" && (
            <div className="ep-list">
              {ENDPOINTS.map(ep => <EndpointCard key={ep.id} ep={ep} lang={language} t={t} />)}
            </div>
          )}

          {/* ── Auth ── */}
          {section === "auth" && (
            <div className="auth-section">
              <h3>🔑 {t("Authentication via API Key", "المصادقة عبر API Key")}</h3>
              <p>
                {t(
                  <>Every request requires a valid API key in the <span className="code-inline">x-api-key</span> header. Keys start with <span className="code-inline">wani_live_</span> and are generated from the API Keys page.</>,
                  <>كل طلب يحتاج مفتاح API صالح في الـ header{" "}<span className="code-inline">x-api-key</span>. المفاتيح بتبدأ بـ <span className="code-inline">wani_live_</span> وبتتولد من صفحة API Keys.</>
                )}
              </p>

              <div className="code-block">
                <span className="cm"># {t("cURL example", "مثال cURL")}</span>{"\n"}
                <span className="kw">curl</span> -X POST{" "}
                <span className="st">&quot;https://your-domain.com/api/developers/otp/send&quot;</span> \{"\n"}
                {"  "}-H <span className="st">&quot;x-api-key: wani_live_xxxx_yyyy&quot;</span> \{"\n"}
                {"  "}-H <span className="st">&quot;Content-Type: application/json&quot;</span> \{"\n"}
                {"  "}-d <span className="st">&apos;{`{"phone":"+201234567890","templateName":"otp_verification"}`}&apos;</span>
              </div>

              <h3 style={{ marginTop: 24 }}>⚠️ {t("API Key Security", "أمان الـ API Key")}</h3>
              <p>{t("Always store the API Key in an environment variable — never hardcode it:", "احفظ الـ API Key دايمًا في environment variable — لا تحطه في الكود مباشرة:")}</p>
              <div className="code-block">
                <span className="cm"># .env</span>{"\n"}
                <span className="kw">WANI_API_KEY</span>=<span className="st">wani_live_xxxx_yyyy</span>{"\n\n"}
                <span className="cm"># Node.js</span>{"\n"}
                <span className="kw">const</span> apiKey = process.env.<span className="st">WANI_API_KEY</span>;{"\n\n"}
                <span className="cm"># Python</span>{"\n"}
                <span className="kw">import</span> os{"\n"}
                api_key = os.environ[<span className="st">&quot;WANI_API_KEY&quot;</span>]
              </div>

              <h3 style={{ marginTop: 24 }}>🚦 Rate Limiting</h3>
              <p>
                {t(
                  <>The API has rate limiting protection — if you exceed the limit you&apos;ll get a <span className="code-inline">429 Too Many Requests</span> response with a <span className="code-inline">Retry-After</span> header specifying the wait time in seconds.</>,
                  <>الـ API عنده حماية من الاستخدام المفرط — لو تجاوزت الحد هتاخد{" "}<span className="code-inline">429 Too Many Requests</span> مع{" "}<span className="code-inline">Retry-After</span> header بيحدد الانتظار بالثواني.</>
                )}
              </p>

              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "14px 16px",
                border: "1px solid rgba(255,255,255,0.07)", marginTop: 12,
              }}>
                {[
                  { action: "POST /otp/send",   limit: t("5 requests / hour per phone per developer", "5 طلبات / ساعة لكل رقم لكل مبرمج") },
                  { action: "POST /otp/verify", limit: t("10 attempts / 15 min per token", "10 محاولات / 15 دقيقة لكل token") },
                  { action: "GET /otp/status",  limit: t("No limit (read-only)", "بدون حد (read-only)") },
                ].map(r => (
                  <div key={r.action} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                    <span style={{ fontFamily: "Fira Code, monospace", color: "#86efac", fontSize: 12 }}>{r.action}</span>
                    <span style={{ color: "rgba(255,255,255,0.45)" }}>{r.limit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Statuses ── */}
          {section === "statuses" && (
            <div className="ref-panel">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>{t("Status", "الحالة")}</th>
                    <th>{t("Description", "الوصف")}</th>
                    <th>{t("Next Step", "الخطوة التالية")}</th>
                  </tr>
                </thead>
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
                        {s.value === "sent"     && t("Request code from user → POST /verify", "اطلب الكود من المستخدم → POST /verify")}
                        {s.value === "pending"  && t("Wait a moment and try /status again", "انتظر لحظة وحاول /status تاني")}
                        {s.value === "verified" && t("Proceed with login or complete the flow", "اعمل login أو أكمل الـ flow")}
                        {s.value === "expired"  && t("Send a new POST /send", "اعمل POST /send جديدة")}
                        {s.value === "failed"   && t("Check Meta connection — send a new /send", "تحقق من ربط Meta — اعمل /send جديدة")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Errors ── */}
          {section === "errors" && (
            <div className="ref-panel">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>HTTP Code</th>
                    <th>{t("Meaning", "المعنى")}</th>
                    <th>{t("Solution", "الحل")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ERROR_CODES.map(e => (
                    <tr key={e.code}>
                      <td>
                        <span className="code-num" style={{
                          color: e.code >= 500 ? "#f87171" : e.code >= 400 ? "#f59e0b" : "#20d378",
                        }}>
                          {e.code}
                        </span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 8, fontFamily: "Fira Code, monospace" }}>
                          {e.label}
                        </span>
                      </td>
                      <td>{e.desc}</td>
                      <td style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                        {e.code === 400 && t("Check the request body — see error in response", "راجع الـ request body — شوف error في الـ response")}
                        {e.code === 401 && t("Check x-api-key header and that the key is active", "تحقق من x-api-key header وإن الـ key نشط")}
                        {e.code === 404 && t("Check the token and that it belongs to this key", "تحقق من الـ token وإنه تابع للـ key ده")}
                        {e.code === 429 && t("Wait for Retry-After header value in seconds", "انتظر قيمة Retry-After header بالثواني")}
                        {e.code === 502 && t("Meta API issue — check Meta connection and template", "مشكلة في Meta API — تحقق من ربط Meta والقالب")}
                        {e.code === 500 && t("Internal error — contact support", "خطأ داخلي — تواصل مع الدعم")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}