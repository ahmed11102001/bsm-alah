"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LanguageProvider, useLanguage } from "../_components/LanguageProvider";
import { useDevPath } from "@/lib/dev-links";
import { GoogleOAuthButton } from "@/components/GoogleOAuthButton";

export default function DevSignUpPage() {
  return (
    <LanguageProvider>
      <SignUpContent />
    </LanguageProvider>
  );
}


function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, toggleLanguage, t } = useLanguage();
  const devPath = useDevPath();
  const [step, setStep] = useState<"google" | "profile" | "code">("google");
  const [signupToken, setSignupToken] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    const token = searchParams.get("signupToken");
    if (!token) return;
    setSignupToken(token);
    setGoogleEmail(searchParams.get("signupEmail") || "");
    const parts = String(searchParams.get("signupName") || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      setFirstName(parts[0]);
      setLastName(parts.slice(1).join(" "));
    } else if (parts.length === 1) setFirstName(parts[0]);
    setStep("profile");
  }, [searchParams]);

  function validateProfile() {
    const errs: Record<string, string> = {};
    if (!firstName.trim() || firstName.trim().length < 2) errs.firstName = t("At least 2 characters", "حرفين على الأقل");
    if (!lastName.trim() || lastName.trim().length < 2) errs.lastName = t("At least 2 characters", "حرفين على الأقل");
    if (!phone.trim()) errs.phone = t("Phone number is required", "رقم الواتساب مطلوب");
    if (!password) errs.password = t("Password is required", "كلمة المرور مطلوبة");
    else if (password.length < 8) errs.password = t("At least 8 characters", "8 أحرف على الأقل");
    if (password !== confirmPassword) errs.confirmPassword = t("Passwords do not match", "كلمتا المرور غير متطابقتين");
    if (!terms) errs.terms = t("You must accept the terms", "لازم توافق على الشروط");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateProfile()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/developers/auth/signup/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupToken, firstName, lastName, phone, password, terms: true }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) { setError(data.error || t("Something went wrong, try again", "حصل خطأ، حاول تاني")); return; }
      setCode("");
      setResendIn(60);
      setStep("code");
    } catch {
      setLoading(false);
      setError(t("Connection error, try again", "حصل خطأ في الاتصال، حاول تاني"));
    }
  }

  async function handleResend() {
    if (resendIn > 0 || loading) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/developers/auth/signup/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupToken }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) {
        setError(data.error || t("Something went wrong", "حصل خطأ"));
        if (typeof data.retryAfter === "number") setResendIn(data.retryAfter);
        return;
      }
      setResendIn(60);
    } catch {
      setLoading(false);
      setError(t("Connection error, try again", "حصل خطأ في الاتصال، حاول تاني"));
    }
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 4) { setError(t("Enter the code sent to you", "أدخل الكود المرسل إليك")); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/developers/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupToken, code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) { setError(data.error || t("Something went wrong", "حصل خطأ")); return; }
      router.push(devPath(data.redirect || "/portal"));
      router.refresh();
    } catch {
      setLoading(false);
      setError(t("Connection error, try again", "حصل خطأ في الاتصال، حاول تاني"));
    }
  }

  const STEPS = [
    { n: language === 'ar' ? "١" : "1", t: t("Google account", "حساب جوجل"), d: t("Verify your email with Google", "أكّد إيميلك بحساب جوجل") },
    { n: language === 'ar' ? "٢" : "2", t: t("WhatsApp + password", "واتساب + باسورد"), d: t("Your number gets an OTP code", "رقمك هيوصله كود تأكيد") },
    { n: language === 'ar' ? "٣" : "3", t: t("Verify & start", "أكّد وابدأ"), d: t("Enter the code and use the portal", "أدخل الكود وابدأ البورتال") },
  ];

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
          position: absolute; inset: 0;
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
          top: -180px; ${language === 'ar' ? 'right' : 'left'}: -80px; pointer-events: none;
        }
        .blob-2 {
          position: absolute; width: 350px; height: 350px; border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%);
          bottom: -80px; ${language === 'ar' ? 'left' : 'right'}: -80px; pointer-events: none;
        }

        /* ── Brand panel ── */
        .auth-brand {
          width: 400px; padding: 56px 44px;
          display: flex; flex-direction: column; justify-content: center;
          border-${language === 'ar' ? 'left' : 'right'}: 1px solid rgba(255,255,255,0.04);
          position: relative; z-index: 1; flex-shrink: 0;
        }
        .brand-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 44px; }
        .brand-logo-icon {
          width: 42px; height: 42px; border-radius: 12px;
          background: linear-gradient(135deg, #20d378 0%, #10b854 100%);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 19px; color: #060810;
          font-family: 'Fira Code', monospace; flex-shrink: 0;
        }
        .brand-logo-text { font-size: 17px; font-weight: 500; color: #fff; }
        .brand-logo-sub  { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px; }

        .step-list { display: flex; flex-direction: column; gap: 0; }
        .step-item {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 16px 0; position: relative;
        }
        .step-item:not(:last-child)::after {
          content: '';
          position: absolute;
          ${language === 'ar' ? 'right' : 'left'}: 17px; top: 50px;
          width: 1px; height: calc(100% - 28px);
          background: rgba(255,255,255,0.08);
        }
        .step-num {
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(32,211,120,0.1);
          border: 1px solid rgba(32,211,120,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600; color: #20d378; flex-shrink: 0;
        }
        .step-content h4 { font-size: 14px; font-weight: 500; color: #fff; margin-bottom: 3px; }
        .step-content p  { font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.5; }

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
          width: 100%; max-width: 440px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 32px 28px;
          backdrop-filter: blur(20px);
          opacity: 0; transform: translateY(14px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .auth-card.visible { opacity: 1; transform: translateY(0); }

        /* Mobile-only logo */
        .mobile-brand-logo {
          display: none;
          align-items: center; gap: 10px;
          margin-bottom: 22px; justify-content: center;
        }
        .mobile-brand-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #20d378 0%, #10b854 100%);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 16px; color: #060810;
          font-family: 'Fira Code', monospace;
        }
        .mobile-brand-name { font-size: 16px; font-weight: 600; color: #fff; }
        .mobile-brand-sub  { font-size: 11px; color: rgba(255,255,255,0.35); }

        .form-title { font-size: 20px; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .form-desc  { font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 24px; }

        .name-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .field-group { margin-bottom: 14px; }
        .field-label { display: block; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
        .field-input {
          width: 100%; padding: 11px 13px;
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
        .field-input.has-error { border-color: rgba(239,68,68,0.4) !important; }
        .field-input.ltr { direction: ltr; text-align: left; }
        .field-error { font-size: 12px; color: #f87171; margin-top: 5px; }

        .password-wrap { position: relative; }
        .password-wrap .field-input { padding-${language === 'ar' ? 'left' : 'right'}: 42px; }
        .pass-toggle {
          position: absolute; ${language === 'ar' ? 'left' : 'right'}: 11px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer; padding: 6px; line-height: 1;
          transition: color 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .pass-toggle:hover { color: rgba(255,255,255,0.6); }

        .strength-bar { margin-top: 7px; display: flex; gap: 4px; align-items: center; }
        .strength-seg { flex: 1; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.08); transition: background 0.3s; }
        .strength-label { font-size: 11px; color: rgba(255,255,255,0.4); min-width: 36px; text-align: ${language === 'ar' ? 'right' : 'left'}; }

        .error-box {
          padding: 11px 14px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px; color: #f87171;
          font-size: 13px; text-align: center; margin-bottom: 14px;
        }

        .step-hint {
          font-size: 13px; color: rgba(255,255,255,0.5);
          line-height: 1.8; margin-bottom: 16px;
          text-align: ${language === 'ar' ? 'right' : 'left'};
        }

        .field-hint {
          font-size: 11px; color: rgba(255,255,255,0.35);
          margin-top: 6px;
        }

        .code-input {
          text-align: center; font-size: 22px !important;
          letter-spacing: 8px; font-weight: 700;
        }

        .terms-row {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 13px; color: rgba(255,255,255,0.6);
          line-height: 1.8; margin: 16px 0 4px; cursor: pointer;
        }
        .terms-row input { margin-top: 5px; accent-color: #20d378; width: 16px; height: 16px; }
        .terms-row a { color: #20d378; text-decoration: none; }

        .resend-line {
          font-size: 13px; color: rgba(255,255,255,0.4);
          text-align: center; margin-top: 14px;
        }
        .link-btn {
          background: none; border: none; cursor: pointer;
          color: #20d378; font-size: 13px; font-family: inherit; font-weight: 600;
        }
        .link-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .submit-btn {
          width: 100%; padding: 13px 24px;
          background: #20d378; color: #060810;
          font-size: 15px; font-weight: 600; font-family: inherit;
          border: none; border-radius: 11px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.2s, transform 0.15s; margin-top: 8px;
          -webkit-tap-highlight-color: transparent;
        }
        .submit-btn:hover:not(:disabled) { background: #1bbf6b; }
        .submit-btn:active:not(:disabled) { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(6,8,16,0.3);
          border-top-color: #060810; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .auth-footer {
          margin-top: 20px; padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.06);
          text-align: center; font-size: 14px; color: rgba(255,255,255,0.4);
        }
        .auth-footer a { color: #20d378; text-decoration: none; font-weight: 500; }

        .lang-toggle-corner {
          position: absolute; top: 20px; ${language === 'ar' ? 'left' : 'right'}: 20px;
          z-index: 10;
          padding: 6px 12px; font-size: 12px; font-weight: 600;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: rgba(255,255,255,0.5);
          cursor: pointer; transition: all 0.2s;
        }
        .lang-toggle-corner:hover { background: rgba(255,255,255,0.1); color: #fff; }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .auth-root {
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            overflow-y: auto;
          }
          .auth-brand {
            width: 100%;
            max-width: 440px;
            padding: 40px 24px 20px;
            border-left: none;
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            flex-shrink: 0;
          }
          .brand-logo {
            justify-content: center;
            margin-bottom: 24px;
          }
          .step-list {
            max-width: 360px;
            margin: 0 auto;
          }
          .auth-form-panel {
            width: 100%;
            max-width: 440px;
            padding: 24px 16px 32px;
            flex: none;
          }
          .auth-card { padding: 24px 18px; border-radius: 16px; }
          .mobile-brand-logo { display: none !important; }
          .name-row { grid-template-columns: 1fr !important; gap: 0 !important; }
          .form-title { font-size: 19px; }
          .field-input { font-size: 16px; }
        }

        @media (max-width: 380px) {
          .auth-card { padding: 20px 14px; }
          .form-title { font-size: 17px; }
        }
      `}</style>

      <div className="auth-root">
        <div className="blob-1" /><div className="blob-2" />

        {/* Language toggle */}
        <button className="lang-toggle-corner" onClick={toggleLanguage}>
          {language === 'ar' ? 'EN' : 'AR'}
        </button>

        {/* Desktop brand */}
        <div className="auth-brand">
          <div className="brand-logo">
            <div className="brand-logo-icon">W</div>
            <div>
              <div className="brand-logo-text">{t("Wani", "وني")}</div>
              <div className="brand-logo-sub">Developer Portal</div>
            </div>
          </div>
          <div className="step-list">
            {STEPS.map(({ n, t: title, d }) => (
              <div key={n} className="step-item">
                <div className="step-num">{n}</div>
                <div className="step-content"><h4>{title}</h4><p>{d}</p></div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="auth-form-panel">
          <div className={`auth-card ${mounted ? "visible" : ""}`}>

            {/* Mobile logo */}
            <div className="mobile-brand-logo">
              <div className="mobile-brand-logo-icon">W</div>
              <div>
                <div className="mobile-brand-name">{t("Wani", "وني")}</div>
                <div className="mobile-brand-sub">Developer Portal</div>
              </div>
            </div>

            <h2 className="form-title">{t("Create New Account", "إنشاء حساب جديد")}</h2>
            <p className="form-desc">{t("Join thousands of developers using Wani", "انضم لآلاف المطورين اللي بيستخدموا وني")}</p>

            {step === "google" && (
              <div>
                <p className="step-hint">{t("Start with your Google account — then we'll verify your WhatsApp number.", "ابدأ بحساب جوجل — وبعدين هنأكد رقم الواتساب.")}</p>
                <GoogleOAuthButton
                  callbackUrl={`/auth/google-signup?context=portal&returnTo=${encodeURIComponent(devPath("/signup"))}`}
                  loading={loading}
                  label={t("Continue with Google", "متابعة بـ Google")}
                  onStart={() => setLoading(true)}
                />
                {loading && <p className="step-hint">{t("Verifying...", "جاري التحقق...")}</p>}
                {error && <div className="error-box">{error}</div>}
              </div>
            )}

            {step === "profile" && (
              <form onSubmit={handleProfileSubmit} noValidate>
                <p className="step-hint">{googleEmail} ✓</p>
                <div className="name-row">
                  <div className="field-group">
                    <label className="field-label">{t("First Name", "الاسم الأول")}</label>
                    <input
                      className={`field-input ${fieldErrors.firstName ? "has-error" : ""}`}
                      type="text" placeholder={t("Ahmed", "أحمد")}
                      value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                    {fieldErrors.firstName && <p className="field-error">{fieldErrors.firstName}</p>}
                  </div>
                  <div className="field-group">
                    <label className="field-label">{t("Last Name", "الاسم الأخير")}</label>
                    <input
                      className={`field-input ${fieldErrors.lastName ? "has-error" : ""}`}
                      type="text" placeholder={t("Mohamed", "محمد")}
                      value={lastName} onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                    {fieldErrors.lastName && <p className="field-error">{fieldErrors.lastName}</p>}
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">{t("WhatsApp Number", "رقم الواتساب")}</label>
                  <input
                    className={`field-input ltr ${fieldErrors.phone ? "has-error" : ""}`}
                    type="tel" placeholder="01xxxxxxxxx"
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel" inputMode="tel"
                  />
                  {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
                  <p className="field-hint">{t("You'll receive a confirmation code on it", "هيوصلك عليه كود التأكيد")}</p>
                </div>

                <div className="field-group">
                  <label className="field-label">{t("Password", "كلمة المرور")}</label>
                  <div className="password-wrap">
                    <input
                      className={`field-input ltr ${fieldErrors.password ? "has-error" : ""}`}
                      type={showPassword ? "text" : "password"}
                      placeholder={t("At least 8 characters", "8 أحرف على الأقل")}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button type="button" className="pass-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? "👁" : "👁‍🗨"}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
                </div>

                <div className="field-group">
                  <label className="field-label">{t("Confirm Password", "تأكيد كلمة المرور")}</label>
                  <input
                    className={`field-input ltr ${fieldErrors.confirmPassword ? "has-error" : ""}`}
                    type="password" placeholder="••••••••"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  {fieldErrors.confirmPassword && <p className="field-error">{fieldErrors.confirmPassword}</p>}
                </div>

                <label className="terms-row">
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                  <span>
                    {t("I agree to the ", "أوافق على ")}
                    <Link href={devPath("/terms")} target="_blank">{t("Terms", "الشروط")}</Link>
                    {t(" and ", " و")}
                    <Link href={devPath("/privacy")} target="_blank">{t("Privacy Policy", "سياسة الخصوصية")}</Link>
                  </span>
                </label>
                {fieldErrors.terms && <p className="field-error">{fieldErrors.terms}</p>}

                {error && <div className="error-box">{error}</div>}

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? <><div className="spinner" />{t("Sending code...", "جاري إرسال الكود...")}</> : <>{t("Send Confirmation Code", "إرسال كود التأكيد")}</>}
                </button>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={handleVerifySubmit} noValidate>
                <p className="step-hint">{t("Enter the code sent to your WhatsApp — valid 10 minutes", "أدخل الكود المرسل لواتساب — صالح 10 دقائق")}</p>
                <div className="field-group">
                  <label className="field-label">{t("Confirmation Code", "كود التأكيد")}</label>
                  <input
                    className="field-input ltr code-input"
                    type="text" inputMode="numeric" placeholder="••••••"
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </div>

                {error && <div className="error-box">{error}</div>}

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? <><div className="spinner" />{t("Verifying...", "جاري التحقق...")}</> : <>{t("Verify & Create Account", "تأكيد وإنشاء الحساب")}</>}
                </button>

                <p className="resend-line">
                  {t("Didn't get the code? ", "موصلش الكود؟ ")}
                  {resendIn > 0 ? (
                    <span>{t(`Resend in ${resendIn}s`, `إعادة الإرسال بعد ${resendIn} ث`)}</span>
                  ) : (
                    <button type="button" className="link-btn" onClick={handleResend} disabled={loading}>
                      {t("Send new code", "إرسال كود جديد")}
                    </button>
                  )}
                </p>
              </form>
            )}

            <div className="auth-footer">
              {t("Already have an account? ", "عندك حساب بالفعل؟ ")}<Link href={devPath("/signin")}>{t("Sign In", "تسجيل الدخول")}</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
