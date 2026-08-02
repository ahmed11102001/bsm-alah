"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { useSubscription } from "@/lib/dashboard-context";
import {
  BarChart3, Users, Shield, Activity, ShoppingBag, Bot, DollarSign,
} from "lucide-react";
import { pageText } from "./_shared";

// ─── تابات صفحة التقارير ───────────────────────────────────────────────────────
// overview/customers/team لسه مع بعض في /dashboard/reports (نفس الملف، بتفرّق
// بينهم بـ ?tab=). logs/store/automation/cost بقوا routes حقيقية منفصلة.
const REPORT_TABS = [
  { value: "overview", icon: BarChart3, minPlan: "free", href: "/dashboard/reports" },
  { value: "customers", icon: Users, minPlan: "starter", href: "/dashboard/reports?tab=customers" },
  { value: "team", icon: Shield, minPlan: "starter", href: "/dashboard/reports?tab=team" },
  { value: "logs", icon: Activity, minPlan: "starter", href: "/dashboard/reports/logs" },
  { value: "store", icon: ShoppingBag, minPlan: "pro", href: "/dashboard/reports/store" },
  { value: "automation", icon: Bot, minPlan: "pro", href: "/dashboard/reports/automation" },
  { value: "cost", icon: DollarSign, minPlan: "pro", href: "/dashboard/reports/cost" },
] as const;

const ORDER = ["free", "starter", "pro", "enterprise"];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = useLanguage();
  const { planTier } = useSubscription();
  const pathname = usePathname();

  // التاب النشط: لو المسار route منفصل بيتحدد بالـ pathname، غير كده من ?tab=
  const activeFromPath = pathname.split("/")[3]; // "logs" | "store" | "automation" | "cost" | undefined
  const activeTab = activeFromPath ?? (
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tab") ?? "overview"
      : "overview"
  );

  return (
    <div dir={dir}>
      <div className="mb-6 flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {REPORT_TABS.map((item) => {
          const allowed = ORDER.indexOf(planTier) >= ORDER.indexOf(item.minPlan);
          const label = pageText[locale].tabs[item.value];
          const isActive = activeTab === item.value;
          return (
            <Link
              key={item.value}
              href={allowed ? item.href : "#"}
              aria-disabled={!allowed}
              className={`flex items-center gap-1.5 text-sm rounded-lg px-4 py-2 transition-all
                ${!allowed
                  ? "opacity-40 cursor-not-allowed text-gray-400 pointer-events-none"
                  : isActive
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60"
                }`}
            >
              <item.icon className="w-4 h-4" /> {label}
              {!allowed && <span className="text-[10px] mr-1">🔒</span>}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
