"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "../../../../../_components/LanguageProvider";
import { CheckCircle2, ChevronRight, Server, Shield, FileText, ArrowRight } from "lucide-react";

export default function WelcomePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { language, t } = useLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/developers/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        if (data.project) setProject(data.project);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#060810", color: "#fff", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
        {t("Loading project...", "جاري تحميل المشروع...")}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Inter:wght@400;500;600&display=swap');
        
        .welcome-root {
          min-height: 100vh;
          background: #060810;
          color: #e6edf3;
          font-family: ${language === 'ar' ? "'IBM Plex Sans Arabic', sans-serif" : "'Inter', sans-serif"};
          direction: ${dir};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
        }

        .welcome-container {
          width: 100%;
          max-width: 600px;
        }

        .header-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(32,211,120,0.1);
          color: #20d378;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .welcome-title {
          font-size: 24px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .welcome-subtitle {
          font-size: 15px;
          color: #7d8590;
          margin-bottom: 32px;
          line-height: 1.5;
        }

        .steps-box {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 32px;
        }

        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          border-bottom: 1px solid #30363d;
        }

        .step-item:last-child {
          border-bottom: none;
        }

        .step-icon-wrapper {
          color: #7d8590;
          margin-top: 2px;
        }

        .step-content {
          flex: 1;
        }

        .step-title {
          font-size: 15px;
          font-weight: 600;
          color: #e6edf3;
          margin-bottom: 4px;
        }

        .step-desc {
          font-size: 14px;
          color: #7d8590;
          line-height: 1.5;
        }

        .btn-continue {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 24px;
          background: #238636;
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          border: 1px solid rgba(240,246,252,0.1);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          text-decoration: none;
        }

        .btn-continue:hover {
          background: #2ea043;
        }
      `}</style>

      <div className="welcome-root">
        <div className="welcome-container">
          <div className="header-icon">
            <CheckCircle2 size={24} />
          </div>
          
          <h1 className="welcome-title">
            {language === 'ar' ? `مرحباً بك في مشروع ${project?.name || ''}` : `Welcome to ${project?.name || 'Project'}`}
          </h1>
          
          <p className="welcome-subtitle">
            {t(
              "Your project has been successfully transferred. You are now the owner and have full access to its resources.",
              "تم نقل المشروع إليك بنجاح. أنت الآن المالك ولديك الصلاحية الكاملة لإدارته."
            )}
          </p>

          <div className="steps-box">
            <div className="step-item">
              <div className="step-icon-wrapper">
                <Server size={20} />
              </div>
              <div className="step-content">
                <div className="step-title">{t("API Keys", "مفاتيح الربط (API Keys)")}</div>
                <div className="step-desc">
                  {t("Access your API keys for integration with your systems.", "احصل على مفاتيح الربط الخاصة بك لاستخدامها في أنظمتك.")}
                </div>
              </div>
            </div>

            <div className="step-item">
              <div className="step-icon-wrapper">
                <FileText size={20} />
              </div>
              <div className="step-content">
                <div className="step-title">{t("OTP Templates", "قوالب الرسائل")}</div>
                <div className="step-desc">
                  {t("Manage your WhatsApp OTP templates directly from the portal.", "أدر قوالب رسائل الـ OTP الخاصة بك مباشرة من البوابة.")}
                </div>
              </div>
            </div>

            <div className="step-item">
              <div className="step-icon-wrapper">
                <Shield size={20} />
              </div>
              <div className="step-content">
                <div className="step-title">{t("Billing & Limits", "الباقة والاستهلاك")}</div>
                <div className="step-desc">
                  {t("Monitor your usage and upgrade your plan when needed.", "تابع استهلاكك وقم بترقية الباقة عند الحاجة.")}
                </div>
              </div>
            </div>
          </div>

          <button 
            className="btn-continue"
            onClick={() => router.push(`/developers/portal/projects/${projectId}`)}
          >
            {t("Go to Project Dashboard", "الدخول إلى لوحة التحكم")}
            {language === 'ar' ? <ChevronRight size={18} /> : <ArrowRight size={18} />}
          </button>
        </div>
      </div>
    </>
  );
}
