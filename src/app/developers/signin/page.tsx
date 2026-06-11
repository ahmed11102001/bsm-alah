"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function DevSignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/developers/portal";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (errorParam === "suspended") setError("الحساب موقف، تواصل مع الدعم");
  }, [errorParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/developers/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) { setError(data.error || "حصل خطأ، حاول تاني"); return; }
      router.push(data.redirect || callbackUrl);
      router.refresh();
    } catch {
      setLoading(false);
      setError("حصل خطأ في الاتصال، حاول تاني");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');
        
        .auth-root {
          min-height: 100vh;
          background: #060810;
          display: flex;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: rtl;
          position: relative;
          overflow: hidden;
        }
        
        /* Grid background */
        .auth-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(32,211,120,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(32,211,120,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 0%, black 20%, transparent 100%);
        }
        
        /* Glow blobs */
        .blob-1 {
          position: absolute;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(32,211,120,0.08) 0%, transparent 70%);
          top: -200px; left: -100px;
          pointer-events: none;
        }
        .blob-2 {
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%);
          bottom: -100px; right: -100px;
          pointer-events: none;
        }

        /* Left: branding panel */
        .auth-brand {
          width: 480px;
          padding: 64px 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border-left: 1px solid rgba(255,255,255,0.04);
          position: relative;
          z-index: 1;
        }
        
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 64px;
        }
        .brand-logo-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #20d378 0%, #10b854 100%);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 20px; color: #060810;
          font-family: 'Fira Code', monospace;
          flex-shrink: 0;
        }
        .brand-logo-text { font-size: 18px; font-weight: 500; color: #fff; }
        .brand-logo-sub { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px; }
        
        .brand-headline {
          font-size: 36px;
          font-weight: 600;
          line-height: 1.3;
          color: #fff;
          margin-bottom: 16px;
          letter-spacing: -0.5px;
        }
        .brand-headline span { color: #20d378; }
        .brand-sub {
          font-size: 15px;
          color: rgba(255,255,255,0.45);
          line-height: 1.7;
          margin-bottom: 48px;
        }
        
        .feature-list { display: flex; flex-direction: column; gap: 16px; }
        .feature-item {
          display: flex; align-items: center; gap: 12px;
          font-size: 14px; color: rgba(255,255,255,0.55);
        }
        .feature-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #20d378;
          flex-shrink: 0;
        }

        /* Right: form panel */
        .auth-form-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 32px;
          position: relative;
          z-index: 1;
        }
        
        .auth-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px;
          padding: 40px;
          backdrop-filter: blur(20px);
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .auth-card.visible { opacity: 1; transform: translateY(0); }
        
        .form-title {
          font-size: 22px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 6px;
        }
        .form-desc {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 32px;
        }
        
        .field-group { margin-bottom: 20px; }
        .field-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.6);
          margin-bottom: 8px;
        }
        .field-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .field-input::placeholder { color: rgba(255,255,255,0.2); }
        .field-input:focus {
          border-color: rgba(32,211,120,0.4);
          box-shadow: 0 0 0 3px rgba(32,211,120,0.08);
        }
        .field-input.ltr { direction: ltr; text-align: left; }
        
        .password-wrap { position: relative; }
        .password-wrap .field-input { padding-left: 44px; }
        .pass-toggle {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer; padding: 4px;
          line-height: 1;
          transition: color 0.2s;
        }
        .pass-toggle:hover { color: rgba(255,255,255,0.6); }
        
        .error-box {
          padding: 12px 16px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px;
          color: #f87171;
          font-size: 13px;
          text-align: center;
          margin-bottom: 20px;
        }
        
        .submit-btn {
          width: 100%;
          padding: 13px 24px;
          background: #20d378;
          color: #060810;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.2s, transform 0.15s;
          margin-top: 8px;
        }
        .submit-btn:hover:not(:disabled) { background: #1bbf6b; }
        .submit-btn:active:not(:disabled) { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(6,8,16,0.3);
          border-top-color: #060810;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .auth-footer {
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.06);
          text-align: center;
          font-size: 14px;
          color: rgba(255,255,255,0.4);
        }
        .auth-footer a { color: #20d378; text-decoration: none; font-weight: 500; }
        .auth-footer a:hover { text-decoration: underline; }
        
        .back-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; color: rgba(255,255,255,0.3);
          text-decoration: none;
          margin-top: 24px;
          transition: color 0.2s;
        }
        .back-link:hover { color: rgba(255,255,255,0.6); }

        @media (max-width: 768px) {
          .auth-brand { display: none; }
          .auth-form-panel { padding: 24px 16px; }
        }
      `}</style>

      <div className="auth-root">
        <div className="blob-1" />
        <div className="blob-2" />

        {/* Left branding */}
        <div className="auth-brand">
          <div className="brand-logo">
            <div className="brand-logo-icon">W</div>
            <div>
              <div className="brand-logo-text">وني</div>
              <div className="brand-logo-sub">Developer Portal</div>
            </div>
          </div>
          <h1 className="brand-headline">
            ابني تطبيقك بـ<br />
            <span>WhatsApp OTP</span><br />
            في دقائق
          </h1>
          <p className="brand-sub">
            منصة متكاملة لإرسال والتحقق من أكواد الـ OTP<br />
            عبر WhatsApp مع API احترافية وتوثيق كامل.
          </p>
          <div className="feature-list">
            <div className="feature-item"><div className="feature-dot" />إدارة مشاريع متعددة منفصلة</div>
            <div className="feature-item"><div className="feature-dot" />قوالب WhatsApp مع مزامنة Meta</div>
            <div className="feature-item"><div className="feature-dot" />API Keys مع Rate Limiting</div>
            <div className="feature-item"><div className="feature-dot" />تسليم المشروع للعميل بضغطة</div>
          </div>
        </div>

        {/* Form panel */}
        <div className="auth-form-panel">
          <div className={`auth-card ${mounted ? "visible" : ""}`}>
            <h2 className="form-title">تسجيل الدخول</h2>
            <p className="form-desc">أهلاً بك مرة تانية في Developer Portal</p>

            <form onSubmit={handleSubmit}>
              <div className="field-group">
                <label className="field-label">الإيميل</label>
                <input
                  className="field-input ltr"
                  type="email"
                  placeholder="dev@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="field-group">
                <label className="field-label">كلمة المرور</label>
                <div className="password-wrap">
                  <input
                    className="field-input ltr"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="pass-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && <div className="error-box">{error}</div>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <><div className="spinner" />جاري الدخول...</>
                ) : (
                  <>
                    دخول
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="auth-footer">
              ماعندكش حساب؟{" "}
              <Link href="/developers/signup">سجّل جديد</Link>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "0" }}>
            <Link href="/developers" className="back-link">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              رجوع للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}