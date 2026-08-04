
"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

export default function DemoModeBanner() {
  const { locale } = useLanguage();

  return (
    <div className="h-9 flex-shrink-0 bg-[#111b21] text-white flex items-center justify-center gap-3 px-4 text-xs sticky top-0 z-50">
      <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
      <span className="font-medium">
        {locale === "ar" ? "بتشوف نسخة ديمو ببيانات وهمية" : "You're viewing a demo with fake data"}
      </span>
      <Link
        href="/#pricing"
        className="bg-[#25D366] hover:bg-[#20bb5a] text-white font-bold px-3 py-1 rounded-full transition-colors"
      >
        {locale === "ar" ? "سجّل مجانًا" : "Sign up free"}
      </Link>
    </div>
  );
}