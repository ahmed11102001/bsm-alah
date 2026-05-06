import { Zap, Send, Users, BarChart3, Clock, Shield, MessageSquare, RefreshCw, Eye } from 'lucide-react';
import { t, tr, type Lang } from "@/lib/translations";

const ICONS = [Send, Users, Eye, Clock, MessageSquare, RefreshCw, BarChart3, Shield, Zap];
const COLORS = [
  { color: "bg-[#25D366]", light: "bg-green-50",   border: "border-green-100"  },
  { color: "bg-blue-500",  light: "bg-blue-50",    border: "border-blue-100"   },
  { color: "bg-purple-500",light: "bg-purple-50",  border: "border-purple-100" },
  { color: "bg-orange-500",light: "bg-orange-50",  border: "border-orange-100" },
  { color: "bg-pink-500",  light: "bg-pink-50",    border: "border-pink-100"   },
  { color: "bg-indigo-500",light: "bg-indigo-50",  border: "border-indigo-100" },
  { color: "bg-teal-500",  light: "bg-teal-50",    border: "border-teal-100"   },
  { color: "bg-red-500",   light: "bg-red-50",     border: "border-red-100"    },
  { color: "bg-yellow-500",light: "bg-yellow-50",  border: "border-yellow-100" },
];

interface FeaturesProps { lang: Lang }

export default function Features({ lang }: FeaturesProps) {
  const items = t.features.items;

  return (
    <section id="features" className="py-20 lg:py-32 bg-white" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-2 mb-4">
            <Zap className="w-4 h-4 text-[#25D366]" />
            <span className="text-[#25D366] text-sm font-medium">{tr(t.features.badge, lang)}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {tr(t.features.h2a, lang)}{" "}
            <span className="text-gradient">{tr(t.features.h2b, lang)}</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
            {tr(t.features.subtitle, lang)}
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((f, i) => {
            const Icon = ICONS[i];
            const c    = COLORS[i];
            return (
              <div
                key={i}
                className={`group relative ${c.light} border ${c.border} rounded-2xl p-6
                  hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-default`}
              >
                <div className={`w-11 h-11 ${c.color} rounded-xl flex items-center justify-center mb-4
                  group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {tr(f.hook, lang)}
                </p>
                <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug">
                  {tr(f.title, lang)}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {tr(f.desc, lang)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Stats strip */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#25D366] text-base">+98.5%</span>
            <span>{tr(t.features.stat1, lang)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#25D366] text-base">{tr(t.features.stat2v, lang)}</span>
            <span>{tr(t.features.stat2, lang)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#25D366] text-base">24/7</span>
            <span>{tr(t.features.stat3, lang)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#25D366] text-base">API</span>
            <span>{tr(t.features.stat4, lang)}</span>
          </div>
        </div>

      </div>
    </section>
  );
}
