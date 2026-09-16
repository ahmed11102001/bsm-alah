"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Wallet, Check, AlertTriangle, ShieldCheck, Plus, History, Gift, FlaskConical, BadgeCheck } from "lucide-react";
import { useLanguage } from "../../../../_components/LanguageProvider";
import { useDevPath } from "@/lib/dev-links";

const PRICE_PER_MESSAGE = 0.75;
const TOPUP_MIN = 20;
const TOPUP_MAX = 200;
const MAX_DEBT = 10;

function fmtDate(d: string | null, locale: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "long" });
  } catch {
    return "—";
  }
}

const SOURCE_LABEL: Record<string, { ar: string; en: string }> = {
  trial_credit: { ar: "رصيد تجريبي", en: "Trial" },
  monthly_free: { ar: "الحصة الشهرية", en: "Monthly free" },
  paid_wallet: { ar: "رصيد مدفوع", en: "Paid balance" },
  debt: { ar: "مديونية", en: "Debt" },
  topup: { ar: "شحن رصيد", en: "Top-up" },
  monthly_renew: { ar: "تجديد شهري", en: "Monthly renewal" },
  migration_credit: { ar: "رصيد تحويل", en: "Migration credit" },
};

export default function BillingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.id as string;
  const statusParam = searchParams.get("status");
  const { language, t } = useLanguage();
  const devPath = useDevPath();
  const dir = language === "ar" ? "rtl" : "ltr";
  const align = language === "ar" ? "right" : "left";

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (!project) return null;

  const wallet = project.wallet ?? {
    paidBalanceEGP: 0,
    trial: { used: project.trialMessagesUsed ?? 0, total: 30, endsAt: project.trialEndsAt },
    monthly: { used: 0, total: 30, endsAt: null, active: false },
  };
  const balance: number = wallet.paidBalanceEGP ?? 0;
  const messagesAvailable = balance > 0 ? Math.floor(balance / PRICE_PER_MESSAGE) : 0;
  const isDebt = balance < 0;
  const debtUsed = isDebt ? Math.abs(balance) : 0;

  const trialUsed = wallet.trial?.used ?? 0;
  const trialTotal = wallet.trial?.total ?? 30;
  const trialLeft = Math.max(trialTotal - trialUsed, 0);
  const trialPercent = trialTotal > 0 ? Math.min((trialUsed / trialTotal) * 100, 100) : 100;
  let trialDaysLeft: number | null = null;
  let isTrialExpiredByDate = false;
  if (wallet.trial?.endsAt) {
    trialDaysLeft = Math.ceil((new Date(wallet.trial.endsAt).getTime() - Date.now()) / (1000 * 3600 * 24));
    if (trialDaysLeft <= 0) isTrialExpiredByDate = true;
  }
  const isTrialDone = isTrialExpiredByDate || trialUsed >= trialTotal;

  const monthlyActive: boolean = !!wallet.monthly?.active;
  const monthlyUsed = wallet.monthly?.used ?? 0;
  const monthlyTotal = wallet.monthly?.total ?? 30;
  const monthlyLeft = Math.max(monthlyTotal - monthlyUsed, 0);
  const monthlyPercent = monthlyTotal > 0 ? Math.min((monthlyUsed / monthlyTotal) * 100, 100) : 0;

  const ledger: any[] = project.transactions ?? [];
  const pending = project.topupPending;

  let statusMessage = null;
  if (statusParam === "success") {
    statusMessage = (
      <div className="status-box success">
        <ShieldCheck size={18} />
        {t("Payment successful! Balance has been topped up.", "تم الدفع بنجاح! اتشحن رصيدك.")}
      </div>
    );
  } else if (statusParam === "pending") {
    statusMessage = (
      <div className="status-box success">
        <ShieldCheck size={18} />
        {t("Your request is under review.", "طلبك قيد المراجعة — هيتفعل بعد تأكيد الأدمن.")}
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

        .wallet-hero {
          border: 1.5px solid rgba(32,211,120,0.4);
          background: linear-gradient(180deg, rgba(32,211,120,0.07) 0%, rgba(255,255,255,0.01) 100%);
          border-radius: 20px; padding: 40px; margin-bottom: 32px;
        }
        .wallet-hero.debt {
          border-color: rgba(239,68,68,0.4);
          background: linear-gradient(180deg, rgba(239,68,68,0.07) 0%, rgba(255,255,255,0.01) 100%);
        }
        .balance-text { font-size: 48px; font-weight: 700; color: #fff; display: flex; align-items: baseline; gap: 8px; }
        .balance-text span { font-size: 16px; color: rgba(255,255,255,0.4); font-weight: 400; }
        .balance-sub { font-size: 14px; color: rgba(255,255,255,0.55); margin-top: 6px; }

        .status-badge { padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
        .status-badge.active { background: rgba(32,211,120,0.1); color: #20d378; border: 1px solid rgba(32,211,120,0.2); }
        .status-badge.expired { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
        .status-badge.warn { background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }

        .quota-grid { display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 32px; }
        @media (min-width: 720px) { .quota-grid { grid-template-columns: 1fr 1fr; } }
        .quota-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 28px;
        }
        .quota-head { font-size: 16px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .progress-bar-bg { height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; margin-top: 12px; margin-bottom: 8px; }
        .progress-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }

        .btn-topup {
          width: 100%; padding: 18px; background: #20d378; color: #060810;
          font-size: 16px; font-weight: 700; border: none; border-radius: 12px;
          cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 24px;
        }
        .btn-topup:hover { background: #1bbf6b; }

        .feature-list { display: flex; flex-direction: column; gap: 14px; }
        .feature-row { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; color: rgba(255,255,255,0.85); line-height: 1.7; }
        .feature-check { color: #20d378; background: rgba(32,211,120,0.1); padding: 4px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }

        .price-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .price-table th, .price-table td { padding: 14px 12px; text-align: ${align}; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .price-table th { font-weight: 600; color: rgba(255,255,255,0.5); font-size: 13px; }
        .price-table td { font-size: 14px; color: #fff; }
        .price-hl { color: #20d378; font-weight: 700; }

        .ledger-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 10px; }
        .ledger-empty { text-align: center; color: rgba(255,255,255,0.35); font-size: 14px; padding: 24px 0; }

        .alert-box {
          background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2);
          border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px;
          color: #f59e0b; font-size: 13px; margin-bottom: 24px; line-height: 1.7;
        }
        .debt-box {
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
          border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px;
          color: #ef4444; font-size: 13px; margin-bottom: 24px; line-height: 1.7;
        }
        .status-box {
          border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px;
          font-size: 14px; margin-bottom: 24px; font-weight: 500;
        }
        .status-box.success { background: rgba(32,211,120,0.1); border: 1px solid rgba(32,211,120,0.3); color: #20d378; }
        .status-box.failed { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; }

        .role-cols { display: grid; grid-template-columns: 1fr; gap: 24px; }
        @media (min-width: 720px) { .role-cols { grid-template-columns: 1fr 1fr; } }
        .role-col h4 { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
      `}</style>

      <div className="billing-root">
        <h1 className="page-title">
          <Wallet size={28} style={{ color: "#20d378" }} />
          {t("Billing", "الفوترة")}
        </h1>
        <p className="page-sub" style={{ textAlign: align }}>
          {t("Top up your project balance and track usage. No subscription — pay per message.", "اشحن رصيد مشروعك وتابع الاستهلاك. بدون اشتراك — الدفع بالرسالة.")}
        </p>

        {statusMessage}

        {pending && (
          <div className="alert-box">
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>
              {t(`You have a pending top-up request of ${pending.amount} EGP — it will be credited after admin review.`, `عندك طلب شحن معلق بمبلغ ${pending.amount} جنيه — هيتضاف للرصيد بعد مراجعة الأدمن.`)}
            </span>
          </div>
        )}

        {isDebt && (
          <div className="debt-box">
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>
              {t(
                `Project is in debt (${debtUsed.toFixed(2)} / ${MAX_DEBT} EGP). Sending stops at -${MAX_DEBT} EGP — top up now.`,
                `المشروع في مديونية (${debtUsed.toFixed(2)} / ${MAX_DEBT} جنيه). الإرسال هيقف عند -${MAX_DEBT} جنيه — اشحن دلوقتي.`
              )}
            </span>
          </div>
        )}

        {/* 1. WALLET HERO */}
        <div className={`wallet-hero${isDebt ? " debt" : ""}`}>
          <div className="label-text">{t("Paid balance", "الرصيد المدفوع")}</div>
          <div className="balance-text">
            {balance.toFixed(2)} <span>{t("EGP", "جنيه")}</span>
          </div>
          <div className="balance-sub">
            {isDebt
              ? t(`Debt ${debtUsed.toFixed(2)} of ${MAX_DEBT} EGP allowed`, `مديونية ${debtUsed.toFixed(2)} من ${MAX_DEBT} جنيه مسموح`)
              : t(`≈ ${messagesAvailable} OTP messages at ${PRICE_PER_MESSAGE} EGP each — never expires`, `≈ ${messagesAvailable} رسالة OTP بسعر ${PRICE_PER_MESSAGE} جنيه للرسالة — لا ينتهي أبدًا`)}
          </div>
          <button className="btn-topup" onClick={() => router.push(devPath(`/portal/projects/${projectId}/checkout`))}>
            <Plus size={18} />
            {t(`Top up (${TOPUP_MIN}–${TOPUP_MAX} EGP)`, `اشحن الرصيد (${TOPUP_MIN}–${TOPUP_MAX} جنيه)`)}
          </button>
        </div>

        {/* 2. TRIAL + MONTHLY */}
        <div className="quota-grid">
          <div className="quota-card">
            <div className="quota-head">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FlaskConical size={16} style={{ color: "#20d378" }} />
                {t("Developer trial", "الرصيد التجريبي")}
              </span>
              <div className={`status-badge ${isTrialDone ? "expired" : "active"}`}>
                {isTrialDone ? t("Exhausted", "انتهى") : t("Active", "نشط")}
              </div>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: trialPercent + "%", background: trialPercent >= 80 ? "#f59e0b" : "#20d378" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              <span>{t(`${trialLeft} of ${trialTotal} left`, `متبقي ${trialLeft} من ${trialTotal}`)}</span>
              <span>{Math.round(trialPercent)}%</span>
            </div>
            <div className="value-text" style={{ marginTop: 16, fontSize: 13, color: isTrialExpiredByDate ? "#ef4444" : "rgba(255,255,255,0.55)" }}>
              {isTrialExpiredByDate
                ? t("Trial period ended", "انتهت فترة التجربة")
                : trialDaysLeft !== null
                  ? t(`Expires in ${trialDaysLeft} days — one-time only`, `ينتهي خلال ${trialDaysLeft} يوم — مرة واحدة فقط`)
                  : "—"}
            </div>
          </div>

          <div className="quota-card">
            <div className="quota-head">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Gift size={16} style={{ color: "#20d378" }} />
                {t("Owner monthly quota", "الحصة الشهرية للمالك")}
              </span>
              {!monthlyActive ? (
                <div className="status-badge warn">{t("After handover", "بعد التسليم")}</div>
              ) : (
                <div className={`status-badge ${monthlyLeft === 0 ? "warn" : "active"}`}>
                  {monthlyLeft === 0 ? t("Used up", "خلصت") : t("Active", "نشطة")}
                </div>
              )}
            </div>
            {!monthlyActive ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
                {t("Starts when the project is handed over: 30 free messages every 30 days. Paid balance is used only after they run out, and renews automatically.", "بتبدأ لحظة تسليم المشروع: 30 رسالة مجانية كل 30 يوم. الرصيد المدفوع يُستخدم بعد نفادها فقط، وتتجدد تلقائيًا.")}
              </div>
            ) : (
              <>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: monthlyPercent + "%", background: monthlyPercent >= 80 ? "#f59e0b" : "#20d378" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  <span>{t(`${monthlyLeft} of ${monthlyTotal} left`, `متبقي ${monthlyLeft} من ${monthlyTotal}`)}</span>
                  <span>{Math.round(monthlyPercent)}%</span>
                </div>
                <div className="value-text" style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                  {t(`Renews on ${fmtDate(wallet.monthly?.endsAt ?? null, language)} — no rollover`, `تتجدد في ${fmtDate(wallet.monthly?.endsAt ?? null, language)} — بدون ترحيل`)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 3. PRICING & FEATURES */}
        <div className="card-panel">
          <div className="quota-head" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BadgeCheck size={18} style={{ color: "#20d378" }} />
              {t("Pricing & features", "الأسعار والمميزات")}
            </span>
          </div>
          <table className="price-table">
            <thead>
              <tr>
                <th></th>
                <th>{t("Trial (developer)", "التجريبي (مطور)")}</th>
                <th style={{ color: "#20d378" }}>{t("Owner", "المالك")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{t("Price per OTP", "سعر رسالة OTP")}</td>
                <td>{t("Free (30 msgs)", "مجانًا (30 رسالة)")}</td>
                <td className="price-hl">{PRICE_PER_MESSAGE} {t("EGP", "ج")}</td>
              </tr>
              <tr>
                <td>{t("Free quota", "الحصة المجانية")}</td>
                <td>30 / 30 {t("days, once", "يوم، مرة واحدة")}</td>
                <td className="price-hl">30 / 30 {t("days, renewable", "يوم، متجددة")}</td>
              </tr>
              <tr>
                <td>{t("Top-up", "الشحن")}</td>
                <td>{TOPUP_MIN}–{TOPUP_MAX} {t("EGP", "ج")}</td>
                <td>{TOPUP_MIN}–{TOPUP_MAX} {t("EGP", "ج")}</td>
              </tr>
              <tr>
                <td>{t("Paid balance expiry", "انتهاء الرصيد")}</td>
                <td colSpan={2}>{t("Never expires — debt allowed up to 10 EGP", "لا ينتهي أبدًا — مديونية مسموحة حتى 10 جنيه")}</td>
              </tr>
              <tr>
                <td>{t("Deduction order", "ترتيب الخصم")}</td>
                <td colSpan={2}>{t("Trial → monthly free → paid balance → debt", "تجريبي ← شهري مجاني ← رصيد مدفوع ← مديونية")}</td>
              </tr>
            </tbody>
          </table>

          <div className="role-cols" style={{ marginTop: 28 }}>
            <div className="role-col">
              <h4><FlaskConical size={15} style={{ color: "#20d378" }} /> {t("For the developer", "للمطور")}</h4>
              <div className="feature-list">
                <div className="feature-row"><Check size={14} className="feature-check" />{t("Build & test free — 30 OTP for 30 days", "ابنِ وجرّب مجانًا — 30 رسالة لمدة 30 يوم")}</div>
                <div className="feature-row"><Check size={14} className="feature-check" />{t("Top up the project before handover if you need more tests", "اشحن المشروع قبل التسليم لو احتجت اختبارات زيادة")}</div>
                <div className="feature-row"><Check size={14} className="feature-check" />{t("Paid balance transfers fully to the owner", "الرصيد المدفوع ينتقل كاملًا للمالك")}</div>
              </div>
            </div>
            <div className="role-col">
              <h4><Gift size={15} style={{ color: "#20d378" }} /> {t("For the owner", "للمالك")}</h4>
              <div className="feature-list">
                <div className="feature-row"><Check size={14} className="feature-check" />{t("30 free OTP every 30 days, auto-renewed", "30 رسالة مجانية كل 30 يوم، تتجدد تلقائيًا")}</div>
                <div className="feature-row"><Check size={14} className="feature-check" />{t("Extra usage at 0.75 EGP per message from balance", "الاستهلاك الزائد بـ 0.75 جنيه للرسالة من الرصيد")}</div>
                <div className="feature-row"><Check size={14} className="feature-check" />{t("Top up 20–200 EGP anytime — balance never expires", "اشحن 20–200 جنيه في أي وقت — الرصيد لا ينتهي")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. LEDGER HISTORY */}
        <div className="card-panel">
          <div className="quota-head" style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <History size={18} style={{ color: "#20d378" }} />
              {t("Usage & top-up history", "سجل الاستهلاك والشحن")}
            </span>
          </div>
          {ledger.length === 0 ? (
            <div className="ledger-empty">{t("No activity yet.", "لا يوجد نشاط بعد.")}</div>
          ) : (
            ledger.map((e: any) => {
              const lbl = SOURCE_LABEL[e.source] ?? { ar: e.source, en: e.source };
              const isCredit = e.source === "topup" || e.source === "migration_credit";
              return (
                <div key={e.id} className="ledger-row">
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                      {language === "ar" ? lbl.ar : lbl.en}
                      {e.quantity > 0 && <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}> · {e.quantity} OTP</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                      {new Date(e.createdAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium" })}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isCredit ? "#20d378" : "#fff" }}>
                    {isCredit ? `+${e.amountEGP}` : e.amountEGP > 0 ? `-${e.amountEGP}` : "—"}
                    {e.amountEGP > 0 && <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}> {t("EGP", "ج")}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </>
  );
}
