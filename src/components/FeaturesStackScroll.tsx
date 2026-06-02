// ─── Features Stack Scroll — v2 ──────────────────────────────────────────────
// فلسفة الـ animation:
//   • كل كارت "active" بيبقى على الشاشة فترة كافية (300px scroll)
//     قبل ما يبدأ يتقلب — عشان اليوزر يقرأ المحتوى
//   • الـ flip بيبدأ في آخر 35% بس من فترة الكارت — مش فوراً
//   • الكاردز الخلفية scale تفرق أوضح (7% per level) — Stack واضح
//   • الكارت الـ active فيها subtle glow بلون الـ accent بتاعها
//   • progress bar أعلى الشاشة بتبين مكان اليوزر في الرحلة
//   • StatsCounter متضمّن في الأسفل

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send, Brain, Store, Zap, BarChart3,
  MessageSquare, Users, Shield, UserCheck,
} from "lucide-react";
import { tr, type Lang } from "@/lib/translations";
import StatsCounter from "@/components/StatsCounter";

// ── Constants ─────────────────────────────────────────────────────────────────
const SCROLL_PER_CARD = 300;   // px لكل كارت — أكبر = وقت أطول لكل كارت
const FLIP_START      = 0.65;  // الـ flip يبدأ في 65% من الـ scroll window
const MAX_BEHIND      = 3;     // عدد الكاردز الخلفية المرئية

// ── Color meta ────────────────────────────────────────────────────────────────
const META = [
  { Icon: Send,          bg: "bg-[#25D366]",  accent: "#25D366", glow: "rgba(37,211,102,0.18)",  border: "border-green-100",  light: "bg-green-50",   text: "text-green-700"  },
  { Icon: Brain,         bg: "bg-violet-500", accent: "#7C3AED", glow: "rgba(124,58,237,0.15)",  border: "border-violet-100", light: "bg-violet-50",  text: "text-violet-700" },
  { Icon: Store,         bg: "bg-blue-500",   accent: "#3B82F6", glow: "rgba(59,130,246,0.15)",  border: "border-blue-100",   light: "bg-blue-50",    text: "text-blue-700"   },
  { Icon: Zap,           bg: "bg-orange-500", accent: "#F97316", glow: "rgba(249,115,22,0.15)",  border: "border-orange-100", light: "bg-orange-50",  text: "text-orange-700" },
  { Icon: BarChart3,     bg: "bg-teal-500",   accent: "#14B8A6", glow: "rgba(20,184,166,0.15)",  border: "border-teal-100",   light: "bg-teal-50",    text: "text-teal-700"   },
  { Icon: MessageSquare, bg: "bg-pink-500",   accent: "#EC4899", glow: "rgba(236,72,153,0.15)",  border: "border-pink-100",   light: "bg-pink-50",    text: "text-pink-700"   },
  { Icon: Users,         bg: "bg-indigo-500", accent: "#6366F1", glow: "rgba(99,102,241,0.15)",  border: "border-indigo-100", light: "bg-indigo-50",  text: "text-indigo-700" },
  { Icon: UserCheck,     bg: "bg-cyan-500",   accent: "#06B6D4", glow: "rgba(6,182,212,0.15)",   border: "border-cyan-100",   light: "bg-cyan-50",    text: "text-cyan-700"   },
  { Icon: Shield,        bg: "bg-rose-500",   accent: "#F43F5E", glow: "rgba(244,63,94,0.15)",   border: "border-rose-100",   light: "bg-rose-50",    text: "text-rose-700"   },
] as const;

type MetaItem = typeof META[number];
type BStr     = { ar: string; en: string };
type FItem    = { tag: BStr; hook: BStr; title: BStr; desc: BStr };

