// src/lib/language-context.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, type Locale, type Translations } from "@/lib/i18n";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (typeof translations)[Locale];
  dir: "rtl" | "ltr";
}

function resolveInitialClientLocale(): Locale {
  if (typeof document === "undefined") return "ar";

  // 1. Check NEXT_LOCALE cookie (set by landing page /[locale] and proxy middleware)
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  if (match) {
    const val = decodeURIComponent(match[1].trim()).toLowerCase();
    if (val === "ar" || val === "en") return val as Locale;
  }

  // 2. Check localStorage
  try {
    const local = localStorage.getItem("locale");
    if (local === "ar" || local === "en") return local as Locale;
  } catch {}

  // 3. Check HTML lang attribute
  const docLang = document.documentElement.lang?.toLowerCase();
  if (docLang === "ar" || docLang === "en") return docLang as Locale;

  return "ar";
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "ar",
  setLocale: () => {},
  t: translations.ar,
  dir: "rtl",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveInitialClientLocale());

  // On client mount, sync with cookies / storage / html lang
  useEffect(() => {
    const resolved = resolveInitialClientLocale();
    setLocaleState(resolved);
    document.documentElement.lang = resolved;
    document.documentElement.dir = resolved === "ar" ? "rtl" : "ltr";
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("locale", l);
      document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
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