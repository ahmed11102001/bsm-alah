
"use client";

// نسخة أولية من dashboard overview هنطورها في الخطوة الجاية بنفس تصميم
// src/app/dashboard/page.tsx بالظبط. دلوقتي بس شاشة بسيطة تأكد إن الـ shell شغال.

import { useSubscription } from "./_lib/dashboard-context";
import { useLanguage } from "@/lib/language-context";

export default function DemoHomePage() {
  const { dashData } = useSubscription();
  const { locale } = useLanguage();

  if (!dashData) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">
        {locale === "ar" ? `أهلًا، ${dashData.user.name}` : `Welcome, ${dashData.user.name}`}
      </h1>
      <p className="text-sm text-gray-500">
        {locale === "ar" ? "شاشة النظرة العامة الكاملة جاية في الخطوة الجاية." : "Full overview screen coming in the next step."}
      </p>
    </div>
  );
}