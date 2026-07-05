"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LanguageProvider, useLanguage } from "../_components/LanguageProvider";

export default function DevSignInPage() {
  return (
    <LanguageProvider>
      <SignInContent />
    </LanguageProvider>
  );
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/developers/portal";
  const errorParam = searchParams.get("error");
  const { language, toggleLanguage, t } = useLanguage();

  const [tab, setTab] = useState<"login" | "claim">("login");
  const [claimStep, setClaimStep] = useState<1 | 2>(1);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [projectName, setProjectName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (errorParam === "suspended") setError(t("Account suspended, contact support", "الحساب موقف، تواصل مع الدعم"));
  }, [errorParam]);

  async function handleLoginSubmit(e: React.FormEvent) {
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
      if (!res.ok) { setError(data.error || t("Something went wrong, try again", "حصل خطأ، حاول تاني")); return; }
      router.push(data.redirect || callbackUrl);
      router.refresh();
    } catch {
      setLoading(false);
      setError(t("Connection error, try again", "حصل خطأ في الاتصال، حاول تاني"));
    }
  }

  async function handleClaimCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !inviteCode) {
      setError(t("Please fill all fields", "الرجاء ملء كل الحقول"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/developers/auth/claim-project/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, inviteCode }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) { setError(data.error || t("Invalid or expired code", "الكود غير صحيح أو منتهي الصلاحية")); return; }
      
      setAccountExists(data.accountExists);
      setProjectName(data.projectName);
      setClaimStep(2);
    } catch {
      setLoading(false);
      setError(t("Connection error, try again", "حصل خطأ في الاتصال، حاول تاني"));
    }
  }

  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountExists && password !== confirmPassword) {
      setError(t("Passwords do not match", "كلمة المرور غير متطابقة"));
      return;
    }
    setLoading(true);
    setError("");

    const endpoint = accountExists ? "/api/developers/auth/claim-project/login" : "/api/developers/auth/claim-project/register";
    const payload = accountExists 
      ? { email, inviteCode, password }
      : { email, inviteCode, password, firstName, lastName, phone };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) { setError(data.error || t("Something went wrong", "حصل خطأ")); return; }
      
      router.push(data.redirect || callbackUrl);
      router.refresh();
    } catch {
      setLoading(false);
      setError(t("Connection error, try again", "حصل خطأ في الاتصال، حاول تاني"));
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-root {
          min-height: 100vh;
          min-height: 100dvh;
          background: #060810;
          display: flex;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: ${language === 'ar' ? 'rtl' : 'ltr'};
          position: relative;
          overflow: hidden;
        }
        .auth-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(32,211,120,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(32,211,120,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 0%, black 20%, transparent 100%);
          pointer-events: none;
        }
        .blob-1 {
          position: absolute; width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(32,211,120,0.07) 0%, transparent 70%);
          top: -180px; ${language === 'ar' ? 'left' : 'right'}: -80px; pointer-events: none;
        }
        .blob-2 {
          position: absolute; width: 350px; height: 350px; border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%);
          bottom: -80px; ${language === 'ar' ? 'right' : 'left'}: -80px; pointer-events: none;
        }

        /* ── Brand panel ── */
        .auth-brand {
          width: 460px;
          padding: 56px 52px;
          display: flex; flex-direction: column; justify-content: center;
          border-${language === 'ar' ? 'left' : 'right'}: 1px solid rgba(255,255,255,0.04);
          position: relative; z-index: 1;
          flex-shrink: 0;
        }
        .brand-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 56px; }
        .brand-logo-icon {
          width: 44px; height: 44px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .brand-logo-text { font-size: 18px; font-weight: 500; color: #fff; }
        .brand-logo-sub  { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px; }
        .brand-headline {
          font-size: 34px; font-weight: 600; line-height: 1.3; color: #fff;
          margin-bottom: 14px; letter-spacing: -0.5px;
        }
        .brand-headline span { color: #20d378; }
        .brand-sub {
          font-size: 15px; color: rgba(255,255,255,0.45);
          line-height: 1.7; margin-bottom: 40px;
        }
        .feature-list { display: flex; flex-direction: column; gap: 14px; }
        .feature-item { display: flex; align-items: center; gap: 12px; font-size: 14px; color: rgba(255,255,255,0.55); }
        .feature-dot { width: 6px; height: 6px; border-radius: 50%; background: #20d378; flex-shrink: 0; }

        /* ── Form panel ── */
        .auth-form-panel {
          flex: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 40px 24px;
          position: relative; z-index: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .auth-card {
          width: 100%; max-width: 420px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 36px 32px;
          backdrop-filter: blur(20px);
          opacity: 0; transform: translateY(14px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .auth-card.visible { opacity: 1; transform: translateY(0); }

        /* Mobile top logo */
        .mobile-brand-logo {
          display: none;
          align-items: center; gap: 10px;
          margin-bottom: 24px;
          justify-content: center;
        }
        .mobile-brand-logo-icon {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
        }
        .mobile-brand-name { font-size: 16px; font-weight: 600; color: #fff; }
        .mobile-brand-sub  { font-size: 11px; color: rgba(255,255,255,0.35); }

        .tabs { display: flex; gap: 8px; margin-bottom: 24px; background: rgba(255,255,255,0.03); padding: 4px; border-radius: 12px; }
        .tab-btn {
          flex: 1; padding: 10px; text-align: center; border-radius: 8px; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.2s; border: none; background: transparent;
        }
        .tab-btn.active { background: rgba(255,255,255,0.08); color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }

        .form-title { font-size: 21px; font-weight: 600; color: #fff; margin-bottom: 5px; }
        .form-desc  { font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 28px; line-height: 1.5; }

        .field-group { margin-bottom: 18px; }
        .field-label { display: block; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); margin-bottom: 7px; }
        .field-input {
          width: 100%; padding: 12px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; color: #fff;
          font-size: 15px; font-family: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
        }
        .field-input::placeholder { color: rgba(255,255,255,0.2); }
        .field-input:focus {
          border-color: rgba(32,211,120,0.4);
          box-shadow: 0 0 0 3px rgba(32,211,120,0.08);
        }
        .field-input.ltr { direction: ltr; text-align: left; }

        .password-wrap { position: relative; }
        .password-wrap .field-input { padding-${language === 'ar' ? 'left' : 'right'}: 44px; }
        .pass-toggle {
          position: absolute; ${language === 'ar' ? 'left' : 'right'}: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer; padding: 6px; line-height: 1;
          transition: color 0.2s;
        }
        .pass-toggle:hover { color: rgba(255,255,255,0.6); }

        .forgot-link {
          display: block; text-align: ${language === 'ar' ? 'left' : 'right'};
          font-size: 12px; color: rgba(32,211,120,0.7);
          text-decoration: none; margin-top: -10px; margin-bottom: 18px;
          transition: color 0.2s;
        }
        .forgot-link:hover { color: #20d378; }

        .error-box {
          padding: 11px 14px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px; color: #f87171;
          font-size: 13px; text-align: center; margin-bottom: 18px;
        }

        .submit-btn {
          width: 100%; padding: 13px 24px;
          background: #20d378; color: #060810;
          font-size: 15px; font-weight: 600; font-family: inherit;
          border: none; border-radius: 11px; cursor: pointer;
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
          margin-top: 24px; padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          text-align: center; font-size: 14px; color: rgba(255,255,255,0.4);
        }
        .auth-footer a { color: #20d378; text-decoration: none; font-weight: 500; }

        .back-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; color: rgba(255,255,255,0.3);
          text-decoration: none; margin-top: 20px;
          transition: color 0.2s;
        }
        .back-link:hover { color: rgba(255,255,255,0.6); }

        .lang-toggle-corner {
          position: absolute; top: 20px; ${language === 'ar' ? 'left' : 'right'}: 20px;
          z-index: 10;
          padding: 6px 12px; font-size: 12px; font-weight: 600;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: rgba(255,255,255,0.5);
          cursor: pointer; transition: all 0.2s;
        }
        .lang-toggle-corner:hover { background: rgba(255,255,255,0.1); color: #fff; }

        @media (max-width: 768px) {
          .auth-root { flex-direction: column; align-items: center; justify-content: flex-start; overflow-y: auto; }
          .auth-brand { width: 100%; max-width: 420px; padding: 40px 24px 20px; border: none; border-bottom: 1px solid rgba(255,255,255,0.04); flex-shrink: 0; }
          .brand-logo { justify-content: center; margin-bottom: 28px; }
          .brand-headline { font-size: 28px; text-align: center; }
          .brand-sub { font-size: 14px; text-align: center; margin-bottom: 28px; }
          .feature-list { max-width: 320px; margin: 0 auto; }
          .auth-form-panel { width: 100%; max-width: 420px; padding: 24px 16px 32px; flex: none; }
          .auth-card { padding: 28px 22px; border-radius: 16px; }
          .mobile-brand-logo { display: none !important; }
        }
      `}</style>

      <div className="auth-root">
        <div className="blob-1" />
        <div className="blob-2" />

        <button className="lang-toggle-corner" onClick={toggleLanguage}>
          {language === 'ar' ? 'EN' : 'AR'}
        </button>

        <div className="auth-brand">
          <div className="brand-logo">
            <div className="brand-logo-icon"><img src="/favicon.svg" alt="Wani" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
            <div>
              <div className="brand-logo-text">{t("Wani", "وني")}</div>
              <div className="brand-logo-sub">Developer Portal</div>
            </div>
          </div>
          <h1 className="brand-headline">
            {t("Build your app with", "ابني تطبيقك بـ")}<br />
            <span>WhatsApp OTP</span><br />
            {t("in minutes", "في دقائق")}
          </h1>
          <p className="brand-sub">
            {t(
              "A complete platform to send and verify OTP codes via WhatsApp with a professional API and full documentation.",
              "منصة متكاملة لإرسال والتحقق من أكواد الـ OTP عبر WhatsApp مع API احترافية وتوثيق كامل."
            )}
          </p>
          <div className="feature-list">
            <div className="feature-item"><div className="feature-dot" />{t("Manage multiple isolated projects", "إدارة مشاريع متعددة منفصلة")}</div>
            <div className="feature-item"><div className="feature-dot" />{t("WhatsApp templates with Meta sync", "قوالب WhatsApp مع مزامنة Meta")}</div>
            <div className="feature-item"><div className="feature-dot" />{t("API Keys with Rate Limiting", "API Keys مع Rate Limiting")}</div>
            <div className="feature-item"><div className="feature-dot" />{t("Transfer project to client in one click", "تسليم المشروع للعميل بضغطة")}</div>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className={`auth-card ${mounted ? "visible" : ""}`}>
            <div className="mobile-brand-logo">
              <div className="mobile-brand-logo-icon"><img src="/favicon.svg" alt="Wani" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
              <div>
                <div className="mobile-brand-name">{t("Wani", "وني")}</div>
                <div className="mobile-brand-sub">Developer Portal</div>
              </div>
            </div>

            <div className="tabs">
              <button className={`tab-btn ${tab === "login" ? "active" : ""}`} onClick={() => { setTab("login"); setError(""); setClaimStep(1); }}>
                {t("Sign In", "تسجيل دخول")}
              </button>
              <button className={`tab-btn ${tab === "claim" ? "active" : ""}`} onClick={() => { setTab("claim"); setError(""); }}>
                {t("Claim Project", "استلام مشروع")}
              </button>
            </div>

            {tab === "login" ? (
              <>
                <h2 className="form-title">{t("Sign In", "تسجيل الدخول")}</h2>
                <p className="form-desc">{t("Welcome back to the Developer Portal", "أهلاً بك مرة تانية في Developer Portal")}</p>

                <form onSubmit={handleLoginSubmit}>
                  <div className="field-group">
                    <label className="field-label">{t("Email", "الإيميل")}</label>
                    <input className="field-input ltr" type="email" placeholder="dev@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="field-group">
                    <label className="field-label">{t("Password", "كلمة المرور")}</label>
                    <div className="password-wrap">
                      <input className="field-input ltr" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                      <button type="button" className="pass-toggle" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? "👁" : "👁‍🗨"}
                      </button>
                    </div>
                  </div>
                  <Link href="/developers/forgot-password" className="forgot-link">{t("Forgot password?", "نسيت كلمة المرور؟")}</Link>
                  {error && <div className="error-box">{error}</div>}
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? <><div className="spinner" />{t("Signing in...", "جاري الدخول...")}</> : t("Sign In", "دخول")}
                  </button>
                </form>

                <div className="auth-footer">
                  {t("Don't have an account? ", "ماعندكش حساب؟ ")}<Link href="/developers/signup">{t("Sign Up", "سجّل جديد")}</Link>
                </div>
              </>
            ) : (
              <>
                {claimStep === 1 ? (
                  <>
                    <h2 className="form-title">{t("Claim Project", "استلام مشروع")}</h2>
                    <p className="form-desc">{t("Enter your email and the invite code you received", "أدخل بريدك الإلكتروني وكود الدعوة اللي وصلك")}</p>
                    <form onSubmit={handleClaimCheck}>
                      <div className="field-group">
                        <label className="field-label">{t("Email", "الإيميل")}</label>
                        <input className="field-input ltr" type="email" placeholder="client@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                      <div className="field-group">
                        <label className="field-label">{t("Invite Code", "كود الدعوة")}</label>
                        <input className="field-input ltr" type="text" placeholder="XXXXXXXX" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
                      </div>
                      {error && <div className="error-box">{error}</div>}
                      <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? <><div className="spinner" />{t("Checking...", "جاري التحقق...")}</> : t("Continue", "متابعة")}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h2 className="form-title">{t("Complete Setup", "إكمال الإعداد")}</h2>
                    <p className="form-desc">{t(`You are claiming project "${projectName}"`, `أنت تستلم مشروع "${projectName}"`)}</p>
                    <form onSubmit={handleClaimSubmit}>
                      {!accountExists && (
                        <>
                          <div className="field-group">
                            <label className="field-label">{t("First Name", "الاسم الأول")}</label>
                            <input className="field-input" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                          </div>
                          <div className="field-group">
                            <label className="field-label">{t("Last Name", "الاسم الأخير")}</label>
                            <input className="field-input" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                          </div>
                          <div className="field-group">
                            <label className="field-label">{t("Phone", "رقم الموبايل")}</label>
                            <input className="field-input ltr" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                          </div>
                        </>
                      )}
                      
                      <div className="field-group">
                        <label className="field-label">{t("Password", "كلمة المرور")}</label>
                        <div className="password-wrap">
                          <input className="field-input ltr" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                          <button type="button" className="pass-toggle" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? "👁" : "👁‍🗨"}
                          </button>
                        </div>
                      </div>

                      {!accountExists && (
                        <div className="field-group">
                          <label className="field-label">{t("Confirm Password", "تأكيد كلمة المرور")}</label>
                          <input className="field-input ltr" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                        </div>
                      )}

                      {error && <div className="error-box">{error}</div>}
                      <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? <><div className="spinner" />{t("Processing...", "جاري المعالجة...")}</> : t("Claim Project", "استلام المشروع")}
                      </button>
                    </form>
                  </>
                )}
              </>
            )}

            <Link href="/developers" className="back-link">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={language === 'ar' ? "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" : "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"} />
              </svg>
              {t("Back to home page", "رجوع للصفحة الرئيسية")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}