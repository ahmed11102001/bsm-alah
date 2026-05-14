// src/components/dashboard/PlanGate.tsx
// ─── يعرض الصفحة كاملة لكن بـ blur + overlay لو الباقة مش كافية ────────────
// الاستخدام:
//   <PlanGate allowed={plan.limits.advancedReports} featureName="التقارير المتقدمة" requiredPlan="Professional">
//     <Reports />
//   </PlanGate>

"use client";

import { Lock, ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";

interface PlanGateProps {
  /** هل الباقة الحالية تسمح بالميزة دي؟ */
  allowed: boolean;
  /** اسم الميزة بالعربي — بيظهر في الـ overlay */
  featureName: string;
  /** اسم الباقة المطلوبة بالعربي */
  requiredPlan: string;
  children: React.ReactNode;
}

export default function PlanGate({
  allowed,
  featureName,
  requiredPlan,
  children,
}: PlanGateProps) {
  if (allowed) return <>{children}</>;

  return (
    <div className="relative" dir="rtl">

      {/* ── المحتوى الأصلي — مرئي لكن غير تفاعلي ─────────────────────────── */}
      <div
        className="select-none pointer-events-none"
        style={{ filter: "blur(4px)", opacity: 0.45 }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* ── Overlay ──────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-start justify-center pt-24 z-10">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">

          {/* أيقونة */}
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-amber-500" />
          </div>

          {/* النص */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
            {featureName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            الميزة دي غير متاحة في باقتك الحالية.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            ترقّى لباقة{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {requiredPlan}
            </span>{" "}
            عشان تقدر تستخدمها.
          </p>

          {/* CTA */}
          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 bg-[#075E54] hover:bg-[#064944] text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            ترقية الباقة
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

    </div>
  );
}