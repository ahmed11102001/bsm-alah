"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ArrowRight, Play, CheckCheck, TrendingUp,
  Package, Users, ToggleRight, ShoppingCart, MessageSquareText,
} from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";

interface HeroProps { onLoginClick: () => void; lang: Lang; }

// ── Live-updating mock numbers for the dashboard preview ────────────────────
// أرقام توضيحية بس — مش claims حقيقية، الهدف تبيّن شكل الداشبورد مش تثبت أرقام
function useMockTicker() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((p) => p + 1), 3000);
    return () => clearInterval(i);
  }, []);
  return tick;
}

// ── Entrance animation hook ───────────────────────────────────────────────────
function useEntrance() {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t); }, []);
  return ready;
}

function entranceStyle(ready: boolean, delay: number): React.CSSProperties {
  return {
    opacity:   ready ? 1 : 0,
    transform: ready ? "translateY(0)" : "translateY(28px)",
    transition: `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Hero({ onLoginClick, lang }: HeroProps) {
  const isAr      = lang === "ar";
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const ready     = useEntrance();
  const tick      = useMockTicker();

  const scrollTo = (href: string) =>
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#064e45] via-[#075E54] to-[#0a7a6a]">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#25D366]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-300/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ══ Content ══ */}
          <div className={`text-center ${isAr ? "lg:text-right" : "lg:text-left"}`}>

            {/* Badge */}
            <div style={entranceStyle(ready, 0)} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse" />
              <span className="text-white/90 text-sm font-medium">{tr(t.hero.badge, lang)}</span>
            </div>

            {/* H1 */}
            <div style={entranceStyle(ready, 120)}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-5 tracking-tight">
                {tr(t.hero.h1a, lang)}{" "}
                <span className="relative inline-block">
                  <span className="text-[#25D366] drop-shadow-[0_0_30px_rgba(37,211,102,0.5)]">
                    {tr(t.hero.h1highlight, lang)}
                  </span>
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" preserveAspectRatio="none">
                    <path d="M0 6 Q50 0 100 4 Q150 8 200 2" stroke="#25D366" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
                  </svg>
                </span>
                <br />
                <span className="text-white/90 text-3xl sm:text-4xl lg:text-5xl font-bold">
                  {tr(t.hero.h1b, lang)}
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <div style={entranceStyle(ready, 240)}>
              <p className="text-base lg:text-lg text-white/75 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                {tr(t.hero.subtitle, lang)}
              </p>
            </div>

            {/* CTAs */}
            <div style={entranceStyle(ready, 340)} className={`flex flex-col sm:flex-row gap-3 justify-center ${isAr ? "lg:justify-start" : "lg:justify-start"} mb-8`}>
              <Button
                onClick={onLoginClick} size="lg"
                className="bg-[#25D366] hover:bg-[#25D366] text-[#06371f] px-8 font-extrabold text-base h-12 rounded-md border-2 border-[#0c6b34]
                           shadow-[3px_3px_0_rgba(0,0,0,0.55)] hover:shadow-[4px_4px_0_rgba(0,0,0,0.55)]
                           hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_rgba(0,0,0,0.55)]
                           transition-all duration-150"
              >
                {tr(t.hero.cta, lang)}
                <ArrowIcon className="w-5 h-5 mr-2" />
              </Button>
              <Button
                onClick={() => scrollTo("#how-it-works")} size="lg" variant="outline"
                className="bg-transparent text-white px-8 h-12 group text-base font-bold rounded-md border-2 border-white/80
                           shadow-[3px_3px_0_rgba(0,0,0,0.35)] hover:bg-white hover:text-[#06371f]
                           hover:shadow-[4px_4px_0_rgba(0,0,0,0.35)] hover:-translate-x-[1px] hover:-translate-y-[1px]
                           active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_rgba(0,0,0,0.35)]
                           transition-all duration-150"
              >
                <Play className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                {tr(t.hero.ctaWatch, lang)}
              </Button>
            </div>

            {/* Trust strip */}
            <div style={entranceStyle(ready, 440)} className={`flex flex-wrap items-center gap-x-5 gap-y-2 justify-center ${isAr ? "lg:justify-start" : "lg:justify-start"}`}>
              {[tr(t.hero.trust1, lang), tr(t.hero.trust2, lang), tr(t.hero.trust3, lang)].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 text-xs text-white/50">
                  <CheckCheck className="w-3.5 h-3.5 text-[#25D366]/70" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* ══ SaaS Dashboard Mockup — بديل الفون موك ══ */}
          <div
            className="relative flex justify-center lg:block mt-10 lg:mt-0"
            style={{
              opacity:   ready ? 1 : 0,
              transform: ready
                ? "translateX(0) translateY(0)"
                : isAr ? "translateX(-40px)" : "translateX(40px)",
              transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1) 300ms, transform 0.9s cubic-bezier(0.16,1,0.3,1) 300ms",
            }}
          >
            <div className="relative w-[300px] sm:w-[370px] lg:w-[420px] mx-auto">

              {/* ختم وني — بديل الكروت الزجاجية العايمة القديمة */}
              <div
                className="hidden sm:flex absolute -top-6 -right-6 lg:-right-9 z-20 w-[92px] h-[92px] rounded-full items-center justify-center text-center bg-white/90"
                style={{ border: "2px solid #0c6b34", transform: "rotate(-10deg)", mixBlendMode: "multiply" }}
              >
                <div className="absolute inset-[6px] rounded-full border border-dashed border-[#0c6b34]/60" />
                <div className="relative leading-tight">
                  <p className="font-black text-[15px] text-[#0c6b34]">وني</p>
                  <p className="font-mono text-[8.5px] tracking-widest text-[#0c6b34] font-bold">AI · 24/7</p>
                </div>
              </div>

              {/* Glow خفيف بس يفصل الكارد عن الخلفية الغامقة */}
              <div className="absolute inset-0 scale-105 bg-black/25 rounded-[1.75rem] blur-2xl" />

              {/* Dashboard window */}
              <div className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden">

                {/* Window bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <span className="text-[11px] text-gray-400 mr-auto font-medium">
                    {isAr ? "لوحة تحكم وني" : "WANI Dashboard"}
                  </span>
                </div>

                <div className="p-4 sm:p-5 space-y-4">

                  {/* KPI row */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-blue-50 rounded-xl p-2.5">
                      <Package className="w-4 h-4 text-blue-600 mb-1.5" />
                      <p className="text-sm font-black text-gray-800">{(1180 + tick * 4).toLocaleString(isAr ? "ar-EG" : "en-US")}</p>
                      <p className="text-[9.5px] text-gray-500">{isAr ? "طلب" : "orders"}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-2.5">
                      <Users className="w-4 h-4 text-purple-600 mb-1.5" />
                      <p className="text-sm font-black text-gray-800">{(312).toLocaleString(isAr ? "ar-EG" : "en-US")}</p>
                      <p className="text-[9.5px] text-gray-500">{isAr ? "عميل" : "customers"}</p>
                    </div>
                    <div className="bg-[#25D366]/10 rounded-xl p-2.5">
                      <TrendingUp className="w-4 h-4 text-[#0c6b34] mb-1.5" />
                      <p className="text-sm font-black text-gray-800">45.6{isAr ? "ك" : "K"}</p>
                      <p className="text-[9.5px] text-gray-500">{isAr ? "جنيه" : "EGP"}</p>
                    </div>
                  </div>

                  {/* Active automations */}
                  <div className="space-y-2">
                    <p className="text-[10.5px] font-bold text-gray-400 tracking-wide">
                      {isAr ? "الأتمتات الفعّالة" : "ACTIVE AUTOMATIONS"}
                    </p>

                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <MessageSquareText className="w-4 h-4 text-[#0c6b34]" />
                        <span className="text-xs font-semibold text-gray-700">{isAr ? "تأكيد الأوردر" : "Order Confirm"}</span>
                      </div>
                      <ToggleRight className="w-6 h-6 text-[#25D366]" />
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <ShoppingCart className="w-4 h-4 text-[#0c6b34]" />
                        <span className="text-xs font-semibold text-gray-700">{isAr ? "استرداد السلة" : "Cart Recovery"}</span>
                      </div>
                      <ToggleRight className="w-6 h-6 text-[#25D366]" />
                    </div>
                  </div>

                  {/* Mini chart */}
                  <div>
                    <p className="text-[10.5px] font-bold text-gray-400 tracking-wide mb-2">
                      {isAr ? "رسائل هذا الأسبوع" : "MESSAGES THIS WEEK"}
                    </p>
                    <div className="flex items-end gap-1.5 h-16">
                      {[38, 52, 46, 64, 58, 74, 68].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm bg-[#25D366]"
                          style={{ height: `${h}%`, opacity: 0.35 + i / 10 }}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 80L60 72C120 64 240 48 360 44C480 40 600 48 720 52C840 56 960 56 1080 54C1200 52 1320 48 1380 46L1440 44V80H0Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}