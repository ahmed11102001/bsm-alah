"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { EMAIL_TABS } from "../constants";

export default function EmailTabsNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-[#031510]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center gap-3">
        {/* Brand + Channels — على الجانب */}
        <div className="flex items-center gap-2 py-2 flex-shrink-0">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-[#25D366] flex-shrink-0">
            <img src="/faviconlink.svg" alt="Wani" className="h-full w-full object-cover" />
          </span>
          <span className="hidden sm:block text-sm font-extrabold tracking-wider text-white leading-none">
            WANI
          </span>
          <Link
            href="/channels"
            title="مركز القنوات"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-white/70 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 active:scale-95"
          >
            <ArrowRight className="h-3 w-3 rtl:rotate-180" />
            <span className="hidden md:inline">القنوات</span>
          </Link>
        </div>

        {/* خط طولي فاصل بين البراند وتبويبات الإيميل */}
        <div className="h-8 w-px bg-white/10 flex-shrink-0" aria-hidden="true" />

        <nav className="flex flex-1 space-x-2 rtl:space-x-reverse overflow-x-auto py-2.5 no-scrollbar" aria-label="Tabs">
          {EMAIL_TABS.map((tab) => {
            const Icon = tab.icon;
            // التحقق من التاب النشط: إما تطابق كامل، أو إذا كان المسار يبدأ بمسار التاب (مع استثناء overview لئلا يطابق الكل)
            const isActive =
              tab.id === "overview"
                ? pathname === "/dashboard/email" || pathname === "/email-marketing"
                : pathname.startsWith(tab.href) || pathname.startsWith(tab.href.replace("/dashboard/email", "/email-marketing"));

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`group flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/25"
                    : "text-slate-600 hover:bg-red-50/80 hover:text-red-600"
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-red-500"
                  }`}
                />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
