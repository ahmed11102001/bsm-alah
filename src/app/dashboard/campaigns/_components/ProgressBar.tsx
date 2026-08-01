import { safeRate } from "./helpers";

export function ProgressBar({ label, value, max, color, textColor }: {
  label: string; value: number; max: number; color: string; textColor: string;
}) {
  const pct = safeRate(value, max);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`font-semibold ${textColor}`}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-400">{value.toLocaleString()} / {max.toLocaleString()}</p>
    </div>
  );
}