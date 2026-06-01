// src/components/StatsCounter.tsx
// ─── Animated Stats Strip ─────────────────────────────────────────────────────
// Client component — الأرقام تعدّ من 0 لما اليوزر يوصلها

"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/translations";

// ── Arabic numeral converter ──────────────────────────────────────────────────
const toAr = (s: string) =>
  s.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);

// ── Stat definitions ──────────────────────────────────────────────────────────
const STATS = [
  {
    end:      98.5,
    decimals: 1,
    suffix:   "%",
    static:   false,
    label:    { ar: "نسبة التسليم", en: "Delivery Rate" },
  },
  {
    end:      15,
    decimals: 0,
    suffix:   "",
    static:   false,
    label:    { ar: "دقيقة للإعداد", en: "Min to Setup" },
  },
  {
    end:      0,
    decimals: 0,
    suffix:   "",
    display:  "٢٤/٧",
    static:   true,
    label:    { ar: "أتمتة مستمرة", en: "Always-on Automation" },
  },
  {
    end:      0,
    decimals: 0,
    suffix:   "",
    display:  "API",
    static:   true,
    label:    { ar: "واتساب رسمي", en: "Official WhatsApp" },
  },
] as const;

// ── useCountUp hook ────────────────────────────────────────────────────────────
function useCountUp(end: number, decimals: number, active: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || end === 0) return;

    const duration = 1800; // ms
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased    = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(parseFloat((eased * end).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [active, end, decimals]);

  return value;
}

// ── Single stat cell ───────────────────────────────────────────────────────────
function StatCell({
  stat,
  index,
  active,
  isAr,
}: {
  stat: (typeof STATS)[number];
  index: number;
  active: boolean;
  isAr: boolean;
}) {
  const count = useCountUp(stat.end, stat.decimals, active);

  let display: string;
  if (stat.static) {
    display = stat.display ?? "";
  } else {
    const formatted = stat.decimals > 0
      ? count.toFixed(stat.decimals)
      : String(Math.floor(count));
    const withSuffix = formatted + stat.suffix;
    display = isAr ? toAr(withSuffix) : withSuffix;
  }

  return (
    <div
      className={`flex flex-col items-center text-center stats-cell ${index > 0 ? "md:pr-6" : ""}`}
      style={{
        opacity: 0,
        animation: active
          ? `fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) ${index * 120}ms both`
          : "none",
      }}
    >
      <span className="text-2xl font-black text-[#25D366] leading-none mb-1 tabular-nums">
        {display}
      </span>
      <span className="text-xs text-gray-500 font-medium">
        {isAr ? stat.label.ar : stat.label.en}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function StatsCounter({ lang }: { lang: Lang }) {
  const isAr   = lang === "ar";
  const ref    = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="mt-12 bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-5
        grid grid-cols-2 md:grid-cols-4 gap-6 divide-y-0 md:divide-x divide-gray-100"
      style={{ direction: isAr ? "rtl" : "ltr" }}
    >
      {STATS.map((s, i) => (
        <StatCell key={i} stat={s} index={i} active={active} isAr={isAr} />
      ))}
    </div>
  );
}