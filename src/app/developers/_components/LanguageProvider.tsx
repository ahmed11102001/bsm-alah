"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "ar";

interface LangContextProps {
  language: Language;
  toggleLanguage: () => void;
  t: (en: string, ar: string) => string;
}

const LangContext = createContext<LangContextProps>({
  language: "en",
  toggleLanguage: () => {},
  t: (en) => en,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  // Persist to localStorage so the preference survives navigation
  useEffect(() => {
    const saved = localStorage.getItem("dev-lang") as Language | null;
    if (saved === "ar" || saved === "en") setLanguage(saved);
  }, []);

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === "en" ? "ar" : "en";
      localStorage.setItem("dev-lang", next);
      return next;
    });
  };

  const t = (en: string, ar: string) => (language === "ar" ? ar : en);

  return (
    <LangContext.Provider value={{ language, toggleLanguage, t }}>
      <div
        style={{ direction: language === "ar" ? "rtl" : "ltr" }}
        lang={language}
      >
        {children}
      </div>
    </LangContext.Provider>
  );
};

export const useLanguage = () => useContext(LangContext);
export default LanguageProvider;
