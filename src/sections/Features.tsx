// ─── Features Section ─────────────────────────────────────────────────────────
// Server Component — الكاردز عبر FeaturesStackScroll (client)

import { Zap } from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";
import FeaturesStackScroll from "@/components/FeaturesStackScroll";
import StatsCounter from "@/components/StatsCounter";

interface FeaturesProps { lang: Lang }

export default function Features({ lang }: FeaturesProps) {
  const isAr = lang === "ar";

  return (
    <section id="features" className="bg-gray-50" dir={isAr ? "rtl" : "ltr"}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="pt-20 lg:pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">

          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-4 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-[#25D366]" />
            <span className="text-gray-600 text-sm font-medium">
              {tr(t.features.badge, lang)}
            </span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-3 tracking-tight">
            {tr(t.features.h2a, lang)}{" "}
            <span className="text-[#25D366]">{tr(t.features.h2b, lang)}</span>
          </h2>

          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
            {tr(t.features.subtitle, lang)}
          </p>

        </div>
      </div>

      {/* ── Stack scroll ────────────────────────────────────────────────────── */}
      <FeaturesStackScroll items={t.features.items} lang={lang} />

      {/* ── Stats — section مستقلة تماماً تحت الكروت ─────────────────────── */}
      <div className="bg-gray-50 px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-4xl mx-auto">
          <StatsCounter lang={lang} />
        </div>
      </div>

    </section>
  );
}