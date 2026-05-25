"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Sparkles, Zap, Shield, Bot, Store, Brain } from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";
import { usePixel } from "@/hooks/usePixel";

// ─── config ──────────────────────────────────────────────────────────────────
const BASE_PRICES = [0, 249, 499, 1199];
const ENTERPRISE_OFFER = 999;

const CYCLES = [
  { key: "monthly",   label: { ar: "شهري",        en: "Monthly"   }, discount: 0    },
  { key: "quarterly", label: { ar: "ربع سنوي",    en: "Quarterly" }, discount: 0.15 },
  { key: "annual",    label: { ar: "سنوي",         en: "Annual"    }, discount: 0.25 },
] as const;
type Cycle = typeof CYCLES[number]["key"];

const PLAN_STYLES = [
  // Free — pink soft
  { card: "bg-rose-50 border border-rose-200", accent: "text-rose-500", iconBg: "bg-rose-100", dark: false, highlight: false, cta: "border border-rose-300 text-rose-600 hover:border-rose-500 hover:text-rose-800" },
  // Starter — أزرق سماوي
  { card: "bg-sky-50 border border-sky-200",     accent: "text-sky-600",   iconBg: "bg-sky-100",   dark: false, highlight: false, cta: "border-2 border-sky-500 text-sky-700 hover:bg-sky-500 hover:text-white" },
  // Pro — أخضر (البراند) مع highlight
  { card: "bg-white border-2 border-[#25D366] shadow-xl shadow-green-100/50", accent: "text-[#25D366]", iconBg: "bg-green-50", dark: false, highlight: true, cta: "bg-[#25D366] text-white hover:bg-[#20bb5a]" },
  // Enterprise — داكن ذهبي
  { card: "bg-gray-950 border border-amber-700/50", accent: "text-amber-400", iconBg: "bg-amber-900/30", dark: true, highlight: false, cta: "bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-900 font-bold hover:from-amber-400 hover:to-yellow-300" },
];

// أيقونة مميزة لكل plan
const PLAN_ICONS = [Sparkles, Bot, Store, Brain];

function computePrice(base: number, cycle: Cycle) {
  const disc = CYCLES.find(c => c.key === cycle)!.discount;
  return Math.round(base * (1 - disc));
}

function annualTotal(base: number, cycle: Cycle) {
  const months = cycle === "monthly" ? 1 : cycle === "quarterly" ? 3 : 12;
  return computePrice(base, cycle) * months;
}

interface PricingProps { lang: Lang }

