// ─── Features Section ─────────────────────────────────────────────────────────
// Server Component — مع StatsCounter client component للـ animated counters

import {
  Send, Brain, Store, Zap, BarChart3,
  MessageSquare, Users, Shield, UserCheck,
} from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";
import StatsCounter from "@/components/StatsCounter";

// ── icon + color per feature ──────────────────────────────────────────────────
const META = [
  { icon: Send,         bg: "bg-[#25D366]",   light: "bg-green-50",   border: "border-green-100",   text: "text-green-700"   },
  { icon: Brain,        bg: "bg-purple-500",  light: "bg-purple-50",  border: "border-purple-100",  text: "text-purple-700"  },
  { icon: Store,        bg: "bg-blue-500",    light: "bg-blue-50",    border: "border-blue-100",    text: "text-blue-700"    },
  { icon: Zap,          bg: "bg-orange-500",  light: "bg-orange-50",  border: "border-orange-100",  text: "text-orange-700"  },
  { icon: BarChart3,    bg: "bg-teal-500",    light: "bg-teal-50",    border: "border-teal-100",    text: "text-teal-700"    },
  { icon: MessageSquare,bg: "bg-pink-500",    light: "bg-pink-50",    border: "border-pink-100",    text: "text-pink-700"    },
  { icon: Users,        bg: "bg-indigo-500",  light: "bg-indigo-50",  border: "border-indigo-100",  text: "text-indigo-700"  },
  { icon: UserCheck,    bg: "bg-cyan-500",    light: "bg-cyan-50",    border: "border-cyan-100",    text: "text-cyan-700"    },
  { icon: Shield,       bg: "bg-red-500",     light: "bg-red-50",     border: "border-red-100",     text: "text-red-700"     },
] as const;



interface FeaturesProps { lang: Lang }

export default function Features({ lang }: FeaturesProps) {
  const isAr  = lang === "ar";
  const items = t.features.items;

  return (
    <section id="features" className="py-20 lg:py-28 bg-gray-50" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-4 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-[#25D366]" />
            <span className="text-gray-600 text-sm font-medium">{tr(t.features.badge, lang)}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-3 tracking-tight">
            {tr(t.features.h2a, lang)}{" "}
            <span className="text-[#25D366]">{tr(t.features.h2b, lang)}</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
            {tr(t.features.subtitle, lang)}
          </p>
        </div>

        {/* ── Cards grid ── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((f, i) => {
            const m    = META[i];
            const Icon = m.icon;
            // first card (bulk messaging) spans full width on lg to give it prominence
            const span = i === 0 ? "lg:col-span-1" : "";

            return (
              <div
                key={i}
                className={`feature-card group relative ${m.light} border ${m.border} rounded-2xl p-5
                  hover:shadow-lg hover:-translate-y-1
                  transition-[box-shadow,transform,border-color] duration-200 ${span}`}
                style={{ "--card-delay": `${i * 75}ms` } as React.CSSProperties}
              >
                {/* tag pill */}
                <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-3 bg-white/70 backdrop-blur-sm ${m.text}`}>
                  {tr(f.tag, lang)}
                </span>

                {/* icon */}
                <div className={`w-10 h-10 ${m.bg} rounded-xl flex items-center justify-center mb-3
                  group-hover:scale-105 transition-transform duration-200`}>
                  <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>

                {/* hook */}
                <p className="text-[11px] font-semibold text-gray-400 mb-1">
                  {tr(f.hook, lang)}
                </p>

                {/* title */}
                <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug">
                  {tr(f.title, lang)}
                </h3>

                {/* desc */}
                <p className="text-sm text-gray-500 leading-relaxed">
                  {tr(f.desc, lang)}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Stats strip (animated counters) ── */}
        <StatsCounter lang={lang} />

      </div>
    </section>
  );
}