"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Shield, Lock, Check, Loader2, CreditCard, ArrowRight, Sparkles, Bot, CheckCircle2, Zap
} from "lucide-react";
import { useLanguage } from "../../../../_components/LanguageProvider";

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <div className="field-input-readonly">
        {value || "—"}
      </div>
    </div>
  );
}

export default function DeveloperCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { language, t } = useLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";

  const [project, setProject] = useState<any>(null);
  const [developer, setDeveloper] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/developers/projects/${projectId}`).then(res => res.json()),
      fetch(`/api/developers/auth/me`).then(res => res.json())
    ])
      .then(([projData, devData]) => {
        if (projData.project) setProject(projData.project);
        if (devData.developer) setDeveloper(devData.developer);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [projectId]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaying(true);
    setPayError("");

    try {
      const res = await fetch("/api/developers/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        setPayError(data.error ?? t("An error occurred, please try again", "حدث خطأ، حاول مرة أخرى"));
        setPaying(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setPayError(t("Connection error", "خطأ في الاتصال"));
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#060810" }}>
        <Loader2 className="animate-spin text-[#20d378]" size={32} />
      </div>
    );
  }

  const devName = developer ? `${developer.firstName || ""} ${developer.lastName || ""}`.trim() : "";
  const devEmail = developer?.email || "";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');
        
        .checkout-root {
          min-height: 100%;
          background: #060810;
          color: #fff;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: ${dir};
          padding: 40px 24px;
        }

        .checkout-container {
          max-width: 1000px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 1024px) {
          .checkout-container {
            grid-template-columns: 3fr 2fr;
            align-items: start;
          }
        }

        .checkout-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
          max-width: 1000px;
          margin-left: auto;
          margin-right: auto;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }

        .card-panel {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .panel-title {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .field-group {
          margin-bottom: 16px;
        }

        .field-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.6);
          margin-bottom: 8px;
        }

        .field-input-readonly {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
        }

        .fawaterak-box {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
        }

        .fawaterak-badge {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 2px 6px;
        }

        .payment-methods {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .method-tag {
          font-size: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 4px 8px;
          color: rgba(255,255,255,0.7);
        }

        .btn-pay {
          width: 100%;
          padding: 16px;
          background: #20d378;
          color: #060810;
          font-size: 16px;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
          margin-top: 24px;
          box-shadow: 0 4px 20px rgba(32,211,120,0.15);
        }

        .btn-pay:hover:not(:disabled) {
          background: #1bbf6b;
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(32,211,120,0.2);
        }

        .btn-pay:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-box {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          color: #ef4444;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          margin-top: 16px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 14px;
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .trust-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 24px;
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: rgba(255,255,255,0.5);
        }

        .trust-icon {
          color: #20d378;
        }
      `}</style>

      <div className="checkout-root">
        <div className="checkout-header">
          <button className="back-btn" onClick={() => router.back()}>
            <ArrowRight size={16} style={{ transform: dir === 'rtl' ? 'rotate(180deg)' : 'none' }} />
            {t("Back", "رجوع")}
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{t("Checkout", "إتمام الدفع")}</h1>
        </div>

        <div className="checkout-container">
          {/* Left Column: Form */}
          <form onSubmit={handlePay}>
            <div className="card-panel">
              <h2 className="panel-title">{t("Account Details", "بيانات الحساب")}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <ReadOnlyField label={t("Full Name", "الاسم الكامل")} value={devName} />
                <ReadOnlyField label={t("Email", "البريد الإلكتروني")} value={devEmail} />
              </div>
            </div>

            <div className="card-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 className="panel-title" style={{ marginBottom: 0 }}>
                  <CreditCard size={18} /> {t("Payment Method", "طريقة الدفع")}
                </h2>
                <span className="fawaterak-badge">Powered by Fawaterak</span>
              </div>
              
              <div className="fawaterak-box">
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                  <Lock size={16} className="trust-icon" />
                  {t("You will be redirected to the secure Fawaterak payment page.", "ستُحوَّل إلى صفحة الدفع الآمنة على منصة فواتيرك لإتمام الدفع.")}
                </p>
                <div className="payment-methods">
                  <span className="method-tag">Visa</span>
                  <span className="method-tag">MasterCard</span>
                  <span className="method-tag">Meeza</span>
                  <span className="method-tag">Fawry</span>
                  <span className="method-tag">{t("Wallets", "محافظ إلكترونية")}</span>
                </div>
              </div>
            </div>

            {payError && <div className="error-box">{payError}</div>}

            <button type="submit" className="btn-pay" disabled={paying}>
              {paying ? (
                <><Loader2 size={20} className="animate-spin" /> {t("Processing...", "جاري المعالجة...")}</>
              ) : (
                <><Lock size={18} /> {t("Proceed to Payment — 249 EGP", "انتقل للدفع — 249 ج")}</>
              )}
            </button>
            
            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 16 }}>
              {t("By proceeding, you agree to our terms of service.", "بالضغط على زر الدفع توافق على شروط الاستخدام.")}
            </p>
          </form>

          {/* Right Column: Order Summary */}
          <div>
            <div className="card-panel">
              <h2 className="panel-title">{t("Order Summary", "ملخص الطلب")}</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(32,211,120,0.1)', color: '#20d378', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{t("Owner Plan", "باقة الأونر")}</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    {project?.name ? `${t("Project:", "مشروع:")} ${project.name}` : ""}
                  </p>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
                <div className="summary-item">
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{t("Billing Cycle", "دورة الفوترة")}</span>
                  <span style={{ fontWeight: 500 }}>{t("Monthly", "شهري")}</span>
                </div>
                <div className="summary-item">
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>249 {t("EGP", "ج")} × 1 {t("month", "شهر")}</span>
                  <span style={{ fontWeight: 500 }}>249 {t("EGP", "ج")}</span>
                </div>
                <div className="summary-item" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8, paddingTop: 16 }}>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{t("Total Due", "الإجمالي")}</span>
                  <span style={{ fontWeight: 700, color: '#20d378', fontSize: 18 }}>249 {t("EGP", "ج")}</span>
                </div>
              </div>
            </div>

            <div className="trust-list">
              <div className="trust-item">
                <Shield size={16} className="trust-icon" />
                {t("Secure 256-bit SSL encrypted payment", "دفع آمن ومشفر بـ SSL 256-bit")}
              </div>
              <div className="trust-item">
                <Check size={16} className="trust-icon" />
                {t("Cancel subscription at any time", "إلغاء الاشتراك في أي وقت")}
              </div>
              <div className="trust-item">
                <Sparkles size={16} className="trust-icon" />
                {t("Instant activation after payment", "تفعيل فوري بعد الدفع")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
