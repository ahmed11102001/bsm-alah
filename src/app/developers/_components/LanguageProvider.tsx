"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "ar";

// Overloaded t() — strings in, string out; ReactNode in, ReactNode out
interface TranslateFn {
  (en: string, ar: string): string;
  (en: ReactNode, ar: ReactNode): ReactNode;
}

interface LangContextProps {
  language: Language;
  toggleLanguage: () => void;
  t: TranslateFn;
}

const LangContext = createContext<LangContextProps>({
  language: "en",
  toggleLanguage: () => {},
  t: ((en: any) => en) as TranslateFn,
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

  const t = ((en: any, ar: any) => (language === "ar" ? ar : en)) as TranslateFn;

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
