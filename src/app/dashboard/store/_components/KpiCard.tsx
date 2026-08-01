// src/app/dashboard/store/_components/KpiCard.tsx
// ─── كارد الإحصائية الواحدة (KPI) ───────────────────────────────────────────

import { cn } from "@/lib/utils";

export interface KpiCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    color: string;
}

export function KpiCard({ icon, label, value, sub, color }: KpiCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm flex items-start gap-4">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white leading-none">{value}</p>
                {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
            </div>
        </div>
    );
}