export default function Pricing({ lang }: PricingProps) {
  const isAr   = lang === "ar";
  const router = useRouter();
  const { track } = usePixel();
  const plans  = t.pricing.plans;

  const [cycle, setCycle] = useState<Cycle>("monthly");

  // track ViewContent عند أول render للـ Pricing section
  useEffect(() => { track("ViewContent", { content_name: "Pricing Section" }); }, []);

  const handleCTA = (slug: string, isFree: boolean, price: number) => {
    if (isFree) {
      track("CompleteRegistration", { content_name: "Free Plan" });
      router.push("/register");
      return;
    }
    track("InitiateCheckout", {
      content_name: slug,
      content_ids:  [slug],
      content_type: "product",
      value:        price,
      currency:     "EGP",
      num_items:    1,
    });
    router.push(`/checkout?plan=${slug}&cycle=${cycle}`);
  };

  return (
    <section id="pricing" className="py-20 lg:py-32 bg-white" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#25D366]" />
            <span className="text-[#25D366] text-sm font-medium">{tr(t.pricing.badge, lang)}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            {tr(t.pricing.h2a, lang)}{" "}
            <span className="text-gradient">{tr(t.pricing.h2b, lang)}</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base mb-6">{tr(t.pricing.subtitle, lang)}</p>

          {/* ── Billing cycle toggle ── */}
          <div className="inline-flex items-center bg-gray-100 rounded-2xl p-1 gap-1">
            {CYCLES.map(c => (
              <button
                key={c.key}
                onClick={() => setCycle(c.key)}
                className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  cycle === c.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tr(c.label, lang)}
                {c.discount > 0 && (
                  <span className={`absolute -top-2 ${isAr ? "-left-2" : "-right-2"} bg-[#25D366] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full`}>
                    -{Math.round(c.discount * 100)}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Cards ── */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          {plans.map((plan, i) => {
            const s            = PLAN_STYLES[i];
            const base         = BASE_PRICES[i];
            const price        = computePrice(base, cycle);
            const slug         = (plan as any).slug as string;
            const isFree       = base === 0;
            const isEnterprise = slug === "enterprise";
            const Icon         = PLAN_ICONS[i];

            // savings label
            const disc    = CYCLES.find(c => c.key === cycle)!.discount;
            const saving  = base > 0 && disc > 0
              ? Math.round(base * disc * (cycle === "quarterly" ? 3 : 12))
              : 0;

            return (
              <div key={i} className={`relative rounded-2xl p-6 flex flex-col gap-4 overflow-visible ${s.card}`}>

                {/* popular badge */}
                {"badge" in plan && plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <span className="bg-[#25D366] text-white text-xs font-bold px-3.5 py-1 rounded-full shadow-lg whitespace-nowrap">
                      {tr(plan.badge as { ar: string; en: string }, lang)}
                    </span>
                  </div>
                )}

                {/* plan icon + name */}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    s.dark ? "bg-white/10" : s.highlight ? "bg-green-50" : "bg-gray-100"
                  }`}>
                    <Icon className={`w-4 h-4 ${s.dark ? "text-white" : s.highlight ? "text-[#25D366]" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-widest ${s.dark ? "text-gray-400" : "text-gray-400"}`}>
                      {tr(plan.name as { ar: string; en: string }, lang)}
                    </p>
                    <p className={`text-[11px] leading-tight ${s.dark ? "text-gray-400" : "text-gray-500"}`}>
                      {tr(plan.tagline, lang)}
                    </p>
                    {isEnterprise && (
                      <span className="mt-1.5 inline-flex rounded-xl px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {isAr ? "عرض خاص" : "Special Offer"}
                      </span>
                    )}
                  </div>
                </div>

                {/* price */}
                <div className="py-1">
                  {isFree ? (
                    <p className={`text-4xl font-black ${s.dark ? "text-white" : "text-gray-900"}`}>
                      {tr(t.pricing.free, lang)}
                    </p>
                  ) : isEnterprise ? (
                    <>
                      <div className="flex items-end gap-2">
                        <span className={`text-4xl font-black transition-all duration-300 ${s.dark ? "text-white" : "text-gray-900"}`}>
                          {ENTERPRISE_OFFER.toLocaleString("ar-EG")}
                        </span>
                        <span className="text-sm mb-1.5 line-through opacity-40 text-gray-400">
                          {price.toLocaleString("ar-EG")}
                        </span>
                        <span className="text-sm mb-1.5 text-gray-400">
                          {tr(t.pricing.currency, lang)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#1a9e50] font-semibold mt-0.5">
                        {isAr ? "عرض محدود — وفّر ٢٠٠ج/شهر" : "Limited offer — save 200 EGP/mo"}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-end gap-1.5">
                        <span className={`text-4xl font-black transition-all duration-300 ${s.dark ? "text-white" : "text-gray-900"}`}>
                          {price.toLocaleString("ar-EG")}
                        </span>
                        <span className={`text-sm mb-1.5 ${s.dark ? "text-gray-400" : "text-gray-400"}`}>
                          {tr(t.pricing.currency, lang)}
                        </span>
                      </div>
                      {saving > 0 ? (
                        <p className="text-[11px] text-[#1a9e50] font-semibold mt-0.5">
                          {tr(t.pricing.annualSave, lang)} {saving.toLocaleString("ar-EG")} {tr(t.pricing.annualSaveSuffix, lang)}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-400 mt-0.5 h-4" />
                      )}
                    </>
                  )}
                </div>

                {/* CTA */}
                {isEnterprise ? (
                  <button
                    onClick={() => handleCTA(slug, false, ENTERPRISE_OFFER)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all active:scale-95 ${s.cta}`}
                  >
                    {isAr ? "اشترك الآن" : "Subscribe Now"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCTA(slug, isFree, price)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all active:scale-95 ${s.cta}`}
                  >
                    {tr(plan.cta, lang)}
                  </button>
                )}

                {/* divider */}
                <div className={`h-px ${s.dark ? "bg-gray-800" : "bg-gray-100"}`} />

                {/* features */}
                <ul className="space-y-2.5 flex-1">
                  {(plan.features as ReadonlyArray<{ ar: string; en: string; ok: boolean }>).map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2.5">
                      {f.ok ? (
                        <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          s.highlight ? "text-[#25D366]" : s.dark ? "text-green-400" : "text-gray-400"
                        }`} />
                      ) : (
                        <Minus className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-300" />
                      )}
                      <span className={`text-sm leading-snug ${
                        !f.ok
                          ? "text-gray-300"
                          : s.dark
                          ? "text-gray-200"
                          : "text-gray-700"
                      }`}>
                        {tr(f, lang)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* ── Guarantee strip ── */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {[
            { icon: <Shield className="w-4 h-4 text-[#25D366]" />, text: tr(t.pricing.guar1, lang) },
            { icon: <Check  className="w-4 h-4 text-[#25D366]" />, text: tr(t.pricing.guar2, lang) },
            { icon: <Zap    className="w-4 h-4 text-[#25D366]" />, text: tr(t.pricing.guar3, lang) },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
              {item.icon}{item.text}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
