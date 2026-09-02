import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, Eye, RefreshCw, Trash2, Clock, Calendar, Loader2 } from "lucide-react";
import { tr } from "./i18n";
import { statusConfig } from "./helpers";
import { SendProgress } from "./SendProgress";
import type { Campaign, Lang } from "./types";

export function CampaignCard({ campaign, onDelete, onRepeat, onDetails, repeatBlocked, lang }: {
  campaign: Campaign; onDelete: () => void; onRepeat: () => void; onDetails: () => void;
  repeatBlocked: boolean; repeatBlockedNote: string; lang: Lang;
}) {
  const cfg = statusConfig(lang)[campaign.status] ?? statusConfig(lang).draft;
  return (
    <Card className="border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <CardContent className="p-3 sm:p-4">

        {/* ── Header row ── */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{campaign.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${campaign.status === "running" ? "animate-pulse" : ""}`} />
                {cfg.label}
              </span>
              {campaign.template?.name && (
                <span className="text-[11px] text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                  {campaign.template.name}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={onDetails}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
              title={tr("details", lang)}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={onRepeat}
              disabled={repeatBlocked}
              className={`p-1.5 rounded-lg transition ${repeatBlocked ? "text-gray-200 dark:text-gray-600 cursor-not-allowed" : "text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Send progress bar (for running, completed, and queued) ── */}
        {campaign.totalQueued > 0 && campaign.status !== "scheduled" && (
          <div className="mt-3 border-t border-gray-50 dark:border-gray-700 pt-3">
            <SendProgress campaign={campaign} lang={lang} />
          </div>
        )}

        {/* ── Queued banner ── */}
        {campaign.status === "queued" && (
          <div className="mt-2.5 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
            <Clock className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <span className="font-semibold">{tr("queued", lang)}:</span> {tr("queuedHint", lang)}
            </div>
          </div>
        )}

        {/* ── Scheduled banner ── */}
        {campaign.status === "scheduled" && campaign.scheduledAt && (
          <div className="mt-2.5 flex items-start gap-2 text-xs text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">{tr("scheduled", lang)}:</span> {new Date(campaign.scheduledAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}
              <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">{tr("scheduledHint", lang)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}