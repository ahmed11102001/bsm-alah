"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { Handshake, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

export default function WaniPartnerPage() {
  const { dir, locale } = useLanguage();
  const isAr = locale === "ar";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      {/* Background glow effect */}
      <div className="relative flex flex-col items-center max-w-lg w-full">
        <div className="absolute -top-20 -z-10 w-72 h-72 bg-[#25D366]/10 dark:bg-[#25D366]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Icon Badge */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#25D366]/20 to-emerald-500/10 border border-[#25D366]/30 flex items-center justify-center mb-6 shadow-xl shadow-[#25D366]/10 animate-pulse">
          <Handshake className="w-10 h-10 text-[#25D366]" />
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAr ? "برنامج الشركاء" : "Partner Program"}</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">
          WANI Partner
        </h1>

        {/* Soon Text */}
        <div className="my-4 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-[#25D366]/10 to-teal-500/10 border border-[#25D366]/20">
          <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#25D366] to-emerald-400 bg-clip-text text-transparent">
            {isAr ? "قريباً (Soon)" : "Coming Soon"}
          </p>
        </div>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
          {isAr
            ? "نحن نعمل حالياً على تطوير برنامج شركاء وني لتوفير ميزات وفرص استثنائية."
            : "We are currently developing the WANI Partner program to provide exceptional features and opportunities."}
        </p>

        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-white transition-all shadow-md hover:shadow-lg"
        >
          {dir === "rtl" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isAr ? "العودة للرئيسية" : "Back to Dashboard"}</span>
        </Link>
      </div>
    </div>
  );
}
