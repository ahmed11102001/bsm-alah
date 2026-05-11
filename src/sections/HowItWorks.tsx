"use client";

import { useState } from "react";
import {
  Upload, FileText, Rocket, BarChart3,
  ArrowLeft, ArrowRight, Store, Bot,
  Zap, TrendingUp, Link2,
} from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";

// ─── Workflow tabs ────────────────────────────────────────────────────────────
const BASIC_META = [
  { icon: Upload,    color: "bg-blue-500",   ring: "ring-blue-100"   },
  { icon: FileText,  color: "bg-[#25D366]",  ring: "ring-green-100"  },
  { icon: Rocket,    color: "bg-purple-500", ring: "ring-purple-100" },
  { icon: BarChart3, color: "bg-orange-500", ring: "ring-orange-100" },
];

const AI_META = [
  { icon: Store,      color: "bg-blue-500",   ring: "ring-blue-100"   },
  { icon: Bot,        color: "bg-purple-500", ring: "ring-purple-100" },
  { icon: Zap,        color: "bg-[#25D366]",  ring: "ring-green-100"  },
  { icon: TrendingUp, color: "bg-orange-500", ring: "ring-orange-100" },
];

const AI_STEPS = {
  ar: [
    {
      time:  "٥ دقائق",
      title: "اربط متجرك",
      what:  "Shopify أو EasyOrders",
      desc:  "اربط متجرك بخطوات بسيطة. كل أوردر جديد هيوصل لواتس برو تلقائياً من اللحظة دي.",
    },
    {
      time:  "دقيقتين",
      title: "فعّل الـ AI والأتمتة",
      what:  "بدون كودينج خالص",
      desc:  "حدد رسائل التأكيد والشحن والمتابعة. وفعّل الـ AI Sales Assistant على Catalog منتجاتك.",
    },
    {
      time:  "فوري",
      title: "الـ AI يبدأ يبيع",
      what:  "٢٤/٧ بدون تدخل",
      desc:  "الـ AI بيرد على العملاء، بيقترح منتجات، ويتابع السلة المتروكة — وأنت شايل بالك.",
    },
    {
      time:  "مستمر",
      title: "تابع Revenue Attribution",
      what:  "كل حملة = كم أوردر؟",
      desc:  "شوف بالظبط كل حملة واتساب أنتجت كام أوردر وكام إيراد — وحسّن على أساس بيانات حقيقية.",
    },
  ],
  en: [
    {
      time:  "5 minutes",
      title: "Connect your store",
      what:  "Shopify or EasyOrders",
      desc:  "Connect your store in a few steps. Every new order will reach WhatsPro automatically from that moment.",
    },
    {
      time:  "2 minutes",
      title: "Enable AI & Automation",
      what:  "Zero coding required",
      desc:  "Set up confirmation, shipping, and follow-up messages. Enable the AI Sales Assistant on your product catalog.",
    },
    {
      time:  "Instant",
      title: "AI starts selling",
      what:  "24/7, hands-free",
      desc:  "The AI replies to customers, suggests products, and follows up on abandoned carts — while you focus elsewhere.",
    },
    {
      time:  "Ongoing",
      title: "Track Revenue Attribution",
      what:  "Campaign → orders → revenue",
      desc:  "See exactly how many orders and how much revenue each WhatsApp campaign generated — optimize based on real data.",
    },
  ],
};

const NUMS = ["01", "02", "03", "04"];

interface HowItWorksProps { lang: Lang; onLoginClick?: () => void; }

export default function HowItWorks({ lang, onLoginClick }: HowItWorksProps) {
  const isAr      = lang === "ar";
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const [tab, setTab] = useState<"basic" | "ai">("basic");

  const basicSteps = t.how.steps;
  const aiSteps    = isAr ? AI_STEPS.ar : AI_STEPS.en;
  const meta       = tab === "basic" ? BASIC_META : AI_META;

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 mb-4">
            <Rocket className="w-3.5 h-3.5 text-[#25D366]" />
            <span className="text-gray-600 text-sm font-medium">{tr(t.how.badge, lang)}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-3 tracking-tight">
            {tr(t.how.h2a, lang)}{" "}
            <span className="text-[#25D366]">{tr(t.how.h2b, lang)}</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed mb-8">
            {tr(t.how.subtitle, lang)}
          </p>

          {/* ── Tab switcher ── */}
          <div className="inline-flex bg-gray-100 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setTab("basic")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === "basic"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              {isAr ? "إرسال وحملات" : "Sending & Campaigns"}
            </button>
            <button
              onClick={() => setTab("ai")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === "ai"
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              {isAr ? "متجر + AI" : "Store + AI"}
              <span className="text-[10px] bg-[#25D366] text-white px-1.5 py-0.5 rounded-full font-bold">
                NEW
              </span>
            </button>
          </div>
        </div>

        {/* ── Steps ── */}
        <div className="relative">
          {/* connecting line */}
          <div className="hidden lg:block absolute top-14 right-[12.5%] left-[12.5%] h-px bg-gradient-to-r from-blue-200 via-green-200 to-orange-200 z-0" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {meta.map((m, i) => {
              const Icon = m.icon;
              const s    = tab === "basic" ? basicSteps[i] : null;

              return (
                <div key={`${tab}-${i}`} className="flex flex-col items-center text-center group">
                  {/* icon */}
                  <div className={`relative w-14 h-14 ${m.color} ring-4 ${m.ring} rounded-2xl
                    flex items-center justify-center mb-4 shadow-md
                    group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="w-6 h-6 text-white" />
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-gray-200
                      rounded-full text-[10px] font-bold text-gray-500 flex items-center justify-center shadow-sm">
                      {NUMS[i]}
                    </span>
                  </div>

                  {/* time badge */}
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    {tab === "basic" ? tr(s!.time, lang) : aiSteps[i].time}
                  </span>

                  {/* title */}
                  <h3 className="text-sm font-bold text-gray-900 mb-1 leading-snug">
                    {tab === "basic" ? tr(s!.title, lang) : aiSteps[i].title}
                  </h3>

                  {/* what */}
                  <p className="text-xs font-semibold text-[#25D366] mb-2">
                    {tab === "basic" ? tr(s!.what, lang) : aiSteps[i].what}
                  </p>

                  {/* desc */}
                  <p className="text-xs text-gray-500 leading-relaxed max-w-[190px]">
                    {tab === "basic" ? tr(s!.desc, lang) : aiSteps[i].desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="mt-12 bg-gray-50 border border-gray-100 rounded-3xl p-7 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className={`text-center ${isAr ? "sm:text-right" : "sm:text-left"}`}>
            <p className="text-base font-bold text-gray-900 mb-1">{tr(t.how.ctaTitle, lang)}</p>
            <p className="text-sm text-gray-400">{tr(t.how.ctaSub, lang)}</p>
          </div>
          <button
            onClick={onLoginClick}
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bb5a]
              text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap
              active:scale-95"
          >
            {tr(t.how.ctaBtn, lang)}
            <ArrowIcon className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
}