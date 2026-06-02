"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ArrowRight, Play, Sparkles, Zap, Brain,
  Send, Paperclip, Smile, MoreVertical, Phone, Video,
  CheckCheck, Store, TrendingUp,
} from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";

interface HeroProps { onLoginClick: () => void; lang: Lang; }

// ── Typing simulation hook ────────────────────────────────────────────────────
type ChatStep =
  | { type: "msg";    side: "customer" | "ai"; text: string; time: string }
  | { type: "typing"; side: "ai" }
  | { type: "stats" };

function useChatSimulation(lang: Lang) {
  const steps: ChatStep[] = [
    { type: "msg",    side: "customer", text: tr(t.hero.msg1, lang), time: "10:30" },
    { type: "typing", side: "ai" },
    { type: "msg",    side: "ai",       text: tr(t.hero.msg2, lang), time: "10:30" },
    { type: "msg",    side: "ai",       text: tr(t.hero.msg3, lang), time: "10:31" },
    { type: "stats" },
  ];

  const DELAYS = [700, 1200, 1100, 900, 800];
  // بعد آخر step نستنى 3 ثواني وبعدين نلف
  const RESET_DELAY = 3500;

  const [visible, setVisible] = useState<number[]>([]);

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setVisible([]);
      let acc = 400;
      steps.forEach((_, i) => {
        acc += DELAYS[i] ?? 900;
        const t = setTimeout(() => setVisible(prev => [...prev, i]), acc);
        timeouts.push(t);
      });
      // loop
      const total = acc + RESET_DELAY;
      const loop = setTimeout(() => {
        timeouts.forEach(clearTimeout);
        timeouts = [];
        run();
      }, total);
      timeouts.push(loop);
    };

    run();
    return () => timeouts.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return { steps, visible };
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
  const { steps, visible } = useChatSimulation(lang);

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

            {/* Feature pills */}
            <div style={entranceStyle(ready, 340)} className={`flex flex-wrap gap-2.5 justify-center ${isAr ? "lg:justify-start" : "lg:justify-start"} mb-8`}>
              {[
                { icon: Brain, label: tr(t.hero.stat2, lang) },
                { icon: Store, label: tr(t.hero.stat3, lang) },
                { icon: Zap,   label: tr(t.hero.stat1, lang) },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-full px-3.5 py-1.5 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 text-[#25D366]" />
                  <span className="text-white/90 text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div style={entranceStyle(ready, 440)} className={`flex flex-col sm:flex-row gap-3 justify-center ${isAr ? "lg:justify-start" : "lg:justify-start"} mb-8`}>
              <Button
                onClick={onLoginClick} size="lg"
                className="bg-[#25D366] hover:bg-[#20bb5a] text-white px-8 font-bold shadow-lg shadow-green-900/40 hover:shadow-green-800/50 hover:scale-[1.02] transition-all duration-200 text-base h-12"
              >
                {tr(t.hero.cta, lang)}
                <ArrowIcon className="w-5 h-5 mr-2" />
              </Button>
              <Button
                onClick={() => scrollTo("#how-it-works")} size="lg" variant="outline"
                className="border-white/25 text-white hover:bg-white/10 hover:border-white/40 px-8 h-12 group text-base"
              >
                <Play className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                {tr(t.hero.ctaWatch, lang)}
              </Button>
            </div>

            {/* Trust strip */}
            <div style={entranceStyle(ready, 540)} className={`flex flex-wrap items-center gap-x-5 gap-y-2 justify-center ${isAr ? "lg:justify-start" : "lg:justify-start"}`}>
              {[tr(t.hero.trust1, lang), tr(t.hero.trust2, lang), tr(t.hero.trust3, lang)].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 text-xs text-white/50">
                  <CheckCheck className="w-3.5 h-3.5 text-[#25D366]/70" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* ══ Phone Mockup ══ */}
          <div
            className="relative flex justify-center lg:block mt-8 lg:mt-0"
            style={{
              opacity:   ready ? 1 : 0,
              transform: ready
                ? "translateX(0) translateY(0)"
                : isAr ? "translateX(-40px)" : "translateX(40px)",
              transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1) 300ms, transform 0.9s cubic-bezier(0.16,1,0.3,1) 300ms",
            }}
          >
            <div className="relative w-[250px] sm:w-[290px] lg:w-[340px] mx-auto">

              {/* Glow */}
              <div className="absolute inset-0 scale-110 bg-[#25D366]/20 rounded-[3rem] blur-2xl" />

              {/* Phone frame */}
              <div className="relative bg-gray-900 rounded-[2.5rem] p-2.5 shadow-2xl ring-1 ring-white/10">
                <div className="bg-[#ECE5DD] rounded-[2rem] overflow-hidden">

                  {/* Chat header */}
                  <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center shadow-md overflow-hidden">
                        <img src="/favicon.svg" alt="WANI" className="w-full h-full object-cover" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-[#075E54] rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm leading-tight">{isAr ? "وني AI" : "WANI AI"}</p>
                      <p className="text-[11px] text-green-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        {tr(t.hero.chatOnline, lang)}
                      </p>
                    </div>
                    <div className="flex gap-3 text-white/70">
                      <Phone className="w-4 h-4" />
                      <Video className="w-4 h-4" />
                      <MoreVertical className="w-4 h-4" />
                    </div>
                  </div>

                  {/* ── Chat area — typing simulation ── */}
                  <div className="h-[260px] sm:h-[320px] lg:h-[370px] p-3 space-y-2.5 bg-[#ECE5DD] overflow-hidden flex flex-col justify-end">
                    {steps.map((step, i) => {
                      const show = visible.includes(i);
                      if (!show) return null;

                      if (step.type === "typing") {
                        return (
                          <div key={i} className="flex justify-end items-end gap-1.5" style={{ animation: "fade-in-up 0.3s ease both" }}>
                            <div className="flex items-center gap-1 bg-white/70 rounded-full px-2.5 py-1.5">
                              <Brain className="w-3 h-3 text-[#25D366]" />
                              <span className="text-[10px] text-gray-500">{tr(t.hero.typing, lang)}</span>
                              <span className="flex gap-[3px] mr-1">
                                {[0,1,2].map(d => (
                                  <span
                                    key={d}
                                    className="w-1 h-1 bg-gray-400 rounded-full"
                                    style={{ animation: `typing-dot 1.2s ease-in-out ${d * 200}ms infinite` }}
                                  />
                                ))}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      if (step.type === "msg") {
                        const isCustomer = step.side === "customer";
                        return (
                          <div
                            key={i}
                            className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}
                            style={{ animation: `${isCustomer ? "message-received" : "message-sent"} 0.35s cubic-bezier(0.34,1.56,0.64,1) both` }}
                          >
                            <div className={`${isCustomer ? "bg-white rounded-2xl rounded-tl-none" : "bg-[#DCF8C6] rounded-2xl rounded-tr-none"} px-3.5 py-2 max-w-[88%] shadow-sm`}>
                              <p className="text-gray-800 text-xs leading-relaxed">{step.text}</p>
                              <div className={`flex items-center ${isCustomer ? "justify-start" : "justify-end"} gap-1 mt-1`}>
                                <span className="text-[9px] text-gray-400">{step.time}</span>
                                {!isCustomer && <CheckCheck className="w-3 h-3 text-[#25D366]" />}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (step.type === "stats") {
                        return (
                          <div
                            key={i}
                            className="bg-white/95 rounded-xl p-2.5 border border-green-100 shadow-sm mx-1"
                            style={{ animation: "fade-in-scale 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <TrendingUp className="w-3 h-3 text-[#25D366]" />
                              <span className="text-[10px] font-bold text-gray-700">AI Performance</span>
                              <span className="mr-auto text-[9px] text-green-600 font-semibold bg-green-50 px-1.5 rounded-full">LIVE</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="bg-gray-50 rounded-lg p-1.5 text-center">
                                <p className="text-sm font-black text-[#25D366]">98%</p>
                                <p className="text-[9px] text-gray-500">{tr(t.hero.statMsg, lang)}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-1.5 text-center">
                                <p className="text-sm font-black text-[#25D366]">+247</p>
                                <p className="text-[9px] text-gray-500">{tr(t.hero.statCont, lang)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>

                  {/* Input bar */}
                  <div className="bg-[#F0F2F5] px-3 py-2.5 flex items-center gap-2">
                    <Smile className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-xs text-gray-400">
                      {tr(t.hero.chatInput, lang)}
                    </div>
                    <div className="bg-[#25D366] rounded-full p-1.5 flex-shrink-0">
                      <Send className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Floating cards — float ناعم بدل bounce ── */}
              <div
                className="hidden sm:flex absolute -top-4 -right-10 lg:-right-14 bg-white rounded-2xl p-3 shadow-xl items-center gap-2.5"
                style={{ animation: "float 4s ease-in-out infinite" }}
              >
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-[#25D366]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">{tr(t.hero.floatSent, lang)}</p>
                  <p className="text-[10px] text-gray-400">{tr(t.hero.floatSentSub, lang)}</p>
                </div>
              </div>

              <div
                className="hidden sm:flex absolute -bottom-4 -left-10 lg:-left-14 bg-white rounded-2xl p-3 shadow-xl items-center gap-2.5"
                style={{ animation: "float-reverse 4.5s ease-in-out 0.8s infinite" }}
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">{tr(t.hero.floatConts, lang)}</p>
                  <p className="text-[10px] text-gray-400">{tr(t.hero.floatContsSub, lang)}</p>
                </div>
              </div>

              <div
                className="hidden sm:block absolute top-1/2 -left-8 lg:-left-12 -translate-y-1/2 bg-white rounded-xl p-2.5 shadow-xl text-center"
                style={{ animation: "float 5s ease-in-out 1.5s infinite" }}
              >
                <p className="text-base font-black text-[#25D366]">98%</p>
                <p className="text-[9px] text-gray-400 leading-tight">{tr(t.hero.floatRate, lang)}</p>
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