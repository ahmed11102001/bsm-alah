"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Shield, Lock, Check, Loader2, CreditCard, ArrowRight, Sparkles,
  Copy, MessageCircle, Clock,
} from "lucide-react";
import { useLanguage } from "../../../../_components/LanguageProvider";

const SALES_WHATSAPP = process.env.NEXT_PUBLIC_SALES_WHATSAPP || "201281657907";
const INSTAPAY_ACCOUNT = process.env.NEXT_PUBLIC_INSTAPAY_ACCOUNT || "";
const ETISALAT_ACCOUNT = process.env.NEXT_PUBLIC_ETISALAT_CASH_ACCOUNT || "";

type PaymentMethod = "instapay" | "etisalat";

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <div className="field-input-readonly">{value || "—"}</div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
      className="copy-btn"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "تم النسخ" : "نسخ"}
    </button>
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [doneRequest, setDoneRequest] = useState<any>(null);
  const [reused, setReused] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/developers/projects/${projectId}`).then(res => res.json()),
      fetch(`/api/developers/auth/me`).then(res => res.json()),
      fetch(`/api/developers/billing/manual-request?projectId=${projectId}`).then(res => res.json()).catch(() => ({})),
    ])
      .then(([projData, devData, pendingData]) => {
        if (projData.project) setProject(projData.project);
        if (devData.developer) setDeveloper(devData.developer);
        if (pendingData?.pending) {
          setDoneRequest(pendingData.pending);
          setReused(true);
          if (pendingData.pending.paymentMethod) setPaymentMethod(pendingData.pending.paymentMethod);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  const devName = developer ? `${developer.firstName || ""} ${developer.lastName || ""}`.trim() : "";
  const devEmail = developer?.email || "";
  const methodLabel = paymentMethod === "instapay" ? "InstaPay" : "Etisalat Cash";
  const methodAccount = paymentMethod === "instapay" ? INSTAPAY_ACCOUNT : ETISALAT_ACCOUNT;

  const whatsappMessage = useMemo(() => [
    "مرحبًا Wani 👋",
    `أتممت دفع باقة الأونر لمشروع ${project?.name || ""}.`,
    `المشروع: ${project?.name || projectId}`,
    "الباقة: باقة الأونر — اشتراك شهري",
    "السعر الأصلي: 249 EGP",
    "الإجمالي المطلوب دفعه: 249 EGP",
    paymentMethod ? `طريقة الدفع: ${methodLabel}` : "",
    "سأرسل Screenshot لإيصال الدفع في هذه المحادثة.",
  ].filter(Boolean).join("\n"), [project, projectId, paymentMethod, methodLabel]);

  const confirmRequest = async () => {
    if (!paymentMethod || submitting || doneRequest) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/developers/billing/manual-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, paymentMethod }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || t("An error occurred, please try again", "حدث خطأ، حاول مرة أخرى"));
        return;
      }
      setDoneRequest(data.paymentRequest);
      setReused(!!data.reused);
    } catch {
      setSubmitError(t("Connection error", "خطأ في الاتصال"));
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#060810" }}>
        <Loader2 className="animate-spin text-[#20d378]" size={32} />
      </div>
    );
  }

  const isSubscribed = project?.plan === "OWNER_PLAN" && project?.planRenewsAt && new Date(project.planRenewsAt) > new Date();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');
        .checkout-root { min-height: 100%; background: #060810; color: #fff; font-family: 'IBM Plex Sans Arabic', sans-serif; direction: ${dir}; padding: 40px 24px; }
        .checkout-container { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 24px; }
        @media (min-width: 1024px) { .checkout-container { grid-template-columns: 3fr 2fr; align-items: start; } }
        .checkout-header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; max-width: 1000px; margin-left: auto; margin-right: auto; }
        .back-btn { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.2s; }
        .back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .card-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        .panel-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.5); margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .field-group { margin-bottom: 16px; }
        .field-label { display: block; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
        .field-input-readonly { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; color: #fff; font-size: 14px; }
        .method-grid { display: grid; gap: 12px; }
        @media (min-width: 640px) { .method-grid { grid-template-columns: 1fr 1fr; } }
        .method-card { border-radius: 14px; border: 2px solid rgba(255,255,255,0.08); padding: 16px; text-align: start; cursor: pointer; background: rgba(255,255,255,0.02); color: #fff; transition: all 0.2s; }
        .method-card.selected { border-color: #20d378; background: rgba(32,211,120,0.06); }
        .method-card:hover:not(.selected) { border-color: rgba(255,255,255,0.2); }
        .method-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .method-name { font-weight: 700; font-size: 15px; }
        .method-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); }
        .method-card.selected .method-dot { border-color: #20d378; background: #20d378; }
        .method-account { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .method-account span { font-size: 12px; color: rgba(255,255,255,0.55); word-break: break-all; }
        .copy-btn { display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 6px 10px; font-size: 12px; color: rgba(255,255,255,0.6); background: transparent; cursor: pointer; white-space: nowrap; }
        .copy-btn:hover { border-color: #20d378; color: #20d378; }
        .steps-box { background: rgba(32,211,120,0.06); border: 1px solid rgba(32,211,120,0.2); border-radius: 12px; padding: 20px; }
        .steps-box h2 { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
        .steps-box ol { display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: rgba(255,255,255,0.65); }
        .btn-pay { width: 100%; padding: 16px; background: #20d378; color: #060810; font-size: 16px; font-weight: 700; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; margin-top: 24px; box-shadow: 0 4px 20px rgba(32,211,120,0.15); }
        .btn-pay:hover:not(:disabled) { background: #1bbf6b; transform: translateY(-2px); }
        .btn-pay:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-wa { width: 100%; padding: 16px; background: #25D366; color: #fff; font-size: 16px; font-weight: 700; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 12px; }
        .btn-wa:hover { background: #1fb85a; }
        .error-box { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; padding: 12px 16px; border-radius: 10px; font-size: 14px; margin-top: 16px; }
        .pending-box { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); color: #f59e0b; padding: 16px; border-radius: 12px; font-size: 14px; margin-top: 16px; display: flex; gap: 10px; align-items: flex-start; }
        .success-box { background: rgba(32,211,120,0.08); border: 1px solid rgba(32,211,120,0.25); color: #20d378; padding: 16px; border-radius: 12px; font-size: 14px; margin-top: 16px; }
        .hint { text-align: center; font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 16px; }
        .summary-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; }
        .summary-item:last-child { border-bottom: none; }
        .trust-list { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
        .trust-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: rgba(255,255,255,0.5); }
        .trust-icon { color: #20d378; }
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
          <div>
            <div className="card-panel">
              <h2 className="panel-title">{t("Account Details", "بيانات الحساب")}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <ReadOnlyField label={t("Full Name", "الاسم الكامل")} value={devName} />
                <ReadOnlyField label={t("Email", "البريد الإلكتروني")} value={devEmail} />
              </div>
              <ReadOnlyField label={t("Project", "المشروع")} value={project?.name || ""} />
            </div>

            {isSubscribed ? (
              <div className="success-box">
                {t("This project already has an active Owner Plan.", "المشروع ده مشترك بالفعل في باقة الأونر.")}
              </div>
            ) : doneRequest ? (
              <>
                <div className="pending-box">
                  <Clock size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <b>{t("Your request is under review", "طلبك قيد المراجعة")}</b>
                    <p style={{ marginTop: 6, color: 'rgba(255,255,255,0.6)' }}>
                      {reused
                        ? t("You already have a pending request for this project.", "عندك طلب معلّق بالفعل لنفس المشروع — مش محتاج تبعت طلب جديد.")
                        : t("Your payment request was recorded. Send the receipt on WhatsApp to activate faster.", "اتسجل طلب الدفع بتاعك. ابعت إيصال الدفع على واتساب عشان التفعيل يتم أسرع.")}
                    </p>
                  </div>
                </div>
                <div className="steps-box" style={{ marginTop: 16 }}>
                  <h2>{t("Payment method", "طريقة الدفع")}: {doneRequest.paymentMethod === "etisalat" ? "Etisalat Cash" : "InstaPay"}</h2>
                  <ol>
                    <li>1. {t("Transfer", "حوّل مبلغ")} <b style={{ color: '#fff' }}>249 EGP</b> {t("to", "إلى")} <span dir="ltr">{doneRequest.paymentMethod === "etisalat" ? ETISALAT_ACCOUNT : INSTAPAY_ACCOUNT}</span></li>
                    <li>2. {t("Press the WhatsApp button below.", "اضغط زر واتساب بالأسفل.")}</li>
                    <li>3. {t("Send a screenshot of the receipt in the chat.", "ابعت Screenshot لإيصال الدفع جوه المحادثة.")}</li>
                  </ol>
                </div>
                <button className="btn-wa" onClick={openWhatsApp}>
                  <MessageCircle size={20} /> {t("Send receipt via WhatsApp", "إرسال إثبات الدفع عبر واتساب")}
                </button>
              </>
            ) : (
              <>
                <div className="card-panel">
                  <h2 className="panel-title"><CreditCard size={18} /> {t("Payment Method", "طريقة الدفع")}</h2>
                  <div className="method-grid">
                    {([["instapay", "InstaPay", INSTAPAY_ACCOUNT], ["etisalat", "Etisalat Cash", ETISALAT_ACCOUNT]] as const).map(([id, label, account]) => (
                      <button key={id} type="button" onClick={() => setPaymentMethod(id)} className={`method-card${paymentMethod === id ? " selected" : ""}`}>
                        <div className="method-top"><span className="method-name">{label}</span><span className="method-dot" /></div>
                        <div className="method-account"><span dir="ltr">{account || "—"}</span><CopyButton value={account} /></div>
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod && (
                  <div className="steps-box">
                    <h2>{t("Payment method", "طريقة الدفع")}: {methodLabel}</h2>
                    <ol>
                      <li>1. {t("Transfer", "حوّل مبلغ")} <b style={{ color: '#fff' }}>249 EGP</b> {t("to the account shown above.", "لرقم الحساب الموضح فوق.")}</li>
                      <li>2. {t("After transferring, press confirm below.", "بعد التحويل اضغط زر التأكيد بالأسفل.")}</li>
                      <li>3. {t("Then send a screenshot of the receipt on WhatsApp.", "وبعدها ابعت Screenshot لإيصال الدفع على واتساب.")}</li>
                      <li>4. {t("The plan activates after admin review.", "الباقة بتتفعل بعد مراجعة الأدمن.")}</li>
                    </ol>
                  </div>
                )}

                {submitError && <div className="error-box">{submitError}</div>}

                <button className="btn-pay" onClick={confirmRequest} disabled={!paymentMethod || submitting}>
                  {submitting ? (<><Loader2 size={20} className="animate-spin" /> {t("Processing...", "جاري تسجيل الطلب...")}</>) : (<><Lock size={18} /> {t("Confirm request — 249 EGP", "تأكيد الطلب — 249 ج")}</>)}
                </button>
                {!paymentMethod && <p className="hint">{t("Choose a payment method first", "اختر طريقة الدفع أولًا")}</p>}
                <p className="hint">{t("After sending the receipt, the payment is reviewed and the plan is activated.", "بعد إرسال الإيصال، تتم مراجعة الدفع وتفعيل الباقة من فريق WANI.")}</p>
              </>
            )}
          </div>

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
              <div className="trust-item"><Shield size={16} className="trust-icon" />{t("Manual review by WANI team", "مراجعة يدوية من فريق WANI")}</div>
              <div className="trust-item"><Check size={16} className="trust-icon" />{t("Cancel subscription at any time", "إلغاء الاشتراك في أي وقت")}</div>
              <div className="trust-item"><Sparkles size={16} className="trust-icon" />{t("Activation after receipt review", "تفعيل بعد مراجعة الإيصال")}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
