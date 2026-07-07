"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload, FileText, Rocket, BarChart3,
  ArrowLeft, ArrowRight, Store, Bot,
  Zap, TrendingUp,
} from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";

const BASIC_META = [
  { icon: Upload, color: "bg-blue-500", glow: "rgba(59,130,246,0.2)", ring: "ring-blue-100" },
  { icon: FileText, color: "bg-[#25D366]", glow: "rgba(37,211,102,0.2)", ring: "ring-green-100" },
  { icon: Rocket, color: "bg-purple-500", glow: "rgba(168,85,247,0.2)", ring: "ring-purple-100" },
  { icon: BarChart3, color: "bg-orange-500", glow: "rgba(249,115,22,0.2)", ring: "ring-orange-100" },
];

const AI_META = [
  { icon: Store, color: "bg-blue-500", glow: "rgba(59,130,246,0.2)", ring: "ring-blue-100" },
  { icon: Bot, color: "bg-purple-500", glow: "rgba(168,85,247,0.2)", ring: "ring-purple-100" },
  { icon: Zap, color: "bg-[#25D366]", glow: "rgba(37,211,102,0.2)", ring: "ring-green-100" },
  { icon: TrendingUp, color: "bg-orange-500", glow: "rgba(249,115,22,0.2)", ring: "ring-orange-100" },
];

const AI_STEPS = {
  ar: [
    { time: "٥ دقائق", title: "اربط متجرك", what: "Shopify أو EasyOrders", desc: "اربط متجرك بخطوات بسيطة. كل أوردر جديد هيوصل وني تلقائياً من اللحظة دي." },
    { time: "دقيقتين", title: "فعّل الـ AI والأتمتة", what: "بدون كودينج خالص", desc: "حدد رسائل التأكيد والشحن والمتابعة. وفعّل الـ AI Sales Assistant على Catalog منتجاتك." },
    { time: "فوري", title: "الـ AI يبدأ يبيع", what: "٢٤/٧ بدون تدخل", desc: "الـ AI بيرد على العملاء، بيقترح منتجات، ويتابع السلة المتروكة — وأنت شايل بالك." },
    { time: "مستمر", title: "تابع Revenue Attribution", what: "كل حملة = كم أوردر؟", desc: "شوف بالظبط كل حملة واتساب أنتجت كام أوردر وكام إيراد — وحسّن على أساس بيانات حقيقية." },
  ],
  en: [
    { time: "5 min", title: "Connect your store", what: "Shopify or EasyOrders", desc: "Connect your store in a few steps. Every new order will reach WhatsPro automatically." },
    { time: "2 min", title: "Enable AI & Automation", what: "Zero coding required", desc: "Set up confirmation, shipping, and follow-up messages. Enable the AI Sales Assistant on your catalog." },
    { time: "Instant", title: "AI starts selling", what: "24/7, hands-free", desc: "The AI replies to customers, suggests products, and follows up on abandoned carts." },
    { time: "Ongoing", title: "Track Revenue Attribution", what: "Campaign → orders → revenue", desc: "See exactly how many orders each WhatsApp campaign generated — optimize based on real data." },
  ],
};

const NUMS = ["01", "02", "03", "04"];

interface HowItWorksProps { lang: Lang; onLoginClick?: () => void; }

