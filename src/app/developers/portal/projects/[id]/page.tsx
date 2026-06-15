"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Key, FileText, Wifi, WifiOff, Share2, AlertTriangle, Copy, Check, ExternalLink } from "lucide-react";
import { useLanguage } from "../../../_components/LanguageProvider";

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  metaConnection: {
    id: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhone: string;
    isVerified: boolean;
    connectedAt: string;
  } | null;
  _count: {
    apiKeys: number;
    otpTemplates: number;
  };
  otpToday: number;
}

interface ApiKeyPreview {
  id: string;
  keyPrefix: string;
  name: string | null;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
}

interface TemplatePreview {
  id: string;
  name: string;
  status: string;
  language: string;
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { language, t } = useLanguage();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [keys, setKeys] = useState<ApiKeyPreview[]>([]);
  const [templates, setTemplates] = useState<TemplatePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Meta connect form
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [metaForm, setMetaForm] = useState({ accessToken: "", phoneNumberId: "", wabaId: "", displayPhone: "" });
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");

  useEffect(() => {
    fetchAll();
  }, [projectId]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [projRes, keysRes, tmplRes] = await Promise.all([
        fetch(`/api/developers/projects/${projectId}`),
        fetch(`/api/developers/projects/${projectId}/api-keys`),
        fetch(`/api/developers/projects/${projectId}/otp-templates`),
      ]);

      if (projRes.ok) setProject(await projRes.json().then((d) => d.project));
      if (keysRes.ok) setKeys((await keysRes.json()).keys?.slice(0, 3) || []);
      if (tmplRes.ok) setTemplates((await tmplRes.json()).templates?.slice(0, 3) || []);
    } finally {
      setLoading(false);
    }
  }

  async function connectMeta() {
    setMetaLoading(true);
    setMetaError("");
    try {
      const res = await fetch(`/api/developers/projects/${projectId}/meta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metaForm),
      });
      const data = await res.json();
      if (!res.ok) { setMetaError(data.error || t("An error occurred", "حصل خطأ")); return; }
      setShowMetaForm(false);
      fetchAll();
    } catch {
      setMetaError(t("An error occurred, try again", "حصل خطأ، حاول تاني"));
    } finally {
      setMetaLoading(false);
    }
  }

  async function disconnectMeta() {
    if (!confirm(t("You are about to disconnect Meta from this project — are you sure?", "هتقطع ربط Meta من المشروع ده — متأكد؟"))) return;
    await fetch(`/api/developers/projects/${projectId}/meta`, { method: "DELETE" });
    fetchAll();
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  const statusColor: Record<string, string> = {
    APPROVED: "#20d378",
    PENDING: "#f59e0b",
    REJECTED: "#ef4444",
    LOCAL_DRAFT: "rgba(255,255,255,0.3)",
    DISABLED: "rgba(255,255,255,0.2)",
  };

  const statusLabel: Record<string, string> = {
    APPROVED: t("Approved", "موافق عليه"),
    PENDING: t("Pending", "قيد المراجعة"),
    REJECTED: t("Rejected", "مرفوض"),
    LOCAL_DRAFT: t("Draft", "مسودة"),
    DISABLED: t("Disabled", "معطل"),
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "rgba(255,255,255,0.3)", fontFamily: "IBM Plex Sans Arabic, sans-serif", direction: language === 'ar' ? 'rtl' : 'ltr' }}>
        {t("Loading...", "جاري التحميل...")}
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "rgba(255,255,255,0.3)", fontFamily: "IBM Plex Sans Arabic, sans-serif", direction: language === 'ar' ? 'rtl' : 'ltr' }}>
        {t("Project not found", "المشروع مش موجود")}
      </div>
    );
  }

  const metaConnected = !!project.metaConnection;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');
 
        .pov-root {
          max-width: 1000px; margin: 0 auto;
          padding: 36px 28px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: ${language === 'ar' ? 'rtl' : 'ltr'}; color: #fff;
        }

        /* Header */
        .pov-header { margin-bottom: 28px; }
        .pov-title { font-size: 22px; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .pov-sub { font-size: 13px; color: rgba(255,255,255,0.4); }

        /* Stats */
        .pov-stats {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
          margin-bottom: 28px;
        }
        .stat-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 18px 20px;
        }
        .stat-label { font-size: 11px; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .stat-value { font-size: 30px; font-weight: 600; color: #fff; }
        .stat-value.green { color: #20d378; }

        /* Sections grid */
        .pov-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
          margin-bottom: 16px;
        }
        @media (max-width: 700px) { .pov-grid { grid-template-columns: 1fr; } }

        .pov-section {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 20px;
        }
        .pov-section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
        }
        .pov-section-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.7);
        }
        .pov-section-link {
          font-size: 12px; color: rgba(32,211,120,0.7);
          text-decoration: none;
        }
        .pov-section-link:hover { color: #20d378; }

        /* Key row */
        .key-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-family: 'Fira Code', monospace;
        }
        .key-row:last-child { border-bottom: none; }
        .key-prefix { font-size: 12px; color: #20d378; flex: 1; }
        .key-name { font-size: 11px; color: rgba(255,255,255,0.3); font-family: inherit; }
        .copy-btn {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.3); padding: 4px;
          border-radius: 6px; transition: color 0.15s, background 0.15s;
        }
        .copy-btn:hover { color: #20d378; background: rgba(32,211,120,0.08); }

        /* Template row */
        .tmpl-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .tmpl-row:last-child { border-bottom: none; }
        .tmpl-name { font-size: 13px; color: rgba(255,255,255,0.7); font-family: 'Fira Code', monospace; }
        .tmpl-badge {
          font-size: 10px; font-weight: 600;
          padding: 3px 8px; border-radius: 20px;
        }

        .empty-row { font-size: 13px; color: rgba(255,255,255,0.25); padding: 16px 0; text-align: center; }

        /* Meta section */
        .meta-section {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 20px;
          margin-bottom: 16px;
        }
        .meta-connected-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .meta-connected-row:last-child { border-bottom: none; }
        .meta-field-label { font-size: 11px; color: rgba(255,255,255,0.3); margin-bottom: 2px; }
        .meta-field-value { font-size: 13px; color: rgba(255,255,255,0.7); font-family: 'Fira Code', monospace; }

        .btn-connect-meta {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.25);
          border-radius: 10px; color: #60a5fa;
          font-size: 13px; font-weight: 500;
          font-family: inherit; cursor: pointer; transition: background 0.2s;
        }
        .btn-connect-meta:hover { background: rgba(59,130,246,0.15); }

        .btn-disconnect {
          padding: 6px 14px; border-radius: 8px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: rgba(239,68,68,0.7); font-size: 12px;
          cursor: pointer; transition: background 0.2s; font-family: inherit;
        }
        .btn-disconnect:hover { background: rgba(239,68,68,0.15); }

        /* Meta form */
        .meta-form { margin-top: 16px; }
        .form-field { margin-bottom: 14px; }
        .form-label { display: block; font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 6px; }
        .form-input {
          width: 100%; padding: 10px 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: #fff;
          font-size: 13px; font-family: 'Fira Code', monospace;
          outline: none; box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .form-input::placeholder { color: rgba(255,255,255,0.2); }
        .form-input:focus { border-color: rgba(32,211,120,0.4); }
        .form-error {
          font-size: 12px; color: #f87171;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px; padding: 8px 12px; margin-bottom: 12px;
        }
        .form-actions { display: flex; gap: 8px; }
        .btn-submit {
          flex: 1; padding: 10px;
          background: #20d378; color: #060810;
          border: none; border-radius: 10px;
          font-size: 13px; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: background 0.2s;
        }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-cancel-form {
          padding: 10px 18px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: rgba(255,255,255,0.5);
          font-size: 13px; font-family: inherit; cursor: pointer;
          transition: background 0.2s;
        }
        .btn-cancel-form:hover { background: rgba(255,255,255,0.08); }

        /* Transfer banner */
        .transfer-banner {
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(32,211,120,0.05);
          border: 1px solid rgba(32,211,120,0.12);
          border-radius: 14px; padding: 16px 20px;
        }
        .transfer-banner-text { font-size: 13px; color: rgba(255,255,255,0.6); }
        .transfer-banner-title { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .btn-transfer {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 16px;
          background: rgba(32,211,120,0.1);
          border: 1px solid rgba(32,211,120,0.2);
          border-radius: 10px; color: #20d378;
          font-size: 13px; font-weight: 500;
          text-decoration: none; white-space: nowrap;
          transition: background 0.2s;
        }
        .btn-transfer:hover { background: rgba(32,211,120,0.15); }
      `}</style>

      <div className="pov-root">
        {/* Header */}
        <div className="pov-header" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
          <h1 className="pov-title">{t("Overview — ", "نظرة عامة — ")}{project.name}</h1>
          <p className="pov-sub">{t("All of this data is specific to this project only", "كل البيانات دي خاصة بالمشروع ده بس")}</p>
        </div>

        {/* Stats */}
        <div className="pov-stats">
          <div className="stat-card" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
            <div className="stat-label">{t("Active API Keys", "API Keys نشطة")}</div>
            <div className="stat-value green">{project._count.apiKeys}</div>
          </div>
          <div className="stat-card" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
            <div className="stat-label">{t("Approved Templates", "قوالب موافق عليها")}</div>
            <div className="stat-value">{project._count.otpTemplates}</div>
          </div>
          <div className="stat-card" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
            <div className="stat-label">{t("OTP Today", "OTP اليوم")}</div>
            <div className="stat-value">{project.otpToday}</div>
          </div>
        </div>

        {/* API Keys + Templates */}
        <div className="pov-grid">
          {/* API Keys */}
          <div className="pov-section">
            <div className="pov-section-header" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
              <span className="pov-section-title">
                <Key size={14} />
                API Keys
              </span>
              <Link
                href={`/developers/portal/projects/${projectId}/api-keys`}
                className="pov-section-link"
              >
                {t("View All ←", "عرض الكل ←")}
              </Link>
            </div>

            {keys.length === 0 ? (
              <div className="empty-row">{t("No API Keys — create one now", "لا توجد API Keys — أنشئ واحد الآن")}</div>
            ) : (
              keys.map((k) => (
                <div key={k.id} className="key-row" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                  <span className="key-prefix">{k.keyPrefix}...</span>
                  {k.name && <span className="key-name">{k.name}</span>}
                  <button
                    className="copy-btn"
                    onClick={() => copyText(k.keyPrefix, k.id)}
                    title={t("Copy prefix", "نسخ الـ prefix")}
                  >
                    {copied === k.id ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Templates */}
          <div className="pov-section">
            <div className="pov-section-header" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
              <span className="pov-section-title">
                <FileText size={14} />
                {t("Templates", "القوالب")}
              </span>
              <Link
                href={`/developers/portal/projects/${projectId}/otp-templates`}
                className="pov-section-link"
              >
                {t("View All ←", "عرض الكل ←")}
              </Link>
            </div>

            {templates.length === 0 ? (
              <div className="empty-row">{t("No templates — create an OTP template now", "لا توجد قوالب — أنشئ قالب OTP الآن")}</div>
            ) : (
              templates.map((tData) => (
                <div key={tData.id} className="tmpl-row" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                  <span className="tmpl-name">{tData.name}</span>
                  <span
                    className="tmpl-badge"
                    style={{
                      color: statusColor[tData.status] || "rgba(255,255,255,0.3)",
                      background: `${statusColor[tData.status]}18` || "rgba(255,255,255,0.05)",
                      border: `1px solid ${statusColor[tData.status]}30` || "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {statusLabel[tData.status] || tData.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Meta Connection */}
        <div className="meta-section">
          <div className="pov-section-header" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
            <span className="pov-section-title" style={{ fontSize: 15 }}>
              {metaConnected ? <Wifi size={15} style={{ color: "#20d378" }} /> : <WifiOff size={15} style={{ color: "#f59e0b" }} />}
              {t("Meta WhatsApp Connection", "ربط Meta WhatsApp")}
            </span>
            {metaConnected && (
              <button className="btn-disconnect" onClick={disconnectMeta}>
                {t("Disconnect", "قطع الاتصال")}
              </button>
            )}
          </div>

          {metaConnected && project.metaConnection ? (
            <>
              <div className="meta-connected-row" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                <div style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                  <div className="meta-field-label">WABA ID</div>
                  <div className="meta-field-value">{project.metaConnection.wabaId}</div>
                </div>
                <button className="copy-btn" onClick={() => copyText(project.metaConnection!.wabaId, "waba")}>
                  {copied === "waba" ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
              <div className="meta-connected-row" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                <div style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                  <div className="meta-field-label">Phone Number ID</div>
                  <div className="meta-field-value">{project.metaConnection.phoneNumberId}</div>
                </div>
                <button className="copy-btn" onClick={() => copyText(project.metaConnection!.phoneNumberId, "phone_id")}>
                  {copied === "phone_id" ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
              {project.metaConnection.displayPhone && (
                <div className="meta-connected-row" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                  <div style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                    <div className="meta-field-label">{t("Phone Number", "رقم الهاتف")}</div>
                    <div className="meta-field-value">{project.metaConnection.displayPhone}</div>
                  </div>
                </div>
              )}
            </>
          ) : !showMetaForm ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(245,158,11,0.8)" }}>
                <AlertTriangle size={14} />
                {t("This project is not connected to Meta — it won't be able to send OTPs", "المشروع ده مش مربوط بـ Meta — مش هيقدر يرسل OTP")}
              </div>
              <button className="btn-connect-meta" onClick={() => setShowMetaForm(true)}>
                <Wifi size={14} />
                {t("Connect Meta Now", "ربط Meta الآن")}
              </button>
            </div>
          ) : (
            <div className="meta-form" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
              {metaError && <div className="form-error">{metaError}</div>}
              <div className="form-field">
                <label className="form-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>Access Token *</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="EAAxxxxxxxxxxxxxxx..."
                  value={metaForm.accessToken}
                  onChange={(e) => setMetaForm((f) => ({ ...f, accessToken: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>WABA ID *</label>
                <input
                  className="form-input"
                  placeholder="123456789012345"
                  value={metaForm.wabaId}
                  onChange={(e) => setMetaForm((f) => ({ ...f, wabaId: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>Phone Number ID *</label>
                <input
                  className="form-input"
                  placeholder="987654321098765"
                  value={metaForm.phoneNumberId}
                  onChange={(e) => setMetaForm((f) => ({ ...f, phoneNumberId: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t("Display Phone Number (Optional)", "رقم الهاتف المعروض (اختياري)")}</label>
                <input
                  className="form-input"
                  placeholder="+20 10 xxxx xxxx"
                  value={metaForm.displayPhone}
                  onChange={(e) => setMetaForm((f) => ({ ...f, displayPhone: e.target.value }))}
                />
              </div>
              <div className="form-actions" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                <button className="btn-cancel-form" onClick={() => setShowMetaForm(false)}>{t("Cancel", "إلغاء")}</button>
                <button className="btn-submit" onClick={connectMeta} disabled={metaLoading}>
                  {metaLoading ? t("Connecting...", "جاري الربط...") : t("Connect Meta", "ربط Meta")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transfer project banner */}
        <div className="transfer-banner" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse', textAlign: language === 'ar' ? 'right' : 'left' }}>
          <div>
            <div className="transfer-banner-title">{t("Hand over project to a client", "تسليم المشروع لعميل")}</div>
            <div className="transfer-banner-text">
              {t("After completing the project, hand it over to the client using their email so they can manage it from their account", "بعد خلاص المشروع — سلّمه للعميل بإيميله عشان يتحكم فيه من حسابه")}
            </div>
          </div>
          <Link href={`/developers/portal/projects/${projectId}/transfer`} className="btn-transfer">
            <Share2 size={14} />
            {t("Hand over project", "تسليم المشروع")}
          </Link>
        </div>
      </div>
    </>
  );
}