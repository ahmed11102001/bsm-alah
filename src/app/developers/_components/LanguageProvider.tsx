// src/app/developers/_components/LanguageProvider.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "ar";

interface LangContextProps {
  language: Language;
  toggleLanguage: () => void;
}

// Default context values – will be overridden by the provider
const LangContext = createContext<LangContextProps>({
  language: "en",
  toggleLanguage: () => {},
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en"); // English primary
  const toggleLanguage = () =>
    setLanguage((prev) => (prev === "en" ? "ar" : "en"));

  return (
    <LangContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLanguage = () => useContext(LangContext);
export default LanguageProvider;