// ── Single card component ─────────────────────────────────────────────────────
function FeatureCard({
  item, meta, lang, index, total, isActive,
}: {
  item: FItem; meta: MetaItem; lang: Lang;
  index: number; total: number; isActive: boolean;
}) {
  const isAr = lang === "ar";
  const { Icon } = meta;

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className={`relative w-full rounded-3xl bg-white overflow-hidden ${meta.border} border`}
      style={{
        maxWidth: 560,
        boxShadow: isActive
          ? `0 20px 60px ${meta.glow}, 0 4px 20px rgba(0,0,0,0.08)`
          : "0 8px 32px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.4s ease",
      }}
    >
      {/* Accent stripe — بتتحرك مع الـ active state */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${meta.accent}, ${meta.accent}66)`,
          transformOrigin: isAr ? "right" : "left",
          transform: isActive ? "scaleX(1)" : "scaleX(0.4)",
          transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        }}
      />

      <div className="p-7 pt-6">
        {/* Row: icon ↔ tag + counter */}
        <div className="flex items-start justify-between mb-5">
          {/* Icon */}
          <div
            className={`w-14 h-14 ${meta.bg} rounded-2xl flex items-center justify-center shrink-0`}
            style={{
              boxShadow: isActive ? `0 8px 24px ${meta.glow}` : "none",
              transform: isActive ? "scale(1.05)" : "scale(1)",
              transition: "box-shadow 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <Icon className="w-7 h-7 text-white" strokeWidth={2} />
          </div>

          {/* Tag + counter */}
          <div className="flex flex-col items-end gap-1.5">
            <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${meta.light} ${meta.text}`}>
              {tr(item.tag, lang)}
            </span>
            <span className="text-xs text-gray-300 font-medium tabular-nums">
              {index + 1} / {total}
            </span>
          </div>
        </div>

        {/* Hook */}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
          {tr(item.hook, lang)}
        </p>

        {/* Title */}
        <h3 className="text-[1.2rem] font-black text-gray-900 leading-snug mb-3">
          {tr(item.title, lang)}
        </h3>

        {/* Desc */}
        <p className="text-sm text-gray-500 leading-relaxed">
          {tr(item.desc, lang)}
        </p>

        {/* Active indicator line */}
        {isActive && (
          <div
            className="mt-5 h-0.5 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${meta.accent}, transparent)`,
              animation: "expand-line 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Progress bar (أعلى الشاشة) ────────────────────────────────────────────────
function ProgressBar({ current, total, accent }: { current: number; total: number; accent: string }) {
  const pct = ((current) / (total - 1)) * 100;
  return (
    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gray-100 z-50">
      <div
        style={{
          width: `${pct}%`,
          background: accent,
          height: "100%",
          transition: "width 0.3s ease, background 0.4s ease",
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface Props { items: readonly FItem[]; lang: Lang }

export default function FeaturesStackScroll({ items, lang }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ idx: 0, prog: 0 });

  const onScroll = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const scrolled  = -el.getBoundingClientRect().top;
    const maxScroll = (items.length - 1) * SCROLL_PER_CARD;

    if (scrolled <= 0)         { setState({ idx: 0,              prog: 0 }); return; }
    if (scrolled >= maxScroll) { setState({ idx: items.length-1, prog: 0 }); return; }

    const raw = scrolled / SCROLL_PER_CARD;
    const idx = Math.floor(raw);
    setState({ idx, prog: raw - idx });
  }, [items.length]);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const { idx, prog } = state;
  const totalH = (items.length - 1) * SCROLL_PER_CARD;
  const currentAccent = META[idx]?.accent ?? "#25D366";

  return (
    <div ref={wrapperRef} style={{ height: `calc(100svh + ${totalH}px)` }}>
      <div
        className="sticky top-0 flex flex-col items-center justify-center bg-gray-50"
        style={{ height: "100svh", perspective: "1400px" }}
      >
        {/* ── Progress bar ─────────────────────────────────────────────────── */}
        <ProgressBar current={idx} total={items.length} accent={currentAccent} />

        {/* ── Cards stack ──────────────────────────────────────────────────── */}
        <div
          className="relative w-full px-4"
          style={{ height: "min(420px, 80svh)" }}
        >
          {items.map((item, i) => {
            if (i < idx) return null;
            const rel = i - idx;
            if (rel > MAX_BEHIND) return null;

            const isActive = rel === 0;
            const isNext   = rel === 1;

            let transform: string;
            let opacity:   number;
            let zIndex:    number = 50 - rel;

            if (isActive) {
              // الـ flip يبدأ بعد FLIP_START فقط
              const flipProg = prog < FLIP_START
                ? 0
                : (prog - FLIP_START) / (1 - FLIP_START);

              const angle = flipProg * -80;
              const ty    = flipProg * -3;
              const scale = 1 - flipProg * 0.05;

              transform = `rotateX(${angle}deg) translateY(${ty}%) scale(${scale})`;
              opacity   = flipProg > 0.6
                ? Math.max(0, 1 - (flipProg - 0.6) / 0.4)
                : 1;
            } else {
              // الكاردز الخلفية — scale تفرق أوضح
              const baseScale  = 1 - rel * 0.07;
              const baseTransY = rel * 18;

              // لما الـ active بيبدأ يتقلب → الكاردز الخلفية تتقدم
              const flipProg = prog < FLIP_START
                ? 0
                : (prog - FLIP_START) / (1 - FLIP_START);

              const scaleAdj  = isNext ? flipProg * 0.07 : 0;
              const transAdj  = isNext ? flipProg * 18   : 0;

              transform = `translateY(${baseTransY - transAdj}px) scale(${baseScale + scaleAdj})`;
              opacity   = rel === 1 ? 0.85 + flipProg * 0.15
                        : rel === 2 ? 0.6
                        :             0.35;
            }

            return (
              <div
                key={i}
                className="absolute inset-x-0 flex justify-center"
                style={{
                  transformOrigin: "bottom center",
                  transform,
                  opacity,
                  zIndex,
                  willChange: "transform, opacity",
                  transition: isActive ? "none" : "transform 0.1s ease-out, opacity 0.1s ease-out",
                }}
              >
                <FeatureCard
                  item={item}
                  meta={META[i]}
                  lang={lang}
                  index={i}
                  total={items.length}
                  isActive={isActive}
                />
              </div>
            );
          })}
        </div>

        {/* ── Progress dots ─────────────────────────────────────────────────── */}
        <div className="absolute bottom-10 flex items-center gap-[6px]">
          {items.map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width:      i === idx ? 32 : 8,
                height:     8,
                background: i === idx ? currentAccent : i < idx ? "#CBD5E1" : "#E2E8F0",
                transition: "width 0.35s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* ── Scroll hint ───────────────────────────────────────────────────── */}
        <div
          className="absolute bottom-[72px] flex flex-col items-center gap-1.5 pointer-events-none"
          style={{
            opacity:    idx === 0 && prog < 0.06 ? 1 - prog * 16 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          <span className="text-xs text-gray-400 font-medium">
            {lang === "ar" ? "اسكرول للاستكشاف" : "Scroll to explore"}
          </span>
          <svg
            viewBox="0 0 14 18"
            className="w-3.5 h-4 text-gray-300 animate-bounce"
            fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          >
            <path d="M7 1v12M2 9l5 6 5-6" />
          </svg>
        </div>

      </div>

      {/* ── Stats counter — يظهر تحت الـ sticky section ───────────────────── */}
      <div className="bg-gray-50 px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-4xl mx-auto">
          <StatsCounter lang={lang} />
        </div>
      </div>
    </div>
  );
}