"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type HttpMethod = "POST" | "GET";

interface Param {
  name:     string;
  type:     string;
  required: boolean;
  desc:     string;
  example?: string;
}

interface ResponseField {
  name: string;
  type: string;
  desc: string;
}

interface Endpoint {
  id:       string;
  method:   HttpMethod;
  path:     string;
  summary:  string;
  desc:     string;
  auth:     boolean;
  headers:  Param[];
  body:     Param[];
  response: { success: object; error: object };
  fields:   ResponseField[];
  notes?:   string[];
}

// ─── Endpoints definition ─────────────────────────────────────────────────────
const ENDPOINTS: Endpoint[] = [
  {
    id:      "send",
    method:  "POST",
    path:    "/api/developers/otp/send",
    summary: "إرسال OTP",
    desc:    "يولد كود OTP ويرسله للمستخدم عبر WhatsApp باستخدام قالب مُوافق عليه من Meta.",
    auth:    true,
    headers: [
      { name: "x-api-key",     type: "string", required: true,  desc: "مفتاح الـ API الخاص بمشروعك",       example: "wani_live_xxxx_yyyy" },
      { name: "Content-Type",  type: "string", required: true,  desc: "نوع البيانات",                        example: "application/json" },
    ],
    body: [
      { name: "phone",          type: "string",  required: true,  desc: "رقم الهاتف — E.164 أو الصيغة المصرية", example: "+201234567890 أو 01234567890" },
      { name: "templateName",   type: "string",  required: true,  desc: "اسم القالب الـ APPROVED في Meta",       example: "otp_verification" },
      { name: "expiryMinutes",  type: "number",  required: false, desc: "مدة صلاحية الكود بالدقائق",             example: "10 (افتراضي)" },
    ],
    response: {
      success: { ok: true, token: "a3f9c2e1...64hex...", expiresAt: "2025-01-15T14:30:00.000Z" },
      error:   { ok: false, error: "القالب \"otp_verification\" مش موجود أو لسه ما اتوافقش" },
    },
    fields: [
      { name: "ok",        type: "boolean", desc: "true عند النجاح" },
      { name: "token",     type: "string",  desc: "64-char hex token — احتفظ بيه لخطوة التحقق" },
      { name: "expiresAt", type: "string",  desc: "ISO 8601 — وقت انتهاء صلاحية الكود" },
    ],
    notes: [
      "Rate limit: 5 رسائل لكل رقم لكل مبرمج كل ساعة",
      "القالب يجب أن يكون بحالة APPROVED من Meta قبل الإرسال",
      "الرقم يُطبَّع تلقائيًا لـ E.164 (مصري: 01x → 201x)",
    ],
  },
  {
    id:      "verify",
    method:  "POST",
    path:    "/api/developers/otp/verify",
    summary: "التحقق من الكود",
    desc:    "يتحقق من صحة الكود المُدخل مقابل الـ token الصادر من /send.",
    auth:    true,
    headers: [
      { name: "x-api-key",    type: "string", required: true, desc: "مفتاح الـ API",  example: "wani_live_xxxx_yyyy" },
      { name: "Content-Type", type: "string", required: true, desc: "نوع البيانات",   example: "application/json" },
    ],
    body: [
      { name: "token", type: "string", required: true, desc: "الـ token من استجابة /send",      example: "a3f9c2e1..." },
      { name: "code",  type: "string", required: true, desc: "الكود المكوّن من 6 أرقام",         example: "123456" },
    ],
    response: {
      success: { ok: true, verified: true, message: "OTP تم التحقق بنجاح", phone: "+201234567890" },
      error:   { ok: false, verified: false, error: "الكود غير صحيح" },
    },
    fields: [
      { name: "ok",       type: "boolean", desc: "true عند النجاح" },
      { name: "verified", type: "boolean", desc: "true لو الكود صحيح" },
      { name: "phone",    type: "string",  desc: "رقم الهاتف المُتحقَّق منه (عند النجاح فقط)" },
      { name: "message",  type: "string",  desc: "رسالة نصية توضيحية" },
    ],
    notes: [
      "Brute-force protection: 10 محاولات كل 15 دقيقة لكل token",
      "الكود المُتحقَّق منه يُصبح غير قابل للاستخدام مرة أخرى",
      "لو Token انتهت صلاحيته → error: OTP انتهت صلاحيته",
    ],
  },
  {
    id:      "status",
    method:  "GET",
    path:    "/api/developers/otp/status/:token",
    summary: "فحص حالة الـ OTP",
    desc:    "يُرجع الحالة الحالية لـ OTP معين مع الوقت المتبقي قبل انتهاء الصلاحية.",
    auth:    true,
    headers: [
      { name: "x-api-key", type: "string", required: true, desc: "مفتاح الـ API", example: "wani_live_xxxx_yyyy" },
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
      error: { ok: false, error: "Token غير موجود أو لا ينتمي لهذا الـ API Key" },
    },
    fields: [
      { name: "status",           type: "string",        desc: "pending | sent | verified | expired | failed" },
      { name: "secondsRemaining", type: "number | null", desc: "الثواني المتبقية قبل انتهاء الصلاحية (0 لو انتهت)" },
      { name: "sentAt",           type: "string | null", desc: "وقت الإرسال ISO 8601" },
      { name: "verifiedAt",       type: "string | null", desc: "وقت التحقق ISO 8601 (null لو لسه)" },
      { name: "meta.messageId",   type: "string | null", desc: "Meta WhatsApp message ID" },
      { name: "meta.error",       type: "string | null", desc: "سبب الفشل لو status = failed" },
    ],
    notes: [
      "الـ token يُصبح expired تلقائيًا لو تجاوز expiresAt",
      "استخدم هذا الـ endpoint لبناء polling أو progress indicators",
    ],
  },
];

