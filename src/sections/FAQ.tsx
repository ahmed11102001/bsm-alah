"use client";

import { useEffect, useRef, useState } from "react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";

const CATEGORY_COLORS: Record<string, string> = {
  "النظام والإمكانيات":   "bg-blue-50 text-blue-700 border-blue-100",
  "System & Capabilities": "bg-blue-50 text-blue-700 border-blue-100",
  "الأمان والموثوقية":    "bg-green-50 text-green-700 border-green-100",
  "Safety & Reliability":  "bg-green-50 text-green-700 border-green-100",
  "التجربة والاشتراك":    "bg-purple-50 text-purple-700 border-purple-100",
  "Trial & Subscription":  "bg-purple-50 text-purple-700 border-purple-100",
  "الفريق والإدارة":      "bg-orange-50 text-orange-700 border-orange-100",
  "Team & Management":     "bg-orange-50 text-orange-700 border-orange-100",
  "التقارير والنتائج":    "bg-pink-50 text-pink-700 border-pink-100",
  "Reports & Results":     "bg-pink-50 text-pink-700 border-pink-100",
};

// ── Hook: يراقب كل element على حدة ─────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref     = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Header مع scroll reveal ──────────────────────────────────────────────────
function FAQHeader({ lang }: { lang: Lang }) {
  const { ref, visible } = useInView(0.2);
  return (
    <div
      ref={ref}
      className="text-center mb-16"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 mb-4 shadow-sm">
        <HelpCircle className="w-4 h-4 text-[#25D366]" />
        <span className="text-gray-600 text-sm font-medium">{tr(t.faq.badge, lang)}</span>
      </div>
      <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
        {tr(t.faq.h2a, lang)}{" "}
        <span className="relative inline-block">
          <span className="relative z-10 text-[#25D366]">{tr(t.faq.h2b, lang)}</span>
          <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 100 8" preserveAspectRatio="none">
            <path
              d="M0 6 Q50 0 100 6"
              stroke="#25D366" strokeWidth="2.5" fill="none" strokeLinecap="round"
              style={{
                strokeDasharray: 120,
                strokeDashoffset: visible ? 0 : 120,
                transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1) 300ms",
              }}
            />
          </svg>
        </span>
      </h2>
      <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
        {tr(t.faq.subtitle, lang)}
      </p>
    </div>
  );
}

// ── Category block مع stagger على الأسئلة ────────────────────────────────────
function FAQCategory({
  category, catItems, lang, catIndex,
}: {
  category: string;
  catItems: Array<(typeof t.faq.items)[number]>;
  lang: Lang;
  catIndex: number;
}) {
  const { ref, visible } = useInView(0.1);
  const isAr = lang === "ar";

  return (
    <div
      ref={ref}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${catIndex * 80}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${catIndex * 80}ms`,
      }}
    >
      {/* Category badge */}
      <div className="mb-4">
        <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full border ${CATEGORY_COLORS[category] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}>
          {category}
        </span>
      </div>

      {/* Accordion items مع stagger */}
      <Accordion type="single" collapsible className="space-y-3">
        {catItems.map((faq, i) => (
          <div
            key={i}
            style={{
              opacity:    visible ? 1 : 0,
              transform:  visible ? "translateY(0)" : "translateY(16px)",
              transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${catIndex * 80 + i * 60}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${catIndex * 80 + i * 60}ms`,
            }}
          >
            <AccordionItem
              value={`${category}-${i}`}
              className="border border-gray-200 rounded-2xl px-6
                data-[state=open]:border-[#25D366]/40
                data-[state=open]:bg-gradient-to-br
                data-[state=open]:from-green-50/40
                data-[state=open]:to-white
                transition-all duration-200"
            >
              <AccordionTrigger
                className={`font-semibold text-gray-900 hover:text-[#25D366] py-5 text-[15px] leading-snug ${isAr ? "text-right" : "text-left"}`}
              >
                {tr(faq.q, lang)}
              </AccordionTrigger>
              <AccordionContent className="pb-5">
                <div className="text-gray-600 leading-relaxed text-sm whitespace-pre-line space-y-1">
                  {tr(faq.a, lang)}
                </div>
              </AccordionContent>
            </AccordionItem>
          </div>
        ))}
      </Accordion>
    </div>
  );
}

// ── CTA مع scroll reveal ──────────────────────────────────────────────────────
function FAQCTA({ lang }: { lang: Lang }) {
  const { ref, visible } = useInView(0.2);
  const isAr      = lang === "ar";
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <div
      ref={ref}
      className="mt-16 relative overflow-hidden bg-gradient-to-bl from-[#25D366]/10 via-white to-[#128C7E]/5 border border-[#25D366]/20 rounded-3xl p-8 text-center"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#25D366]/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[#128C7E]/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative">
        <p className="text-xs font-bold text-[#25D366] tracking-widest uppercase mb-2">{tr(t.faq.ctaBadge, lang)}</p>
        <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">{tr(t.faq.ctaTitle, lang)}</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto leading-relaxed">{tr(t.faq.ctaSub, lang)}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bb5a] active:scale-[.98] text-white font-bold px-7 py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-green-200"
          >
            {tr(t.faq.ctaBtn, lang)}
            <ArrowIcon className="w-4 h-4" />
          </a>
          <a href="#" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#25D366] font-medium text-sm transition-colors">
            {tr(t.faq.ctaLink, lang)}
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FAQ({ lang }: { lang: Lang }) {
  const isAr = lang === "ar";
  const items = t.faq.items;

  const grouped: Record<string, Array<(typeof items)[number]>> = {};
  items.forEach(item => {
    const cat = tr(item.category, lang);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  return (
    <section id="faq" className="py-20 lg:py-32 bg-gray-50" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <FAQHeader lang={lang} />

        <div className="space-y-10">
          {Object.entries(grouped).map(([category, catItems], catIndex) => (
            <FAQCategory
              key={category}
              category={category}
              catItems={catItems}
              lang={lang}
              catIndex={catIndex}
            />
          ))}
        </div>

        <FAQCTA lang={lang} />

      </div>
    </section>
  );
}