"use client";

// نسخة الديمو من src/app/dashboard/reports/layout.tsx — نفس الشكل والسلوك،
// الفرق: الروابط بتوجه لـ /demo/reports/* والـ useSubscription من الـ context الوهمي.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { useSubscription } from "../_lib/dashboard-context";
import {
    BarChart3, Users, Shield, Activity, ShoppingBag, Bot, DollarSign,
} from "lucide-react";
import { pageText } from "@/app/dashboard/reports/_shared";

const REPORT_TABS = [
    { value: "overview", icon: BarChart3, minPlan: "free", href: "/demo/reports" },
    { value: "customers", icon: Users, minPlan: "starter", href: "/demo/reports?tab=customers" },
    { value: "team", icon: Shield, minPlan: "starter", href: "/demo/reports?tab=team" },
    { value: "logs", icon: Activity, minPlan: "starter", href: "/demo/reports/logs" },
    { value: "store", icon: ShoppingBag, minPlan: "pro", href: "/demo/reports/store" },
    { value: "automation", icon: Bot, minPlan: "pro", href: "/demo/reports/automation" },
    { value: "cost", icon: DollarSign, minPlan: "pro", href: "/demo/reports/cost" },
] as const;

const ORDER = ["free", "starter", "pro", "enterprise"];

export default function DemoReportsLayout({ children }: { children: React.ReactNode }) {
    const { locale, dir } = useLanguage();
    const { planTier } = useSubscription();
    const pathname = usePathname();

    const activeFromPath = pathname.split("/")[3];
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