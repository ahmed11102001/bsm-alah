"use client";

import { useRouter } from "next/navigation";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import type { Locale } from "@/lib/i18n";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShoppingCart,
  PackageCheck,
  Star,
  RefreshCcw,
  Undo2,
  Filter,
  Headset,
  Lock,
  Play,
} from "lucide-react";
import React from "react";

// ─────────────────────────────────────────────────────────────────────────
// نصوص الصفحة — محلية هنا بدل ما نضيفها لملف الترجمة الرئيسي (i18n.ts) الكبير،
// عشان الصفحة دي معزولة بهويتها البصرية عن باقي الداشبورد ومش عايزين نأثر
// على ملف مشترك ضخم لمساحة صغيرة زي دي.
// ─────────────────────────────────────────────────────────────────────────
const copy = {
  ar: {
    back: "العودة للداشبورد",
    title: "الاستراتيجيات",
    subtitle: "مش شاشات، ولا خطوات — دي أساليب تفكير تجارية شغالة لوحدها",
    live: "شاهد الاستراتيجية",
    soon: "قريبًا",
    footer: "كل استراتيجية بتتكلم نفس اللغة البصرية، بقصة مختلفة",
  },
  en: {
    back: "Back to dashboard",
    title: "Strategies",
    subtitle: "Not screens, not steps — these are business instincts, running on their own",
    live: "Watch the strategy",
    soon: "Soon",
    footer: "Every strategy speaks the same visual language, telling a different story",
  },
} as const;

type StrategyDef = {
  slug: string | null; // null = لسه مفيش فيلم لها (coming soon)
  icon: React.ElementType;
  accent: string; // hex — لون هوية الكارت
  glow: string; // rgba للـ glow
  name: { ar: string; en: string };
  line: { ar: string; en: string };
};

const STRATEGIES: StrategyDef[] = [
  {
    slug: "abandoned-cart",
    icon: ShoppingCart,
    accent: "#f2b84a",
    glow: "rgba(242,184,74,0.35)",
    name: { ar: "استرجاع السلة المتروكة", en: "Abandoned Cart Recovery" },
    line: {
      ar: "لحظة كادت تضيع، والنظام لاحظها في الوقت المناسب",
      en: "A moment nearly lost — noticed in time.",
    },
  },
  {
    slug: null,
    icon: PackageCheck,
    accent: "#bcd2ff",
    glow: "rgba(188,210,255,0.30)",
    name: { ar: "تأكيد الطلب", en: "Order Confirmation" },
    line: {
      ar: "أول طمأنينة يحسها العميل بعد الشراء",
      en: "The first reassurance after a purchase.",
    },
  },
  {
    slug: null,
    icon: Star,
    accent: "#e3c98a",
    glow: "rgba(227,201,138,0.30)",
    name: { ar: "طلب التقييم", en: "Review Requests" },
    line: {
      ar: "دعوة هادئة للرأي، من غير إلحاح",
      en: "A quiet invitation to speak, without pressure.",
    },
  },
  {
    slug: null,
    icon: RefreshCcw,
    accent: "#7fa0c9",
    glow: "rgba(127,160,201,0.30)",
    name: { ar: "إعادة تفعيل العملاء", en: "Customer Re-engagement" },
    line: {
      ar: "ضوء خافت من زمان، يتذكره النظام قبل ما يتذكره هو",
      en: "A light that dimmed a while ago — remembered before it's forgotten.",
    },
  },
  {
    slug: null,
    icon: Undo2,
    accent: "#ff7a68",
    glow: "rgba(255,122,104,0.32)",
    name: { ar: "استعادة العملاء الغائبين", en: "Win-back Campaigns" },
    line: {
      ar: "أبعد نقطة في المجال، والوحيدة اللي رجوعها احتفال",
      en: "The farthest point in the field — the only return worth celebrating.",
    },
  },
  {
    slug: null,
    icon: Filter,
    accent: "#b48ee0",
    glow: "rgba(180,142,224,0.30)",
    name: { ar: "تأهيل العملاء المحتملين", en: "Lead Qualification" },
    line: {
      ar: "مش كل ضوء جديد يستاهل نفس الاهتمام",
      en: "Not every new light deserves the same attention.",
    },
  },
  {
    slug: null,
    icon: Headset,
    accent: "#5fd0c9",
    glow: "rgba(95,208,201,0.30)",
    name: { ar: "أتمتة الدعم الفني", en: "Customer Support Automation" },
    line: {
      ar: "توتر مفاجئ، يتهدى بسرعة مش بانفجار",
      en: "A sudden flare — settled quickly, not explosively.",
    },
  },
];

