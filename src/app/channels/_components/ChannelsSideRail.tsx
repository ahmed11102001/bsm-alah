"use client";

import Link from "next/link";
import { Users, Store, Bot } from "lucide-react";

// ─── شريط جانبي عائم (كارت طولي صغير في النصف الأسفل) ──────────────────────
// مش سايدبار للتنقل العام — اختصارات سريعة: وني CRM + ويزرد ربط المتجر
// (شغّالين) ووني AI (واجهة فقط حاليًا).
export default function ChannelsSideRail({ onConnectStore }: { onConnectStore: () => void }) {
  return (
    <>
      <style>{`
        @keyframes rail-float {
          0%, 100% { transform: translateY(calc(-50% - 6px)); }
          50% { transform: translateY(calc(-50% + 6px)); }
        }
        .channels-side-rail {
          animation: rail-float 3.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .channels-side-rail { animation: none; }
        }
      `}</style>
    <div
      className="channels-side-rail hidden lg:flex fixed left-4 top-[62%] z-40 flex-col items-stretch gap-1.5 rounded-2xl border border-white/10 bg-black/50 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl"
      aria-label="اختصارات سريعة"
    >
      {/* وني CRM — ينقل لصفحة CRM */}
      <Link
        href="/crm"
        title="وني CRM"
        className="group flex w-[76px] flex-col items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-3 transition-all duration-200 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95"
      >
        <Users className="h-5 w-5 text-emerald-300 transition-transform duration-200 group-hover:scale-110" />
        <span className="text-[11px] font-bold text-emerald-200">وني CRM</span>
      </Link>

      {/* ربط المتجر — يفتح ويزرد الربط */}
      <button
        type="button"
        title="ربط المتجر"
        onClick={onConnectStore}
        className="group flex w-[76px] flex-col items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-2 py-3 transition-all duration-200 hover:bg-emerald-500/[0.14] hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95"
      >
        <Store className="h-5 w-5 text-emerald-300/90 transition-transform duration-200 group-hover:scale-110" />
        <span className="text-[11px] font-semibold text-emerald-100/90">ربط المتجر</span>
      </button>

      {/* وني AI — ينقل لصفحة الوكيل الذكي المستقلة */}
      <Link
        href="/wani-ai"
        title="وني AI"
        className="group flex w-[76px] flex-col items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-2 py-3 transition-all duration-200 hover:bg-emerald-500/[0.14] hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95"
      >
        <Bot className="h-5 w-5 text-emerald-300/90 transition-transform duration-200 group-hover:scale-110" />
        <span className="text-[11px] font-semibold text-emerald-100/90">وني AI</span>
      </Link>
    </div>

      {/* زر عائم للموبايل (الشريط مخفي تحت lg) — يفتح ويزرد الربط */}
      <button
        type="button"
        onClick={onConnectStore}
        title="ربط المتجر"
        aria-label="ربط المتجر"
        className="lg:hidden fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-[#06231a]/95 shadow-2xl shadow-black/50 backdrop-blur-xl active:scale-95 transition"
      >
        <Store className="h-5 w-5 text-emerald-300" />
      </button>
    </>
  );
}
