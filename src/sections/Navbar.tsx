"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Menu, X, User, Languages } from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";

interface NavbarProps {
  onLoginClick:  () => void;
  lang:          Lang;
  onLangChange:  (l: Lang) => void;
}

export default function Navbar({ onLoginClick, lang, onLangChange }: NavbarProps) {
  const [isScrolled,       setIsScrolled]       = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAr = lang === "ar";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { label: tr(t.nav.features,     lang), href: "#features" },
    { label: tr(t.nav.partners,     lang), href: "#partners" },
    { label: tr(t.nav.howItWorks,   lang), href: "#how-it-works" },
    { label: tr(t.nav.pricing,      lang), href: "#pricing" },
    { label: tr(t.nav.testimonials, lang), href: "#testimonials" },
    { label: tr(t.nav.faq,          lang), href: "#faq" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-whatsapp-gradient flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className={`text-xl font-bold ${isScrolled ? "text-gray-900" : "text-gray-900 lg:text-white"}`}>
              {isAr
                ? <>واتس <span className="text-[#25D366]">برو</span></>
                : <>Whats<span className="text-[#25D366]">Pro</span></>}
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollToSection(item.href)}
                className={`text-sm font-medium transition-colors hover:text-[#25D366] ${
                  isScrolled ? "text-gray-700" : "text-white/90"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right — lang + login */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => onLangChange(lang === "ar" ? "en" : "ar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                isScrolled
                  ? "border-gray-200 text-gray-600 hover:border-[#25D366] hover:text-[#25D366]"
                  : "border-white/30 text-white/80 hover:border-white hover:text-white"
              }`}
            >
              <Languages className="w-4 h-4" />
              {tr(t.nav.langSwitch, lang)}
            </button>

            <Button
              onClick={onLoginClick}
              className="bg-[#25D366] text-white px-6 hover:bg-[#20bb5a]"
            >
              <User className="w-4 h-4 ml-2" />
              {tr(t.nav.login, lang)}
            </Button>
          </div>

          {/* Mobile menu btn */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={isMobileMenuOpen}
            className={`lg:hidden p-2 rounded-lg ${isScrolled ? "text-gray-900" : "text-white"}`}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t shadow-lg">
          <div className="px-4 py-4 space-y-3">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollToSection(item.href)}
                className={`block w-full py-2 font-medium text-gray-700 hover:text-[#25D366] ${isAr ? "text-right" : "text-left"}`}
              >
                {item.label}
              </button>
            ))}

            <button
              onClick={() => onLangChange(lang === "ar" ? "en" : "ar")}
              className="flex items-center gap-2 w-full py-2 text-gray-500 font-medium"
            >
              <Languages className="w-4 h-4" />
              {lang === "ar" ? "Switch to English" : "التبديل للعربية"}
            </button>

            <Button
              onClick={onLoginClick}
              className="w-full bg-[#25D366] text-white hover:bg-[#20bb5a] mt-4"
            >
              <User className="w-4 h-4 ml-2" />
              {tr(t.nav.login, lang)}
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}