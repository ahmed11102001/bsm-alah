import { Check, Minus, Sparkles, Zap, ArrowLeft, Shield } from 'lucide-react';

// ─── Plan data ────────────────────────────────────────────────────────────────
const plans = [
  {
    id:       "free",
    badge:    null,
    name:     "مجاني",
    tagline:  "جرّب بدون أي التزام",
    price:    0,
    period:   null,
    cta:      "ابدأ مجاناً",
    ctaStyle: "border border-gray-300 text-gray-700 hover:border-[#25D366] hover:text-[#25D366]",
    card:     "bg-white border border-gray-200",
    highlight: false,
    features: [
      { text: "١٠٠ جهة اتصال",          ok: true },
      { text: "١ مستخدم",                ok: true },
      { text: "٣ حملات فقط",             ok: true },
      { text: "صندوق الوارد النصي",      ok: true },
      { text: "تقارير أساسية",           ok: true },
      { text: "حملات مجدولة",            ok: false },
      { text: "أعضاء فريق",              ok: false },
      { text: "جماهير مخصصة",            ok: false },
      { text: "تقارير متقدمة",           ok: false },
      { text: "أتمتة الردود الذكية ",    ok: false },
    ],
  },
  {
    id:       "starter",
    badge:    null,
    name:     "Starter",
    tagline:  "للمشاريع الناشئة والعمل الفردي",
    price:    249,
    period:   "شهر",
    cta:      "ابدأ الآن",
    ctaStyle: "border border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white",
    card:     "bg-white border border-gray-200",
    highlight: false,
    features: [
      { text: "٢٬٠٠٠ جهة اتصال",        ok: true },
      { text: "٢ مستخدمين",              ok: true },
      { text: "٥٠ حملة شهرياً",         ok: true },
      { text: "نص + صور + ملفات",       ok: true },
      { text: "حملات مجدولة",           ok: true },
      { text: "تقارير أساسية",          ok: true },
      { text: "أعضاء فريق إضافيين",    ok: false },
      { text: "جماهير مخصصة",          ok: false },
      { text: "تقارير متقدمة",         ok: false },
      { text: "أتمتة الردود الذكية ",  ok: false },
    ],
  },
  {
    id:       "pro",
    badge:    "الأكثر اختياراً",
    name:     "Professional",
    tagline:  "للمتاجر والشركات الجادة",
    price:    499,
    period:   "شهر",
    cta:      "ابدأ الآن",
    ctaStyle: "bg-[#25D366] text-white hover:bg-[#20bb5a]",
    card:     "bg-white border-2 border-[#25D366] shadow-xl shadow-green-100/50",
    highlight: true,
    features: [
      { text: "١٥٬٠٠٠ جهة اتصال",       ok: true },
      { text: "حتى ٥ مستخدمين",          ok: true },
      { text: "حملات غير محدودة",        ok: true },
      { text: "كل أنواع الميديا",        ok: true },
      { text: "حملات مجدولة",            ok: true },
      { text: "جماهير مخصصة + VIP",      ok: true },
      { text: "تقارير متقدمة + Export",  ok: true },
      { text: "تقارير أداء الفريق",      ok: true },
      { text: "صلاحيات متدرجة",         ok: true },
      { text: "أتمتة الردود الذكية ",    ok: true },
    ],
  },
  {
    id:       "enterprise",
    badge:    null,
    name:     "Enterprise",
    tagline:  "للشركات الكبيرة والمؤسسات",
    price:    999,
    period:   "شهر",
    cta:      "تواصل معنا",
    ctaStyle: "border border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white",
    card:     "bg-gray-950 border border-gray-800",
    highlight: false,
    dark:     true,
    features: [
      { text: "جهات اتصال غير محدودة",   ok: true },
      { text: "مستخدمون غير محدودون",    ok: true },
      { text: "حملات غير محدودة",        ok: true },
      { text: "API Access كامل",          ok: true },
      { text: "قاعدة بيانات مخصصة",      ok: true },
      { text: "Webhook مركزي",            ok: true },
      { text: "دعم VIP مباشر ٢٤/٧",      ok: true },
      { text: "Onboarding مخصص",         ok: true },
      { text: "SLA ضمان ٩٩.٩%",          ok: true },
      { text: "أتمتة الردود الذكية ",    ok: true },
    ],
  },
];

