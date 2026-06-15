"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LanguageProvider, useLanguage } from "../_components/LanguageProvider";

export default function DevSignUpPage() {
  return (
    <LanguageProvider>
      <SignUpContent />
    </LanguageProvider>
  );
}


function SignUpContent() {
  const router = useRouter();
  const { language, toggleLanguage, t } = useLanguage();
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => { setMounted(true); }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = t("First name is required", "الاسم الأول مطلوب");
    else if (form.firstName.trim().length < 2) errs.firstName = t("At least 2 characters", "حرفين على الأقل");
    if (!form.lastName.trim()) errs.lastName = t("Last name is required", "الاسم الأخير مطلوب");
    else if (form.lastName.trim().length < 2) errs.lastName = t("At least 2 characters", "حرفين على الأقل");
    if (!form.phone.trim()) errs.phone = t("Phone number is required", "رقم الموبايل مطلوب");
    if (!form.email.trim()) errs.email = t("Email is required", "الإيميل مطلوب");
    if (!form.password) errs.password = t("Password is required", "كلمة المرور مطلوبة");
    else if (form.password.length < 8) errs.password = t("At least 8 characters", "8 أحرف على الأقل");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/developers/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) { setError(data.error || t("Something went wrong, try again", "حصل خطأ، حاول تاني")); return; }
      router.push(data.redirect || "/developers/portal");
      router.refresh();
    } catch {
      setLoading(false);
      setError(t("Connection error, try again", "حصل خطأ في الاتصال، حاول تاني"));
    }
  }

  const strengthScore = (() => {
    const p = form.password; if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabels = ["", t("Weak", "ضعيفة"), t("Fair", "مقبولة"), t("Good", "جيدة"), t("Strong", "قوية")];
  const strengthLabel = strengthLabels[strengthScore];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#3b82f6", "#20d378"][strengthScore];

  const STEPS = [
    { n: language === 'ar' ? "١" : "1", t: t("Create account", "إنشاء الحساب"), d: t("Register your info and a strong password", "سجّل بياناتك وكلمة مرور قوية") },
    { n: language === 'ar' ? "٢" : "2", t: t("Create your first project", "إنشاء مشروعك الأول"), d: t("Name your project and start working immediately", "سمّي مشروعك وابدأ العمل فوراً") },
    { n: language === 'ar' ? "٣" : "3", t: t("Connect WhatsApp Business", "ربط WhatsApp Business"), d: t("Link your project's Meta account", "اربط حساب Meta الخاص بمشروعك") },
    { n: language === 'ar' ? "٤" : "4", t: t("Use the API", "استخدم الـ API"), d: t("Send OTPs directly from your app", "أرسل OTPs مباشرة من تطبيقك") },
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

            <form onSubmit={handleSubmit} noValidate>
              <div className="name-row">
                <div className="field-group">
                  <label className="field-label">{t("First Name", "الاسم الأول")}</label>
                  <input
                    className={`field-input ${fieldErrors.firstName ? "has-error" : ""}`}
                    type="text" placeholder={t("Ahmed", "أحمد")}
                    value={form.firstName} onChange={(e) => set("firstName", e.target.value)}
                    autoComplete="given-name" autoCapitalize="words"
                  />
                  {fieldErrors.firstName && <p className="field-error">{fieldErrors.firstName}</p>}
                </div>
                <div className="field-group">
                  <label className="field-label">{t("Last Name", "الاسم الأخير")}</label>
                  <input
                    className={`field-input ${fieldErrors.lastName ? "has-error" : ""}`}
                    type="text" placeholder={t("Mohamed", "محمد")}
                    value={form.lastName} onChange={(e) => set("lastName", e.target.value)}
                    autoComplete="family-name" autoCapitalize="words"
                  />
                  {fieldErrors.lastName && <p className="field-error">{fieldErrors.lastName}</p>}
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">{t("Phone Number", "رقم الموبايل")}</label>
                <input
                  className={`field-input ltr ${fieldErrors.phone ? "has-error" : ""}`}
                  type="tel" placeholder="01xxxxxxxxx"
                  value={form.phone} onChange={(e) => set("phone", e.target.value)}
                  autoComplete="tel" inputMode="tel"
                />
                {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
              </div>

              <div className="field-group">
                <label className="field-label">{t("Email", "الإيميل")}</label>
                <input
                  className={`field-input ltr ${fieldErrors.email ? "has-error" : ""}`}
                  type="email" placeholder="dev@example.com"
                  value={form.email} onChange={(e) => set("email", e.target.value)}
                  autoComplete="email" inputMode="email"
                />
                {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
              </div>

              <div className="field-group">
                <label className="field-label">{t("Password", "كلمة المرور")}</label>
                <div className="password-wrap">
                  <input
                    className={`field-input ltr ${fieldErrors.password ? "has-error" : ""}`}
                    type={showPassword ? "text" : "password"}
                    placeholder={t("At least 8 characters", "8 أحرف على الأقل")}
                    value={form.password} onChange={(e) => set("password", e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {form.password && (
                  <div className="strength-bar">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="strength-seg" style={{ background: i <= strengthScore ? strengthColor : undefined }} />
                    ))}
                    <span className="strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
                  </div>
                )}
                {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
              </div>

              {error && <div className="error-box">{error}</div>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <><div className="spinner" />{t("Creating account...", "جاري إنشاء الحساب...")}</> : <>{t("Create Account", "إنشاء الحساب")}</>}
              </button>
            </form>

            <div className="auth-footer">
              {t("Already have an account? ", "عندك حساب بالفعل؟ ")}<Link href="/developers/signin">{t("Sign In", "تسجيل الدخول")}</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}