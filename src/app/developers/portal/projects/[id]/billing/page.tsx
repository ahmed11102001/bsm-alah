"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CreditCard, Check, AlertTriangle, ShieldCheck } from "lucide-react";
import { useLanguage } from "../../../../_components/LanguageProvider";

export default function BillingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const statusParam = searchParams.get("status");
  const { language, t } = useLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";
  const align = language === "ar" ? "right" : "left";

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function handleCheckout() {
    setCheckoutLoading(true);
    setError("");
    try {
      const res = await fetch("/api/developers/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حصل خطأ");
        setCheckoutLoading(false);
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError("حصل خطأ في الاتصال");
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ color: "rgba(255,255,255,0.5)", padding: 40, textAlign: "center", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
        {t("Loading...", "جاري التحميل...")}
      </div>
    );
  }

  const isOwner = project?.viewerRole === "owner";
  const isOwnerPlan = project?.plan === "OWNER_PLAN";

  let statusMessage = null;
  if (statusParam === "success") {
    statusMessage = (
      <div className="status-box success">
        <ShieldCheck size={18} />
        {t("Payment successful! Your subscription is now active.", "تم الدفع بنجاح! اشتراكك مفعل الآن.")}
      </div>
    );
  } else if (statusParam === "failed") {
    statusMessage = (
      <div className="status-box failed">
        <AlertTriangle size={18} />
        {t("Payment failed or was cancelled.", "فشلت عملية الدفع أو تم إلغاؤها.")}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');
        .billing-root {
          max-width: 900px; margin: 0 auto;
          padding: 40px 24px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          color: #fff;
          direction: ${dir};
        }
        .page-title { font-size: 24px; font-weight: 600; color: #fff; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
        .page-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 40px; }

        .plan-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px; padding: 32px;
          margin-bottom: 32px; display: flex; flex-direction: column; gap: 24px;
        }
        .plan-card.active-owner {
          border-color: rgba(32,211,120,0.4);
          background: linear-gradient(180deg, rgba(32,211,120,0.05) 0%, rgba(255,255,255,0.02) 100%);
        }
        .plan-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
        .plan-name { font-size: 20px; font-weight: 600; color: #fff; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
        .plan-price { font-size: 28px; font-weight: 600; color: #20d378; }
        .plan-price span { font-size: 14px; color: rgba(255,255,255,0.4); font-weight: 400; }
        
        .plan-features { display: flex; flex-direction: column; gap: 12px; }
        .feature-item { display: flex; align-items: center; gap: 10px; font-size: 14px; color: rgba(255,255,255,0.7); }
        .feature-icon { color: #20d378; flex-shrink: 0; }

        .btn-upgrade {
          padding: 12px 24px; background: #20d378; color: #060810;
          font-size: 14px; font-weight: 600; font-family: inherit;
          border: none; border-radius: 10px; cursor: pointer; align-self: flex-start;
          transition: background 0.2s; display: flex; align-items: center; gap: 8px;
        }
        .btn-upgrade:hover:not(:disabled) { background: #1bbf6b; }
        .btn-upgrade:disabled { opacity: 0.7; cursor: not-allowed; }

        .alert-box {
          background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2);
          border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px;
          color: #f59e0b; font-size: 13px; margin-bottom: 24px;
        }
        .error-text { color: #ef4444; font-size: 13px; margin-top: 8px; }
        
        .status-box {
          border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px;
          font-size: 14px; margin-bottom: 24px; font-weight: 500;
        }
        .status-box.success { background: rgba(32,211,120,0.1); border: 1px solid rgba(32,211,120,0.3); color: #20d378; }
        .status-box.failed { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; }
        
        .renews-text { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: -16px; margin-bottom: 8px; }
      `}</style>

      <div className="billing-root">
        <h1 className="page-title">
          <CreditCard size={24} style={{ color: "#20d378" }} />
          {t("Billing & Subscription", "الباقة والفواتير")}
        </h1>
        <p className="page-sub" style={{ textAlign: align }}>
          {t("Manage your project's subscription and view consumption details.", "إدارة باقة المشروع وعرض تفاصيل الاستهلاك.")}
        </p>

        {statusMessage}

        {!isOwner && (
          <div className="alert-box">
            <AlertTriangle size={18} />
            {t("Only the project owner can manage billing and subscriptions.", "مالك المشروع فقط هو من يمكنه إدارة الباقة والفواتير.")}
          </div>
        )}

        {isOwnerPlan ? (
          <div className="plan-card active-owner">
            <div className="plan-header">
              <div>
                <div className="plan-name">
                  {t("Owner Plan", "باقة الأونر")}
                  <ShieldCheck size={18} color="#20d378" />
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  {t("Unlimited limits, your own templates, full control", "بلا حدود، قوالب خاصة، تحكم كامل")}
                </div>
              </div>
              <div className="plan-price">
                {t("Active", "مفعلة")}
              </div>
            </div>
            
            {project?.planRenewsAt && (
              <div className="renews-text">
                {t("Subscription renews at:", "يتجدد الاشتراك في:")} {new Date(project.planRenewsAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { dateStyle: "long" })}
              </div>
            )}

            <div className="plan-features">
              <div className="feature-item">
                <Check size={16} className="feature-icon" />
                {t("Unlimited OTP messages", "رسائل OTP غير محدودة")}
              </div>
              <div className="feature-item">
                <Check size={16} className="feature-icon" />
                {t("Create unlimited custom templates", "إنشاء قوالب مخصصة بلا حدود")}
              </div>
              <div className="feature-item">
                <Check size={16} className="feature-icon" />
                {t("Premium Support", "دعم فني متقدم")}
              </div>
            </div>
          </div>
        ) : (
          <div className="plan-card">
            <div className="plan-header">
              <div>
                <div className="plan-name">{t("Free Trial", "الباقة التجريبية")}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                  {t("50 free OTPs for 14 days", "50 رسالة OTP مجانية لمدة 14 يوم")}
                </div>
              </div>
              <div className="plan-price">
                {t("Free", "مجاناً")}
              </div>
            </div>

            <div className="plan-features">
              <div className="feature-item">
                <Check size={16} className="feature-icon" />
                {t("Up to 50 successful OTP verifications", "حتى 50 عملية تحقق ناجحة")}
              </div>
              <div className="feature-item">
                <Check size={16} className="feature-icon" />
                {t("Test integration easily", "اختبار الربط بسهولة")}
              </div>
              <div className="feature-item">
                <Check size={16} className="feature-icon" />
                {t("Standard Delivery Speed", "سرعة إرسال قياسية")}
              </div>
            </div>

            {isOwner && (
              <>
                <button className="btn-upgrade" onClick={handleCheckout} disabled={checkoutLoading}>
                  {checkoutLoading ? t("Loading...", "جاري التحميل...") : t("Subscribe to Owner Plan — 249 EGP/mo", "اشترك في باقة الأونر — 249ج/شهر")}
                </button>
                {error && <div className="error-text">{error}</div>}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