// ─── Annual saving helper ─────────────────────────────────────────────────────
const annualSaving = (price: number) =>
  price > 0 ? Math.round(price * 12 * 0.2) : 0;

// ─── Component ────────────────────────────────────────────────────────────────
export default function Pricing() {

  return (
    <section id="pricing" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#25D366]" />
            <span className="text-[#25D366] text-sm font-medium">خطط الأسعار</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            ادفع على قد ما تحتاج —{" "}
            <span className="text-gradient">وكبّر وقت ما تكبر</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
            ابدأ مجاناً بدون بطاقة ائتمان. الترقية سهلة في أي وقت.
          </p>

          {/* Annual toggle note */}
          <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-full px-4 py-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-amber-700 text-xs font-medium">
              وفّر ٢٠٪ مع الاشتراك السنوي
            </span>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 flex flex-col gap-5 transition-all duration-200
                hover:-translate-y-1 hover:shadow-xl ${plan.card}`}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-[#25D366] text-white text-[11px] font-bold px-4 py-1 rounded-full whitespace-nowrap shadow-lg shadow-green-200">
                    ⭐ {plan.badge}
                  </span>
                </div>
              )}

              {/* Name + tagline */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1
                  ${plan.dark ? "text-gray-400" : "text-gray-400"}`}>
                  {plan.name}
                </p>
                <p className={`text-sm leading-snug
                  ${plan.dark ? "text-gray-300" : "text-gray-600"}`}>
                  {plan.tagline}
                </p>
              </div>

              {/* Price */}
              <div>
                {plan.price === 0 ? (
                  <p className={`text-4xl font-black ${plan.dark ? "text-white" : "text-gray-900"}`}>
                    مجاني
                  </p>
                ) : (
                  <div className="flex items-end gap-1.5">
                    <span className={`text-4xl font-black ${plan.dark ? "text-white" : "text-gray-900"}`}>
                      {plan.price.toLocaleString("ar-EG")}
                    </span>
                    <span className={`text-sm mb-1.5 ${plan.dark ? "text-gray-400" : "text-gray-400"}`}>
                      ج / {plan.period}
                    </span>
                  </div>
                )}
                {plan.price > 0 && (
                  <p className="text-[11px] text-[#25D366] mt-0.5 font-medium">
                    وفّر {annualSaving(plan.price).toLocaleString("ar-EG")} ج سنوياً
                  </p>
                )}
              </div>

              {/* CTA */}
              <a
                href="#"
                className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all
                  flex items-center justify-center gap-1.5 ${plan.ctaStyle}`}
              >
                {plan.cta}
                <ArrowLeft className="w-3.5 h-3.5" />
              </a>

              {/* Divider */}
              <div className={`h-px ${plan.dark ? "bg-gray-800" : "bg-gray-100"}`} />

              {/* Features */}
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    {f.ok ? (
                      <Check className={`w-4 h-4 flex-shrink-0 ${
                        plan.highlight ? "text-[#25D366]" :
                        plan.dark      ? "text-green-400" :
                                         "text-gray-500"
                      }`} />
                    ) : (
                      <Minus className="w-4 h-4 flex-shrink-0 text-gray-300" />
                    )}
                    <span className={`text-sm ${
                      !f.ok        ? "text-gray-300" :
                      plan.dark    ? "text-gray-200" :
                                     "text-gray-700"
                    }`}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Guarantee strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {[
            { icon: <Shield className="w-4 h-4 text-[#25D366]" />, text: "بدون بطاقة ائتمان للباقة المجانية" },
            { icon: <Check className="w-4 h-4 text-[#25D366]" />,  text: "إلغاء في أي وقت بدون رسوم" },
            { icon: <Zap className="w-4 h-4 text-[#25D366]" />,    text: "ترقية فورية وبدون انقطاع" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
              {item.icon}
              {item.text}
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-400">
            عندك متطلبات خاصة؟{" "}
            <a href="#" className="text-[#25D366] font-semibold hover:underline">
              تواصل معنا للحصول على عرض مخصص
            </a>
          </p>
        </div>

      </div>
    </section>
  );
}