"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, type Locale, type Translations } from "@/lib/i18n";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (typeof translations)[Locale];
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "ar",
  setLocale: () => {},
  t: translations.ar,
  dir: "rtl",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  // Persist to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved === "ar" || saved === "en") setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  };

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, t: translations[locale], dir }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}