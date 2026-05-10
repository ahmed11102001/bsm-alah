"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Shield, Lock, Check, ChevronDown, ChevronUp,
  Loader2, CreditCard, Tag, ArrowRight,
  Sparkles, Bot, Store, Brain, CheckCircle2,
} from "lucide-react";
import { usePixel } from "@/hooks/usePixel";

// ─── Plan config (must match Pricing) ────────────────────────────────────────
const PLANS: Record<string, {
  name: string; tagline: string; color: string; icon: any;
  monthly: number; features: string[];
}> = {
  starter: {
    name: "Starter", tagline: "للمشاريع الناشئة", color: "text-gray-700",
    icon: Bot, monthly: 249,
    features: ["٢٬٠٠٠ جهة اتصال", "٢ مستخدمين", "Chatbot بردود ثابتة", "٥٠ حملة شهرياً"],
  },
  professional: {
    name: "Professional", tagline: "للمتاجر والشركات الجادة", color: "text-[#25D366]",
    icon: Store, monthly: 499,
    features: ["٢٠٬٠٠٠ جهة اتصال", "٥ مستخدمين", "ربط متجر + أتمتة", "حملات غير محدودة"],
  },
  enterprise: {
    name: "Enterprise", tagline: "للشركات الكبيرة", color: "text-purple-600",
    icon: Brain, monthly: 850,
    features: ["جهات اتصال غير محدودة", "مستخدمون غير محدودون", "AI Sales Assistant", "قاعدة بيانات مخصصة"],
  },
};

const CYCLES: Record<string, { label: string; months: number; discount: number }> = {
  monthly:   { label: "شهري",     months: 1,  discount: 0    },
  quarterly: { label: "ربع سنوي", months: 3,  discount: 0.15 },
  annual:    { label: "سنوي",     months: 12, discount: 0.25 },
};

function computePrice(monthly: number, cycle: string) {
  const c = CYCLES[cycle] ?? CYCLES.monthly;
  return Math.round(monthly * (1 - c.discount));
}

// ─── PayMob mock card field ───────────────────────────────────────────────────
function CardField({ label, placeholder, type = "text", maxLength }: {
  label: string; placeholder: string; type?: string; maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500">{label}</label>
      <input
        type={type} placeholder={placeholder} maxLength={maxLength}
        className="h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-all placeholder-gray-400"
      />
    </div>
  );
}

