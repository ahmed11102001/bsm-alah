import { Check, Minus, Sparkles, Zap, ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import { t, tr, type Lang } from "@/lib/translations";

const PLAN_STYLES = [
  { ctaStyle: "border border-gray-300 text-gray-700 hover:border-[#25D366] hover:text-[#25D366]", card: "bg-white border border-gray-200",                           highlight: false, dark: false },
  { ctaStyle: "border border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white",          card: "bg-white border border-gray-200",                           highlight: false, dark: false },
  { ctaStyle: "bg-[#25D366] text-white hover:bg-[#20bb5a]",                                       card: "bg-white border-2 border-[#25D366] shadow-xl shadow-green-100/50", highlight: true,  dark: false },
  { ctaStyle: "border border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white",          card: "bg-gray-950 border border-gray-800",                        highlight: false, dark: true  },
];

const annualSaving = (price: number) => price > 0 ? Math.round(price * 12 * 0.2) : 0;

const PRICES = [0, 249, 499, 999];

interface PricingProps { lang: Lang }

export default function Pricing({ lang }: PricingProps) {
  const isAr = lang === "ar";
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const plans = t.pricing.plans;

  return (
    <section id="pricing" className="py-20 lg:py-32 bg-white" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#25D366]" />
            <span className="text-[#25D366] text-sm font-medium">{tr(t.pricing.badge, lang)}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {tr(t.pricing.h2a, lang)}{" "}
            <span className="text-gradient">{tr(t.pricing.h2b, lang)}</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">{tr(t.pricing.subtitle, lang)}</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-full px-4 py-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-700 text-xs font-semibold">{tr(t.pricing.saveBadge, lang)}</span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan, i) => {
            const s     = PLAN_STYLES[i];
            const price = PRICES[i];
            return (
              <div key={i} className={`relative rounded-2xl p-6 flex flex-col gap-5 ${s.card}`}>

                {/* Popular badge */}
                {"badge" in plan && plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#25D366] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                      {tr(plan.badge as { ar: string; en: string }, lang)}
                    </span>
                  </div>
                )}

                {/* Name & tagline */}
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${s.dark ? "text-gray-400" : "text-gray-400"}`}>
                    {tr(plan.name as { ar: string; en: string }, lang)}
                  </p>
                  <p className={`text-sm leading-snug ${s.dark ? "text-gray-300" : "text-gray-600"}`}>
                    {tr(plan.tagline, lang)}
                  </p>
                </div>

                {/* Price */}
                <div>
                  {price === 0 ? (
                    <p className={`text-4xl font-black ${s.dark ? "text-white" : "text-gray-900"}`}>
                      {tr(t.pricing.free, lang)}
                    </p>
                  ) : (
                    <div className="flex items-end gap-1.5">
                      <span className={`text-4xl font-black ${s.dark ? "text-white" : "text-gray-900"}`}>
                        {price.toLocaleString("ar-EG")}
                      </span>
                      <span className={`text-sm mb-1.5 ${s.dark ? "text-gray-400" : "text-gray-400"}`}>
                        {tr(t.pricing.currency, lang)}
                      </span>
                    </div>
                  )}
                  {price > 0 && (
                    <p className="text-[11px] text-[#1a9e50] mt-0.5 font-semibold">
                      {tr(t.pricing.annualSave, lang)} {annualSaving(price).toLocaleString("ar-EG")} {tr(t.pricing.annualSaveSuffix, lang)}
                    </p>
                  )}
                </div>

                {/* CTA */}
                <a href="#" className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all flex items-center justify-center gap-1.5 ${s.ctaStyle}`}>
                  {tr(plan.cta, lang)}
                  <ArrowIcon className="w-3.5 h-3.5" />
                </a>

                {/* Divider */}
                <div className={`h-px ${s.dark ? "bg-gray-800" : "bg-gray-100"}`} />

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f, fi) => {
                    // الـ features الأولى ok=true والباقي ok=false حسب كل plan
                    const okCount = i === 0 ? 5 : i === 1 ? 6 : i === 2 ? 10 : 10;
                    const ok = fi < okCount;
                    return (
                      <li key={fi} className="flex items-center gap-2.5">
                        {ok ? (
                          <Check className={`w-4 h-4 flex-shrink-0 ${s.highlight ? "text-[#25D366]" : s.dark ? "text-green-400" : "text-gray-500"}`} />
                        ) : (
                          <Minus className="w-4 h-4 flex-shrink-0 text-gray-300" />
                        )}
                        <span className={`text-sm ${!ok ? "text-gray-300" : s.dark ? "text-gray-200" : "text-gray-700"}`}>
                          {tr(f as { ar: string; en: string }, lang)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Guarantee strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {[
            { icon: <Shield className="w-4 h-4 text-[#25D366]" />, text: tr(t.pricing.guar1, lang) },
            { icon: <Check  className="w-4 h-4 text-[#25D366]" />, text: tr(t.pricing.guar2, lang) },
            { icon: <Zap    className="w-4 h-4 text-[#25D366]" />, text: tr(t.pricing.guar3, lang) },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
              {item.icon}
              {item.text}
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-400">
            {tr(t.pricing.enterprise, lang)}{" "}
            <a href="#" className="text-[#25D366] font-semibold hover:underline">
              {tr(t.pricing.enterpriseLink, lang)}
            </a>
          </p>
        </div>

      </div>
    </section>
  );
}