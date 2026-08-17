"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Check, ChevronDown, ChevronUp, Copy, CreditCard, Loader2, MessageCircle, Shield, Tag, X } from "lucide-react";
import { BILLING_CYCLES, canUseBillingCycle, computePrice, SUBSCRIPTION_PLANS, type BillingCycle, type PlanSlug } from "@/lib/pricing";

const SALES_WHATSAPP = process.env.NEXT_PUBLIC_SALES_WHATSAPP || "201281657907";
const INSTAPAY_ACCOUNT = process.env.NEXT_PUBLIC_INSTAPAY_ACCOUNT || "سيتم تزويدك برقم InstaPay قريبًا";
const ETISALAT_ACCOUNT = process.env.NEXT_PUBLIC_ETISALAT_CASH_ACCOUNT || "سيتم تزويدك برقم Etisalat Cash قريبًا";

type PaymentMethod = "instapay" | "etisalat";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); }} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:border-[#25D366] hover:text-[#1a9e50]">
    {copied ? <Check className="h-3.5 w-3.5 text-[#25D366]" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "تم النسخ" : "نسخ"}
  </button>;
}

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [coupon, setCoupon] = useState("");
  const [couponState, setCouponState] = useState<{ code: string; type: string; value: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [referralCredit, setReferralCredit] = useState(0);
  const [useReferralCredit, setUseReferralCredit] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showFeatures, setShowFeatures] = useState(false);

  // جلب رصيد الإحالات المتاح للمستخدم
  useState(() => {
    fetch("/api/referral/status")
      .then(res => res.json())
      .then(data => {
        if (data.isEligible && data.creditBalance > 0) {
          setReferralCredit(data.creditBalance);
        }
      })
      .catch(() => {});
  });

  const planSlug = (params.get("plan") || "pro") as PlanSlug;
  const plan = SUBSCRIPTION_PLANS[planSlug] || SUBSCRIPTION_PLANS.pro;
  const requestedCycle = (params.get("cycle") || "monthly") as BillingCycle;
  const cycleKey = canUseBillingCycle(plan.slug, requestedCycle) ? requestedCycle : "monthly";
  const cycle = BILLING_CYCLES[cycleKey];
  const monthlyPrice = computePrice(plan.monthly, cycleKey);
  const originalPrice = monthlyPrice * cycle.months;
  const discount = couponState
    ? couponState.type === "percent" ? Math.round(originalPrice * couponState.value / 100) : Math.min(couponState.value, originalPrice)
    : 0;
  
  const priceAfterCoupon = Math.max(0, originalPrice - discount);
  const appliedCredit = (useReferralCredit && referralCredit > 0) ? Math.min(referralCredit, priceAfterCoupon) : 0;
  const finalPrice = Math.max(0, priceAfterCoupon - appliedCredit);
  const remainingCredit = referralCredit - appliedCredit;

  const productName = plan.name;
  const whatsappMessage = useMemo(() => [
    "مرحبًا Wani 👋",
    `أتممت دفع اشتراك ${productName}.`,
    `الباقة: ${productName}`,
    `السعر الأصلي: ${originalPrice} EGP`,
    discount > 0 ? `خصم الكوبون: ${discount} EGP` : "",
    appliedCredit > 0 ? `رصيد الإحالات المستخدم: ${appliedCredit} EGP` : "",
    `الإجمالي المطلوب دفعه: ${finalPrice} EGP`,
    `طريقة الدفع: ${paymentMethod === "instapay" ? "InstaPay" : "Etisalat Cash"}`,
    couponState ? `الكوبون: ${couponState.code}` : "الكوبون: لا يوجد",
    "سأرسل Screenshot لإيصال الدفع في هذه المحادثة.",
  ].filter(Boolean).join("\n"), [productName, originalPrice, discount, appliedCredit, finalPrice, paymentMethod, couponState]);

  async function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true); setCouponError(""); setCouponState(null);
    try {
      const res = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, planSlug: plan.slug }) });
      const data = await res.json();
      if (!res.ok || !data.valid) setCouponError(data.error || "كود الخصم غير صحيح");
      else setCouponState({ code: data.code, type: data.discountType, value: data.discountValue });
    } catch { setCouponError("تعذر التحقق من الكوبون، حاول مرة أخرى"); }
    finally { setCouponLoading(false); }
  }

  if (status === "loading") return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#25D366]" /></div>;

  function openWhatsApp() {
    if (!paymentMethod) return;
    window.open(`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`, "_blank", "noopener,noreferrer");
  }

  return <main dir="rtl" className="min-h-screen bg-[#f7faf8] text-gray-900">
    <header className="border-b border-gray-100 bg-white px-4 py-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"><ArrowRight className="h-4 w-4" /> رجوع</button>
        <div className="font-black"><span className="text-[#25D366]">WANI</span></div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><Shield className="h-4 w-4 text-[#25D366]" /> دفع يدوي آمن</div>
      </div>
    </header>

    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center"><h1 className="text-2xl font-black sm:text-3xl">إتمام الاشتراك</h1><p className="mt-2 text-sm text-gray-500">أكمل خطوات الدفع لتفعيل باقتك</p></div>
      <div className="grid items-start gap-5 lg:grid-cols-5">
        <section className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs font-bold text-gray-400">ملخص الباقة</p>
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-black">{productName}</h2><p className="mt-1 text-xs text-gray-500">{plan.tagline}</p></div><CreditCard className="h-7 w-7 text-[#25D366]" /></div>
            <div className="space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">السعر الأصلي</span><b>{originalPrice.toLocaleString("ar-EG")} EGP</b></div>
              {discount > 0 && <div className="flex justify-between text-[#1a9e50]"><span>خصم الكوبون</span><b>- {discount.toLocaleString("ar-EG")} EGP</b></div>}
              {appliedCredit > 0 && <div className="flex justify-between text-purple-600"><span>رصيد الإحالات</span><b>- {appliedCredit.toLocaleString("ar-EG")} EGP</b></div>}
              <div className="flex justify-between border-t border-gray-200 pt-2 font-black"><span>الإجمالي المطلوب</span><b>{finalPrice.toLocaleString("ar-EG")} EGP</b></div>
            </div>
            {showFeatures && <ul className="mt-3 space-y-2">{plan.features.map((feature, i) => <li key={i} className="flex gap-2 text-xs text-gray-600"><Check className="h-3.5 w-3.5 shrink-0 text-[#25D366]" />{feature}</li>)}</ul>}
            <button onClick={() => setShowFeatures(v => !v)} className="mt-4 flex w-full items-center justify-between text-xs text-gray-500"><span>أهم مميزات الباقة</span>{showFeatures ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
          </div>
          {referralCredit > 0 && (
            <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-purple-900">🎁 رصيد الإحالات المتاح</p>
                  <p className="text-sm font-black text-purple-700 mt-0.5">{referralCredit.toLocaleString("ar-EG")} EGP</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useReferralCredit}
                    onChange={e => setUseReferralCredit(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-semibold text-purple-800">تطبيق الخصم</span>
                </label>
              </div>
              {appliedCredit > 0 && remainingCredit > 0 && (
                <p className="text-[11px] text-purple-600 mt-2">سيبقى {remainingCredit.toLocaleString("ar-EG")} EGP في رصيدك للفاتورة التالية.</p>
              )}
            </div>
          )}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-500"><Tag className="h-4 w-4" /> لديك كوبون خصم؟</div><div className="flex gap-2"><input value={coupon} onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponError(""); setCouponState(null); }} placeholder="WAN10" className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono outline-none focus:border-[#25D366]" /><button onClick={applyCoupon} disabled={!coupon.trim() || couponLoading} className="rounded-xl bg-gray-900 px-4 text-sm font-bold text-white disabled:opacity-40">{couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تطبيق"}</button></div>{couponError && <p className="mt-2 text-xs text-red-500">{couponError}</p>}{couponState && <div className="mt-2 flex items-center justify-between text-xs text-[#1a9e50]"><span>تم تطبيق الكوبون {couponState.code}</span><button onClick={() => setCouponState(null)}><X className="h-3.5 w-3.5" /></button></div>}</div>
        </section>

        <section className="space-y-5 lg:col-span-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><p className="mb-4 text-xs font-bold text-gray-400">طريقة الدفع</p><div className="grid gap-3 sm:grid-cols-2">
            {([ ["instapay", "InstaPay", INSTAPAY_ACCOUNT], ["etisalat", "Etisalat Cash", ETISALAT_ACCOUNT] ] as const).map(([id, label, account]) => <button key={id} onClick={() => setPaymentMethod(id)} className={`rounded-2xl border-2 p-4 text-right transition ${paymentMethod === id ? "border-[#25D366] bg-[#25D366]/5" : "border-gray-100 hover:border-gray-300"}`}><div className="mb-3 flex items-center justify-between"><span className="font-black">{label}</span><span className={`h-4 w-4 rounded-full border-2 ${paymentMethod === id ? "border-[#25D366] bg-[#25D366]" : "border-gray-300"}`} /></div><div className="flex items-center justify-between gap-2"><span className="break-all text-xs text-gray-500" dir="ltr">{account}</span><CopyButton value={account} /></div></button>)}
          </div></div>
          {paymentMethod && <div className="rounded-2xl border border-[#25D366]/20 bg-[#effcf4] p-5"><h2 className="mb-3 text-sm font-black">طريقة الدفع: {paymentMethod === "instapay" ? "InstaPay" : "Etisalat Cash"}</h2><ol className="space-y-2 text-sm text-gray-600"><li>1. حوّل مبلغ <b className="text-gray-900">{finalPrice.toLocaleString("ar-EG")} EGP</b>.</li><li>2. استخدم رقم الحساب الموضح في الكارت.</li><li>3. بعد التحويل اضغط زر WhatsApp بالأسفل.</li><li>4. أرسل Screenshot لإيصال الدفع داخل المحادثة.</li></ol></div>}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><p className="mb-3 text-xs font-bold text-gray-400">بيانات الحساب</p><p className="text-sm text-gray-600">{session?.user?.name || "المستخدم"}</p><p className="mt-1 text-xs text-gray-400">{session?.user?.email || ""}</p></div>
          <button onClick={openWhatsApp} disabled={!paymentMethod} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-base font-black text-white shadow-lg shadow-green-200 transition hover:bg-[#1fb85a] disabled:cursor-not-allowed disabled:opacity-40"><MessageCircle className="h-5 w-5" /> إرسال إثبات الدفع عبر WhatsApp</button>
          {!paymentMethod && <p className="text-center text-xs text-amber-600">اختر طريقة الدفع أولًا</p>}
          <p className="text-center text-xs text-gray-400">بعد إرسال الإيصال، تتم مراجعة الدفع وتفعيل الباقة يدويًا من فريق WANI.</p>
        </section>
      </div>
    </div>
  </main>;
}

export default function CheckoutPage() { return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#25D366]" /></div>}><CheckoutContent /></Suspense>; }
