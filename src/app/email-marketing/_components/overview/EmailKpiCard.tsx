import { LucideIcon } from "lucide-react";

interface EmailKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accentColor?: "blue" | "emerald" | "indigo" | "amber";
}

export default function EmailKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  accentColor = "blue",
}: EmailKpiCardProps) {
  const colorMap = {
    blue: "from-blue-500/15 to-blue-600/5 text-blue-400 border-blue-500/20",
    emerald: "from-emerald-500/15 to-emerald-600/5 text-emerald-400 border-emerald-500/20",
    indigo: "from-indigo-500/15 to-indigo-600/5 text-indigo-400 border-indigo-500/20",
    amber: "from-amber-500/15 to-amber-600/5 text-amber-400 border-amber-500/20",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-white/50">{title}</p>
          <h3 className="mt-2 text-2xl font-black text-white">{value}</h3>
          {subtitle && (
            <p className="mt-1 text-xs text-white/40">{subtitle}</p>
          )}
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-xl border bg-gradient-to-br ${colorMap[accentColor]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-white/5 text-xs">
          <span className={trendUp ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
            {trend}
          </span>
          <span className="text-white/40">مقارنة بالشهر الماضي</span>
        </div>
      )}
    </div>
  );
}
