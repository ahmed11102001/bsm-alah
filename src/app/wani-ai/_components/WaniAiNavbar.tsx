"use client";

import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function WaniAiNavbar() {
  const { locale, dir, setLocale } = useLanguage();
  const ar = locale === "ar";

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30" dir={dir}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        <span className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#25D366]">
          <img src="/faviconlink.svg" alt="Wani" className="w-full h-full object-cover" />
        </span>
        <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#25D366]" />
          {ar ? "وني AI" : "Wani AI"}
        </span>
        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocale(ar ? "en" : "ar")}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            {ar ? "EN" : "عربي"}
          </button>
          <Link
            href="/channels"
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1"
          >
            <ArrowRight className={`w-3.5 h-3.5 ${ar ? "" : "rotate-180"}`} />
            {ar ? "القنوات" : "Channels"}
          </Link>
        </div>
      </div>
    </header>
  );
}
