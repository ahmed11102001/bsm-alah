// ─── Features Stack Scroll ────────────────────────────────────────────────────
// "use client" — كل الـ animation من scroll position مباشرة، صفر timers
// الكاردز مكدسة فوق بعض، كل scroll بيقلب الكارت للخلف ويكشف اللي تحته

"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send, Brain, Store, Zap, BarChart3,
  MessageSquare, Users, Shield, UserCheck,
} from "lucide-react";
import { tr, type Lang } from "@/lib/translations";

// ── Constants ─────────────────────────────────────────────────────────────────
const SCROLL_PER_CARD = 200;   // px لكل كارت
const MAX_BEHIND      = 3;     // كام كارت يبانوا وراء الأكتيف

// ── Color meta ────────────────────────────────────────────────────────────────
const META = [
  { Icon: Send,          bg: "bg-[#25D366]",  light: "bg-green-50",   border: "border-green-200",  text: "text-green-700",  accent: "#25D366" },
  { Icon: Brain,         bg: "bg-purple-500", light: "bg-purple-50",  border: "border-purple-200", text: "text-purple-700", accent: "#8B5CF6" },
  { Icon: Store,         bg: "bg-blue-500",   light: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",   accent: "#3B82F6" },
  { Icon: Zap,           bg: "bg-orange-500", light: "bg-orange-50",  border: "border-orange-200", text: "text-orange-700", accent: "#F97316" },
  { Icon: BarChart3,     bg: "bg-teal-500",   light: "bg-teal-50",    border: "border-teal-200",   text: "text-teal-700",   accent: "#14B8A6" },
  { Icon: MessageSquare, bg: "bg-pink-500",   light: "bg-pink-50",    border: "border-pink-200",   text: "text-pink-700",   accent: "#EC4899" },
  { Icon: Users,         bg: "bg-indigo-500", light: "bg-indigo-50",  border: "border-indigo-200", text: "text-indigo-700", accent: "#6366F1" },
  { Icon: UserCheck,     bg: "bg-cyan-500",   light: "bg-cyan-50",    border: "border-cyan-200",   text: "text-cyan-700",   accent: "#06B6D4" },
  { Icon: Shield,        bg: "bg-rose-500",   light: "bg-rose-50",    border: "border-rose-200",   text: "text-rose-700",   accent: "#F43F5E" },
] as const;

type MetaItem = (typeof META)[number];
type BStr     = { ar: string; en: string };
type FItem    = { tag: BStr; hook: BStr; title: BStr; desc: BStr };

// ── Single card ───────────────────────────────────────────────────────────────
function FeatureCard({
  item, meta, lang, index, total,
}: {
  item:   FItem;
  meta:   MetaItem;
  lang:   Lang;
  index:  number;
  total:  number;
}) {
  const isAr = lang === "ar";
  const { Icon } = meta;

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className={`relative w-full rounded-3xl bg-white border ${meta.border} overflow-hidden`}
      style={{
        maxWidth: 560,
        boxShadow: "0 12px 56px rgba(0,0,0,0.11), 0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Accent top stripe */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${meta.accent}, ${meta.accent}88)` }} />

      <div className="p-7 pt-6">
        {/* Row: icon ← → tag + counter */}
        <div className="flex items-start justify-between mb-5">
          <div
            className={`w-14 h-14 ${meta.bg} rounded-2xl flex items-center justify-center shrink-0`}
            style={{ boxShadow: `0 6px 20px ${meta.accent}55` }}
          >
            <Icon className="w-7 h-7 text-white" strokeWidth={2} />
          </div>

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
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props { items: readonly FItem[]; lang: Lang }

export default function FeaturesStackScroll({ items, lang }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ idx: 0, prog: 0 });

  useEffect(() => {
    const onScroll = () => {
      const el = wrapperRef.current;
      if (!el) return;

      const scrolled = -el.getBoundingClientRect().top;
      const maxScroll = (items.length - 1) * SCROLL_PER_CARD;

      if (scrolled <= 0)          { setState({ idx: 0,                   prog: 0 }); return; }
      if (scrolled >= maxScroll)  { setState({ idx: items.length - 1,    prog: 0 }); return; }

      const raw  = scrolled / SCROLL_PER_CARD;
      const idx  = Math.floor(raw);
      setState({ idx, prog: raw - idx });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [items.length]);

  const { idx, prog } = state;
  const totalH = (items.length - 1) * SCROLL_PER_CARD;

  return (
    <div
      ref={wrapperRef}
      style={{ height: `calc(100svh + ${totalH}px)` }}
    >
      <div
        className="sticky top-0 flex flex-col items-center justify-center bg-gray-50"
        style={{ height: "100svh", perspective: "1400px" }}
      >

        {/* ── Cards stack ──────────────────────────────────────────────────── */}
        <div className="relative w-full px-4" style={{ height: 360 }}>
          {items.map((item, i) => {
            if (i < idx) return null;          // gone
            const rel = i - idx;               // 0 = active, 1 = next, …
            if (rel > MAX_BEHIND) return null; // outside visible stack

            const isActive = rel === 0;
            const isNext   = rel === 1;

            /* ─ transforms ─ */
            let transform: string;
            let opacity:   number;

            if (isActive) {
              // قلبة للخلف على rotateX مع fade
              const angle = prog * -88;
              const ty    = prog * -4;
              transform   = `rotateX(${angle}deg) translateY(${ty}%)`;
              opacity     = prog > 0.52 ? Math.max(0, 1 - (prog - 0.52) / 0.48) : 1;
            } else {
              // الكاردز الخلفية تتحرك للأمام تدريجياً
              const scale = (1 - rel * 0.05) + (isNext ? prog * 0.05 : 0);
              const ty    = (rel * 14)        - (isNext ? prog * 14   : 0);
              transform   = `translateY(${ty}px) scale(${scale})`;
              opacity     = rel === 1 ? 0.9 + prog * 0.1
                          : rel === 2 ? 0.65
                          :             0.4;
            }

            return (
              <div
                key={i}
                className="absolute inset-x-0 flex justify-center"
                style={{
                  transformOrigin: "bottom center",
                  transform,
                  opacity,
                  zIndex: 50 - rel,
                  willChange: "transform, opacity",
                }}
              >
                <FeatureCard
                  item={item}
                  meta={META[i]}
                  lang={lang}
                  index={i}
                  total={items.length}
                />
              </div>
            );
          })}
        </div>

        {/* ── Progress dots ─────────────────────────────────────────────────── */}
        <div className="absolute bottom-9 flex items-center gap-[7px]">
          {items.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300 ease-out"
              style={{
                width:  i === idx ? 28 : 8,
                height: 8,
                background:
                  i === idx ? META[idx].accent
                  : i < idx ? "#CBD5E1"
                  :           "#E2E8F0",
              }}
            />
          ))}
        </div>

        {/* ── Scroll hint (يختفي بعد أول scroll) ──────────────────────────── */}
        <div
          className="absolute bottom-[72px] flex flex-col items-center gap-1.5 transition-opacity duration-300 pointer-events-none"
          style={{ opacity: idx === 0 && prog < 0.08 ? 1 - prog * 12 : 0 }}
        >
          <span className="text-xs text-gray-400 font-medium">
            {lang === "ar" ? "اسكرول للاستكشاف" : "Scroll to explore"}
          </span>
          <svg viewBox="0 0 14 18" className="w-3.5 h-4 text-gray-300 animate-bounce" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M7 1v12M2 9l5 6 5-6" />
          </svg>
        </div>

      </div>
    </div>
  );
}