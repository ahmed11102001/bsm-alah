"use client";

// ─── رسم مصغّر لردود الوكيل الذكي — آخر 7 أيام (يوم × عدد الرسايل) ─────────
// مشترك بين الداشبورد الحقيقية وصفحة الديمو. صغير على قد الكارت.
export interface AiAgentDailyPoint {
  date: string;
  count: number;
}

export default function AiAgentMiniChart({ daily, totalLabel, emptyHint, last7Label, dateLocale, numFmt }: {
  daily: AiAgentDailyPoint[];
  totalLabel: string;
  emptyHint: string;
  last7Label: string;
  dateLocale: string;
  numFmt: (n: number) => string;
}) {
  const total = daily.reduce((s, d) => s + d.count, 0);
  const max = Math.max(1, ...daily.map(d => d.count));
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full flex flex-col h-full">
      {/* الإجمالي تحت الاسم */}
      <div className="flex items-baseline gap-2">
        <span className="text-[32px] leading-none font-extrabold text-foreground">{numFmt(total)}</span>
        <span className="text-[11px] text-muted-foreground">{totalLabel}</span>
        <span className="ms-auto text-[10px] text-muted-foreground/70 flex-shrink-0">{last7Label}</span>
      </div>
      {/* رسم الأيام */}
      <div className="flex items-end gap-1.5 flex-1 w-full mt-3 min-h-[84px]">
        {daily.map(d => {
          const isToday = d.date === todayKey;
          const pct = d.count > 0 ? Math.max(8, Math.round((d.count / max) * 100)) : 0;
          return (
            <div key={d.date} className="flex-1 h-full flex flex-col items-center justify-end gap-1 min-w-0" title={`${d.date}: ${numFmt(d.count)}`}>
              <div
                className={`w-full max-w-[26px] rounded-t-md transition-all ${
                  d.count === 0
                    ? "bg-muted"
                    : isToday
                      ? "bg-emerald-600 dark:bg-emerald-500"
                      : "bg-emerald-500/35 dark:bg-emerald-400/30"
                }`}
                style={{ height: d.count === 0 ? 3 : `${pct}%` }}
              />
              <span className={`text-[9px] leading-none flex-shrink-0 ${isToday ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/70"}`}>
                {new Date(`${d.date}T00:00:00`).toLocaleDateString(dateLocale, { weekday: "short" })}
              </span>
            </div>
          );
        })}
      </div>
      {total === 0 && (
        <p className="text-[11px] text-muted-foreground text-center mt-2">{emptyHint}</p>
      )}
    </div>
  );
}
