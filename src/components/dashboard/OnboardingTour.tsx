"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, X, Navigation,
  Home, Users, Send, FileText, MessageSquare,
  BarChart3, Bot, ShoppingBag, Code,
} from "lucide-react";

// ─── Tour Step definitions ────────────────────────────────────────────────────
interface TourStep {
  sidebarId: string;
  icon: React.ComponentType<{ className?: string }>;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    sidebarId: "home",
    icon: Home,
    titleAr: "الصفحة الرئيسية",
    titleEn: "Home Dashboard",
    descAr: "لوحة التحكم الرئيسية — هنا تشوف نظرة عامة على حسابك، إحصائيات الرسائل، وآخر الحملات.",
    descEn: "Main dashboard — overview of your account, message stats, and recent campaigns.",
  },
  {
    sidebarId: "team",
    icon: Users,
    titleAr: "الفريق",
    titleEn: "Team",
    descAr: "إدارة فريقك — أضف أعضاء فريق وحدد صلاحيات كل واحد.",
    descEn: "Manage your team — add members and set permissions for each one.",
  },
  {
    sidebarId: "contacts",
    icon: Users,
    titleAr: "جهات الاتصال",
    titleEn: "Contacts",
    descAr: "جهات الاتصال — أضف وأدر كل جهات اتصالك وقوائمك.",
    descEn: "Contacts — add and manage all your contacts and audience lists.",
  },
  {
    sidebarId: "campaigns",
    icon: Send,
    titleAr: "الحملات",
    titleEn: "Campaigns",
    descAr: "الحملات — أنشئ حملات رسائل واتساب وتابع نتائجها لحظة بلحظة.",
    descEn: "Campaigns — create WhatsApp message campaigns and track results in real-time.",
  },
  {
    sidebarId: "templates",
    icon: FileText,
    titleAr: "القوالب",
    titleEn: "Templates",
    descAr: "القوالب — جهّز قوالب رسائل جاهزة ومعتمدة من Meta عشان تستخدمها في حملاتك.",
    descEn: "Templates — prepare pre-approved Meta message templates for your campaigns.",
  },
  {
    sidebarId: "chat",
    icon: MessageSquare,
    titleAr: "المحادثات",
    titleEn: "Conversations",
    descAr: "المحادثات — تواصل مباشرة مع عملائك في الوقت الفعلي.",
    descEn: "Conversations — chat directly with your customers in real-time.",
  },
  {
    sidebarId: "reports",
    icon: BarChart3,
    titleAr: "التقارير",
    titleEn: "Reports",
    descAr: "التقارير — تقارير تفصيلية عن أداء حملاتك ورسائلك ومعدلات التوصيل.",
    descEn: "Reports — detailed reports on your campaigns, messages, and delivery rates.",
  },
  {
    sidebarId: "automation",
    icon: Bot,
    titleAr: "الأتمتة الذكية",
    titleEn: "Smart Automation",
    descAr: "الأتمتة الذكية — اعمل ردود تلقائية وسيناريوهات ذكية تشتغل لوحدها.",
    descEn: "Smart Automation — set up auto-replies and smart scenarios that run automatically.",
  },
  {
    sidebarId: "store",
    icon: ShoppingBag,
    titleAr: "المتجر",
    titleEn: "Store",
    descAr: "المتجر — ربط متجرك الإلكتروني بواتساب واستقبل الطلبات تلقائياً.",
    descEn: "Store — connect your online store to WhatsApp and receive orders automatically.",
  },
  {
    sidebarId: "api",
    icon: Code,
    titleAr: "API",
    titleEn: "API",
    descAr: "API — للمطورين: وصّل واتساب بأنظمتك الخاصة وتحكم برمجياً.",
    descEn: "API — for developers: connect WhatsApp to your custom systems programmatically.",
  },
];

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  ar: {
    next:     "التالي",
    prev:     "السابق",
    skip:     "تخطي الجولة",
    finish:   "إنهاء الجولة 🎉",
    stepOf:   (c: number, t: number) => `${c} من ${t}`,
    tourTitle: "جولة تعريفية",
  },
  en: {
    next:     "Next",
    prev:     "Previous",
    skip:     "Skip Tour",
    finish:   "Finish Tour 🎉",
    stepOf:   (c: number, t: number) => `${c} of ${t}`,
    tourTitle: "Guided Tour",
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  locale:       "ar" | "en";
  onNavigate:   (section: string) => void;
  onComplete:   () => void;
}

