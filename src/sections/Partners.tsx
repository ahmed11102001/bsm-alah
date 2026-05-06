"use client";

import { useRef, useEffect, useState } from "react";
import { t, tr, type Lang } from "@/lib/translations";

interface PartnersProps {
  lang: Lang;
}

// Partner logos data
const PARTNERS = [
  {
    name: "Meta",
    logo: "🔵",
    color: "from-blue-500 to-blue-600",
    description: { ar: "واتساب API", en: "WhatsApp API" },
  },
  {
    name: "Shopify",
    logo: "🛍️",
    color: "from-green-500 to-green-600",
    description: { ar: "متجر متكامل", en: "E-commerce Store" },
  },
  {
    name: "EasyOrder",
    logo: "📦",
    color: "from-orange-500 to-orange-600",
    description: { ar: "إدارة الطلبات", en: "Order Management" },
  },
  {
    name: "ChatGPT",
    logo: "🤖",
    color: "from-purple-500 to-purple-600",
    description: { ar: "ذكاء اصطناعي", en: "AI Assistant" },
  },
  {
    name: "Gemini",
    logo: "✨",
    color: "from-cyan-500 to-cyan-600",
    description: { ar: "معالجة اللغة", en: "Language AI" },
  },
];

export default function Partners({ lang }: PartnersProps) {
  const [useMarquee, setUseMarquee] = useState(true);

  useEffect(() => {
    // Determine if we should use marquee or grid based on screen size
    const handleResize = () => {
      setUseMarquee(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

        {/* Marquee Container for Desktop */}
        {useMarquee ? (
          <div className="relative overflow-hidden">
            {/* Fade gradient overlays */}
            <div
              className={`absolute top-0 ${
                lang === "ar" ? "right-0" : "left-0"
              } h-full w-20 bg-gradient-to-${
                lang === "ar" ? "l" : "r"
              } from-gradient-to-b via-transparent to-transparent z-10 pointer-events-none`}
              style={{
                backgroundImage:
                  lang === "ar"
                    ? "linear-gradient(to left, rgba(255,255,255,1), transparent)"
                    : "linear-gradient(to right, rgba(255,255,255,1), transparent)",
              }}
            />
            <div
              className={`absolute top-0 ${
                lang === "ar" ? "left-0" : "right-0"
              } h-full w-20 bg-gradient-to-${
                lang === "ar" ? "r" : "l"
              } from-gray-50 via-transparent to-transparent z-10 pointer-events-none`}
              style={{
                backgroundImage:
                  lang === "ar"
                    ? "linear-gradient(to right, rgba(249,250,251,1), transparent)"
                    : "linear-gradient(to left, rgba(249,250,251,1), transparent)",
              }}
            />

            {/* Marquee Track */}
            <style>{`
              @keyframes marquee {
                0% {
                  transform: translateX(0);
                }
                100% {
                  transform: translateX(-100%);
                }
              }

              @keyframes marquee-rtl {
                0% {
                  transform: translateX(0);
                }
                100% {
                  transform: translateX(100%);
                }
              }

              .marquee-track {
                animation: marquee 30s linear infinite;
              }

              .marquee-track-rtl {
                animation: marquee-rtl 30s linear infinite;
              }

              .marquee-container:hover .marquee-track,
              .marquee-container:hover .marquee-track-rtl {
                animation-play-state: paused;
              }
            `}</style>

            <div className="marquee-container overflow-hidden">
              <div
                className={`marquee-track${
                  lang === "ar" ? "-rtl" : ""
                } flex gap-8 py-8 w-max`}
              >
                {/* Original set */}
                {PARTNERS.map((partner, idx) => (
                  <PartnerCard key={`${idx}-original`} partner={partner} lang={lang} />
                ))}
                {/* Duplicate set for seamless loop */}
                {PARTNERS.map((partner, idx) => (
                  <PartnerCard key={`${idx}-duplicate`} partner={partner} lang={lang} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Grid Layout for Mobile/Tablet */
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {PARTNERS.map((partner, idx) => (
              <PartnerCard key={idx} partner={partner} lang={lang} />
            ))}
          </div>
        )}

        {/* Bottom Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 border-t border-gray-100">
          <div className="text-center">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-700 mb-2">
              500+
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
      <div className="relative bg-white border border-gray-200 rounded-2xl p-6 h-40 flex flex-col items-center justify-center hover:shadow-lg hover:border-gray-300 transition-all duration-300 overflow-hidden">
        {/* Gradient background on hover */}
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br ${partner.color}`}
        />

        {/* Content */}
        <div className="relative z-10 text-center">
          <div className="text-5xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
            {partner.logo}
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

        {/* Border glow on hover */}
        <div
          className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
          style={{
            background: `conic-gradient(from 0deg, ${partner.color.split(" ")[1]}, transparent 50%)`,
            opacity: 0,
          }}
        />
      </div>
    </div>
  );
}
