"use client";

import { t, tr, type Lang } from "@/lib/translations";

interface PartnersProps {
  lang: Lang;
}

const PARTNERS = [
  {
    name: "Meta",
    logoSrc: "/partners/meta.svg",
    description: { ar: "واتساب API", en: "WhatsApp API" },
    accent: "#0081FB",
  },
  {
    name: "Shopify",
    logoSrc: "/partners/shopify.svg",
    description: { ar: "متجر متكامل", en: "E-commerce" },
    accent: "#96BF48",
  },
  {
    name: "EasyOrder",
    logoSrc: "/partners/easyorder.svg",
    description: { ar: "إدارة الطلبات", en: "Order Mgmt" },
    accent: "#F97316",
  },
  {
    name: "WooCommerce",
    logoSrc: "/partners/woocommerce.svg",
    description: { ar: "إرسال عروض", en: "Send Offers" },
    accent: "#7F54B3",
  },
  {
    name: "ChatGPT",
    logoSrc: "/partners/chatgpt.svg",
    description: { ar: "ذكاء اصطناعي", en: "AI Assistant" },
    accent: "#10A37F",
  },
  {
    name: "Elevenlabs",
    logoSrc: "/partners/elevenlabs.svg",
    description: { ar: "Voice AI", en: "Voice AI" },
    accent: "#EAB308",
  },
  {
    name: "Gemini",
    logoSrc: "/partners/gemini.svg",
    description: { ar: "سيلز AI", en: "AI Sales" },
    accent: "#8B5CF6",
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
  // duplicate for seamless infinite loop
  const track = [...PARTNERS, ...PARTNERS, ...PARTNERS];

  return (
    <section
      id="partners"
      className="py-20 lg:py-32 bg-gradient-to-b from-white to-gray-50 overflow-hidden"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <style>{`
        @keyframes marquee-ltr {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marquee-rtl {
          0%   { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
        .marquee-track-ltr {
          animation: marquee-ltr 28s linear infinite;
          will-change: transform;
        }
        .marquee-track-rtl {
          animation: marquee-rtl 28s linear infinite;
          will-change: transform;
        }
        .marquee-track-ltr:hover,
        .marquee-track-rtl:hover {
          animation-play-state: paused;
        }
        .partner-pill {
          transition: box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;
        }
        .partner-pill:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.10);
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="text-center mb-14">
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

      </div>

      {/* ── Marquee — full bleed, no max-w constraint ── */}
      <div className="relative w-full select-none" aria-hidden="true">

        {/* fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10
          bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10
          bg-gradient-to-l from-white to-transparent" />

        {/* row 1 — left-to-right */}
        <div className="overflow-hidden mb-3">
          <div className={`flex gap-3 ${lang === "ar" ? "marquee-track-rtl" : "marquee-track-ltr"}`}
               style={{ width: "max-content" }}>
            {track.map((p, i) => (
              <PartnerPill key={i} partner={p} lang={lang} />
            ))}
          </div>
        </div>

        {/* row 2 — opposite direction, offset timing */}
        <div className="overflow-hidden">
          <div className={`flex gap-3 ${lang === "ar" ? "marquee-track-ltr" : "marquee-track-rtl"}`}
               style={{ width: "max-content", animationDelay: "-14s" }}>
            {[...track].reverse().map((p, i) => (
              <PartnerPill key={i} partner={p} lang={lang} />
            ))}
          </div>
        </div>

      </div>

      {/* ── Who is it for ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

function PartnerPill({
  partner,
  lang,
}: {
  partner: (typeof PARTNERS)[0];
  lang: Lang;
}) {
  return (
    <div
      className="partner-pill flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-3 cursor-default"
      style={{ minWidth: 180 }}
    >
      <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
        <img
          src={partner.logoSrc}
          alt={partner.name}
          width={36}
          height={36}
          className="w-9 h-9 object-contain"
          loading="lazy"
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
          {partner.name}
        </p>
        <p className="text-xs font-medium truncate" style={{ color: partner.accent }}>
          {partner.description[lang]}
        </p>
      </div>
    </div>
  );
}