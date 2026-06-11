"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DevSignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "", password: "",
  });
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
    if (!form.firstName.trim()) errs.firstName = "الاسم الأول مطلوب";
    else if (form.firstName.trim().length < 2) errs.firstName = "حرفين على الأقل";
    if (!form.lastName.trim()) errs.lastName = "الاسم الأخير مطلوب";
    else if (form.lastName.trim().length < 2) errs.lastName = "حرفين على الأقل";
    if (!form.phone.trim()) errs.phone = "رقم الموبايل مطلوب";
    if (!form.email.trim()) errs.email = "الإيميل مطلوب";
    if (!form.password) errs.password = "كلمة المرور مطلوبة";
    else if (form.password.length < 8) errs.password = "8 أحرف على الأقل";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/developers/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) { setError(data.error || "حصل خطأ، حاول تاني"); return; }
      router.push(data.redirect || "/developers/portal");
      router.refresh();
    } catch {
      setLoading(false);
      setError("حصل خطأ في الاتصال، حاول تاني");
    }
  }

  const strengthScore = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabel = ["", "ضعيفة", "مقبولة", "جيدة", "قوية"][strengthScore];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#3b82f6", "#20d378"][strengthScore];

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
        .blob-1 {
          position: absolute; width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(32,211,120,0.08) 0%, transparent 70%);
          top: -200px; right: -100px; pointer-events: none;
        }
        .blob-2 {
          position: absolute; width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%);
          bottom: -100px; left: -100px; pointer-events: none;
        }

        .auth-brand {
          width: 420px; padding: 64px 48px;
          display: flex; flex-direction: column; justify-content: center;
          border-left: 1px solid rgba(255,255,255,0.04);
          position: relative; z-index: 1;
        }
        .brand-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 56px; }
        .brand-logo-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #20d378 0%, #10b854 100%);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 20px; color: #060810;
          font-family: 'Fira Code', monospace; flex-shrink: 0;
        }
        .brand-logo-text { font-size: 18px; font-weight: 500; color: #fff; }
        .brand-logo-sub { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px; }
        
        .step-list { display: flex; flex-direction: column; gap: 0; }
        .step-item {
          display: flex; align-items: flex-start; gap: 16px;
          padding: 20px 0; position: relative;
        }
        .step-item:not(:last-child)::after {
          content: '';
          position: absolute;
          left: 18px; top: 52px;
          width: 1px; height: calc(100% - 32px);
          background: rgba(255,255,255,0.08);
        }
        .step-num {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(32,211,120,0.1);
          border: 1px solid rgba(32,211,120,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600; color: #20d378;
          flex-shrink: 0;
        }
        .step-content h4 { font-size: 15px; font-weight: 500; color: #fff; margin-bottom: 4px; }
        .step-content p { font-size: 13px; color: rgba(255,255,255,0.4); line-height: 1.6; }

        .auth-form-panel {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 48px 32px; position: relative; z-index: 1; overflow-y: auto;
        }
        .auth-card {
          width: 100%; max-width: 460px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px; padding: 40px;
          backdrop-filter: blur(20px);
          opacity: 0; transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .auth-card.visible { opacity: 1; transform: translateY(0); }
        
        .form-title { font-size: 22px; font-weight: 600; color: #fff; margin-bottom: 6px; }
        .form-desc { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 28px; }
        
        .name-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .field-group { margin-bottom: 16px; }
        .field-label {
          display: block; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.6); margin-bottom: 8px;
        }
        .field-input {
          width: 100%; padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; color: #fff;
          font-size: 15px; font-family: inherit;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .field-input::placeholder { color: rgba(255,255,255,0.2); }
        .field-input:focus {
          border-color: rgba(32,211,120,0.4);
          box-shadow: 0 0 0 3px rgba(32,211,120,0.08);
        }
        .field-input.has-error { border-color: rgba(239,68,68,0.4); }
        .field-input.ltr { direction: ltr; text-align: left; }
        .field-error { font-size: 12px; color: #f87171; margin-top: 6px; }
        
        .password-wrap { position: relative; }
        .password-wrap .field-input { padding-left: 44px; }
        .pass-toggle {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: rgba(255,255,255,0.3); cursor: pointer; padding: 4px; line-height: 1;
          transition: color 0.2s;
        }
        .pass-toggle:hover { color: rgba(255,255,255,0.6); }
        
        .strength-bar { margin-top: 8px; display: flex; gap: 4px; align-items: center; }
        .strength-seg {
          flex: 1; height: 3px; border-radius: 2px;
          background: rgba(255,255,255,0.08);
          transition: background 0.3s;
        }
        .strength-label { font-size: 11px; color: rgba(255,255,255,0.4); min-width: 36px; text-align: left; }
        
        .error-box {
          padding: 12px 16px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px; color: #f87171;
          font-size: 13px; text-align: center; margin-bottom: 16px;
        }
        
        .submit-btn {
          width: 100%; padding: 13px 24px;
          background: #20d378; color: #060810;
          font-size: 15px; font-weight: 600; font-family: inherit;
          border: none; border-radius: 12px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.2s, transform 0.15s; margin-top: 8px;
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
          margin-top: 24px; padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          text-align: center; font-size: 14px; color: rgba(255,255,255,0.4);
        }
        .auth-footer a { color: #20d378; text-decoration: none; font-weight: 500; }
        .auth-footer a:hover { text-decoration: underline; }

        @media (max-width: 768px) {
          .auth-brand { display: none; }
          .auth-form-panel { padding: 24px 16px; }
          .name-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="auth-root">
        <div className="blob-1" />
        <div className="blob-2" />

        {/* Left: steps guide */}
        <div className="auth-brand">
          <div className="brand-logo">
            <div className="brand-logo-icon">W</div>
            <div>
              <div className="brand-logo-text">وني</div>
              <div className="brand-logo-sub">Developer Portal</div>
            </div>
          </div>
          <div className="step-list">
            <div className="step-item">
              <div className="step-num">١</div>
              <div className="step-content">
                <h4>إنشاء الحساب</h4>
                <p>سجّل بياناتك الشخصية وكلمة مرور قوية</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">٢</div>
              <div className="step-content">
                <h4>إنشاء مشروعك الأول</h4>
                <p>سمّي مشروعك وابدأ العمل عليه فوراً</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">٣</div>
              <div className="step-content">
                <h4>ربط WhatsApp Business</h4>
                <p>اربط حساب Meta الخاص بمشروعك</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">٤</div>
              <div className="step-content">
                <h4>استخدم الـ API</h4>
                <p>أرسل OTPs مباشرة من تطبيقك</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="auth-form-panel">
          <div className={`auth-card ${mounted ? "visible" : ""}`}>
            <h2 className="form-title">إنشاء حساب جديد</h2>
            <p className="form-desc">انضم لآلاف المطورين اللي بيستخدموا وني</p>

            <form onSubmit={handleSubmit} noValidate>
              {/* Name row */}
              <div className="name-row">
                <div className="field-group">
                  <label className="field-label">الاسم الأول</label>
                  <input
                    className={`field-input ${fieldErrors.firstName ? "has-error" : ""}`}
                    type="text" placeholder="أحمد"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    autoComplete="given-name"
                  />
                  {fieldErrors.firstName && <p className="field-error">{fieldErrors.firstName}</p>}
                </div>
                <div className="field-group">
                  <label className="field-label">الاسم الأخير</label>
                  <input
                    className={`field-input ${fieldErrors.lastName ? "has-error" : ""}`}
                    type="text" placeholder="محمد"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    autoComplete="family-name"
                  />
                  {fieldErrors.lastName && <p className="field-error">{fieldErrors.lastName}</p>}
                </div>
              </div>

              {/* Phone */}
              <div className="field-group">
                <label className="field-label">رقم الموبايل</label>
                <input
                  className={`field-input ltr ${fieldErrors.phone ? "has-error" : ""}`}
                  type="tel" placeholder="01xxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  autoComplete="tel"
                />
                {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
              </div>

              {/* Email */}
              <div className="field-group">
                <label className="field-label">الإيميل</label>
                <input
                  className={`field-input ltr ${fieldErrors.email ? "has-error" : ""}`}
                  type="email" placeholder="dev@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  autoComplete="email"
                />
                {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
              </div>

              {/* Password */}
              <div className="field-group">
                <label className="field-label">كلمة المرور</label>
                <div className="password-wrap">
                  <input
                    className={`field-input ltr ${fieldErrors.password ? "has-error" : ""}`}
                    type={showPassword ? "text" : "password"}
                    placeholder="8 أحرف على الأقل"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowPassword(!showPassword)}>
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
                {form.password && (
                  <div className="strength-bar">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="strength-seg" style={{ background: i <= strengthScore ? strengthColor : undefined }} />
                    ))}
                    <span className="strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
                  </div>
                )}
                {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
              </div>

              {error && <div className="error-box">{error}</div>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <><div className="spinner" />جاري إنشاء الحساب...</>
                ) : (
                  <>إنشاء الحساب</>
                )}
              </button>
            </form>

            <div className="auth-footer">
              عندك حساب بالفعل؟{" "}
              <Link href="/developers/signin">تسجيل الدخول</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}