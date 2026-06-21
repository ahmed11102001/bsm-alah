"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Shield, Lock, Check, ChevronDown, ChevronUp,
  Loader2, CreditCard, Tag, ArrowRight,
  Sparkles, Bot, CheckCircle2, Zap,
} from "lucide-react";
import { usePixel } from "@/hooks/usePixel";
import {
  SUBSCRIPTION_PLANS, BILLING_CYCLES, TOKEN_PACKAGES, MCP_ADDON_PACKAGES,
  computePrice,
  type PlanSlug, type BillingCycle, type TokenPackageId,
} from "@/lib/pricing";

// ─── Read-only account field — بيعرض بيانات الحساب المسجّل (مش فورم) ──────────
// الدفع بيتعمل على حساب اليوزر اللي عمل login بيه، فمفيش داعي لحقول
// قابلة للتعديل هنا — ده كان بيدي انطباع غلط إنها "مش بتكتب" لأنها أصلاً
// معندهاش state ولا بتتبعت لأي مكان.
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500">{label}</label>
      <div className="h-10 px-3 flex items-center text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700">
        {value || "—"}
      </div>
    </div>
  );
}

// ─── Main checkout ─────────────────────────────────────────────────────────────
function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { track } = usePixel();
  const { data: session } = useSession();

  // ── استنتج نوع الـ checkout من الـ URL ──
  const rawPackageId = params.get("packageId");
  const planSlug = params.get("plan") as PlanSlug | null;
  const cycleKey = (params.get("cycle") ?? "monthly") as BillingCycle;

  // ── MCP Addon purchase mode (id يبدأ بـ mcp_addon_) ──
  const mcpAddonPkg = rawPackageId?.startsWith("mcp_addon_")
    ? MCP_ADDON_PACKAGES.find(p => p.id === rawPackageId) ?? null
    : null;

  // ── Token purchase mode ──
  const tokenPkg = !mcpAddonPkg && rawPackageId
    ? TOKEN_PACKAGES.find(p => p.id === (rawPackageId as TokenPackageId)) ?? null
    : null;

  // ── Plan purchase mode ──
  const plan = planSlug && SUBSCRIPTION_PLANS[planSlug]
    ? SUBSCRIPTION_PLANS[planSlug]
    : SUBSCRIPTION_PLANS.pro;
  const cycle = BILLING_CYCLES[cycleKey] ?? BILLING_CYCLES.monthly;
  const Icon = mcpAddonPkg ? Bot : tokenPkg ? Zap : plan.icon;

  const pricePerMonth = computePrice(plan.monthly, cycleKey);
  const totalDue = mcpAddonPkg
    ? mcpAddonPkg.priceEGP
    : tokenPkg
      ? tokenPkg.priceEGP
      : pricePerMonth * cycle.months;
  const savings = !tokenPkg && !mcpAddonPkg && cycle.discount > 0
    ? Math.round(plan.monthly * cycle.discount * cycle.months)
    : 0;

  // ── UI state ──
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponData, setCouponData] = useState<{
    code: string; discountType: string; discountValue: number;
  } | null>(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cardFocused, setCardFocused] = useState(false);

  useEffect(() => {
    track("InitiateCheckout", {
      content_name: mcpAddonPkg ? mcpAddonPkg.label : tokenPkg ? tokenPkg.label : plan.name,
      content_ids: [mcpAddonPkg ? mcpAddonPkg.id : tokenPkg ? tokenPkg.id : plan.slug],
      content_type: "product",
      value: totalDue,
      currency: "EGP",
      num_items: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCardFocus = () => {
    if (cardFocused) return;
    setCardFocused(true);
    track("AddPaymentInfo", {
      content_name: mcpAddonPkg ? mcpAddonPkg.label : tokenPkg ? tokenPkg.label : plan.name,
      value: finalTotal,
      currency: "EGP",
    });
  };

  const applyCoupon = async () => {
    const trimmed = coupon.trim().toUpperCase();
    if (!trimmed) return;
    setValidatingCoupon(true);
    setCouponError("");
    setCouponApplied(false);
    setCouponData(null);

    const planSlug: string | undefined =
      !tokenPkg && !mcpAddonPkg ? plan.slug : undefined;

    const res = await fetch("/api/coupon/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: trimmed, planSlug }),
    });
    const data = await res.json();
    setValidatingCoupon(false);

    if (data.valid) {
      setCouponApplied(true);
      setCouponData({ code: data.code, discountType: data.discountType, discountValue: data.discountValue });
    } else {
      setCouponError(data.error ?? "كود الخصم غير صحيح");
    }
  };

  const couponDiscount = couponApplied && couponData
    ? couponData.discountType === "percent"
      ? Math.round(totalDue * couponData.discountValue / 100)
      : Math.min(couponData.discountValue, totalDue)
    : 0;
  const finalTotal = totalDue - couponDiscount;

  const [payError, setPayError] = useState("");

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaying(true);
    setPayError("");

    // ── تحديد نوع ومعطيات العملية ──────────────────────────────────────────
    let body: Record<string, string>;

    if (mcpAddonPkg) {
      body = { type: "mcp_addon", packageId: mcpAddonPkg.id };
    } else if (tokenPkg) {
      body = { type: "ai_credits", packageId: tokenPkg.id };
    } else {
      body = { type: "subscription", planSlug: plan.slug, cycle: cycleKey };
    }

    // لو فيه كوبون أضفه للـ body
    if (couponApplied && couponData) {
      body.couponCode = couponData.code;
    }

    // ── طلب إنشاء الفاتورة على فواتيرك ──────────────────────────────────────
    const res = await fetch("/api/payment/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.checkoutUrl) {
      setPayError(data.error ?? "حدث خطأ، حاول مرة أخرى");
      setPaying(false);
      return;
    }

    // ── سجّل الكوبون قبل التوجيه ─────────────────────────────────────────────
    if (couponApplied && couponData) {
      await fetch("/api/coupon/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponData.code }),
      }).catch(() => { });
    }

    // ── Pixel tracking ────────────────────────────────────────────────────────
    track("Purchase", {
      content_name: mcpAddonPkg ? mcpAddonPkg.label : tokenPkg ? tokenPkg.label : plan.name,
      content_ids: [mcpAddonPkg ? mcpAddonPkg.id : tokenPkg ? tokenPkg.id : plan.slug],
      content_type: "product",
      value: finalTotal,
      currency: "EGP",
      num_items: 1,
    });

    // ── توجيه اليوزر لصفحة الدفع على فواتيرك ────────────────────────────────
    window.location.href = data.checkoutUrl;
  };

  // ── Success screen ──
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-[#25D366]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">تم الدفع بنجاح! 🎉</h2>
          <p className="text-gray-500 text-sm">
            {mcpAddonPkg
              ? `تمت إضافة أوامر Claude غير محدودة لحسابك لمدة شهر`
              : tokenPkg
                ? `تمت إضافة ${tokenPkg.tokens.toLocaleString("ar-EG")} توكن لحسابك`
                : `جاري تفعيل باقة ${plan.name}…`}
          </p>
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 mb-3">ملخص الطلب</p>

            {/* Product header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${mcpAddonPkg ? "bg-orange-50" : tokenPkg ? "bg-purple-50" : "bg-green-50"}`}>
                <Icon className={`w-5 h-5 ${mcpAddonPkg ? "text-orange-500" : tokenPkg ? "text-purple-500" : "text-[#25D366]"}`} />
              </div>
              <div>
                <p className="font-bold text-gray-900">
                  {mcpAddonPkg ? mcpAddonPkg.label : tokenPkg ? tokenPkg.label : plan.name}
                </p>
                <p className="text-xs text-gray-400">
                  {mcpAddonPkg
                    ? mcpAddonPkg.description
                    : tokenPkg
                      ? `${tokenPkg.tokens.toLocaleString("ar-EG")} توكن — ${tokenPkg.description}`
                      : plan.tagline}
                </p>
              </div>
            </div>

            {/* MCP Addon: one-time badge */}
            {mcpAddonPkg && (
              <div className="flex items-center gap-1.5 mb-3 text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                <Bot className="w-3.5 h-3.5" />
                دفعة واحدة — تُفعَّل فوراً لمدة شهر كامل
              </div>
            )}

            {/* Token pack: one-time badge */}
            {tokenPkg && !mcpAddonPkg && (
              <div className="flex items-center gap-1.5 mb-3 text-xs text-purple-600 bg-purple-50 rounded-lg px-3 py-2">
                <Zap className="w-3.5 h-3.5" />
                دفعة واحدة — تُضاف فوراً لرصيد التوكن
              </div>
            )}

            {/* Plan: cycle selector */}
            {!tokenPkg && !mcpAddonPkg && (
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">دورة الفوترة</span>
                <span className="font-semibold text-gray-800">{cycle.label}</span>
              </div>
            )}

            {/* Price breakdown */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm mt-3">
              {!tokenPkg && !mcpAddonPkg && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{pricePerMonth.toLocaleString("ar-EG")} ج × {cycle.months} شهر</span>
                  <span className="text-gray-700 font-medium">{totalDue.toLocaleString("ar-EG")} ج</span>
                </div>
              )}
              {tokenPkg && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{tokenPkg.label}</span>
                  <span className="text-gray-700 font-medium">{tokenPkg.priceEGP} ج</span>
                </div>
              )}
              {mcpAddonPkg && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Claude غير محدود ∞ — شهر</span>
                  <span className="text-gray-700 font-medium">{mcpAddonPkg.priceEGP} ج</span>
                </div>
              )}
              {savings > 0 && (
                <div className="flex justify-between text-[#1a9e50]">
                  <span>خصم {Math.round(cycle.discount * 100)}%</span>
                  <span>- {savings.toLocaleString("ar-EG")} ج</span>
                </div>
              )}
              {couponApplied && couponData && (
                <div className="flex justify-between text-blue-600">
                  <span>كود {couponData.code}</span>
                  <span>- {couponDiscount.toLocaleString("ar-EG")} ج</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                <span>الإجمالي</span>
                <span>{finalTotal.toLocaleString("ar-EG")} ج</span>
              </div>
            </div>

            {/* Plan features toggle */}
            {!tokenPkg && !mcpAddonPkg && (
              <>
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
              </>
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
                onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponError(""); setCouponApplied(false); setCouponData(null); }}
                placeholder="SAVE-A3F9K"
                className="flex-1 h-9 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-all placeholder-gray-300 font-mono"
              />
              <button
                onClick={applyCoupon}
                disabled={!coupon.trim() || validatingCoupon}
                className="h-9 px-4 text-sm font-semibold rounded-xl bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-30 transition-all flex items-center gap-1.5"
              >
                {validatingCoupon && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                تطبيق
              </button>
            </div>
            {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
            {couponApplied && couponData && (
              <p className="text-xs text-[#1a9e50] mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3" />
                تم تطبيق خصم {couponData.discountType === "percent" ? `${couponData.discountValue}%` : `${couponData.discountValue} ج`}
              </p>
            )}
          </div>

          {/* Trust signals */}
          <div className="flex flex-col gap-2">
            {[
              { icon: Shield, text: "دفع آمن ومشفر بـ SSL 256-bit" },
              { icon: Check, text: "إلغاء الاشتراك في أي وقت" },
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
              <ReadOnlyField label="الاسم الكامل" value={session?.user?.name ?? ""} />
              <ReadOnlyField label="البريد الإلكتروني" value={session?.user?.email ?? ""} />
            </div>
          </div>

          {/* Payment info — Fawaterak redirect */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> طريقة الدفع
              </p>
              <span className="text-[10px] font-bold text-gray-400 border border-gray-200 rounded-md px-2 py-0.5">
                Powered by Fawaterak
              </span>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600 space-y-3">
              <p className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#25D366] flex-shrink-0" />
                ستُحوَّل إلى صفحة الدفع الآمنة على منصة فواتيرك لإتمام الدفع.
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                {["Visa", "MasterCard", "Meeza", "Fawry", "محافظ إلكترونية"].map(m => (
                  <span key={m} className="bg-white border border-gray-200 rounded-md px-2 py-0.5 font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Error message */}
          {payError && (
            <div className="rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">
              {payError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={paying}
            className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20bb5a] text-white font-bold text-base transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-green-200"
          >
            {paying ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> جاري المعالجة…</>
            ) : (
              <><Lock className="w-4 h-4" /> انتقل للدفع — {finalTotal.toLocaleString("ar-EG")} ج</>
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