"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Play, CheckCheck } from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";

interface HeroProps { onLoginClick: () => void; lang: Lang; }

// ── Automation Log — الأحداث المعروضة في محاكاة السجل ────────────────────────
// نصوص توضيحية بس (illustrative)، مش أرقام/ادعاءات حقيقية عن عملاء فعليين
type LogStatus = "ok" | "pending";
interface LogEvent { time: string; type: string; main: string; action: string; status: LogStatus; }

const AUTOMATION_EVENTS: LogEvent[] = [
  { time: "10:30", type: "MESSAGE",   main: "عميل سأل عن السعر",       action: "وني رد تلقائيًا",              status: "ok" },
  { time: "10:31", type: "ORDER",     main: "العميل أكّد الطلب",        action: "تم إنشاء الطلب #1024",         status: "ok" },
  { time: "10:33", type: "PAYMENT",   main: "اتبعث رابط الدفع",         action: "في انتظار الدفع",              status: "pending" },
  { time: "10:34", type: "PAYMENT",   main: "الفلوس اتحصّلت",           action: "الطلب مؤكَّد",                 status: "ok" },
  { time: "10:42", type: "FOLLOW-UP", main: "عميل ما كملش الطلب",       action: "وني بدأ المتابعة",             status: "ok" },
  { time: "10:55", type: "CART",      main: "سلة متروكة من ساعة",       action: "وني بعت تذكير بالمنتج",        status: "ok" },
  { time: "11:02", type: "ORDER",     main: "أكّد الطلب بعد المتابعة",  action: "تم إنشاء الطلب #1031",         status: "ok" },
  { time: "11:10", type: "SHIPPING",  main: "الطلب جاهز للشحن",         action: "وني بعت تحديث الشحن للعميل",   status: "ok" },
];

const LOG_WINDOW = 6;
const ENTRY_HEIGHT = 92;

function useAutomationLog() {
  const [startIndex, setStartIndex] = useState(0);
  const [shifted, setShifted] = useState(false);

  useEffect(() => {
    const loop = setInterval(() => {
      setShifted(true);
      const settle = setTimeout(() => {
        setStartIndex((p) => (p + 1) % AUTOMATION_EVENTS.length);
        setShifted(false);
      }, 550);
      return () => clearTimeout(settle);
    }, 2800);
    return () => clearInterval(loop);
  }, []);

  const items = Array.from({ length: LOG_WINDOW + 1 }, (_, i) => AUTOMATION_EVENTS[(startIndex + i) % AUTOMATION_EVENTS.length]);
  return { items, shifted };
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
  const { items: logItems, shifted } = useAutomationLog();

  const scrollTo = (href: string) =>
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* ── Background — أعمق ومتجانس، من غير glow كبير ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#053b32] to-[#0b5c4e]" />

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

          {/* ══ Automation Log Mockup — بديل الفون موك ══ */}
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
            <div className="relative w-[320px] sm:w-[420px] lg:w-[500px] mx-auto">

              {/* Glow خفيف ومحصور تحت الكارد بس — مش ambient blob كبير */}
              <div className="absolute inset-0 scale-105 bg-black/20 rounded-[1.75rem] blur-2xl" />

              {/* Automation Log — البطل البصري للـ Hero */}
              <div
                className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden"
                style={{ transform: "rotate(-2deg)" }}
              >

                {/* Header — "24/7" بقى جزء من هوية الكارد، مش ختم عايم */}
                <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-[18px] sm:text-[20px] text-gray-900">
                      {isAr ? "وني AI · 24/7" : "WANI AI · 24/7"}
                    </span>
                    <span className="text-[10px] font-bold tracking-wider text-[#0c6b34] bg-[#25D366]/15 px-2.5 py-1 rounded-md flex-shrink-0">
                      AUTOMATION LOG
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
                    <span className="text-[11px] text-gray-400 font-mono">
                      {isAr ? "سجل الأتمتة — مباشر" : "Automation log — live"}
                    </span>
                  </div>
                </div>
                <div className="h-[2px] bg-gray-900 mx-5 sm:mx-6" />

                {/* Log entries — الشريط بيتحرك لوحده كل شوية */}
                <div
                  className="relative h-[500px] sm:h-[560px] lg:h-[600px] overflow-hidden px-5 sm:px-6"
                  style={{
                    maskImage: "linear-gradient(to bottom, black 84%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 84%, transparent 100%)",
                  }}
                >
                  <div
                    className="transition-transform ease-out"
                    style={{
                      transform: shifted ? `translateY(-${ENTRY_HEIGHT}px)` : "translateY(0)",
                      transitionDuration: "550ms",
                    }}
                  >
                    {logItems.map((e, i) => (
                      <div
                        key={`${e.time}-${e.main}-${i}`}
                        className="py-4 border-b border-dashed border-gray-100"
                        style={{ height: ENTRY_HEIGHT }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] font-mono text-gray-400">{e.time}</span>
                          <span className="text-[9.5px] font-mono font-bold tracking-wider text-gray-400 border border-gray-200 rounded px-1.5 py-[1px]">
                            {e.type}
                          </span>
                        </div>
                        <p className="text-[15px] font-bold text-gray-900 mb-2 leading-snug">{e.main}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[14px] font-black flex-shrink-0 ${e.status === "ok" ? "text-[#0c6b34]" : "text-gray-300"}`}>
                            {e.status === "ok" ? "✓" : "→"}
                          </span>
                          <span className="text-[13.5px] text-gray-600 font-semibold">{e.action}</span>
                        </div>
                      </div>
                    ))}
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