// ─── Status values reference ──────────────────────────────────────────────────
const STATUS_VALUES = [
  { value: "pending", color: "#94a3b8", desc: "OTP أُنشئ لكن لم يُرسَل بعد" },
  { value: "sent",    color: "#f59e0b", desc: "تم الإرسال عبر WhatsApp — ينتظر التحقق" },
  { value: "verified",color: "#20d378", desc: "تم التحقق بنجاح" },
  { value: "expired", color: "#6b7280", desc: "انتهت صلاحية الكود" },
  { value: "failed",  color: "#ef4444", desc: "فشل الإرسال عبر Meta" },
];

// ─── Error codes reference ────────────────────────────────────────────────────
const ERROR_CODES = [
  { code: 400, label: "Bad Request",    desc: "بيانات ناقصة أو غير صحيحة في الـ body" },
  { code: 401, label: "Unauthorized",   desc: "x-api-key مفقود أو غير صحيح أو ملغي" },
  { code: 404, label: "Not Found",      desc: "Token غير موجود أو لا ينتمي لهذا الـ Key" },
  { code: 429, label: "Too Many Req.",  desc: "Rate limit — انتظر قبل المحاولة مجددًا (Retry-After header)" },
  { code: 502, label: "Bad Gateway",    desc: "فشل الإرسال عبر Meta WhatsApp API" },
  { code: 500, label: "Server Error",   desc: "خطأ داخلي — تواصل مع الدعم" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function CopyBtn({ text, small }: { text: string; small?: boolean }) {
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
      {copied ? "✓ تم" : "نسخ"}
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
function EndpointCard({ ep }: { ep: Endpoint }) {
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
          textAlign: "right", direction: "rtl",
        }}
      >
        <MethodBadge method={ep.method} />
        <span style={{ fontFamily: "Fira Code, monospace", fontSize: 13, color: "rgba(255,255,255,0.7)", direction: "ltr", textAlign: "left" }}>
          {ep.path}
        </span>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", flex: 1 }}>{ep.summary}</span>
        {ep.auth && (
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)", flexShrink: 0 }}>
            🔑 يحتاج Auth
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
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{ep.desc}</p>
          </div>

          <div style={{ padding: "0 22px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Left: Params */}
            <div>
              {/* Headers */}
              <SectionLabel>Headers</SectionLabel>
              <ParamTable params={ep.headers} />

              {/* Body */}
              {ep.body.length > 0 && (
                <>
                  <SectionLabel style={{ marginTop: 18 }}>Request Body (JSON)</SectionLabel>
                  <ParamTable params={ep.body} />
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
                      <td style={{ padding: "7px 0", color: "rgba(255,255,255,0.4)", textAlign: "right" }}>{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Notes */}
              {ep.notes && ep.notes.length > 0 && (
                <>
                  <SectionLabel style={{ marginTop: 18 }}>ملاحظات</SectionLabel>
                  <ul style={{ margin: 0, paddingRight: 18, listStyle: "disc" }}>
                    {ep.notes.map((n, i) => (
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
                  {(["success", "error"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                      padding: "3px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                      background: tab === t ? (t === "success" ? "rgba(32,211,120,0.12)" : "rgba(239,68,68,0.12)") : "transparent",
                      border: `1px solid ${tab === t ? (t === "success" ? "rgba(32,211,120,0.25)" : "rgba(239,68,68,0.25)") : "rgba(255,255,255,0.08)"}`,
                      color: tab === t ? (t === "success" ? "#20d378" : "#f87171") : "rgba(255,255,255,0.35)",
                    }}>
                      {t === "success" ? "✓ نجاح" : "✗ خطأ"}
                    </button>
                  ))}
                  <CopyBtn text={JSON.stringify(ep.response[tab], null, 2)} small />
                </div>
              </div>
              <div style={{
                background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "16px",
                border: "1px solid rgba(255,255,255,0.06)", direction: "ltr",
              }}>
                <JsonBlock data={ep.response[tab]} />
              </div>

              {/* Full URL example */}
              <SectionLabel style={{ marginTop: 18 }}>مثال الطلب</SectionLabel>
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

function ParamTable({ params }: { params: Param[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <tbody>
        {params.map(p => (
          <tr key={p.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <td style={{ padding: "7px 0" }}>
              <span style={{ fontFamily: "Fira Code, monospace", color: "#86efac" }}>{p.name}</span>
              {p.required && <span style={{ color: "#f87171", marginRight: 4, fontSize: 10 }}>*</span>}
            </td>
            <td style={{ padding: "7px 8px", color: "#93c5fd", fontFamily: "Fira Code, monospace" }}>{p.type}</td>
            <td style={{ padding: "7px 0", color: "rgba(255,255,255,0.4)", direction: "rtl", textAlign: "right" }}>{p.desc}</td>
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

  useEffect(() => { setMounted(true); }, []);

  const sections = [
    { id: "endpoints", label: "الـ Endpoints" },
    { id: "auth",      label: "المصادقة" },
    { id: "statuses",  label: "حالات الـ OTP" },
    { id: "errors",    label: "أكواد الأخطاء" },
  ] as const;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

        .docs-root { min-height:100vh; background:#060810; font-family:'IBM Plex Sans Arabic',sans-serif; direction:rtl; color:#fff; }
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
        .ref-table th { padding:10px 14px; background:rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.4); font-size:11px; text-transform:uppercase; letter-spacing:.5px; font-weight:600; text-align:right; }
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
            <p className="docs-subtitle">توثيق كامل لـ OTP API — كل الـ endpoints والـ parameters والـ responses</p>
          </div>

          {/* Base URL */}
          <div className="base-url-banner">
            <span className="base-url-label">Base URL</span>
            <span className="base-url-value">
              {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}
              /api/developers/otp
            </span>
            <CopyBtn text={`${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/developers/otp`} />
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
              {ENDPOINTS.map(ep => <EndpointCard key={ep.id} ep={ep} />)}
            </div>
          )}

          {/* ── Auth ── */}
          {section === "auth" && (
            <div className="auth-section">
              <h3>🔑 المصادقة عبر API Key</h3>
              <p>
                كل طلب يحتاج مفتاح API صالح في الـ header{" "}
                <span className="code-inline">x-api-key</span>.
                المفاتيح بتبدأ بـ <span className="code-inline">wani_live_</span> وبتتولد من صفحة API Keys.
              </p>

              <div className="code-block">
                <span className="cm"># مثال cURL</span>{"\n"}
                <span className="kw">curl</span> -X POST{" "}
                <span className="st">"https://your-domain.com/api/developers/otp/send"</span> \{"\n"}
                {"  "}-H <span className="st">"x-api-key: wani_live_xxxx_yyyy"</span> \{"\n"}
                {"  "}-H <span className="st">"Content-Type: application/json"</span> \{"\n"}
                {"  "}-d <span className="st">'{`{"phone":"+201234567890","templateName":"otp_verification"}`}'</span>
              </div>

              <h3 style={{ marginTop: 24 }}>⚠️ أمان الـ API Key</h3>
              <p>احفظ الـ API Key دايمًا في environment variable — لا تحطه في الكود مباشرة:</p>
              <div className="code-block">
                <span className="cm"># .env</span>{"\n"}
                <span className="kw">WANI_API_KEY</span>=<span className="st">wani_live_xxxx_yyyy</span>{"\n\n"}
                <span className="cm"># Node.js</span>{"\n"}
                <span className="kw">const</span> apiKey = process.env.<span className="st">WANI_API_KEY</span>;{"\n\n"}
                <span className="cm"># Python</span>{"\n"}
                <span className="kw">import</span> os{"\n"}
                api_key = os.environ[<span className="st">"WANI_API_KEY"</span>]
              </div>

              <h3 style={{ marginTop: 24 }}>🚦 Rate Limiting</h3>
              <p>
                الـ API عنده حماية من الاستخدام المفرط — لو تجاوزت الحد هتاخد{" "}
                <span className="code-inline">429 Too Many Requests</span> مع{" "}
                <span className="code-inline">Retry-After</span> header بيحدد الانتظار بالثواني.
              </p>

              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "14px 16px",
                border: "1px solid rgba(255,255,255,0.07)", marginTop: 12,
              }}>
                {[
                  { action: "POST /otp/send",   limit: "5 طلبات / ساعة لكل رقم لكل مبرمج" },
                  { action: "POST /otp/verify", limit: "10 محاولات / 15 دقيقة لكل token" },
                  { action: "GET /otp/status",  limit: "بدون حد (read-only)" },
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
                    <th>الحالة</th>
                    <th>الوصف</th>
                    <th>الخطوة التالية</th>
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
                        {s.value === "sent"     && "اطلب الكود من المستخدم → POST /verify"}
                        {s.value === "pending"  && "انتظر لحظة وحاول /status تاني"}
                        {s.value === "verified" && "اعمل login أو أكمل الـ flow"}
                        {s.value === "expired"  && "اعمل POST /send جديدة"}
                        {s.value === "failed"   && "تحقق من ربط Meta — اعمل /send جديدة"}
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
                    <th>المعنى</th>
                    <th>الحل</th>
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
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginRight: 8, fontFamily: "Fira Code, monospace" }}>
                          {e.label}
                        </span>
                      </td>
                      <td>{e.desc}</td>
                      <td style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                        {e.code === 400 && "راجع الـ request body — شوف error في الـ response"}
                        {e.code === 401 && "تحقق من x-api-key header وإن الـ key نشط"}
                        {e.code === 404 && "تحقق من الـ token وإنه تابع للـ key ده"}
                        {e.code === 429 && "انتظر قيمة Retry-After header بالثواني"}
                        {e.code === 502 && "مشكلة في Meta API — تحقق من ربط Meta والقالب"}
                        {e.code === 500 && "خطأ داخلي — تواصل مع الدعم"}
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