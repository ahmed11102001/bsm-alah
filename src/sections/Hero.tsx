"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Play, Sparkles, Zap, Shield, Send, Paperclip, Smile, MoreVertical, Phone, Video, CheckCheck } from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";

interface HeroProps {
  onLoginClick: () => void;
  lang: Lang;
}

const Users = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

export default function Hero({ onLoginClick, lang }: HeroProps) {
  const isAr = lang === "ar";

  const scrollToSection = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366]">
        {/* Static blobs — no animate-pulse to reduce TBT */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

          {/* Content */}
          <div className={`text-center ${isAr ? "lg:text-right" : "lg:text-left"}`}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-[#25D366] animate-pulse" />
              <span className="text-white/90 text-sm font-medium">{tr(t.hero.badge, lang)}</span>
            </div>

            <h1 className="text-4xl sm:text-4xl lg:text-6xl font-bold text-white leading-tight mb-6">
              {tr(t.hero.h1a, lang)}
              <span className="block text-[#25D366] drop-shadow-lg">{tr(t.hero.h1highlight, lang)}</span>
              {tr(t.hero.h1b, lang)}
            </h1>

            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {tr(t.hero.subtitle, lang)}
            </p>

            {/* Stats */}
            <div className={`flex flex-wrap justify-center ${isAr ? "lg:justify-start" : "lg:justify-start"} gap-6 mb-8`}>
              {[
                { icon: Zap,    label: tr(t.hero.stat1, lang) },
                { icon: Shield, label: tr(t.hero.stat2, lang) },
                { icon: CheckCheck, label: tr(t.hero.stat3, lang) },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-white/90 group hover:scale-105 transition-transform duration-300">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors">
                    <Icon className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className={`flex flex-col sm:flex-row gap-4 justify-center ${isAr ? "lg:justify-start" : "lg:justify-start"}`}>
              <Button
                onClick={onLoginClick}
                size="lg"
                className="bg-white text-[#128C7E] hover:bg-white/90 px-8 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {tr(t.hero.cta, lang)}
                <ArrowIcon className="w-5 h-5 mr-2" />
              </Button>
              <Button
                onClick={() => scrollToSection("#how-it-works")}
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 px-8 group"
              >
                <Play className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform duration-300" />
                {tr(t.hero.ctaWatch, lang)}
              </Button>
            </div>
          </div>

          {/* Phone Mockup — visible on all screens, smaller on mobile */}
          <div className="relative flex justify-center lg:block mt-6 lg:mt-0">
            <div className="relative w-[240px] sm:w-[280px] lg:w-auto">
              <div className="relative bg-white rounded-[2.5rem] lg:rounded-[3rem] p-2.5 lg:p-3 shadow-2xl max-w-sm mx-auto lg:hover:scale-105 transition-transform duration-700">
                <div className="bg-[#ECE5DD] rounded-[2.5rem] overflow-hidden">
                  {/* Chat header */}
                  <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg">
                      <span className="text-white text-xl font-bold">و</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{tr(t.hero.chatHeader, lang)}</div>
                      <div className="text-xs text-green-300 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        {tr(t.hero.chatOnline, lang)}
                      </div>
                    </div>
                    <div className="flex gap-4 text-white/80">
                      <Phone className="w-5 h-5" />
                      <Video className="w-5 h-5" />
                      <MoreVertical className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Chat area */}
                  <div className="h-[280px] sm:h-[340px] lg:h-[420px] overflow-y-auto p-3 lg:p-4 space-y-3 bg-[#ECE5DD] relative">
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl rounded-tr-none px-4 py-2 max-w-[85%] shadow-sm">
                        <p className="text-gray-800 text-sm">{tr(t.hero.msg1, lang)}</p>
                        <span className="text-[10px] text-gray-400 float-left mt-1">10:30</span>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#DCF8C6] rounded-2xl rounded-tl-none px-4 py-2 max-w-[85%] shadow-sm">
                        <p className="text-gray-800 text-sm">{tr(t.hero.msg2, lang)}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-gray-500">10:31</span>
                          <CheckCheck className="w-3.5 h-3.5 text-[#25D366]" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#DCF8C6] rounded-2xl rounded-tl-none px-4 py-2 max-w-[85%] shadow-sm">
                        <p className="text-gray-800 text-sm">{tr(t.hero.msg3, lang)}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-gray-500">10:32</span>
                          <CheckCheck className="w-3.5 h-3.5 text-[#25D366]" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl rounded-tr-none px-4 py-2 shadow-sm">
                        <div className="flex gap-1 items-center">
                          <span className="w-2 h-2 bg-[#25D366] rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-[#25D366] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                          <span className="w-2 h-2 bg-[#25D366] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                          <span className="text-xs text-gray-500 mr-2">{tr(t.hero.typing, lang)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 bg-white/90 rounded-xl p-3 border border-green-200 shadow-md">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">📨 {tr(t.hero.statMsg, lang)}</span>
                        <span className="text-[#25D366] font-bold">5,678</span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-gray-600">👥 {tr(t.hero.statCont, lang)}</span>
                        <span className="text-[#25D366] font-bold">8</span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#25D366] rounded-full animate-pulse" style={{ width: "75%" }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Input bar */}
                  <div className="bg-[#F0F0F0] p-3 flex items-center gap-2">
                    <Smile className="w-6 h-6 text-gray-500" />
                    <Paperclip className="w-5 h-5 text-gray-500" />
                    <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-gray-500">
                      {tr(t.hero.chatInput, lang)}
                    </div>
                    <div className="bg-[#25D366] text-white rounded-full p-2">
                      <Send className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating cards — hidden on small phones, visible sm+ */}
              <div className="hidden sm:block absolute -top-6 -right-6 lg:-top-8 lg:-right-8 bg-white rounded-2xl p-3 lg:p-4 shadow-xl animate-bounce" style={{ animationDuration: "3s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCheck className="w-5 h-5 text-[#25D366]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{tr(t.hero.floatSent, lang)}</p>
                    <p className="text-xs text-gray-500">{tr(t.hero.floatSentSub, lang)}</p>
                  </div>
                </div>
              </div>

              <div className="hidden sm:block absolute -bottom-6 -left-6 lg:-bottom-8 lg:-left-8 bg-white rounded-2xl p-3 lg:p-4 shadow-xl animate-bounce" style={{ animationDuration: "3s", animationDelay: "1s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{tr(t.hero.floatConts, lang)}</p>
                    <p className="text-xs text-gray-500">{tr(t.hero.floatContsSub, lang)}</p>
                  </div>
                </div>
              </div>

              <div className="hidden sm:block absolute top-1/2 -right-10 lg:-right-12 -translate-y-1/2 bg-white rounded-2xl p-3 shadow-xl">
                <div className="text-center">
                  <div className="text-[#25D366] font-bold text-xl">98%</div>
                  <div className="text-xs text-gray-500">{tr(t.hero.floatRate, lang)}</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H0Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}