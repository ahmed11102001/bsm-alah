"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "../../../../_components/LanguageProvider";
import { CheckCircle2, ArrowLeft } from "lucide-react";

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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#060810", color: "rgba(255,255,255,0.5)", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
        {t("Loading...", "جاري التحميل...")}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&display=swap');
        
        .welcome-root {
          min-height: 100vh;
          background: #060810;
          color: #fff;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: ${dir};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
        }

        .welcome-container {
          width: 100%;
          max-width: 460px;
          text-align: center;
        }

        .check-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(32,211,120,0.1);
          color: #20d378;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 28px;
        }

        .welcome-title {
          font-size: 22px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 20px;
        }

        .welcome-body {
          font-size: 15px;
          color: rgba(255,255,255,0.5);
          line-height: 1.8;
          margin-bottom: 36px;
        }

        .welcome-body strong {
          color: rgba(255,255,255,0.8);
          font-weight: 500;
        }

        .btn-enter {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          background: #20d378;
          color: #060810;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-enter:hover {
          background: #1bbf6b;
        }
      `}</style>

      <div className="welcome-root">
        <div className="welcome-container">
          <div className="check-icon">
            <CheckCircle2 size={28} />
          </div>
          
          <h1 className="welcome-title">
            {t("Your project has been delivered ✅", "تم استلام مشروعك ✅")}
          </h1>
          
          <p className="welcome-body">
            {t(
              <>The project <strong>&quot;{project?.name || "Project"}&quot;</strong> has been set up and transferred to you successfully.<br /><br />You can now monitor sending status and manage your project subscription.</>,
              <>تم تجهيز مشروع <strong>&quot;{project?.name || "المشروع"}&quot;</strong> وتسليمه إليك بنجاح.<br /><br />يمكنك الآن متابعة حالة الإرسال وإدارة اشتراك المشروع.</>
            )}
          </p>

          <button 
            className="btn-enter"
            onClick={() => router.push(`/developers/portal/projects/${projectId}`)}
          >
            {t("Go to your project", "ادخل إلى مشروعك")}
            <ArrowLeft size={18} style={{ transform: language === 'ar' ? 'none' : 'rotate(180deg)' }} />
          </button>
        </div>
      </div>
    </>
  );
}
