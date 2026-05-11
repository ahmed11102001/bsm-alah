"use client";

import { t, tr, type Lang } from "@/lib/translations";

interface PartnersProps {
  lang: Lang;
}

const PARTNERS = [
  {
    name: "Meta",
    logoSrc: "/partners/meta.svg",
    color: "from-blue-500 to-blue-600",
    description: { ar: "واتساب API", en: "WhatsApp API" },
  },
  {
    name: "Shopify",
    logoSrc: "/partners/shopify.svg",
    color: "from-green-500 to-green-600",
    description: { ar: "متجر متكامل", en: "E-commerce Store" },
  },
  {
    name: "EasyOrder",
    logoSrc: "/partners/easyorder.svg",
    color: "from-orange-500 to-orange-600",
    description: { ar: "إدارة الطلبات", en: "Order Management" },
  },
  {
    name: "ChatGPT",
    logoSrc: "/partners/chatgpt.svg",
    color: "from-purple-500 to-purple-600",
    description: { ar: "ذكاء اصطناعي", en: "AI Assistant" },
  },
  {
    name: "Gemini",
    logoSrc: "/partners/gemini.svg",
    color: "from-cyan-500 to-cyan-600",
    description: { ar: "معالجة اللغة", en: "Language AI" },
  },
  {
    name: "Elevenlabs",
    logoSrc: "/partners/elevenlabs.svg",
    color: "from-cyan-500 to-cyan-600",
    description: { ar: "Voice AI", en: "Voice AI" },
  },
];

export default function Partners({ lang }: PartnersProps) {
  return (
    <section
      id="partners"
      className="py-20 lg:py-32 bg-gradient-to-b from-white to-gray-50"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-2 mb-4">
            <span className="text-2xl">🤝</span>
            <span className="text-blue-600 text-sm font-medium">
              {tr(t.partners.badge, lang)}
            </span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {tr(t.partners.h2a, lang)}{" "}
            <span className="text-gradient">{tr(t.partners.h2b, lang)}</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
            {tr(t.partners.subtitle, lang)}
          </p>
        </div>

        {/* Static grid (no animation) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {PARTNERS.map((partner, idx) => (
            <PartnerCard key={idx} partner={partner} lang={lang} />
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 border-t border-gray-100">
          <div className="text-center">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-700 mb-2">
              99+
            </div>
            <p className="text-gray-600 text-sm">
              {lang === "ar" ? "شركة تثق بنا" : "Companies Trust Us"}
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-700 mb-2">
              99.9%
            </div>
            <p className="text-gray-600 text-sm">
              {lang === "ar" ? "معدل التوفر" : "Uptime Guarantee"}
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-700 mb-2">
              24/7
            </div>
            <p className="text-gray-600 text-sm">
              {lang === "ar" ? "دعم فني" : "Technical Support"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PartnerCard({
  partner,
  lang,
}: {
  partner: (typeof PARTNERS)[0];
  lang: Lang;
}) {
  return (
    <div className="flex-shrink-0 w-40 group">
      <div className="relative bg-white border border-gray-200 rounded-2xl p-6 h-40 flex flex-col items-center justify-center hover:shadow-lg hover:border-gray-300 overflow-hidden">
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${partner.color}`}
        />

        {/* Content */}
        <div className="relative z-10 text-center">
          <div className="mb-3 h-12 w-full flex items-center justify-center">
            <img
              src={partner.logoSrc}
              alt={partner.name}
              width={140}
              height={40}
              className="h-10 w-auto max-w-[140px] object-contain"
              loading="lazy"
            />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {partner.name}
          </h3>
          <p
            className={`text-xs font-medium text-transparent bg-clip-text bg-gradient-to-r ${partner.color}`}
          >
            {partner.description[lang]}
          </p>
        </div>

        <div
          className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none`}
          style={{
            background: `conic-gradient(from 0deg, ${partner.color.split(" ")[1]}, transparent 50%)`,
            opacity: 0,
          }}
        />
      </div>
    </div>
  );
}