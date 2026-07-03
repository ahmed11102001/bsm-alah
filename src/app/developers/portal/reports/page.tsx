"use client";

import { BarChart2 } from "lucide-react";
import { useLanguage } from "../../_components/LanguageProvider";

export default function DeveloperReportsPage() {
  const { language, t } = useLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";
  const align = language === "ar" ? "right" : "left";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');
        .reports-root {
          max-width: 900px; margin: 0 auto;
          padding: 40px 24px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          color: #fff;
          direction: ${dir};
        }
        .page-title { font-size: 24px; font-weight: 600; color: #fff; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
        .page-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 40px; }

        .empty-state {
          text-align: center; padding: 80px 20px;
          background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 16px; margin-top: 40px;
        }
        .empty-icon { color: rgba(255,255,255,0.2); margin-bottom: 16px; }
        .empty-text { font-size: 15px; color: rgba(255,255,255,0.5); }
      `}</style>

      <div className="reports-root">
        <h1 className="page-title">
          <BarChart2 size={24} style={{ color: "#20d378" }} />
          {t("Developer Reports", "تقارير المطور")}
        </h1>
        <p className="page-sub" style={{ textAlign: align }}>
          {t("View detailed analytics and OTP consumption across all your projects.", "عرض تحليلات مفصلة واستهلاك الـ OTP عبر جميع مشاريعك.")}
        </p>

        <div className="empty-state">
          <div className="empty-icon"><BarChart2 size={48} style={{ margin: "0 auto" }} /></div>
          <div className="empty-text">
            {t("No data available yet. Start sending OTPs to see reports.", "لا توجد بيانات متاحة بعد. ابدأ في إرسال OTPs لرؤية التقارير.")}
          </div>
        </div>
      </div>
    </>
  );
}
