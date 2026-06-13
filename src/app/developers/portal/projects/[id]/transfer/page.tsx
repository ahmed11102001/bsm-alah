"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Share2, AlertTriangle, Check, User, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TransferProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ name: string; email: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleTransfer() {
    if (!email.trim()) { setError("إيميل العميل مطلوب"); return; }
    if (!confirmed) { setError("لازم توافق على شروط التسليم الأول"); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/developers/projects/${projectId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: email.trim(), note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "حصل خطأ"); return; }
      setSuccess(data.transferredTo);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400&display=swap');
        .transfer-root {
          max-width: 600px; margin: 0 auto;
          padding: 40px 24px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: rtl; color: #fff;
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
        .warning-box ul { margin: 0; padding-right: 16px; }
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
        .form-textarea { resize: none; height: 90px; line-height: 1.5; }

        .confirm-row {
          display: flex; align-items: flex-start; gap: 10px;
          margin-bottom: 20px; cursor: pointer;
        }
        .confirm-checkbox {
          width: 18px; height: 18px; border-radius: 5px;
          border: 1.5px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.04);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px;
          cursor: pointer; transition: border-color 0.2s, background 0.2s;
        }
        .confirm-checkbox.checked {
          border-color: #20d378; background: rgba(32,211,120,0.15);
        }
        .confirm-text { font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.6; }

        .form-error {
          font-size: 13px; color: #f87171;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px; padding: 10px 14px;
          margin-bottom: 16px;
        }

        .btn-transfer {
          width: 100%; padding: 14px;
          background: #20d378; color: #060810;
          border: none; border-radius: 12px;
          font-size: 15px; font-weight: 600;
          font-family: inherit; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: background 0.2s;
        }
        .btn-transfer:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-transfer:hover:not(:disabled) { background: #1bbf6b; }

        /* Success */
        .success-box {
          background: rgba(32,211,120,0.07);
          border: 1px solid rgba(32,211,120,0.2);
          border-radius: 16px; padding: 32px;
          text-align: center;
        }
        .success-icon {
          width: 56px; height: 56px; border-radius: 50%;
          background: rgba(32,211,120,0.12);
          border: 1px solid rgba(32,211,120,0.2);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px; color: #20d378;
        }
        .success-title { font-size: 20px; font-weight: 600; color: #fff; margin-bottom: 8px; }
        .success-sub { font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 20px; line-height: 1.6; }
        .success-email {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 16px;
          background: rgba(32,211,120,0.08);
          border: 1px solid rgba(32,211,120,0.15);
          border-radius: 20px; font-size: 13px; color: #20d378;
          font-family: 'Fira Code', monospace;
          margin-bottom: 24px;
        }
        .btn-back {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 20px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: rgba(255,255,255,0.6);
          font-size: 13px; font-family: inherit; cursor: pointer;
          text-decoration: none; transition: background 0.2s;
        }
        .btn-back:hover { background: rgba(255,255,255,0.09); }
      `}</style>

      <div className="transfer-root">
        <Link href={`/developers/portal/projects/${projectId}`} className="back-link">
          <ArrowLeft size={14} />
          رجوع للمشروع
        </Link>

        {success ? (
          /* ── Success state ── */
          <div className="success-box">
            <div className="success-icon">
              <Check size={26} />
            </div>
            <div className="success-title">تم تسليم المشروع بنجاح! 🎉</div>
            <div className="success-sub">
              المشروع اتسلم لـ <strong style={{ color: "#fff" }}>{success.name || success.email}</strong>.
              <br />
              العميل دلوقتي يقدر يوصل للـ API Keys والقوالب وإعدادات Meta من حسابه.
            </div>
            <div className="success-email">
              <Mail size={13} />
              {success.email}
            </div>
            <br />
            <Link href="/developers/portal" className="btn-back">
              <ArrowLeft size={13} />
              رجوع لكل المشاريع
            </Link>
          </div>
        ) : (
          /* ── Transfer form ── */
          <>
            <h1 className="transfer-title">
              <Share2 size={20} style={{ display: "inline", marginLeft: 8, color: "#20d378", verticalAlign: "middle" }} />
              تسليم المشروع لعميل
            </h1>
            <p className="transfer-sub">
              بتسلّم المشروع ده بكل محتوياته — API Keys، القوالب، وربط Meta — لعميل عنده حساب في منصة وني.
              <br />
              بعد التسليم، أنت مش هتقدر تعدل فيه تاني.
            </p>

            {/* Warning */}
            <div className="warning-box">
              <div className="warning-box-title">
                <AlertTriangle size={15} />
                مهم — اقرأ قبل التسليم
              </div>
              <ul>
                <li>التسليم <strong>نهائي</strong> — مش هتقدر ترجعه لحسابك</li>
                <li>العميل هياخد التحكم الكامل في المشروع</li>
                <li>الـ API Keys والقوالب هتعدي للعميل زي ما هي</li>
                <li>لازم العميل يكون عامل حساب في منصة وني بنفس الإيميل</li>
              </ul>
            </div>

            {/* Form */}
            <div className="form-field">
              <label className="form-label">إيميل العميل *</label>
              <input
                className="form-input"
                type="email"
                placeholder="ahmed@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                dir="ltr"
              />
            </div>

            <div className="form-field">
              <label className="form-label">ملاحظة للعميل (اختياري)</label>
              <textarea
                className={`form-input form-textarea`}
                placeholder="مثلاً: تقدر تبدأ على طول — الـ API Key الأول جاهز"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
              />
            </div>

            {/* Confirm checkbox */}
            <div className="confirm-row" onClick={() => setConfirmed((v) => !v)}>
              <div className={`confirm-checkbox ${confirmed ? "checked" : ""}`}>
                {confirmed && <Check size={11} style={{ color: "#20d378" }} />}
              </div>
              <span className="confirm-text">
                أنا فاهم إن التسليم نهائي ومش هرجع المشروع لحسابي تاني، وإن العميل هياخد
                التحكم الكامل في الـ API Keys والقوالب وربط Meta.
              </span>
            </div>

            {error && <div className="form-error">{error}</div>}

            <button
              className="btn-transfer"
              onClick={handleTransfer}
              disabled={loading || !email || !confirmed}
            >
              {loading ? (
                "جاري التسليم..."
              ) : (
                <>
                  <Share2 size={16} />
                  تسليم المشروع
                </>
              )}
            </button>
          </>
        )}
      </div>
    </>
  );
}