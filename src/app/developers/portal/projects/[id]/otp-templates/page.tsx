"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
type TemplateStatus = "LOCAL_DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "DISABLED";
type TemplateCategory = "AUTHENTICATION" | "UTILITY" | "MARKETING";

interface Template {
  id: string;
  name: string;
  language: string;
  category: TemplateCategory;
  headerType: string | null;
  headerText: string | null;
  body: string;
  footer: string | null;
  status: TemplateStatus;
  rejectedReason: string | null;
  metaTemplateId: string | null;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "ar",    label: "العربية 🇸🇦" },
  { code: "en_US", label: "الإنجليزية 🇺🇸" },
  { code: "en_GB", label: "الإنجليزية (UK) 🇬🇧" },
  { code: "fr",    label: "الفرنسية 🇫🇷" },
  { code: "de",    label: "الألمانية 🇩🇪" },
  { code: "es",    label: "الإسبانية 🇪🇸" },
  { code: "tr",    label: "التركية 🇹🇷" },
];

const CATEGORIES: { value: TemplateCategory; label: string; desc: string; icon: string }[] = [
  { value: "AUTHENTICATION", label: "OTP / التحقق",  desc: "أكواد التحقق والمصادقة الثنائية", icon: "🔐" },
];

const STATUS_CONFIG: Record<TemplateStatus, { label: string; color: string; bg: string; border: string; icon: string }> = {
  LOCAL_DRAFT: { label: "مسودة",         color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", icon: "📝" },
  PENDING:     { label: "قيد المراجعة",  color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  icon: "⏳" },
  APPROVED:    { label: "موافق عليه",    color: "#20d378", bg: "rgba(32,211,120,0.08)",  border: "rgba(32,211,120,0.2)",  icon: "✅" },
  REJECTED:    { label: "مرفوض",         color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",   icon: "❌" },
  DISABLED:    { label: "متوقف",         color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)", icon: "🚫" },
};

// ─── WhatsApp Live Preview ────────────────────────────────────────────────────
function WAPreview({ headerType, headerText, body, footer, category }: {
  headerType: string; headerText: string; body: string; footer: string; category: TemplateCategory;
}) {
  // Render {{N}} as colored pills
  function renderText(text: string) {
    return text.split(/(\{\{\d+\}\})/g).map((part, i) =>
      /^\{\{\d+\}\}$/.test(part)
        ? <span key={i} style={{ background: "rgba(32,211,120,0.2)", color: "#20d378", borderRadius: 4, padding: "0 4px", fontSize: 12, fontWeight: 600 }}>{part}</span>
        : <span key={i}>{part}</span>
    );
  }

  const hasContent = body.trim();

  return (
    <div style={{
      background: "#0a1628",
      borderRadius: 20,
      padding: "0",
      width: 280,
      flexShrink: 0,
      overflow: "hidden",
      border: "8px solid #0d1f35",
      boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
    }}>
      {/* Phone notch */}
      <div style={{ background: "#0d1f35", padding: "8px 0 4px", textAlign: "center" }}>
        <div style={{ width: 60, height: 6, background: "#1a2f4a", borderRadius: 3, margin: "0 auto" }} />
      </div>

      {/* Chat header */}
      <div style={{
        background: "#128C7E",
        padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0d6e63", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          {category === "AUTHENTICATION" ? "🔐" : category === "UTILITY" ? "⚡" : "📢"}
        </div>
        <div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>وني OTP</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>متصل الآن</div>
        </div>
      </div>

      {/* Chat background */}
      <div style={{
        background: "#0e1b2b",
        minHeight: 320,
        padding: "16px 12px",
        backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {/* Date chip */}
        <div style={{ textAlign: "center" }}>
          <span style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: 11, borderRadius: 10, padding: "3px 10px" }}>
            اليوم
          </span>
        </div>

        {/* Message bubble */}
        {hasContent ? (
          <div style={{
            background: "#1f2c3a",
            borderRadius: "12px 12px 12px 2px",
            padding: "10px 12px",
            maxWidth: "90%",
            alignSelf: "flex-start",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }}>
            {/* Header */}
            {headerType === "text" && headerText && (
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 6 }}>
                {renderText(headerText)}
              </div>
            )}

            {/* Body */}
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, direction: "rtl", whiteSpace: "pre-wrap" }}>
              {renderText(body || "اكتب محتوى القالب...")}
            </div>

            {/* Footer */}
            {footer && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 5 }}>
                {footer}
              </div>
            )}

            {/* Meta timestamp */}
            <div style={{ textAlign: "left", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                {new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })} ✓✓
              </span>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.15)", fontSize: 13, textAlign: "center", padding: "40px 16px" }}>
            ابدأ الكتابة وشوف المعاينة هنا
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{
        background: "#1a2634",
        padding: "8px 12px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{ flex: 1, background: "#2d3d4f", borderRadius: 20, height: 34, display: "flex", alignItems: "center", padding: "0 12px" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>اكتب رسالة...</span>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#128C7E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 16 }}>🎤</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectTemplatesPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create">("list");
  const [mounted, setMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [metaConnected, setMetaConnected] = useState<boolean | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    language: "ar",
    category: "AUTHENTICATION" as TemplateCategory,
    headerType: "none",
    headerText: "",
    body: "",
    footer: "",
  });
  const [bodyExamples, setBodyExamples] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    setMounted(true);
    fetchTemplates();
    // Check Meta connection status
    fetch(`/api/developers/projects/${projectId}/meta`)
      .then(r => r.json())
      .then(d => setMetaConnected(!!d.connection?.isVerified))
      .catch(() => setMetaConnected(false));
  }, [projectId]);

  async function fetchTemplates() {
    try {
      const res = await fetch(`/api/developers/projects/${projectId}/otp-templates`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  }

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    setFormError("");
    setFormSuccess("");
  }

  // Detect {{N}} variables in body
  const varMatches = [...new Set((form.body.match(/\{\{(\d+)\}\}/g) || []))];
  const varCount = varMatches.length;

  function setExample(idx: number, val: string) {
    setBodyExamples(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }

  // Auto-generate name from Arabic input
  function handleNameInput(raw: string) {
    const safe = raw.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    setField("name", safe);
  }

  async function handleSaveDraft() {
    if (!form.name) { setFormError("اسم القالب مطلوب"); return; }
    if (!form.body.trim()) { setFormError("محتوى القالب مطلوب"); return; }
    setSaving(true); setFormError("");
    try {
      const res = await fetch(`/api/developers/projects/${projectId}/otp-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, bodyExample: bodyExamples, submitToMeta: false }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "حصل خطأ"); return; }
      setTemplates(prev => [data.template, ...prev]);
      setFormSuccess("✅ القالب اتحفظ كمسودة");
      setTimeout(() => { setView("list"); resetForm(); }, 1200);
    } catch { setFormError("حصل خطأ في الاتصال"); }
    finally { setSaving(false); }
  }

  async function handleSubmitToMeta() {
    if (!form.name) { setFormError("اسم القالب مطلوب"); return; }
    if (!form.body.trim()) { setFormError("محتوى القالب مطلوب"); return; }
    if (varCount > 0 && bodyExamples.filter(Boolean).length < varCount) {
      setFormError(`أضف ${varCount} قيمة تجريبية للمتغيرات — Meta بتطلبها`); return;
    }
    setSubmitting(true); setFormError(""); setFormSuccess("");
    try {
      const res = await fetch(`/api/developers/projects/${projectId}/otp-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, bodyExample: bodyExamples, submitToMeta: true }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "حصل خطأ"); return; }

      // warning = Meta مش مربوطة أو فشل الإرسال → معاملها كـ error واضح
      if (data.warning) {
        setFormError(`⚠️ ${data.warning}`);
        // القالب اتحفظ كمسودة — نضيفه للقائمة بس نفضل في الـ form
        if (data.template) setTemplates(prev => [data.template, ...prev]);
        return;
      }

      setTemplates(prev => [data.template, ...prev]);
      setFormSuccess("🚀 تم إرسال القالب لـ Meta — هيظهر قيد المراجعة قريباً");
      setTimeout(() => { setView("list"); resetForm(); }, 1800);
    } catch { setFormError("حصل خطأ في الاتصال"); }
    finally { setSubmitting(false); }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/developers/projects/${projectId}/otp-templates/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setSyncMsg({ type: "err", text: data.error || "فشلت المزامنة" }); return; }
      setSyncMsg({ type: "ok", text: `✅ تمت المزامنة — ${data.updated} قالب اتحدث من أصل ${data.total}` });
      fetchTemplates();
    } catch { setSyncMsg({ type: "err", text: "حصل خطأ في الاتصال" }); }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(null), 4000); }
  }

  function resetForm() {
    setForm({ name: "", language: "ar", category: "AUTHENTICATION", headerType: "none", headerText: "", body: "", footer: "" });
    setBodyExamples([]);
    setFormError(""); setFormSuccess("");
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');
        .tp-root { min-height:100vh; background:#060810; font-family:'IBM Plex Sans Arabic',sans-serif; direction:rtl; color:#fff; }
        .tp-root::before { content:''; position:fixed; inset:0; background-image:linear-gradient(rgba(32,211,120,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(32,211,120,0.025) 1px,transparent 1px); background-size:48px 48px; pointer-events:none; z-index:0; }
        .tp-inner { max-width:1200px; margin:0 auto; padding:40px 32px; position:relative; z-index:1; opacity:0; transform:translateY(10px); transition:opacity .4s,transform .4s; }
        .tp-inner.visible { opacity:1; transform:translateY(0); }

        /* Page header */
        .tp-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:32px; }
        .tp-title { font-size:26px; font-weight:600; }
        .tp-subtitle { font-size:14px; color:rgba(255,255,255,0.4); margin-top:4px; }
        .btn-new { display:flex; align-items:center; gap:8px; padding:10px 20px; background:#20d378; color:#060810; border:none; border-radius:12px; font-size:14px; font-weight:600; font-family:inherit; cursor:pointer; transition:background .2s; }
        .btn-new:hover { background:#1bbf6b; }

        /* Template list */
        .tmpl-grid { display:flex; flex-direction:column; gap:12px; }
        .tmpl-card { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:20px 24px; display:flex; align-items:center; gap:16px; transition:border-color .2s, background .2s; }
        .tmpl-card:hover { border-color:rgba(255,255,255,0.12); background:rgba(255,255,255,0.035); }
        .tmpl-icon { width:44px; height:44px; border-radius:12px; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
        .tmpl-info { flex:1; }
        .tmpl-name { font-size:15px; font-weight:600; font-family:'Fira Code',monospace; margin-bottom:4px; }
        .tmpl-meta { font-size:12px; color:rgba(255,255,255,0.4); display:flex; gap:12px; flex-wrap:wrap; }
        .tmpl-body-preview { font-size:13px; color:rgba(255,255,255,0.5); margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:500px; }
        .status-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:500; flex-shrink:0; }
        .rejected-reason { margin-top:6px; font-size:12px; color:#f87171; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.15); border-radius:8px; padding:6px 10px; }

        /* Empty */
        .empty { text-align:center; padding:80px 32px; }
        .empty-icon { font-size:52px; opacity:.4; margin-bottom:16px; }
        .empty-title { font-size:20px; font-weight:600; margin-bottom:8px; }
        .empty-sub { font-size:14px; color:rgba(255,255,255,0.4); margin-bottom:28px; }

        /* Create form layout */
        .create-layout { display:grid; grid-template-columns:1fr 280px; gap:32px; align-items:start; }
        .form-panel { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:20px; padding:32px; }
        .form-title { font-size:20px; font-weight:600; margin-bottom:24px; }
        .field { margin-bottom:20px; }
        .field-label { display:block; font-size:13px; font-weight:500; color:rgba(255,255,255,0.6); margin-bottom:8px; }
        .field-hint { font-size:11px; color:rgba(255,255,255,0.3); margin-top:5px; }
        .f-input,.f-select,.f-textarea { width:100%; padding:11px 14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09); border-radius:12px; color:#fff; font-size:14px; font-family:'IBM Plex Sans Arabic',sans-serif; outline:none; box-sizing:border-box; transition:border-color .2s,box-shadow .2s; }
        .f-input.mono,.f-select.mono { font-family:'Fira Code',monospace; direction:ltr; text-align:left; }
        .f-input::placeholder,.f-textarea::placeholder { color:rgba(255,255,255,0.2); }
        .f-input:focus,.f-select:focus,.f-textarea:focus { border-color:rgba(32,211,120,0.4); box-shadow:0 0 0 3px rgba(32,211,120,0.07); }
        .f-select { appearance:none; cursor:pointer; }
        .f-textarea { resize:vertical; line-height:1.6; }
        .f-select option { background:#1a2333; color:#fff; }

        /* Category pills */
        .cat-pills { display:flex; gap:8px; flex-wrap:wrap; }
        .cat-pill { padding:9px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03); cursor:pointer; font-size:13px; font-family:inherit; color:rgba(255,255,255,0.55); transition:all .2s; display:flex; align-items:center; gap:7px; }
        .cat-pill:hover { border-color:rgba(255,255,255,0.18); color:rgba(255,255,255,0.8); }
        .cat-pill.active { background:rgba(32,211,120,0.1); border-color:rgba(32,211,120,0.35); color:#20d378; }
        .cat-pill-desc { font-size:11px; color:inherit; opacity:.6; }

        /* Header type toggle */
        .htype-row { display:flex; gap:8px; }
        .htype-btn { flex:1; padding:9px; border-radius:10px; border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.5); font-size:13px; font-family:inherit; cursor:pointer; transition:all .2s; }
        .htype-btn:hover { border-color:rgba(255,255,255,0.16); }
        .htype-btn.active { background:rgba(32,211,120,0.1); border-color:rgba(32,211,120,0.3); color:#20d378; }

        /* Var examples */
        .var-row { display:flex; align-items:center; gap:8px; margin-top:10px; }
        .var-tag { padding:4px 10px; background:rgba(32,211,120,0.12); color:#20d378; border-radius:8px; font-size:12px; font-family:'Fira Code',monospace; flex-shrink:0; }
        .var-input { flex:1; padding:9px 12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09); border-radius:10px; color:#fff; font-size:13px; font-family:inherit; outline:none; }
        .var-input:focus { border-color:rgba(32,211,120,0.3); }
        .var-input::placeholder { color:rgba(255,255,255,0.2); }

        /* Form error / success */
        .form-error { padding:12px 16px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; color:#f87171; font-size:13px; margin-bottom:16px; }
        .form-success { padding:12px 16px; background:rgba(32,211,120,0.08); border:1px solid rgba(32,211,120,0.2); border-radius:10px; color:#20d378; font-size:13px; margin-bottom:16px; }

        /* Buttons */
        .form-actions { display:flex; gap:10px; margin-top:24px; }
        .btn-draft { flex:1; padding:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.65); border-radius:12px; font-size:14px; font-family:inherit; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .btn-draft:hover:not(:disabled) { background:rgba(255,255,255,0.07); }
        .btn-submit { flex:2; padding:12px; background:#20d378; color:#060810; border:none; border-radius:12px; font-size:14px; font-weight:600; font-family:inherit; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .btn-submit:hover:not(:disabled) { background:#1bbf6b; }
        .btn-draft:disabled,.btn-submit:disabled { opacity:.5; cursor:not-allowed; }
        .btn-back { padding:8px 16px; background:none; border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:rgba(255,255,255,0.5); font-size:13px; font-family:inherit; cursor:pointer; transition:all .2s; margin-bottom:24px; display:inline-flex; align-items:center; gap:6px; }
        .btn-back:hover { color:rgba(255,255,255,0.8); border-color:rgba(255,255,255,0.2); }

        .spinner { width:16px; height:16px; border:2px solid rgba(6,8,16,0.3); border-top-color:#060810; border-radius:50%; animation:spin .7s linear infinite; }
        .spinner-dark { width:16px; height:16px; border:2px solid rgba(255,255,255,0.15); border-top-color:rgba(255,255,255,0.7); border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        .skeleton { background:linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 100%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:8px; }
        @keyframes shimmer { to { background-position:-200% 0; } }

        .preview-sticky { position:sticky; top:80px; }
        .preview-label { font-size:12px; font-weight:600; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:.8px; margin-bottom:14px; text-align:center; }

        .divider { height:1px; background:rgba(255,255,255,0.06); margin:20px 0; }

        @media(max-width:900px) {
          .create-layout { grid-template-columns:1fr; }
          .preview-sticky { position:static; }
        }
        @media(max-width:640px) {
          .tp-inner { padding:24px 16px; }
          .tp-header { flex-direction:column; align-items:flex-start; gap:12px; }
          .form-panel { padding:20px; }
        }
      `}</style>

      <div className="tp-root">
        <div className={`tp-inner ${mounted ? "visible" : ""}`}>

          {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
          {view === "list" && (
            <>
              <div className="tp-header">
                <div>
                  <h1 className="tp-title">قوالب OTP</h1>
                  <p className="tp-subtitle">أنشئ قوالب التحقق، أرسلها لـ Meta، وانتظر الموافقة</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: syncing ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.65)", fontSize: 14, fontFamily: "inherit", cursor: syncing ? "not-allowed" : "pointer", transition: "all .2s" }}
                  >
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ animation: syncing ? "spin .8s linear infinite" : "none" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
                    </svg>
                    {syncing ? "جاري المزامنة..." : "مزامنة من Meta"}
                  </button>
                  <button className="btn-new" onClick={() => { setView("create"); resetForm(); }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                    قالب جديد
                  </button>
                </div>
              </div>

              {/* Hook notice */}
              <div style={{ marginBottom: 24, padding: "14px 18px", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>🪝</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
                    محتاج قوالب إشعارات أو تسويق؟
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                    صفحة القوالب دي مخصصة لـ OTP فقط. قوالب الإشعارات والتسويق متاحة في{" "}
                    <a href="/templates" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>منصة وني التسويقية ←</a>
                    {" "}— بتقدر تستخدمها في كامبينات الواتساب والأتمتة.
                  </div>
                </div>
              </div>

              {syncMsg && (
                <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, fontSize: 13, background: syncMsg.type === "ok" ? "rgba(32,211,120,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${syncMsg.type === "ok" ? "rgba(32,211,120,0.2)" : "rgba(239,68,68,0.2)"}`, color: syncMsg.type === "ok" ? "#20d378" : "#f87171" }}>
                  {syncMsg.text}
                </div>
              )}

              {loading ? (
                <div className="tmpl-grid">
                  {[1,2,3].map(i => (
                    <div key={i} className="tmpl-card">
                      <div className="skeleton" style={{ width:44, height:44, borderRadius:12 }} />
                      <div style={{ flex:1 }}>
                        <div className="skeleton" style={{ width:"35%", height:16, marginBottom:8 }} />
                        <div className="skeleton" style={{ width:"60%", height:13 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📋</div>
                  <h3 className="empty-title">لسه ماعندكش قوالب</h3>
                  <p className="empty-sub">ابني أول قالب WhatsApp وابعته لـ Meta للمراجعة</p>
                  <button className="btn-new" onClick={() => { setView("create"); resetForm(); }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                    إنشاء أول قالب
                  </button>
                </div>
              ) : (
                <div className="tmpl-grid">
                  {templates.map((t) => {
                    const s = STATUS_CONFIG[t.status];
                    const cat = CATEGORIES.find(c => c.value === t.category);
                    return (
                      <div key={t.id} className="tmpl-card">
                        <div className="tmpl-icon">{cat?.icon ?? "📋"}</div>
                        <div className="tmpl-info">
                          <div className="tmpl-name">{t.name}</div>
                          <div className="tmpl-meta">
                            <span>{LANGUAGES.find(l => l.code === t.language)?.label ?? t.language}</span>
                            <span>{cat?.label}</span>
                            {t.metaTemplateId && <span style={{ fontFamily: "Fira Code", fontSize:11, color:"rgba(255,255,255,0.25)" }}>ID: {t.metaTemplateId}</span>}
                          </div>
                          {t.body && (
                            <div className="tmpl-body-preview">{t.body.replace(/\{\{\d+\}\}/g, "●●●")}</div>
                          )}
                          {t.status === "REJECTED" && t.rejectedReason && (
                            <div className="rejected-reason">❌ سبب الرفض: {t.rejectedReason}</div>
                          )}
                        </div>
                        <div className="status-badge" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                          {s.icon} {s.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── CREATE VIEW ───────────────────────────────────────────────── */}
          {view === "create" && (
            <>
              <button className="btn-back" onClick={() => { setView("list"); resetForm(); }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                رجوع للقوالب
              </button>

              <div className="create-layout">
                {/* ── Left: Form ── */}
                <div className="form-panel">
                  <h2 className="form-title">قالب OTP جديد</h2>

                  {/* Meta not connected warning */}
                  {metaConnected === false && (
                    <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", marginBottom: 3 }}>Meta مش مربوط بالمشروع ده</div>
                        <div style={{ fontSize: 12, color: "rgba(245,158,11,0.7)", lineHeight: 1.5 }}>
                          القالب هيتحفظ كمسودة فقط ومش هيتبعت لـ Meta. {" "}
                          <a href={`/developers/portal/projects/${projectId}`} style={{ color: "#f59e0b", fontWeight: 600, textDecoration: "underline" }}>اربط Meta من نظرة عامة ←</a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Name */}
                  <div className="field">
                    <label className="field-label">اسم القالب * <span style={{ color:"rgba(255,255,255,0.3)", fontWeight:400 }}>(snake_case — بيظهر في Meta)</span></label>
                    <input className="f-input mono" placeholder="otp_verification" value={form.name}
                      onChange={e => handleNameInput(e.target.value)} />
                    <div className="field-hint">بيتحول تلقائياً لـ lowercase مع underscores — مثال: otp_verification</div>
                  </div>

                  {/* Language */}
                  <div className="field">
                    <label className="field-label">اللغة *</label>
                    <select className="f-select" value={form.language} onChange={e => setField("language", e.target.value)}>
                      {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>

                  <div className="divider" />

                  {/* Header */}
                  <div className="field">
                    <label className="field-label">الهيدر (اختياري)</label>
                    <div className="htype-row">
                      {["none","text"].map(t => (
                        <button key={t} className={`htype-btn ${form.headerType === t ? "active" : ""}`}
                          onClick={() => setField("headerType", t)}>
                          {t === "none" ? "بدون هيدر" : "نص"}
                        </button>
                      ))}
                    </div>
                    {form.headerType === "text" && (
                      <input className="f-input" style={{ marginTop:10 }} placeholder="عنوان الرسالة..."
                        value={form.headerText} onChange={e => setField("headerText", e.target.value)} />
                    )}
                  </div>

                  {/* Body */}
                  <div className="field">
                    <label className="field-label">
                      المحتوى * &nbsp;
                      <span style={{ color:"rgba(255,255,255,0.3)", fontWeight:400, fontSize:12 }}>
                        استخدم {"{{1}}"} {"{{2}}"} للمتغيرات
                      </span>
                    </label>
                    <textarea className="f-textarea" rows={5}
                      placeholder={"كود التحقق الخاص بك هو: {{1}}\nصالح لمدة 10 دقائق.\nلا تشارك هذا الكود مع أي أحد."}
                      value={form.body} onChange={e => setField("body", e.target.value)} />
                    <div className="field-hint">
                      {varCount > 0
                        ? `🔢 تم اكتشاف ${varCount} متغير — أضف قيم تجريبية أسفل`
                        : "لم يتم اكتشاف متغيرات بعد"}
                    </div>

                    {/* Variable examples */}
                    {varCount > 0 && (
                      <div style={{ marginTop:12, background:"rgba(32,211,120,0.04)", border:"1px solid rgba(32,211,120,0.12)", borderRadius:12, padding:"12px 14px" }}>
                        <div style={{ fontSize:12, color:"#20d378", fontWeight:600, marginBottom:10 }}>
                          ⚡ قيم تجريبية — Meta بتطلبها عشان تراجع القالب
                        </div>
                        {Array.from({ length: varCount }, (_, i) => (
                          <div key={i} className="var-row">
                            <span className="var-tag">{`{{${i+1}}}`}</span>
                            <input className="var-input" placeholder={`مثال: ${i === 0 ? "123456" : i === 1 ? "10" : "قيمة_" + (i+1)}`}
                              value={bodyExamples[i] || ""}
                              onChange={e => setExample(i, e.target.value)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="field">
                    <label className="field-label">الفوتر (اختياري)</label>
                    <input className="f-input" placeholder="لا تشارك هذا الكود مع أي شخص"
                      value={form.footer} onChange={e => setField("footer", e.target.value)} />
                  </div>

                  {formError  && <div className="form-error">{formError}</div>}
                  {formSuccess && <div className="form-success">{formSuccess}</div>}

                  {/* Actions */}
                  <div className="form-actions">
                    <button className="btn-draft" onClick={handleSaveDraft} disabled={saving || submitting}>
                      {saving ? <><div className="spinner-dark"/>جاري الحفظ...</> : <>💾 حفظ مسودة</>}
                    </button>
                    <button className="btn-submit" onClick={handleSubmitToMeta} disabled={saving || submitting}>
                      {submitting ? <><div className="spinner"/>جاري الإرسال...</> : <>🚀 إرسال لـ Meta</>}
                    </button>
                  </div>

                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.25)", marginTop:12, textAlign:"center" }}>
                    "إرسال لـ Meta" بيحتاج ربط Meta أولاً — لو مش مربوط بيتحفظ كمسودة
                  </div>
                </div>

                {/* ── Right: Live Preview ── */}
                <div className="preview-sticky">
                  <div className="preview-label">معاينة مباشرة</div>
                  <WAPreview
                    headerType={form.headerType}
                    headerText={form.headerText}
                    body={form.body}
                    footer={form.footer}
                    category={form.category}
                  />

                  {/* Meta submit flow info */}
                  <div style={{ marginTop:20, background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"16px" }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.5)", marginBottom:12, textTransform:"uppercase", letterSpacing:".5px" }}>
                      دورة حياة القالب
                    </div>
                    {[
                      { icon:"📝", label:"مسودة",        desc:"محفوظ محلياً فقط" },
                      { icon:"🚀", label:"إرسال لـ Meta", desc:"يُرسل للمراجعة" },
                      { icon:"⏳", label:"قيد المراجعة",  desc:"Meta بتراجع القالب" },
                      { icon:"✅", label:"موافق عليه",    desc:"جاهز للاستخدام في API" },
                    ].map((s, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:i<3?10:0 }}>
                        <span style={{ fontSize:16 }}>{s.icon}</span>
                        <div>
                          <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", fontWeight:500 }}>{s.label}</div>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>{s.desc}</div>
                        </div>
                        {i<3 && <div style={{ marginRight:"auto", color:"rgba(255,255,255,0.15)", fontSize:12 }}>↓</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}