"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Share2, AlertTriangle, Check, Mail, ArrowLeft, Copy, UserX } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "../../../../_components/LanguageProvider";

export default function TransferProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { language, t } = useLanguage();
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);

  const dir = language === "ar" ? "rtl" : "ltr";
  const align = language === "ar" ? "right" : "left";

  useEffect(() => {
    fetchProject();
  }, []);

  async function fetchProject() {
    try {
      const res = await fetch(`/api/developers/projects/${projectId}`);
      const data = await res.json();
      if (data.project) setProject(data.project);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(role: "OWNER" | "DEVELOPER") {
    if (!email.trim()) {
      setError(t("Email is required", "الإيميل مطلوب"));
      return;
    }

    setActionLoading(true);
    setError("");
    setInviteCode(null);
    try {
      const res = await fetch(`/api/developers/projects/${projectId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("An error occurred", "حصل خطأ"));
        return;
      }
      setInviteCode(data.code);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveDeveloper() {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/developers/projects/${projectId}/transfer`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("An error occurred", "حصل خطأ"));
        return;
      }
      // Refresh project data
      await fetchProject();
      setRemoveConfirm(false);
    } finally {
      setActionLoading(false);
    }
  }

  function copyCode() {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div style={{ color: "rgba(255,255,255,0.5)", padding: 40, textAlign: "center", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
        {t("Loading...", "جاري التحميل...")}
      </div>
    );
  }

  if (!project) return null;

  const isDeveloper = project.viewerRole === "developer";
  const isOwner = project.viewerRole === "owner";
  
  const hasOwner = !!project.owner;
  const hasDeveloper = !!project.developer && !project.developerRemovedAt;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');
        .transfer-root {
          max-width: 600px; margin: 0 auto;
          padding: 40px 24px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          color: #fff;
        }
        .back-link {
          display: inline-flex; align-items: center; gap: 6px;
          color: rgba(255,255,255,0.4); font-size: 13px;
          text-decoration: none; margin-bottom: 28px;
          transition: color 0.2s;
        }
        .back-link:hover { color: rgba(255,255,255,0.7); }
        .transfer-title { font-size: 22px; font-weight: 600; color: #fff; margin-bottom: 6px; }
        .transfer-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 32px; line-height: 1.6; }

        .warning-box {
          background: rgba(245,158,11,0.07);
          border: 1px solid rgba(245,158,11,0.2);
          border-radius: 12px; padding: 16px 18px;
          margin-bottom: 28px;
        }
        .warning-box-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 14px; font-weight: 600; color: #f59e0b;
          margin-bottom: 10px;
        }
        .warning-box ul { margin: 0; padding-inline-start: 16px; }
        .warning-box li { font-size: 13px; color: rgba(245,158,11,0.75); margin-bottom: 6px; line-height: 1.5; }

        .form-field { margin-bottom: 18px; }
        .form-label { display: block; font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 8px; font-weight: 500; }
        .form-input {
          width: 100%; padding: 12px 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; color: #fff;
          font-size: 14px; font-family: inherit;
          outline: none; box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .form-input::placeholder { color: rgba(255,255,255,0.2); }
        .form-input:focus { border-color: rgba(32,211,120,0.4); }

        .form-error {
          font-size: 13px; color: #f87171;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px; padding: 10px 14px;
          margin-bottom: 16px;
        }

        .btn-action {
          width: 100%; padding: 14px;
          background: #20d378; color: #060810;
          border: none; border-radius: 12px;
          font-size: 15px; font-weight: 600;
          font-family: inherit; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: background 0.2s;
        }
        .btn-action:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-action:hover:not(:disabled) { background: #1bbf6b; }

        .btn-danger {
          background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2);
        }
        .btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.15); }

        .code-box {
          background: rgba(32,211,120,0.08); border: 1px solid rgba(32,211,120,0.2);
          border-radius: 16px; padding: 24px; text-align: center; margin-top: 24px;
        }
        .code-title { font-size: 14px; color: #20d378; margin-bottom: 12px; font-weight: 600; }
        .code-value {
          font-family: 'Fira Code', monospace; font-size: 28px; font-weight: 600; color: #fff;
          letter-spacing: 2px; margin-bottom: 20px;
        }
        .btn-copy {
          display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px;
          background: rgba(255,255,255,0.1); border: none; border-radius: 8px;
          color: #fff; font-size: 13px; cursor: pointer; font-family: inherit;
        }
        .btn-copy:hover { background: rgba(255,255,255,0.15); }

        .user-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px;
        }
        .user-avatar {
          width: 48px; height: 48px; border-radius: 50%; background: rgba(32,211,120,0.1);
          color: #20d378; display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 600; flex-shrink: 0;
        }
        .user-info { flex: 1; }
        .user-name { font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .user-email { font-size: 13px; color: rgba(255,255,255,0.5); }
      `}</style>

      <div className="transfer-root" style={{ direction: dir }}>
        <Link href={`/developers/portal/projects/${projectId}`} className="back-link">
          <ArrowLeft size={14} />
          {t("Back to project", "رجوع للمشروع")}
        </Link>

        {isDeveloper && (
          <>
            <h1 className="transfer-title">
              {t("Project Transfer", "تسليم المشروع")}
            </h1>
            <p className="transfer-sub" style={{ textAlign: align }}>
              {hasOwner 
                ? t("This project has already been claimed by an owner.", "تم استلام هذا المشروع من قِبل مالك.")
                : t("Invite a client to claim ownership of this project.", "قم بدعوة عميل لاستلام ملكية هذا المشروع.")}
            </p>

            {hasOwner ? (
              <div className="user-card">
                <div className="user-avatar">{project.owner.firstName?.[0] || project.owner.email[0].toUpperCase()}</div>
                <div className="user-info">
                  <div className="user-name">{project.owner.firstName} {project.owner.lastName}</div>
                  <div className="user-email">{project.owner.email}</div>
                </div>
              </div>
            ) : inviteCode ? (
              <div className="code-box">
                <div className="code-title">{t("Invite Code Generated", "تم إنشاء كود الدعوة")}</div>
                <div className="code-value">{inviteCode}</div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20 }}>
                  {t("Send this code to the client. They will use it to claim the project.", "أرسل هذا الكود للعميل ليقوم باستخدامه لاستلام المشروع.")}
                </p>
                <button className="btn-copy" onClick={copyCode}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? t("Copied!", "تم النسخ!") : t("Copy Code", "نسخ الكود")}
                </button>
              </div>
            ) : (
              <>
                <div className="form-field">
                  <label className="form-label" style={{ textAlign: align }}>
                    {t("Client email *", "إيميل العميل *")}
                  </label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="client@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    dir="ltr"
                    style={{ textAlign: "left" }}
                  />
                </div>
                {error && <div className="form-error" style={{ textAlign: align }}>{error}</div>}
                <button
                  className="btn-action"
                  onClick={() => handleInvite("OWNER")}
                  disabled={actionLoading || !email}
                >
                  {actionLoading ? t("Generating...", "جاري الإنشاء...") : t("Generate Invite Code", "إنشاء كود الدعوة")}
                </button>
              </>
            )}
          </>
        )}

        {isOwner && (
          <>
            <h1 className="transfer-title">
              {t("Developer Management", "إدارة المطورين")}
            </h1>
            <p className="transfer-sub" style={{ textAlign: align }}>
              {hasDeveloper 
                ? t("Manage the developer who currently has access to this project.", "إدارة المطور الذي لديه وصول إلى هذا المشروع حالياً.")
                : t("Invite a new developer to manage this project for you.", "قم بدعوة مطور جديد لإدارة هذا المشروع لك.")}
            </p>

            {hasDeveloper ? (
              <div className="user-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div className="user-avatar">{project.developer.firstName?.[0] || project.developer.email[0].toUpperCase()}</div>
                  <div className="user-info">
                    <div className="user-name">{project.developer.firstName} {project.developer.lastName}</div>
                    <div className="user-email">{project.developer.email}</div>
                  </div>
                </div>
                
                {removeConfirm ? (
                  <div style={{ background: "rgba(239,68,68,0.1)", padding: 16, borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)" }}>
                    <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>
                      {t("Are you sure you want to remove this developer? They will lose access to the project immediately.", "هل أنت متأكد من إزالة هذا المطور؟ سيفقد الوصول للمشروع فوراً.")}
                    </p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn-action btn-danger" onClick={handleRemoveDeveloper} disabled={actionLoading} style={{ flex: 1, padding: 10, fontSize: 13 }}>
                        {actionLoading ? t("Removing...", "جاري الإزالة...") : t("Yes, Remove", "نعم، أزل المطور")}
                      </button>
                      <button className="btn-action" onClick={() => setRemoveConfirm(false)} style={{ flex: 1, padding: 10, fontSize: 13, background: "rgba(255,255,255,0.1)", color: "#fff" }}>
                        {t("Cancel", "إلغاء")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn-action btn-danger" onClick={() => setRemoveConfirm(true)}>
                    <UserX size={16} />
                    {t("Remove Developer Access", "إزالة وصول المطور")}
                  </button>
                )}
              </div>
            ) : inviteCode ? (
              <div className="code-box">
                <div className="code-title">{t("Invite Code Generated", "تم إنشاء كود الدعوة")}</div>
                <div className="code-value">{inviteCode}</div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20 }}>
                  {t("Send this code to the developer. They will use it to access the project.", "أرسل هذا الكود للمطور ليقوم باستخدامه للوصول للمشروع.")}
                </p>
                <button className="btn-copy" onClick={copyCode}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? t("Copied!", "تم النسخ!") : t("Copy Code", "نسخ الكود")}
                </button>
              </div>
            ) : (
              <>
                <div className="form-field">
                  <label className="form-label" style={{ textAlign: align }}>
                    {t("Developer email *", "إيميل المطور *")}
                  </label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="dev@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    dir="ltr"
                    style={{ textAlign: "left" }}
                  />
                </div>
                {error && <div className="form-error" style={{ textAlign: align }}>{error}</div>}
                <button
                  className="btn-action"
                  onClick={() => handleInvite("DEVELOPER")}
                  disabled={actionLoading || !email}
                >
                  {actionLoading ? t("Generating...", "جاري الإنشاء...") : t("Generate Invite Code", "إنشاء كود الدعوة")}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}