function StrategyCard({ s, locale }: { s: StrategyDef; locale: Locale }) {
  const Icon = s.icon;
  const isLive = !!s.slug;
  const t = copy[locale];

  const content = (
    <div
      className="group relative h-full rounded-3xl border p-6 sm:p-7 flex flex-col justify-between overflow-hidden transition-all duration-300"
      style={{
        background: "linear-gradient(155deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
        borderColor: isLive ? `${s.accent}55` : "rgba(255,255,255,0.08)",
        boxShadow: isLive ? `0 0 0 1px ${s.accent}22` : undefined,
      }}
    >
      {/* توهج خلفي بلون الاستراتيجية */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-60 transition-opacity duration-300 group-hover:opacity-90"
        style={{ background: s.glow }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
          style={{
            background: `${s.accent}1a`,
            boxShadow: isLive ? `0 0 24px ${s.glow}` : undefined,
          }}
        >
          <Icon style={{ color: s.accent, width: 22, height: 22 }} />
        </div>

        {isLive ? (
          <span
            className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full"
            style={{ color: s.accent, background: `${s.accent}14`, border: `1px solid ${s.accent}33` }}
          >
            <Play className="w-3 h-3" fill="currentColor" />
            {t.live}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide px-2.5 py-1 rounded-full text-white/35 border border-white/10">
            <Lock className="w-3 h-3" />
            {t.soon}
          </span>
        )}
      </div>

      <div className="relative mt-6 space-y-2">
        <h3 className="text-[1.05rem] sm:text-lg font-bold text-white/90 leading-snug">
          {s.name[locale]}
        </h3>
        <p className="text-[0.85rem] sm:text-sm text-white/45 leading-relaxed">
          {s.line[locale]}
        </p>
      </div>
    </div>
  );

  if (!isLive) {
    return <div className="cursor-not-allowed select-none opacity-70">{content}</div>;
  }

  return (
    <a
      href={`/strategies/${s.slug}.html`}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full active:scale-[0.98] transition-transform duration-150"
      aria-label={s.name[locale]}
    >
      {content}
    </a>
  );
}

function StrategiesInner() {
  const router = useRouter();
  const { locale, setLocale, dir } = useLanguage();
  const t = copy[locale];
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div dir={dir} className="min-h-screen relative overflow-hidden" style={{ background: "#050710" }}>
      {/* خلفية الفيلد — نفس هوية أفلام الاستراتيجيات */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(20,26,48,0.9) 0%, rgba(5,7,16,1) 70%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* الهيدر */}
        <div className="flex items-center justify-between gap-3 mb-8 sm:mb-12">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-white/50 hover:text-white/85 text-sm font-medium transition-colors px-3 py-2 rounded-xl hover:bg-white/5"
          >
            <BackIcon className="w-4 h-4" />
            <span className="hidden xs:inline">{t.back}</span>
          </button>

          <button
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="text-[11px] font-semibold tracking-widest text-white/45 hover:text-white/80 border border-white/10 hover:border-white/25 rounded-full px-3 py-1.5 transition-colors"
          >
            {locale === "ar" ? "EN" : "AR"}
          </button>
        </div>

        {/* عنوان الصفحة */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.3em] uppercase text-amber-300/70 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Wani
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3">
            {t.title}
          </h1>
          <p className="text-white/45 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        {/* شبكة الكروت */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {STRATEGIES.map((s) => (
            <StrategyCard key={s.name.en} s={s} locale={locale} />
          ))}
        </div>

        <p className="text-center text-white/25 text-xs mt-10 sm:mt-14">{t.footer}</p>
      </div>
    </div>
  );
}

export default function StrategiesPage() {
  return (
    <LanguageProvider>
      <StrategiesInner />
    </LanguageProvider>
  );
}