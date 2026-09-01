"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Sparkles, Zap, Shield, Rocket, Store, Brain, ArrowRight, ArrowLeft } from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";
import { usePixel } from "@/hooks/usePixel";
import { canUseBillingCycle } from "@/lib/pricing";

// ─── config ───────────────────────────────────────────────────────────────────
const BASE_PRICES = [0, 249, 599, 1199];
const MAX_OFFER = 999;

const CYCLES = [
  { key: "monthly", label: { ar: "شهري", en: "Monthly" }, discount: 0 },
  { key: "quarterly", label: { ar: "ربع سنوي", en: "Quarterly" }, discount: 0.15 },
  { key: "annual", label: { ar: "سنوي", en: "Annual" }, discount: 0.25 },
] as const;
type Cycle = typeof CYCLES[number]["key"];

const PLAN_STYLES = [
  {
    card: "bg-slate-50/90 dark:bg-gray-800/80 border border-slate-200/80 dark:border-gray-700 shadow-sm",
    accent: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100/70 dark:bg-emerald-950/50",
    dark: false,
    highlight: false,
    badgeBg: "bg-gray-800 text-white dark:bg-gray-700",
    cta: "border-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white font-bold",
  },
  {
    card: "bg-gradient-to-b from-sky-50/90 to-cyan-50/40 dark:from-sky-950/20 dark:to-gray-900 border border-sky-300/80 dark:border-sky-800/60 shadow-lg shadow-sky-500/5",
    accent: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-100 dark:bg-sky-950/60",
    dark: false,
    highlight: false,
    badgeBg: "bg-sky-600 text-white",
    cta: "bg-gradient-to-r from-sky-500 to-cyan-600 text-white hover:from-sky-600 hover:to-cyan-700 shadow-md shadow-sky-500/25 font-bold",
  },
  {
    card: "bg-gradient-to-b from-white via-emerald-50/30 to-white dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 border-2 border-[#25D366] shadow-2xl shadow-emerald-500/20 scale-[1.02] md:-translate-y-2 z-10",
    accent: "text-[#25D366]",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    dark: false,
    highlight: true,
    badgeBg: "bg-[#25D366] text-white shadow-md shadow-emerald-500/40",
    cta: "bg-[#25D366] text-white hover:bg-[#20bb5a] shadow-lg shadow-emerald-500/30 font-black text-base",
  },
  {
    card: "bg-gradient-to-b from-[#111827] via-[#0b0f19] to-[#030712] border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10 text-white",
    accent: "text-amber-400",
    iconBg: "bg-amber-500/20",
    dark: true,
    highlight: false,
    badgeBg: "bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-950 font-black",
    cta: "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-gray-950 font-black hover:from-amber-300 hover:to-yellow-300 shadow-lg shadow-amber-500/30",
  },
];

// social proof لكل plan
const SOCIAL_PROOF = [
  { ar: "تجربة مجانية فورية ⚡", en: "Instant Free Trial ⚡" },
  { ar: "انطلاقة سريعة وقوية 🚀", en: "Fast & Agile Launch 🚀" },
  { ar: "الأعلى عائداً وقيمة 💎", en: "Best ROI & Value 💎" },
  { ar: "قوة المؤسسات وذكاء AI 👑", en: "Enterprise AI Power 👑" },
];

const PLAN_ICONS = [Sparkles, Rocket, Store, Brain];

function computePrice(base: number, cycle: Cycle) {
  const disc = CYCLES.find((c) => c.key === cycle)!.discount;
  return Math.round(base * (1 - disc));
}

