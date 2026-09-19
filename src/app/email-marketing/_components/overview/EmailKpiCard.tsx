import { LucideIcon } from "lucide-react";

interface EmailKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accentColor?: "blue" | "emerald" | "indigo" | "amber" | "red" | "rose";
}

export default function EmailKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  accentColor = "red",
}: EmailKpiCardProps) {
  const colorMap: Record<string, string> = {
    red: "from-red-50 to-rose-50 text-red-600 border-red-200",
    rose: "from-rose-50 to-red-50 text-rose-600 border-rose-200",
    blue: "from-red-50 to-rose-50 text-red-600 border-red-200",
    indigo: "from-rose-50 to-red-50 text-rose-600 border-rose-200",
    emerald: "from-emerald-50 to-teal-50 text-emerald-600 border-emerald-200",
    amber: "from-amber-50 to-orange-50 text-amber-600 border-amber-200",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:border-red-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">{value}</h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-xl border bg-gradient-to-br ${colorMap[accentColor] || colorMap.red}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-slate-100 text-xs">
          <span className={trendUp ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
            {trend}
          </span>
          <span className="text-slate-400">مقارنة بالشهر الماضي</span>
        </div>
      )}
    </div>
  );
}