export default function OnboardingTour({ locale, onNavigate, onComplete }: Props) {
  const [step, setStep]         = useState(0);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrowTop: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const t = T[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  // ── Position the tooltip next to the sidebar item ────────────────────────
  const updatePosition = useCallback(() => {
    const el = document.querySelector(`[data-sidebar-id="${current.sidebarId}"]`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 200;

    // Tooltip should appear to the left of sidebar in RTL, right in LTR
    const top = Math.max(
      16,
      Math.min(
        rect.top + rect.height / 2 - tooltipHeight / 2,
        window.innerHeight - tooltipHeight - 16
      )
    );

    const left = dir === "rtl"
      ? rect.left - 16 // tooltip to the left of sidebar
      : rect.right + 16; // tooltip to the right of sidebar

    const arrowTop = rect.top + rect.height / 2 - top;

    setTooltipPos({ top, left, arrowTop });
  }, [current.sidebarId, dir]);

  // ── Navigate to the section & position tooltip ───────────────────────────
  useEffect(() => {
    onNavigate(current.sidebarId);

    // Wait for sidebar to update, then position
    const timer = setTimeout(updatePosition, 100);
    window.addEventListener("resize", updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
    };
  }, [step, current.sidebarId, onNavigate, updatePosition]);

  // ── Step change animation ────────────────────────────────────────────────
  const goToStep = useCallback((nextStep: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsAnimating(false);
    }, 200);
  }, []);

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      goToStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      goToStep(step - 1);
    }
  };

  const handleFinish = () => {
    // Mark onboarding as completed in DB
    fetch("/api/user/onboarding", { method: "POST" }).catch(() => {});
    onComplete();
  };

  const handleSkip = () => {
    handleFinish();
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

      {/* Overlay — transparent but blocks interaction */}
      <div
        dir={dir}
        className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-[2px]"
        style={{ animation: "otFadeIn .3s ease forwards" }}
      />

      {/* Highlight the active sidebar item */}
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

      {/* Make sidebar visible above overlay */}
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

      {/* Tooltip */}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          dir={dir}
          className="fixed z-[58] w-[340px] max-w-[calc(100vw-2rem)]"
          style={{
            top: tooltipPos.top,
            ...(dir === "rtl"
              ? { right: `calc(100vw - ${tooltipPos.left}px)` }
              : { left: tooltipPos.left }),
            animation: isAnimating
              ? "otFadeOut .2s ease forwards"
              : "otSlideIn .35s ease forwards",
          }}
        >
          {/* Arrow pointing to sidebar */}
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
            {/* Header with progress */}
            <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-white" />
                <span className="text-white text-xs font-semibold">{t.tourTitle}</span>
              </div>
              <span className="text-white/80 text-xs font-medium">
                {t.stepOf(step + 1, TOUR_STEPS.length)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-100 dark:bg-gray-700">
              <div
                className="h-full bg-[#25D366] transition-all duration-500 ease-out"
                style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
              />
            </div>

            {/* Content */}
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

            {/* Actions */}
            <div className="px-5 pb-4 flex items-center gap-2">
              {/* Previous */}
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  {dir === "rtl" ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                  {t.prev}
                </button>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Skip */}
              <button
                onClick={handleSkip}
                className="px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                {t.skip}
              </button>

              {/* Next / Finish */}
              <button
                onClick={handleNext}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-[.97] ${
                  isLast
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

      {/* Step indicators (dots) */}
      <div className="fixed z-[58] bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-600">
        {TOUR_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => goToStep(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === step
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
