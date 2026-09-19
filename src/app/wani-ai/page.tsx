"use client";

import { Suspense, useEffect, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import AiAgentDashboard from "@/app/dashboard/automation/_components/AiAgentDashboard";

// ─── صفحة وني AI المستقلة (برا الداشبورد) ────────────────────────────────────
// نفس مكون تاب الوكيل الذكي بالكامل — اتنقل هنا عشان المرحلة الجاية
// يدعم قنوات زيادة (فيس/انستا). الرد على المحادثات شغال من الباك إند
// وملوش علاقة بمكان عرض الإعدادات.
export default function WaniAiPage() {
  const { locale, dir } = useLanguage();
  const lang = locale === "en" ? "en" : "ar";
  const ar = lang === "ar";

  // بانر تجربة الإيجنت (كان في صفحة الأتمتة) — ساري فقط لغير Max أثناء البيتا
  const [agentBeta, setAgentBeta] = useState<{ active?: boolean; daysLeft?: number; remaining?: number } | null>(null);
  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAgentBeta(d?.plan?.agentBeta ?? null))
      .catch(() => {});
  }, []);
  const betaActive = agentBeta?.active === true;

  return (
    <div dir={dir} className="space-y-5">
      {betaActive && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/30 dark:to-gray-900 px-4 py-3">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">Agent Beta</span>
          <p className="text-xs text-gray-600 dark:text-gray-300 flex-1 min-w-[12rem]">
            {ar
              ? `تجربة الإيجنت سارية — متبقي ${agentBeta?.daysLeft ?? 0} ${((agentBeta?.daysLeft ?? 0) === 1) ? "يوم" : "أيام"} و ${(agentBeta?.remaining ?? 0).toLocaleString("ar-EG")} توكن (Gemini فقط).`
              : `Agent trial active — ${agentBeta?.daysLeft ?? 0} day(s) and ${(agentBeta?.remaining ?? 0).toLocaleString("en-US")} tokens left (Gemini only).`}
          </p>
          <a href="/checkout?plan=max"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition">
            {ar ? "الترقية إلى Max" : "Upgrade to Max"}
          </a>
        </div>
      )}

      <Suspense
        fallback={
          <div className="space-y-4" dir={dir}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse"
              />
            ))}
          </div>
        }
      >
        <AiAgentDashboard lang={lang} />
      </Suspense>
    </div>
  );
}