// ─── Main checkout component ──────────────────────────────────────────────────
function CheckoutContent() {
  const params  = useSearchParams();
  const router  = useRouter();

  const planSlug = params.get("plan") ?? "professional";
  const cycleKey = params.get("cycle") ?? "monthly";

  const plan  = PLANS[planSlug] ?? PLANS.professional;
  const cycle = CYCLES[cycleKey] ?? CYCLES.monthly;
  const Icon  = plan.icon;

  const pricePerMonth = computePrice(plan.monthly, cycleKey);
  const totalDue      = pricePerMonth * cycle.months;
  const savings       = cycle.discount > 0
    ? Math.round(plan.monthly * cycle.discount * cycle.months)
    : 0;

  const [coupon,        setCoupon]        = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError,   setCouponError]   = useState("");
  const [showFeatures,  setShowFeatures]  = useState(false);
  const [paying,        setPaying]        = useState(false);
  const [success,       setSuccess]       = useState(false);
  const [cardFocused,   setCardFocused]   = useState(false);

  const { track } = usePixel();

  // ── InitiateCheckout عند دخول الصفحة ──
  useEffect(() => {
    track("InitiateCheckout", {
      content_name: plan.name,
      content_ids:  [planSlug],
      content_type: "product",
      value:        totalDue,
      currency:     "EGP",
      num_items:    1,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── AddPaymentInfo عند أول focus على البطاقة ──
  const handleCardFocus = () => {
    if (cardFocused) return;
    setCardFocused(true);
    track("AddPaymentInfo", {
      content_name: plan.name,
      value:        finalTotal,
      currency:     "EGP",
    });
  };
  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() === "WHATSPRO20") {
      setCouponApplied(true); setCouponError("");
    } else {
      setCouponError("كود الخصم غير صحيح أو منتهي"); setCouponApplied(false);
    }
  };

  const couponDiscount = couponApplied ? Math.round(totalDue * 0.1) : 0;
  const finalTotal     = totalDue - couponDiscount;

  // ── fake payment submit ──
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaying(true);
    // TODO: استبدل بـ PayMob iframe/API call هنا
    await new Promise(r => setTimeout(r, 2000));
    track("Purchase", {
      content_name: plan.name,
      content_ids:  [planSlug],
      content_type: "product",
      value:        finalTotal,
      currency:     "EGP",
      num_items:    1,
    });
    setPaying(false);
    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 2500);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-[#25D366]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">تم الدفع بنجاح! 🎉</h2>
          <p className="text-gray-500 text-sm">جاري تفعيل باقة {plan.name}…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between max-w-5xl mx-auto">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> رجوع
        </button>
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <span className="text-[#25D366]">واتس</span> برو
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Lock className="w-3.5 h-3.5" /> دفع آمن بـ SSL
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ══ Right: Order Summary ══ */}
        <div className="lg:col-span-2 space-y-4">

          {/* Plan card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 mb-3">ملخص الطلب</p>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[#25D366]" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{plan.name}</p>
                <p className="text-xs text-gray-400">{plan.tagline}</p>
              </div>
            </div>

            {/* Cycle */}
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">دورة الفوترة</span>
              <span className="font-semibold text-gray-800">{cycle.label}</span>
            </div>

            {/* Price breakdown */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm mt-3">
              <div className="flex justify-between">
                <span className="text-gray-500">{pricePerMonth.toLocaleString("ar-EG")} ج × {cycle.months} شهر</span>
                <span className="text-gray-700 font-medium">{totalDue.toLocaleString("ar-EG")} ج</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-[#1a9e50]">
                  <span>خصم {Math.round(cycle.discount * 100)}%</span>
                  <span>- {savings.toLocaleString("ar-EG")} ج</span>
                </div>
              )}
              {couponApplied && (
                <div className="flex justify-between text-blue-600">
                  <span>كود WHATSPRO20</span>
                  <span>- {couponDiscount.toLocaleString("ar-EG")} ج</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                <span>الإجمالي</span>
                <span>{finalTotal.toLocaleString("ar-EG")} ج</span>
              </div>
            </div>

            {/* Features toggle */}
            <button
              onClick={() => setShowFeatures(v => !v)}
              className="w-full flex items-center justify-between mt-3 text-xs text-gray-400 hover:text-gray-600 transition"
            >
              <span>ما المضمون في الباقة؟</span>
              {showFeatures ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showFeatures && (
              <ul className="mt-2 space-y-1.5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <Check className="w-3.5 h-3.5 text-[#25D366] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Coupon */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> كود خصم
            </p>
            <div className="flex gap-2">
              <input
                value={coupon}
                onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponError(""); setCouponApplied(false); }}
                placeholder="WHATSPRO20"
                className="flex-1 h-9 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-all placeholder-gray-300 font-mono"
              />
              <button
                onClick={applyCoupon}
                disabled={!coupon.trim()}
                className="h-9 px-4 text-sm font-semibold rounded-xl bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-30 transition-all"
              >
                تطبيق
              </button>
            </div>
            {couponError   && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
            {couponApplied && <p className="text-xs text-[#1a9e50] mt-1.5 flex items-center gap-1"><Check className="w-3 h-3" /> تم تطبيق خصم 10%</p>}
          </div>

          {/* Trust signals */}
          <div className="flex flex-col gap-2">
            {[
              { icon: Shield,   text: "دفع آمن ومشفر بـ SSL 256-bit" },
              { icon: Check,    text: "إلغاء الاشتراك في أي وقت" },
              { icon: Sparkles, text: "تفعيل فوري بعد الدفع" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                <item.icon className="w-3.5 h-3.5 text-[#25D366] flex-shrink-0" />
                {item.text}
              </div>
            ))}
          </div>
        </div>

        {/* ══ Left: Payment Form ══ */}
        <form onSubmit={handlePay} className="lg:col-span-3 space-y-4">

          {/* Personal info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 mb-4">بيانات الحساب</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CardField label="الاسم الكامل"  placeholder="أحمد محمد" />
              <CardField label="البريد الإلكتروني" placeholder="ahmed@example.com" type="email" />
            </div>
          </div>

          {/* Card info — PayMob placeholder ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> بيانات البطاقة
              </p>
              {/* PayMob logo placeholder */}
              <span className="text-[10px] font-bold text-gray-400 border border-gray-200 rounded-md px-2 py-0.5">
                Powered by PayMob
              </span>
            </div>

            {/* TODO: استبدل بـ PayMob iFrame بعد ما تجيب الـ API Keys */}
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">رقم البطاقة</label>
                <input
                  type="text" placeholder="•••• •••• •••• ••••" maxLength={19}
                  onFocus={handleCardFocus}
                  className="h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-all placeholder-gray-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CardField label="تاريخ الانتهاء" placeholder="MM / YY" maxLength={5} />
                <CardField label="CVV" placeholder="•••" type="password" maxLength={4} />
              </div>
              <CardField label="الاسم على البطاقة" placeholder="AHMED MOHAMED" />
            </div>

            {/* PayMob iframe سيُضاف هنا */}
            {/* <iframe src={payMobIframeUrl} className="w-full h-[400px] border-0" /> */}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={paying}
            className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20bb5a] text-white font-bold text-base transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-green-200"
          >
            {paying ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> جاري المعالجة…</>
            ) : (
              <><Lock className="w-4 h-4" /> ادفع {finalTotal.toLocaleString("ar-EG")} ج الآن</>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            بالضغط على زر الدفع توافق على{" "}
            <a href="/terms" className="underline hover:text-gray-600">شروط الاستخدام</a>
            {" "}و{" "}
            <a href="/privacy" className="underline hover:text-gray-600">سياسة الخصوصية</a>
          </p>
        </form>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}