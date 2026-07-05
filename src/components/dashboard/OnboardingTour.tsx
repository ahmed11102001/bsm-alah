"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Navigation } from "lucide-react";
import { TOUR_STEPS, TOUR_TEXT } from "@/lib/onboarding-tour-data";

interface Props {
  locale: "ar" | "en";
  onNavigate: (section: string) => void;
  onComplete: () => void;
}

export default function OnboardingTour({ locale, onNavigate, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrowTop: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const t = TOUR_TEXT[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  const updatePosition = useCallback(() => {
    const el = document.querySelector(`[data-sidebar-id="${current.sidebarId}"]`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 200;
    const top = Math.max(
      16,
      Math.min(rect.top + rect.height / 2 - tooltipHeight / 2, window.innerHeight - tooltipHeight - 16)
    );
    const left = dir === "rtl" ? rect.left - 16 : rect.right + 16;
    const arrowTop = rect.top + rect.height / 2 - top;

    setTooltipPos({ top, left, arrowTop });
  }, [current.sidebarId, dir]);

  useEffect(() => {
    onNavigate(current.sidebarId);
    const timer = window.setTimeout(updatePosition, 100);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
    };
  }, [step, current.sidebarId, onNavigate, updatePosition]);

  const goToStep = useCallback((nextStep: number) => {
    setIsAnimating(true);
    window.setTimeout(() => {
      setStep(nextStep);
      setIsAnimating(false);
    }, 200);
  }, []);

  const handleFinish = useCallback(() => {
    fetch("/api/user/onboarding", { method: "POST" }).catch(() => { });
    onComplete();
  }, [onComplete]);

  const handleNext = () => {
    if (isLast) {
      handleFinish();
      return;
    }
    goToStep(step + 1);
  };

  const handlePrev = () => {
    if (!isFirst) {
      goToStep(step - 1);
    }
  };

  const Icon = current.icon;

  return (
    <>
      <style>{`
        @keyframes otFadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes otSlideIn   { from { opacity:0; transform:translateX(${dir === "rtl" ? "20px" : "-20px"}) } to { opacity:1; transform:translateX(0) } }
        @keyframes otPulse     { 0%, 100% { box-shadow: 0 0 0 0 rgba(37,211,102,0.4) } 50% { box-shadow: 0 0 0 8px rgba(37,211,102,0) } }
        @keyframes otFadeOut   { from { opacity:1 } to { opacity:0 } }
      `}</style>

      <div
        dir={dir}
        className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-[2px]"
        style={{ animation: "otFadeIn .3s ease forwards" }}
      />

      {(() => {
        const el = document.querySelector(`[data-sidebar-id="${current.sidebarId}"]`);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return (
          <div
            className="fixed z-[57] rounded-xl pointer-events-none"
            style={{
              top: rect.top - 4,
              left: rect.left - 4,
              width: rect.width + 8,
              height: rect.height + 8,
              animation: "otPulse 2s ease-in-out infinite",
              boxShadow: "0 0 0 3px rgba(37,211,102,0.5), 0 0 20px rgba(37,211,102,0.2)",
              background: "rgba(37,211,102,0.08)",
            }}
          />
        );
      })()}

      {(() => {
        const sidebar = document.querySelector("aside.lg\\:flex");
        if (sidebar) {
          const sidebarRect = sidebar.getBoundingClientRect();
          return (
            <div
              className="fixed z-[56] hidden lg:block"
              style={{
                top: sidebarRect.top,
                left: sidebarRect.left,
                width: sidebarRect.width,
                height: sidebarRect.height,
                background: "transparent",
                pointerEvents: "none",
              }}
            />
          );
        }
        return null;
      })()}

      {tooltipPos && (
        <div
          ref={tooltipRef}
          dir={dir}
          className="fixed z-[58] w-[340px] max-w-[calc(100vw-2rem)]"
          style={{
            top: tooltipPos.top,
            ...(dir === "rtl" ? { right: `calc(100vw - ${tooltipPos.left}px)` } : { left: tooltipPos.left }),
            animation: isAnimating ? "otFadeOut .2s ease forwards" : "otSlideIn .35s ease forwards",
          }}
        >
          <div
            className="absolute w-3 h-3 bg-white dark:bg-gray-800 rotate-45 border border-gray-200 dark:border-gray-600"
            style={{
              top: tooltipPos.arrowTop - 6,
              ...(dir === "rtl"
                ? { right: -6, borderLeft: "none", borderBottom: "none" }
                : { left: -6, borderRight: "none", borderTop: "none" }),
            }}
          />

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-600 overflow-hidden">
            <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-white" />
                <span className="text-white text-xs font-semibold">{t.tourTitle}</span>
              </div>
              <span className="text-white/80 text-xs font-medium">
                {t.stepOf(step + 1, TOUR_STEPS.length)}
              </span>
            </div>

            <div className="h-1 bg-gray-100 dark:bg-gray-700">
              <div
                className="h-full bg-[#25D366] transition-all duration-500 ease-out"
                style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
              />
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#25D366]" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {locale === "ar" ? current.titleAr : current.titleEn}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {locale === "ar" ? current.descAr : current.descEn}
              </p>
            </div>

            <div className="px-5 pb-4 flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  {dir === "rtl" ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                  {t.prev}
                </button>
              )}

              <div className="flex-1" />

              <button
                onClick={handleFinish}
                className="px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                {t.skip}
              </button>

              <button
                onClick={handleNext}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-[.97] ${isLast
                    ? "bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white shadow-lg shadow-green-500/20"
                    : "bg-[#25D366] hover:bg-[#20bb5a] text-white"
                  }`}
              >
                {isLast ? t.finish : t.next}
                {!isLast && (dir === "rtl" ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed z-[58] bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-600">
        {TOUR_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => goToStep(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step
                ? "w-6 bg-[#25D366]"
                : i < step
                  ? "bg-[#25D366]/40"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
          />
        ))}
      </div>
    </>
  );
}