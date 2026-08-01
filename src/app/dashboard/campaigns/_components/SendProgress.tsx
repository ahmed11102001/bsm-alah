import { tr } from "./i18n";
import { safeRate } from "./helpers";
import type { Campaign, Lang } from "./types";

export function SendProgress({ campaign, lang }: { campaign: Campaign; lang: Lang }) {
  const total = campaign.totalQueued || 0;
  if (total === 0) return null;
  const pct = safeRate(campaign.sentCount, total);
  const isLive = campaign.status === "running";
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
          {isLive && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse inline-block" />}
          {tr("sendProgress", lang)}
        </span>
        <span className="font-semibold text-blue-600 dark:text-blue-400">{pct}%</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${isLive ? "bg-blue-400 animate-pulse" : "bg-blue-400"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{campaign.sentCount.toLocaleString()} {tr("sent", lang)}</span>
        <span>{total.toLocaleString()} {tr("totalAudience", lang)}</span>
      </div>
    </div>
  );
}