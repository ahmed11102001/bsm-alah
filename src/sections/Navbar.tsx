"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, User, Languages, Sparkles, Code2 } from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";

interface NavbarProps {
  onLoginClick:  () => void;
  lang:          Lang;
  onLangChange:  (l: Lang) => void;
}

export default function Navbar({ onLoginClick, lang, onLangChange }: NavbarProps) {
  const [isScrolled,       setIsScrolled]       = useState(false);
  const [pastFold,         setPastFold]         = useState(false);   // بعد الـ hero
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileClosing,    setMobileClosing]    = useState(false);
  const isAr = lang === "ar";

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setPastFold(window.scrollY > window.innerHeight * 0.75);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobile = () => {
    setMobileClosing(true);
    setTimeout(() => { setIsMobileMenuOpen(false); setMobileClosing(false); }, 220);
  };

  const scrollToSection = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    closeMobile();
  };

  const navItems = [
    { label: tr(t.nav.features,     lang), href: "#features"      },
    { label: tr(t.nav.partners,     lang), href: "#partners"      },
    { label: tr(t.nav.howItWorks,   lang), href: "#how-it-works"  },
    { label: tr(t.nav.pricing,      lang), href: "#pricing"       },
    { label: tr(t.nav.testimonials, lang), href: "#testimonials"  },
    { label: tr(t.nav.faq,          lang), href: "#faq"           },
  ];

  const isLight = isScrolled || isMobileMenuOpen;

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background:   isLight ? "rgba(255,255,255,0.97)" : "transparent",
          backdropFilter: isLight ? "blur(12px)" : "none",
          boxShadow:    isScrolled ? "0 1px 0 rgba(0,0,0,0.07)" : "none",
          transition:   "background 0.35s ease, box-shadow 0.35s ease, backdrop-filter 0.35s ease",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">

            {/* ── Logo ── */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center overflow-hidden shadow-md shadow-green-200">
                <img src="/favicon.svg" alt="WANI" className="w-full h-full object-cover" />
              </div>
              <span
                className="text-xl font-black tracking-tight transition-colors duration-300"
                style={{ color: isLight ? "#111827" : "white" }}
              >
                {isAr ? "وني" : "WANI"}
              </span>
            </div>

            {/* ── Desktop nav links ── */}
            <div className="hidden lg:flex items-center gap-6">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => scrollToSection(item.href)}
                  className="text-sm font-medium transition-colors duration-200 hover:text-[#25D366] relative group"
                  style={{ color: isLight ? "#374151" : "rgba(255,255,255,0.88)" }}
                >
                  {item.label}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-[#25D366] rounded-full group-hover:w-full transition-all duration-250" />
                </button>
              ))}
            </div>

            {/* ── Desktop right ── */}
            <div className="hidden lg:flex items-center gap-2.5">
              {/* Lang */}
              <button
                onClick={() => onLangChange(lang === "ar" ? "en" : "ar")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200"
                style={{
                  borderColor: isLight ? "#e5e7eb" : "rgba(255,255,255,0.3)",
                  color:       isLight ? "#6b7280" : "rgba(255,255,255,0.8)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#25D366";
                  (e.currentTarget as HTMLElement).style.color       = "#25D366";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = isLight ? "#e5e7eb" : "rgba(255,255,255,0.3)";
                  (e.currentTarget as HTMLElement).style.color       = isLight ? "#6b7280" : "rgba(255,255,255,0.8)";
                }}
              >
                <Languages className="w-3.5 h-3.5" />
                {tr(t.nav.langSwitch, lang)}
              </button>

              {/* Developers btn */}
              <Link href="/developers" style={{ textDecoration: "none" }}>
                <button
                  className="h-9 text-sm gap-1.5 flex items-center transition-all duration-200 px-4 rounded-lg"
                  style={{
                    background:  "transparent",
                    color:       isLight ? "#374151" : "rgba(255,255,255,0.75)",
                    border:      `1px solid ${isLight ? "#e5e7eb" : "rgba(255,255,255,0.15)"}`,
                    fontFamily:  "inherit",
                    cursor:      "pointer",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#25D366"; (e.currentTarget as HTMLButtonElement).style.color = "#25D366"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = isLight ? "#e5e7eb" : "rgba(255,255,255,0.15)"; (e.currentTarget as HTMLButtonElement).style.color = isLight ? "#374151" : "rgba(255,255,255,0.75)"; }}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  {isAr ? "المطورين" : "Developers"}
                </button>
              </Link>

              {/* Login btn — يتغير شكله بعد الـ fold */}
              <Button
                onClick={onLoginClick}
                className="h-9 text-sm gap-1.5 transition-all duration-300"
                style={{
                  background:  "#25D366",
                  color:       "white",
                  paddingInline: "1.25rem",
                  boxShadow:   pastFold ? "0 4px 14px rgba(37,211,102,0.35)" : "none",
                  transform:   "scale(1)",
                }}
              >
                {pastFold
                  ? <Sparkles className="w-3.5 h-3.5" />
                  : <User    className="w-3.5 h-3.5" />}
                {tr(t.nav.login, lang)}
              </Button>
            </div>

            {/* ── Mobile menu btn ── */}
            <button
              onClick={() => isMobileMenuOpen ? closeMobile() : setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl transition-colors"
              style={{ color: isLight ? "#111827" : "white" }}
              aria-label="toggle menu"
            >
              <div style={{ transition: "transform 0.25s ease" }}>
                {isMobileMenuOpen
                  ? <X className="w-5 h-5" />
                  : <Menu className="w-5 h-5" />}
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile menu ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={closeMobile}
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            style={{ animation: `${mobileClosing ? "fade-out" : "fade-in"} 0.22s ease both` }}
          />

          {/* drawer */}
          <div
            className="absolute top-16 left-0 right-0 bg-white shadow-2xl rounded-b-3xl overflow-hidden"
            style={{
              animation: `${mobileClosing ? "slide-in-down" : "slide-in-down"} 0.25s cubic-bezier(0.16,1,0.3,1) both`,
              animationDirection: mobileClosing ? "reverse" : "normal",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 space-y-1">
              {navItems.map((item, i) => (
                <button
                  key={item.href}
                  onClick={() => scrollToSection(item.href)}
                  className="flex w-full items-center py-3 px-3 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:text-[#25D366] transition-colors text-sm"
                  style={{
                    textAlign: isAr ? "right" : "left",
                    animation: `fade-in-up 0.35s cubic-bezier(0.16,1,0.3,1) ${i * 40}ms both`,
                  }}
                >
                  {item.label}
                </button>
              ))}

              <div className="h-px bg-gray-100 my-2" />

              <Link href="/developers" onClick={closeMobile}
                className="flex items-center gap-2 w-full py-3 px-3 rounded-xl font-medium transition-colors text-sm"
                style={{ color: "#25D366", animation: "fade-in-up 0.35s cubic-bezier(0.16,1,0.3,1) 220ms both",
                  textDecoration: "none" }}>
                <Code2 className="w-4 h-4" />
                {isAr ? "للمطورين — OTP API" : "Developers — OTP API"}
              </Link>

              <button
                onClick={() => { onLangChange(lang === "ar" ? "en" : "ar"); closeMobile(); }}
                className="flex items-center gap-2 w-full py-3 px-3 rounded-xl text-gray-500 font-medium hover:bg-gray-50 transition-colors text-sm"
                style={{ animation: "fade-in-up 0.35s cubic-bezier(0.16,1,0.3,1) 240ms both" }}
              >
                <Languages className="w-4 h-4" />
                {lang === "ar" ? "Switch to English" : "التبديل للعربية"}
              </button>

              <div style={{ animation: "fade-in-up 0.35s cubic-bezier(0.16,1,0.3,1) 280ms both" }}>
                <Button
                  onClick={() => { onLoginClick(); closeMobile(); }}
                  className="w-full bg-[#25D366] text-white hover:bg-[#20bb5a] mt-2 h-11 text-sm font-bold shadow-md shadow-green-100"
                >
                  <Sparkles className="w-4 h-4 ml-1" />
                  {tr(t.nav.login, lang)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}