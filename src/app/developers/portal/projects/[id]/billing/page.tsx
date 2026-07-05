"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { CreditCard, Check, AlertTriangle, ShieldCheck, X, Activity } from "lucide-react";
import { useLanguage } from "../../../../_components/LanguageProvider";

export default function BillingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
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
    router.push(`/developers/portal/projects/${projectId}/checkout`);
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

  // Calculate Trial Stats
  const trialUsed = project?.trialMessagesUsed || 0;
  const trialTotal = 50;
  const trialPercent = Math.min((trialUsed / trialTotal) * 100, 100);
  const isTrialWarning = trialPercent >= 80;
  
  let trialDaysLeft = null;
  let isTrialExpiredByDate = false;
  if (project?.trialEndsAt) {
    const ends = new Date(project.trialEndsAt).getTime();
    const now = new Date().getTime();
    const diff = ends - now;
    trialDaysLeft = Math.ceil(diff / (1000 * 3600 * 24));
    if (trialDaysLeft <= 0) isTrialExpiredByDate = true;
  }
  const isTrialExpiredByUsage = trialUsed >= trialTotal;
  const isTrialExpired = !isOwnerPlan && (isTrialExpiredByDate || isTrialExpiredByUsage);

  const lastPayment = project?.transactions?.[0];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
        .billing-root {
          max-width: 900px; margin: 0 auto;
          padding: 40px 24px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          color: #fff;
          direction: ${dir};
        }
        .page-title { font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
        .page-sub { font-size: 15px; color: rgba(255,255,255,0.4); margin-bottom: 40px; }

        .card-panel {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 32px;
          margin-bottom: 32px;
        }

        .label-text { font-size: 12px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .value-text { font-size: 15px; color: #fff; font-weight: 500; }

        /* Current Plan Section */
        .current-plan-header { font-size: 18px; font-weight: 600; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
        .status-badge { padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
        .status-badge.active { background: rgba(32,211,120,0.1); color: #20d378; border: 1px solid rgba(32,211,120,0.2); }
        .status-badge.expired { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }

        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 24px; margin-bottom: 32px; }
        
        .progress-bar-bg { height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; margin-top: 12px; margin-bottom: 8px; }
        .progress-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
        
        /* Pricing & Owner Plan */
        .owner-plan-card {
          border: 1.5px solid rgba(32,211,120,0.4);
          background: linear-gradient(180deg, rgba(32,211,120,0.05) 0%, rgba(255,255,255,0.01) 100%);
          border-radius: 20px; padding: 40px; margin-bottom: 40px;
        }
        .price-text { font-size: 48px; font-weight: 700; color: #fff; display: flex; align-items: baseline; gap: 8px; margin-bottom: 32px; }
        .price-text span { font-size: 16px; color: rgba(255,255,255,0.4); font-weight: 400; }

        .feature-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px; }
        .feature-row { display: flex; align-items: center; gap: 12px; font-size: 15px; color: rgba(255,255,255,0.85); }
        .feature-check { color: #20d378; background: rgba(32,211,120,0.1); padding: 4px; border-radius: 50%; }

        .btn-subscribe {
          width: 100%; padding: 18px; background: #20d378; color: #060810;
          font-size: 16px; font-weight: 700; border: none; border-radius: 12px;
          cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-subscribe:hover:not(:disabled) { background: #1bbf6b; }
        .btn-subscribe:disabled { opacity: 0.7; cursor: not-allowed; }

        .sub-help { font-size: 13px; color: rgba(255,255,255,0.4); text-align: center; margin-top: 16px; line-height: 1.6; }

        /* Comparison Table */
        .comp-table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        .comp-table th, .comp-table td { padding: 16px; text-align: ${align}; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .comp-table th { font-weight: 600; color: rgba(255,255,255,0.5); font-size: 14px; }
        .comp-table td { font-size: 15px; color: #fff; }
        
        .alert-box {
          background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2);
          border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px;
          color: #f59e0b; font-size: 13px; margin-bottom: 24px;
        }
        .error-text { color: #ef4444; font-size: 13px; margin-top: 12px; text-align: center; }
        
        .status-box {
          border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px;
          font-size: 14px; margin-bottom: 24px; font-weight: 500;
        }
        .status-box.success { background: rgba(32,211,120,0.1); border: 1px solid rgba(32,211,120,0.3); color: #20d378; }
        .status-box.failed { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; }
      `}</style>

      <div className="billing-root">
        <h1 className="page-title">
          <CreditCard size={28} style={{ color: "#20d378" }} />
          {t("Project Plan", "خطة المشروع")}
        </h1>
        <p className="page-sub" style={{ textAlign: align }}>
          {t("Manage your project's plan and view subscription details.", "إدارة خطة المشروع وعرض تفاصيل الاشتراك.")}
        </p>

        {statusMessage}

        {!isOwner && (
          <div className="alert-box">
            <AlertTriangle size={18} />
            {t("Only the project owner can manage the project plan.", "مالك المشروع فقط هو من يمكنه إدارة خطة المشروع.")}
          </div>
        )}

        {/* 1. CURRENT PLAN BLOCK */}
        {!isOwnerPlan ? (
          <div className="card-panel">
            <div className="current-plan-header">
              {t("Current Plan", "الخطة الحالية")}
              <div className={`status-badge ${isTrialExpired ? 'expired' : 'active'}`}>
                {isTrialExpired ? (
                  <><X size={14} /> {t("Trial Expired", "انتهت التجربة")}</>
                ) : (
                  <><div style={{width: 8, height: 8, borderRadius: '50%', background: '#20d378'}} /> {t("Free Trial", "فترة تجريبية")}</>
                )}
              </div>
            </div>

            <div className="info-grid">
              <div>
                <div className="label-text">{t("Project", "المشروع")}</div>
                <div className="value-text">{project?.name}</div>
              </div>
              <div>
                <div className="label-text">{t("Status", "الحالة")}</div>
                <div className="value-text">{project?.status === "ACTIVE" ? t("Active", "نشط") : project?.status}</div>
              </div>
              <div>
                <div className="label-text">{t("Trial Ends", "انتهاء التجربة")}</div>
                <div className="value-text" style={{ color: isTrialExpiredByDate ? '#ef4444' : '#fff' }}>
                  {isTrialExpiredByDate ? t("Expired", "انتهت") : (trialDaysLeft !== null ? t(`بعد ${trialDaysLeft} يوم`, `In ${trialDaysLeft} days`) : "—")}
                </div>
              </div>
            </div>

            <div>
              <div className="label-text">{t("Usage", "الاستخدام")}</div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: trialPercent + "%", background: isTrialWarning ? '#f59e0b' : '#20d378' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                <span>{trialUsed} / {trialTotal} OTP</span>
                <span>{Math.round(trialPercent)}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-panel">
            <div className="current-plan-header">
              {t("Subscription", "الاشتراك")}
              <div className="status-badge active">
                <div style={{width: 8, height: 8, borderRadius: '50%', background: '#20d378'}} /> {t("Owner Plan", "باقة الأونر")}
              </div>
            </div>

            <div className="info-grid">
              <div>
                <div className="label-text">{t("Project", "المشروع")}</div>
                <div className="value-text">{project?.name}</div>
              </div>
              <div>
                <div className="label-text">{t("Status", "الحالة")}</div>
                <div className="value-text">{t("Active", "نشط")}</div>
              </div>
              <div>
                <div className="label-text">{t("Next Renewal", "التجديد القادم")}</div>
                <div className="value-text">
                  {project?.planRenewsAt ? new Date(project.planRenewsAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { dateStyle: "long" }) : "—"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. OWNER PLAN CTA (IF IN TRIAL) */}
        {!isOwnerPlan && isOwner && (
          <div className="owner-plan-card">
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>{t("Owner Plan", "باقة الأونر")}</h2>
            
            <div className="price-text">
              249 <span>{t("EGP / month", "جنيه / شهر")}</span>
            </div>

            <h3 style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
              {t("Includes", "يشمل")}
            </h3>

            <div className="feature-list">
              <div className="feature-row">
                <Check size={14} className="feature-check" />
                {t("Unlimited OTP messages", "رسائل OTP غير محدودة")}
              </div>
              <div className="feature-row">
                <Check size={14} className="feature-check" />
                {t("Unlimited custom OTP templates", "قوالب OTP غير محدودة")}
              </div>
              <div className="feature-row">
                <Check size={14} className="feature-check" />
                {t("Continuous technical support", "دعم فني مستمر")}
              </div>
              <div className="feature-row">
                <Check size={14} className="feature-check" />
                {t("Active throughout subscription", "يعمل طوال مدة الاشتراك")}
              </div>
            </div>

            <button className="btn-subscribe" onClick={handleCheckout} disabled={checkoutLoading}>
              {checkoutLoading ? t("Redirecting...", "جاري التحويل...") : t("Subscribe Now", "اشترك الآن")}
            </button>
            {error && <div className="error-text">{error}</div>}

            <div className="sub-help">
              {t("Your project will not be paused during the payment process.", "لن يتم إيقاف مشروعك أثناء عملية الدفع.")}
              <br />
              {t("You can renew at any time before your subscription expires.", "يمكنك التجديد في أي وقت قبل انتهاء الاشتراك.")}
            </div>
          </div>
        )}

        {/* 3. COMPARISON TABLE (IF IN TRIAL) */}
        {!isOwnerPlan && (
          <div className="card-panel">
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{t("Plan Comparison", "مقارنة الباقات")}</h3>
            <table className="comp-table">
              <thead>
                <tr>
                  <th></th>
                  <th>{t("Trial", "التجريبية")}</th>
                  <th style={{ color: '#20d378' }}>{t("Owner", "الأونر")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t("OTP Messages", "رسائل OTP")}</td>
                  <td>50</td>
                  <td style={{ color: '#20d378', fontWeight: 600 }}>{t("Unlimited", "غير محدود")}</td>
                </tr>
                <tr>
                  <td>{t("Duration", "المدة")}</td>
                  <td>{t("14 Days", "14 يوم")}</td>
                  <td style={{ color: '#20d378', fontWeight: 600 }}>{t("Unlimited", "غير محدود")}</td>
                </tr>
                <tr>
                  <td>{t("Premium Support", "الدعم")}</td>
                  <td>❌</td>
                  <td>✅</td>
                </tr>
                <tr>
                  <td>{t("Production Use", "للاستخدام الحقيقي")}</td>
                  <td>❌</td>
                  <td>✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 4. PAYMENTS HISTORY (LAST PAYMENT) */}
        {isOwnerPlan && lastPayment && (
          <div className="card-panel">
            <div className="current-plan-header" style={{ marginBottom: 16, borderBottom: 'none', paddingBottom: 0 }}>
              {t("Payments", "عمليات الدفع")}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                  {lastPayment.amount} {lastPayment.currency === 'EGP' ? t("EGP", "جنيه") : lastPayment.currency}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                  {new Date(lastPayment.createdAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { dateStyle: "long" })}
                </div>
              </div>
              <div className="status-badge active">
                {t("Paid", "مدفوع")}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
