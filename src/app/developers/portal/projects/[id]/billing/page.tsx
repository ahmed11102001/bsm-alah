"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CreditCard, Check, AlertTriangle } from "lucide-react";
import { useLanguage } from "../../../../_components/LanguageProvider";

export default function BillingPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { language, t } = useLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";
  const align = language === "ar" ? "right" : "left";

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div style={{ color: "rgba(255,255,255,0.5)", padding: 40, textAlign: "center", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
        {t("Loading...", "جاري التحميل...")}
      </div>
    );
  }

  const isOwner = project?.viewerRole === "owner";

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
        .plan-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .plan-name { font-size: 20px; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .plan-price { font-size: 28px; font-weight: 600; color: #20d378; }
        .plan-price span { font-size: 14px; color: rgba(255,255,255,0.4); font-weight: 400; }
        
        .plan-features { display: flex; flex-direction: column; gap: 12px; }
        .feature-item { display: flex; align-items: center; gap: 10px; font-size: 14px; color: rgba(255,255,255,0.7); }
        .feature-icon { color: #20d378; flex-shrink: 0; }

        .btn-upgrade {
          padding: 12px 24px; background: #20d378; color: #060810;
          font-size: 14px; font-weight: 600; font-family: inherit;
          border: none; border-radius: 10px; cursor: pointer; align-self: flex-start;
          transition: background 0.2s;
        }
        .btn-upgrade:hover { background: #1bbf6b; }

        .alert-box {
          background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2);
          border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px;
          color: #f59e0b; font-size: 13px; margin-bottom: 24px;
        }
      `}</style>

      <div className="billing-root">
        <h1 className="page-title">
          <CreditCard size={24} style={{ color: "#20d378" }} />
          {t("Billing & Subscription", "الباقة والفواتير")}
        </h1>
        <p className="page-sub" style={{ textAlign: align }}>
          {t("Manage your project's subscription and view consumption details.", "إدارة باقة المشروع وعرض تفاصيل الاستهلاك.")}
        </p>

        {!isOwner && (
          <div className="alert-box">
            <AlertTriangle size={18} />
            {t("Only the project owner can manage billing and subscriptions.", "مالك المشروع فقط هو من يمكنه إدارة الباقة والفواتير.")}
          </div>
        )}

        <div className="plan-card">
          <div className="plan-header">
            <div>
              <div className="plan-name">{t("Free Trial", "الباقة التجريبية")}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                {t("100 free OTPs per month", "100 كود OTP مجاني شهرياً")}
              </div>
            </div>
            <div className="plan-price">
              {t("Free", "مجاناً")}
            </div>
          </div>

          <div className="plan-features">
            <div className="feature-item">
              <Check size={16} className="feature-icon" />
              {t("Up to 100 successful OTP verifications", "حتى 100 عملية تحقق ناجحة")}
            </div>
            <div className="feature-item">
              <Check size={16} className="feature-icon" />
              {t("Community Support", "دعم مجتمعي")}
            </div>
            <div className="feature-item">
              <Check size={16} className="feature-icon" />
              {t("Standard Delivery Speed", "سرعة إرسال قياسية")}
            </div>
          </div>

          {isOwner && (
            <button className="btn-upgrade">
              {t("Upgrade Plan", "ترقية الباقة")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