// ── 3D Tilt Card ──────────────────────────────────────────────────────────────
function PricingCard({
  index,
  plan,
  s,
  base,
  price,
  slug,
  isFree,
  isMax,
  Icon,
  saving,
  cycle,
  lang,
  isAr,
  numLocale,
  visible,
  onCTA,
}: {
  index: number;
  plan: (typeof t.pricing.plans)[number];
  s: (typeof PLAN_STYLES)[number];
  base: number;
  price: number;
  slug: string;
  isFree: boolean;
  isMax: boolean;
  Icon: React.ElementType;
  saving: number;
  cycle: Cycle;
  lang: Lang;
  isAr: boolean;
  numLocale: string;
  visible: boolean;
  onCTA: (slug: string, isFree: boolean, price: number, cycle: Cycle) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0, shine: { x: 50, y: 50 } });
  const [hovered, setHovered] = useState(false);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width - 0.5;
      const cy = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({
        x: cy * -12,
        y: cx * 12,
        shine: { x: (cx + 0.5) * 100, y: (cy + 0.5) * 100 },
      });
    });
  };

  const onMouseLeave = () => {
    cancelAnimationFrame(rafRef.current);
    setTilt({ x: 0, y: 0, shine: { x: 50, y: 50 } });
    setHovered(false);
  };

  const fadeUp = (delay: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0) scale(1)" : "translateY(32px) scale(0.97)",
    transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <div style={{ ...fadeUp(index * 90), perspective: "900px" }} className="flex">
      <div
        ref={cardRef}
        onMouseMove={onMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={onMouseLeave}
        className={`relative rounded-3xl p-6 sm:p-7 flex flex-col gap-4 w-full cursor-default ${s.card}`}
        dir={isAr ? "rtl" : "ltr"}
        style={{
          transform: hovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.025)`
            : "rotateX(0deg) rotateY(0deg) scale(1)",
          transformStyle: "preserve-3d",
          transition: hovered
            ? "transform 0.1s ease-out, box-shadow 0.2s ease"
            : "transform 0.5s cubic-bezier(0.16,1,0.3,1), box-shadow 0.5s ease",
          willChange: "transform",
        }}
      >
        {/* ── Shine overlay ── */}
        {hovered && (
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              background: `radial-gradient(circle at ${tilt.shine.x}% ${tilt.shine.y}%, rgba(255,255,255,${
                s.dark ? "0.08" : "0.22"
              }) 0%, transparent 65%)`,
              zIndex: 10,
            }}
          />
        )}

        {/* Popular / Feature Ribbon Badge */}
        {"badge" in plan && plan.badge && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2" style={{ zIndex: 20 }}>
            <span
              className={`text-xs font-black px-4 py-1 rounded-full shadow-lg whitespace-nowrap uppercase tracking-wider ${s.badgeBg}`}
            >
              {tr(plan.badge as { ar: string; en: string }, lang)}
            </span>
          </div>
        )}

        {/* Icon + Title Header */}
        <div className="flex items-center gap-3 pt-1">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${s.iconBg}`}
          >
            <Icon className={`w-5 h-5 ${s.accent}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-xl font-black ${s.dark ? "text-white" : "text-gray-900"}`}>
                {tr(plan.name as { ar: string; en: string }, lang)}
              </h3>
              {isMax && (
                <span className="inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isAr ? "AI متكامل" : "Full AI"}
                </span>
              )}
            </div>
            <p className={`text-xs leading-snug mt-0.5 ${s.dark ? "text-gray-300" : "text-gray-500"}`}>
              {tr(plan.tagline, lang)}
            </p>
          </div>
        </div>

        {/* Pricing Block */}
        <div className="py-2">
          {isFree ? (
            <div>
              <p className={`text-4xl font-black ${s.dark ? "text-white" : "text-gray-900"}`}>
                {tr(t.pricing.free, lang)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">{isAr ? "بدون بطاقة ائتمان — مجاناً للأبد" : "No credit card needed — free forever"}</p>
            </div>
          ) : isMax ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black tracking-tight ${s.dark ? "text-white" : "text-gray-900"}`}>
                  {MAX_OFFER.toLocaleString(numLocale)}
                </span>
                <span className="text-sm line-through opacity-50 text-gray-400">
                  {price.toLocaleString(numLocale)}
                </span>
                <span className="text-sm text-gray-400 font-semibold">{tr(t.pricing.currency, lang)}</span>
              </div>
              <p className="text-xs text-amber-400 font-bold mt-1">
                {isAr ? "🔥 عرض خاص: وفّر ٢٠٠ج شهرياً" : "🔥 Special offer: Save 200 EGP/mo"}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-4xl font-black tracking-tight ${s.dark ? "text-white" : "text-gray-900"}`}>
                  {price.toLocaleString(numLocale)}
                </span>
                <span className={`text-sm font-semibold ${s.dark ? "text-gray-400" : "text-gray-500"}`}>
                  {tr(t.pricing.currency, lang)}
                </span>
              </div>
              {saving > 0 ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                  {tr(t.pricing.annualSave, lang)} {saving.toLocaleString(numLocale)} {tr(t.pricing.annualSaveSuffix, lang)}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  {isAr ? "دفع شهري مرن مع إمكانية الإلغاء في أي وقت" : "Flexible monthly billing, cancel anytime"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div>
          {isMax ? (
            <button
              onClick={() => onCTA(slug, false, MAX_OFFER, cycle)}
              className={`w-full py-3 px-4 rounded-2xl text-sm font-bold text-center transition-all active:scale-95 flex items-center justify-center gap-2 ${s.cta}`}
            >
              <span>{tr(plan.cta, lang)}</span>
              {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          ) : (
            <button
              onClick={() => onCTA(slug, isFree, price, cycle)}
              className={`w-full py-3 px-4 rounded-2xl text-sm font-bold text-center transition-all active:scale-95 flex items-center justify-center gap-2 ${s.cta}`}
            >
              <span>{tr(plan.cta, lang)}</span>
              {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Social Proof Tag */}
        <div
          className={`flex items-center gap-2 text-xs font-bold pt-1 ${
            s.dark ? "text-amber-400" : s.highlight ? "text-[#25D366]" : "text-gray-600 dark:text-gray-400"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${
              s.dark ? "bg-amber-400" : s.highlight ? "bg-[#25D366]" : "bg-sky-500"
            }`}
          />
          <span>{isAr ? SOCIAL_PROOF[index].ar : SOCIAL_PROOF[index].en}</span>
        </div>

        {/* Divider */}
        <div className={`h-px my-1 ${s.dark ? "bg-gray-800" : "bg-gray-200/70 dark:bg-gray-700/60"}`} />

        {/* Feature List */}
        <div className="space-y-1 flex-1">
          <p className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${s.dark ? "text-gray-400" : "text-gray-400"}`}>
            {isAr ? "المميزات المضمنة:" : "Included features:"}
          </p>
          <ul className="space-y-2.5">
            {(plan.features as ReadonlyArray<{ ar: string; en: string; ok: boolean }>).map((f, fi) => (
              <li key={fi} className="flex items-start gap-2.5 text-xs sm:text-sm">
                {f.ok ? (
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      s.highlight
                        ? "bg-emerald-500/20 text-[#25D366]"
                        : s.dark
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : (
                  <Minus className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-300" />
                )}
                <span
                  className={`leading-relaxed font-medium ${
                    !f.ok ? "text-gray-400 line-through opacity-60" : s.dark ? "text-gray-200" : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {tr(f, lang)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface PricingProps {
  lang: Lang;
}

export default function Pricing({ lang }: PricingProps) {
  const isAr = lang === "ar";
  const numLocale = isAr ? "ar-EG" : "en-US";
  const router = useRouter();
  const { track } = usePixel();
  const plans = t.pricing.plans;

  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // scroll reveal
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    track("ViewContent", { content_name: "Pricing Section" });
  }, []);

  const handleCTA = (slug: string, isFree: boolean, price: number, selectedCycle: Cycle) => {
    if (isFree) {
      track("CompleteRegistration", { content_name: "Free Plan" });
      router.push("/register");
      return;
    }
    track("InitiateCheckout", {
      content_name: slug,
      content_ids: [slug],
      content_type: "product",
      value: price,
      currency: "EGP",
      num_items: 1,
    });

    router.push(`/checkout?plan=${encodeURIComponent(slug)}&cycle=${encodeURIComponent(selectedCycle)}`);
  };

  const fadeUp = (delay: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0) scale(1)" : "translateY(32px) scale(0.97)",
    transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <section ref={sectionRef} id="pricing" className="py-20 lg:py-32 bg-white dark:bg-gray-950 relative overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
      {/* Background soft ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[250px] bg-sky-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ── Header ── */}
        <div className="text-center mb-12" style={fadeUp(0)}>
          <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 rounded-full px-4 py-2 mb-4 shadow-sm">
            <Sparkles className="w-4 h-4 text-[#25D366]" />
            <span className="text-emerald-700 dark:text-emerald-300 text-sm font-bold">{tr(t.pricing.badge, lang)}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight leading-tight">
            {tr(t.pricing.h2a, lang)}{" "}
            <span className="relative inline-block text-[#25D366]">
              {tr(t.pricing.h2b, lang)}
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 100 8" preserveAspectRatio="none">
                <path
                  d="M0 6 Q50 0 100 6"
                  stroke="#25D366"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: 120,
                    strokeDashoffset: visible ? 0 : 120,
                    transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1) 400ms",
                  }}
                />
              </svg>
            </span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-base sm:text-lg mb-8 leading-relaxed">
            {tr(t.pricing.subtitle, lang)}
          </p>

          {/* Billing cycle toggle */}
          <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700 rounded-2xl p-1.5 gap-1.5 shadow-inner">
            {CYCLES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCycle(c.key)}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  cycle === c.key
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-md"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                {tr(c.label, lang)}
                {c.discount > 0 && (
                  <span
                    className={`absolute -top-2.5 ${
                      isAr ? "-left-2" : "-right-2"
                    } bg-[#25D366] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm`}
                  >
                    -{Math.round(c.discount * 100)}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Cards Grid ── */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan, i) => {
            const s = PLAN_STYLES[i];
            const base = BASE_PRICES[i];
            const slug = (plan as any).slug as string;
            const planCycle = canUseBillingCycle(slug, cycle) ? cycle : "monthly";
            const price = computePrice(base, planCycle);
            const isFree = base === 0;
            const isMax = slug === "max" || slug === "enterprise";
            const Icon = PLAN_ICONS[i] || Sparkles;
            const disc = CYCLES.find((c) => c.key === planCycle)!.discount;
            const saving =
              base > 0 && disc > 0 ? Math.round(base * disc * (planCycle === "quarterly" ? 3 : 12)) : 0;

            return (
              <PricingCard
                key={i}
                index={i}
                plan={plan}
                s={s}
                base={base}
                price={price}
                slug={slug}
                isFree={isFree}
                isMax={isMax}
                Icon={Icon}
                saving={saving}
                cycle={cycle}
                lang={lang}
                isAr={isAr}
                numLocale={numLocale}
                visible={visible}
                onCTA={handleCTA}
              />
            );
          })}
        </div>

        {/* ── Guarantee strip ── */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-12 gap-y-4" style={fadeUp(400)}>
          {[
            { icon: <Shield className="w-5 h-5 text-[#25D366]" />, text: tr(t.pricing.guar1, lang) },
            { icon: <Check className="w-5 h-5 text-[#25D366]" />, text: tr(t.pricing.guar2, lang) },
            { icon: <Zap className="w-5 h-5 text-[#25D366]" />, text: tr(t.pricing.guar3, lang) },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-800">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
