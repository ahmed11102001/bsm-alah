"use client";

import { useState, useEffect } from "react";
import { Bot, Sparkles, ShieldCheck, Lightbulb, Zap, Navigation } from "lucide-react";

interface Props {
  locale: "ar" | "en";
  onStartTour: () => void;
}

const T = {
  ar: {
    greeting: "أهلاً! أنا مساعدك الذكي في  وني 👋",
    subtitle: "هنا عشان أساعدك تستخدم المنتج صح وتجنب المشاكل قبل ما تحصل.",
    features: [
      { icon: ShieldCheck, text: "أحذرك قبل أي خطوة ممكن تسبب حظر الواتساب" },
      { icon: Lightbulb, text: "أديك نصايح مخصصة لنشاطك وعلى حسب الصفحة" },
      { icon: Zap, text: "أعرفك على أفضل طريقة تستخدم كل feature" },
    ],
    activate: "ابدأ الجولة",
    badge: "مساعد ذكي جديد ✨",
  },
  en: {
    greeting: "Hey! I'm your smart assistant in WhatsPro 👋",
    subtitle: "I'm here to help you use the product correctly and avoid problems before they happen.",
    features: [
      { icon: ShieldCheck, text: "Warn you before any step that could get your WhatsApp blocked" },
      { icon: Lightbulb, text: "Give you personalized tips based on your activity and current page" },
      { icon: Zap, text: "Help you get the most out of every feature" },
    ],
    activate: "Start the Tour",
    badge: "New Smart Assistant ✨",
  },
};

export default function WelcomeBanner({ locale, onStartTour }: Props) {
  const [visible, setVisible] = useState(false);
  const t = T[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    // أظهره بعد 800ms — بعد ما الداشبورد يتحمل
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleStartTour = () => {
    setVisible(false);
    setTimeout(onStartTour, 300);
  };

  if (!visible) return null;

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      style={{ animation: "wpFadeIn .3s ease forwards" }}
    >
      <style>{`
        @keyframes wpFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes wpSlideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <div
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700"
        style={{ animation: "wpSlideUp .35s ease forwards" }}
      >
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-[#25D366] via-[#1fbe5c] to-[#128C7E] px-6 pt-6 pb-8 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <span className="bg-white/25 text-white text-xs font-semibold px-3 py-1 rounded-full">
              {t.badge}
            </span>
          </div>

          <h2 className="text-white text-xl font-bold leading-snug">{t.greeting}</h2>
          <p className="text-white/80 text-sm mt-1 leading-relaxed">{t.subtitle}</p>
        </div>

        {/* Features */}
        <div className="px-6 py-5 space-y-3.5">
          {t.features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-[#25D366]" />
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{f.text}</p>
              </div>
            );
          })}
        </div>

        {/* Action — single "Start Tour" button */}
        <div className="px-6 pb-6">
          <button
            onClick={handleStartTour}
            className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white font-semibold py-3 rounded-2xl text-sm transition-all duration-200 active:scale-[.98] flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            {t.activate}
          </button>
        </div>
      </div>
    </div>
  );
}