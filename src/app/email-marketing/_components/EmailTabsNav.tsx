"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EMAIL_TABS } from "../constants";

export default function EmailTabsNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200/90 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-2 rtl:space-x-reverse overflow-x-auto py-2.5 no-scrollbar" aria-label="Tabs">
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