export default function HowItWorks({ lang, onLoginClick }: HowItWorksProps) {
  const isAr = lang === "ar";
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [tab, setTab] = useState<"basic" | "ai">("basic");
  const [animating, setAnimating] = useState(false);
  const [displayed, setDisplayed] = useState<"basic" | "ai">("basic");
  const [visible, setVisible] = useState(false);
  const [stepsIn, setStepsIn] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // ── scroll reveal ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── stagger steps لما visible يبقى true أو tab يتغير ─────────────────────
  useEffect(() => {
    if (!visible) return;
    setStepsIn(false);
    const t = setTimeout(() => setStepsIn(true), 80);
    return () => clearTimeout(t);
  }, [visible, displayed]);

  // ── tab transition مع fade ────────────────────────────────────────────────
  const switchTab = (next: "basic" | "ai") => {
    if (next === tab || animating) return;
    setAnimating(true);
    // fade out
    setStepsIn(false);
    setTimeout(() => {
      setDisplayed(next);
      setTab(next);
      setAnimating(false);
      // fade in بعد frame واحد
      requestAnimationFrame(() => setTimeout(() => setStepsIn(true), 60));
    }, 280);
  };

  const basicSteps = t.how.steps;
  const aiSteps = isAr ? AI_STEPS.ar : AI_STEPS.en;
  const meta = displayed === "basic" ? BASIC_META : AI_META;

  // ── line progress (animated when visible) ────────────────────────────────
  const lineStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "scaleX(1)" : "scaleX(0)",
    transformOrigin: isAr ? "right" : "left",
    transition: "transform 1s cubic-bezier(0.16,1,0.3,1) 400ms, opacity 0.6s ease 400ms",
  };

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="py-20 lg:py-28 bg-white overflow-hidden"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="text-center mb-10"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 mb-4">
            <Rocket className="w-3.5 h-3.5 text-[#25D366]" />
            <span className="text-gray-600 text-sm font-medium">{tr(t.how.badge, lang)}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-3 tracking-tight">
            {tr(t.how.h2a, lang)}{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#25D366]">{tr(t.how.h2b, lang)}</span>
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 100 8" preserveAspectRatio="none">
                <path d="M0 6 Q50 0 100 6" stroke="#25D366" strokeWidth="2.5" fill="none" strokeLinecap="round"
                  style={{ strokeDasharray: 120, strokeDashoffset: visible ? 0 : 120, transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1) 300ms" }} />
              </svg>
            </span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed mb-8">
            {tr(t.how.subtitle, lang)}
          </p>

          {/* ── Tab switcher ── */}
          <div className="inline-flex bg-gray-100 rounded-2xl p-1 gap-1">
            {(["basic", "ai"] as const).map(id => (
              <button
                key={id}
                onClick={() => switchTab(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-250 ${tab === id
                    ? id === "ai"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {id === "basic" ? <Rocket className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                {id === "basic"
                  ? (isAr ? "إرسال وحملات" : "Sending & Campaigns")
                  : (isAr ? "متجر + AI" : "Store + AI")}
                {id === "ai" && (
                  <span className="text-[10px] bg-[#25D366] text-white px-1.5 py-0.5 rounded-full font-bold">NEW</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Steps ─────────────────────────────────────────────────────────── */}
        <div className="relative">
          {/* connecting line — animated */}
          <div
            className="hidden lg:block absolute top-14 right-[12.5%] left-[12.5%] h-px bg-gradient-to-r from-blue-300 via-green-300 to-orange-300 z-0"
            style={lineStyle}
          />

          <div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 relative z-10"
            style={{
              transition: "opacity 0.25s ease",
              opacity: animating ? 0 : 1,
            }}
          >
            {meta.map((m, i) => {
              const Icon = m.icon;
              const s = displayed === "basic" ? basicSteps[i] : null;
              const step = displayed === "basic"
                ? { time: tr(s!.time, lang), title: tr(s!.title, lang), what: tr(s!.what, lang), desc: tr(s!.desc, lang) }
                : (isAr ? AI_STEPS.ar[i] : AI_STEPS.en[i]);

              return (
                <div
                  key={`${displayed}-${i}`}
                  className="flex flex-col items-center text-center group"
                  style={{
                    opacity: stepsIn ? 1 : 0,
                    transform: stepsIn ? "translateY(0)" : "translateY(28px)",
                    transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 100}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 100}ms`,
                  }}
                >
                  {/* icon */}
                  <div
                    className={`relative w-16 h-16 ${m.color} ring-4 ${m.ring} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}
                    style={{
                      boxShadow: `0 8px 24px ${m.glow}`,
                      transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = "scale(1.12) translateY(-4px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 40px ${m.glow}`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = "";
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${m.glow}`;
                    }}
                  >
                    <Icon className="w-7 h-7 text-white" strokeWidth={2} />
                    <span className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-white border border-gray-200 rounded-full text-[10px] font-black text-gray-600 flex items-center justify-center shadow-sm">
                      {NUMS[i]}
                    </span>
                  </div>

                  {/* time badge */}
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    {step.time}
                  </span>

                  {/* title */}
                  <h3 className="text-sm font-black text-gray-900 mb-1 leading-snug">{step.title}</h3>

                  {/* what */}
                  <p className="text-xs font-semibold text-[#25D366] mb-2">{step.what}</p>

                  {/* desc */}
                  <p className="text-xs text-gray-500 leading-relaxed max-w-[200px]">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <div
          className="mt-14 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-3xl p-7 flex flex-col sm:flex-row items-center justify-between gap-5"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s cubic-bezier(0.16,1,0.3,1) 500ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) 500ms",
          }}
        >
          <div className={`text-center ${isAr ? "sm:text-right" : "sm:text-left"}`}>
            <p className="text-base font-bold text-gray-900 mb-1">{tr(t.how.ctaTitle, lang)}</p>
            <p className="text-sm text-gray-400">{tr(t.how.ctaSub, lang)}</p>
          </div>
          <button
            onClick={onLoginClick}
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bb5a] text-white font-bold px-7 py-3 rounded-xl transition-all text-sm whitespace-nowrap active:scale-95 shadow-lg shadow-green-200 hover:shadow-green-300 hover:scale-[1.02]"
          >
            {tr(t.how.ctaBtn, lang)}
            <ArrowIcon className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
}