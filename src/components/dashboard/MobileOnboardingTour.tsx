"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Navigation } from "lucide-react";
import { TOUR_STEPS, TOUR_TEXT } from "@/lib/onboarding-tour-data";

interface Props {
  locale: "ar" | "en";
  onNavigate: (section: string) => void;
  onComplete: () => void;
}

export default function MobileOnboardingTour({ locale, onNavigate, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;
  const t = TOUR_TEXT[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    onNavigate(current.sidebarId);
  }, [current.sidebarId, onNavigate]);

  const goToStep = useCallback((nextStep: number) => {
    setIsAnimating(true);
    window.setTimeout(() => {
      setStep(nextStep);
      setIsAnimating(false);
    }, 180);
  }, []);

  const handleFinish = useCallback(() => {
    fetch("/api/user/onboarding", { method: "POST" }).catch(() => { });
    onComplete();
  }, [onComplete]);

  const Icon = current.icon;

  const stepLabel = useMemo(() => t.stepOf(step + 1, TOUR_STEPS.length), [step, t]);

  return (
    <>
      <style>{`
        @keyframes mtFadeIn {
          from { opacity: 0; transform: translateY(10px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes mtCardOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(8px) scale(.98); }
        }
      `}</style>

      <div dir={dir} className="fixed inset-0 z-[55] bg-black/45 backdrop-blur-[3px]" />

      <div className="fixed inset-0 z-[56] flex items-end sm:items-center justify-center p-4 sm:p-6">
        <div
          className="w-full max-w-md"
          style={{ animation: isAnimating ? "mtCardOut .18s ease forwards" : "mtFadeIn .25s ease forwards" }}
        >
          <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white dark:bg-gray-900 shadow-[0_24px_80px_rgba(0,0,0,.28)]">
            <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#25D366] to-[#128C7E]">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-white" />
                <span className="text-white text-xs font-semibold">{t.tourTitle}</span>
              </div>
              <button
                onClick={handleFinish}
                className="text-white/85 hover:text-white transition"
                aria-label={locale === "ar" ? "إغلاق الجولة" : "Close tour"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-1 bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full bg-[#25D366] transition-all duration-300 ease-out"
                style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
              />
            </div>

            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#25D366]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                      {locale === "ar" ? current.titleAr : current.titleEn}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stepLabel}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {locale === "ar" ? current.descAr : current.descEn}
              </p>
            </div>

            <div className="px-5 pb-5">
              <div className="flex items-center justify-center gap-1.5 mb-4">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToStep(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${i === step
                        ? "w-6 bg-[#25D366]"
                        : i < step
                          ? "w-2.5 bg-[#25D366]/45"
                          : "w-2 bg-gray-300 dark:bg-gray-600"
                      }`}
                    aria-label={`${t.tourTitle} ${i + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={() => goToStep(step - 1)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800"
                  >
                    {dir === "rtl" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {t.prev}
                  </button>
                )}

                <button
                  onClick={handleFinish}
                  className="flex-1 flex items-center justify-center px-4 py-3 rounded-2xl text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
                >
                  {t.skip}
                </button>

                <button
                  onClick={() => {
                    if (isLast) {
                      handleFinish();
                      return;
                    }
                    goToStep(step + 1);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[.98] ${isLast
                      ? "bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white shadow-lg shadow-green-500/20"
                      : "bg-[#25D366] text-white"
                    }`}
                >
                  {isLast ? t.finish : t.next}
                  {!isLast && (dir === "rtl" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}