"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LanguageProvider, useLanguage } from "../_components/LanguageProvider";

export default function ResetPasswordPage() {
  return (
    <LanguageProvider>
      <ResetPasswordContent />
    </LanguageProvider>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { language, toggleLanguage, t } = useLanguage();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("Passwords do not match", "كلمات المرور غير متطابقة"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/developers/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || t("Something went wrong, check the link or try again", "حصل خطأ، تأكد من صحة الرابط أو حاول مرة أخرى"));
      } else {
        setSuccess(true);
      }
    } catch {
      setLoading(false);
      setError(t("Connection error, check your internet and try again", "مشكلة في الاتصال، تأكد من الإنترنت وحاول تاني"));
    }
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060810', color: '#fff', fontFamily: 'system-ui' }}>
        <p>{t("Invalid or missing link. Please use the link sent to your email.", "الرابط غير صحيح أو مفقود. يرجى استخدام الرابط المرسل لبريدك.")}</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap');
        
        .auth-root {
          min-height: 100vh; background: #060810; display: flex; align-items: center; justify-content: center;
          font-family: 'IBM Plex Sans Arabic', sans-serif; direction: ${language === 'ar' ? 'rtl' : 'ltr'}; position: relative;
        }
        .auth-card {
          width: 100%; max-width: 440px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px; padding: 40px; backdrop-filter: blur(20px); z-index: 10;
        }
        .form-title { font-size: 22px; font-weight: 600; color: #fff; margin-bottom: 6px; text-align: center; }
        .form-desc { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 32px; text-align: center; }
        .field-label { display: block; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
        .field-input {
          width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
          color: #fff; font-size: 15px; outline: none; transition: 0.2s; box-sizing: border-box; direction: ltr; text-align: left; margin-bottom: 24px;
          font-family: inherit;
        }
        .field-input:focus { border-color: rgba(32,211,120,0.4); box-shadow: 0 0 0 3px rgba(32,211,120,0.08); }
        .submit-btn {
          width: 100%; padding: 13px 24px; background: #20d378; color: #060810; font-size: 15px; font-weight: 600; border: none; border-radius: 12px;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; font-family: inherit;
        }
        .submit-btn:hover:not(:disabled) { background: #1bbf6b; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-box { padding: 12px 16px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; color: #f87171; font-size: 13px; text-align: center; margin-bottom: 20px; }
        .success-box { padding: 16px; background: rgba(32,211,120,0.08); border: 1px solid rgba(32,211,120,0.2); border-radius: 10px; color: #20d378; font-size: 14px; text-align: center; line-height: 1.5; }

        .lang-toggle-corner {
          position: absolute; top: 20px; ${language === 'ar' ? 'left' : 'right'}: 20px;
          z-index: 10;
          padding: 6px 12px; font-size: 12px; font-weight: 600;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: rgba(255,255,255,0.5);
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .lang-toggle-corner:hover { background: rgba(255,255,255,0.1); color: #fff; }

        @media (max-width: 768px) {
          .auth-root { padding: 16px; align-items: flex-start; padding-top: 48px; }
          .auth-card { padding: 24px; max-width: 100%; }
          .form-title { font-size: 20px; }
        }
      `}</style>

      <div className="auth-root">
        <button className="lang-toggle-corner" onClick={toggleLanguage}>
          {language === 'ar' ? 'EN' : 'AR'}
        </button>

        <div className="auth-card">
          <h2 className="form-title">{t("Reset Password", "إعادة تعيين كلمة المرور")}</h2>
          <p className="form-desc">{t("Enter a new password for your account", "أدخل كلمة مرور جديدة لحسابك")}</p>

          {success ? (
            <div className="success-box">
              {t("Password changed successfully. You can now sign in.", "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.")}<br /><br />
              <Link href="/developers/signin" style={{ color: '#fff', textDecoration: 'underline' }}>
                {t("Sign In", "تسجيل الدخول")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="field-label">{t("New Password", "كلمة المرور الجديدة")}</label>
              <input
                className="field-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              
              <label className="field-label">{t("Confirm Password", "تأكيد كلمة المرور")}</label>
              <input
                className="field-input"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />

              {error && <div className="error-box">{error}</div>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? t("Changing...", "جاري التغيير...") : t("Change Password", "تغيير كلمة المرور")}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
