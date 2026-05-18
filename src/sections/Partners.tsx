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
    name: "woocommerce",
    logoSrc: "/partners/woocommerce.svg",
    color: "from-purple-500 to-purple-600",
    description: { ar: "ارسال عروض", en: "Send Offers" },
  },
  {
    name: "ChatGPT",
    logoSrc: "/partners/chatgpt.svg",
    color: "from-cyan-500 to-cyan-600",
    description: { ar: "ذكاء اصطناعي", en: "AI Assistant" },
  },
  {
    name: "Elevenlabs",
    logoSrc: "/partners/elevenlabs.svg",
    color: "from-yellow-500 to-yellow-600",
    description: { ar: "Voice AI", en: "Voice AI" },
  },
  {
    name: "Gemini",
    logoSrc: "/partners/gemini.svg",
    color: "from-pink-500 to-pink-600",
    description: { ar: "سيلز AI", en: "AI Sales" },
  },
];

const WHO_FOR = [
  {
    icon: "🛍️",
    title: { ar: "أصحاب المتاجر الإلكترونية", en: "E-commerce Owners" },
    desc: {
      ar: "أرسل تأكيدات الطلبات، عروض خاصة، وتذكيرات السلة المهجورة تلقائياً",
      en: "Send order confirmations, special offers & abandoned cart reminders automatically",
    },
    color: "from-green-50 to-emerald-50",
    border: "border-green-200",
    iconBg: "bg-green-100",
  },
  {
    icon: "☕",
    title: { ar: "المطاعم والكافيهات", en: "Restaurants & Cafes" },
    desc: {
      ar: "تواصل مع عملائك بعروض يومية، قوائم جديدة، وحجوزات عبر واتساب مباشرة",
      en: "Reach customers with daily offers, new menus & WhatsApp reservations",
    },
    color: "from-orange-50 to-amber-50",
    border: "border-orange-200",
    iconBg: "bg-orange-100",
  },
  {
    icon: "🏥",
    title: { ar: "العيادات والمراكز الطبية", en: "Clinics & Medical Centers" },
    desc: {
      ar: "ذكّر مرضاك بمواعيدهم وأرسل تعليمات ما بعد الزيارة بشكل احترافي",
      en: "Remind patients of appointments & send post-visit instructions professionally",
    },
    color: "from-blue-50 to-sky-50",
    border: "border-blue-200",
    iconBg: "bg-blue-100",
  },
  {
    icon: "🏢",
    title: { ar: "الشركات والمؤسسات", en: "Companies & Businesses" },
    desc: {
      ar: "أتمتة تواصلك مع العملاء، فريق المبيعات، والدعم الفني في مكان واحد",
      en: "Automate customer communication, sales team & support in one place",
    },
    color: "from-purple-50 to-violet-50",
    border: "border-purple-200",
    iconBg: "bg-purple-100",
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

        {/* ── Header ── */}
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

        {/* ── Partners grid 4×2 ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PARTNERS.map((partner, idx) => (
            <PartnerCard key={idx} partner={partner} lang={lang} />
          ))}
        </div>

        {/* ── Divider + Who is it for ── */}
        <div className="mt-16 pt-16 border-t border-gray-100">
          <div className="text-center mb-10">
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {lang === "ar" ? "مناسب لـ 🎯" : "Who is it for? 🎯"}
            </h3>
            <p className="text-gray-500 text-sm">
              {lang === "ar"
                ? "واتس برو مصمم لكل من يريد تسويقاً أذكى عبر واتساب"
                : "WhatsPro is built for anyone who wants smarter WhatsApp marketing"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WHO_FOR.map((item, idx) => (
              <div
                key={idx}
                className={`relative rounded-2xl border ${item.border} bg-gradient-to-br ${item.color} p-6 hover:shadow-md transition-shadow duration-200`}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${item.iconBg} mb-4 text-2xl`}>
                  {item.icon}
                </div>
                <h4 className="text-base font-bold text-gray-900 mb-2">
                  {item.title[lang]}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.desc[lang]}
                </p>
              </div>
            ))}
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
    <div className="group">
      <div className="relative bg-white border border-gray-200 rounded-2xl p-6 h-40 flex flex-col items-center justify-center hover:shadow-lg hover:border-gray-300 overflow-hidden transition-all duration-200">
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${partner.color} transition-opacity duration-200`}
        />
        <div className="relative z-10 text-center">
          <div className="mb-3 h-12 w-full flex items-center justify-center">
            <img
              src={partner.logoSrc}
              alt={partner.name}
              width={140}
              height={40}
              className="h-10 w-auto max-w-[120px] object-contain"
              loading="lazy"
            />
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">
            {partner.name}
          </h3>
          <p className={`text-xs font-medium text-transparent bg-clip-text bg-gradient-to-r ${partner.color}`}>
            {partner.description[lang]}
          </p>
        </div>
      </div>
    </div>
  );
}