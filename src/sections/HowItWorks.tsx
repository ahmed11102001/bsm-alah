import { Upload, FileText, Rocket, BarChart3, ArrowLeft, ArrowRight } from 'lucide-react';
import { t, tr, type Lang } from "@/lib/translations";

const ICONS  = [Upload, FileText, Rocket, BarChart3];
const COLORS = [
  { color: "bg-blue-500",   ring: "ring-blue-100"   },
  { color: "bg-[#25D366]",  ring: "ring-green-100"  },
  { color: "bg-purple-500", ring: "ring-purple-100" },
  { color: "bg-orange-500", ring: "ring-orange-100" },
];
const NUMS = ["01", "02", "03", "04"];

interface HowItWorksProps { lang: Lang }

export default function HowItWorks({ lang }: HowItWorksProps) {
  const isAr = lang === "ar";
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const steps = t.how.steps;

  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-gray-50" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 mb-4 shadow-sm">
            <Rocket className="w-4 h-4 text-[#25D366]" />
            <span className="text-gray-600 text-sm font-medium">{tr(t.how.badge, lang)}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {tr(t.how.h2a, lang)}{" "}
            <span className="text-gradient">{tr(t.how.h2b, lang)}</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
            {tr(t.how.subtitle, lang)}
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          <div className="hidden lg:block absolute top-16 right-[12.5%] left-[12.5%] h-px bg-gradient-to-r from-blue-200 via-green-200 via-purple-200 to-orange-200 z-0" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {steps.map((s, i) => {
              const Icon = ICONS[i];
              const c    = COLORS[i];
              return (
                <div key={i} className="flex flex-col items-center text-center group">
                  <div className={`relative w-16 h-16 ${c.color} ring-4 ${c.ring} rounded-2xl
                    flex items-center justify-center mb-5 shadow-md
                    group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="w-7 h-7 text-white" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200
                      rounded-full text-[11px] font-bold text-gray-500 flex items-center justify-center shadow-sm">
                      {NUMS[i]}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    {tr(s.time, lang)}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 mb-1 leading-snug">{tr(s.title, lang)}</h3>
                  <p className="text-xs font-medium text-[#25D366] mb-2">{tr(s.what, lang)}</p>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-[200px]">
                    {tr(s.desc, lang)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 bg-white border border-gray-100 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className={`text-center ${isAr ? "sm:text-right" : "sm:text-left"}`}>
            <p className="text-lg font-bold text-gray-900 mb-1">{tr(t.how.ctaTitle, lang)}</p>
            <p className="text-sm text-gray-400">{tr(t.how.ctaSub, lang)}</p>
          </div>
          <a
            href="#"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bb5a]
              text-white font-bold px-7 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap"
          >
            {tr(t.how.ctaBtn, lang)}
            <ArrowIcon className="w-4 h-4" />
          </a>
        </div>

      </div>
    </section>
  );
}
