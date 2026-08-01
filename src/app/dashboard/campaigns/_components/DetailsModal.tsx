import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Users, Send, CheckCircle, Eye, XCircle, Hourglass, BarChart3 } from "lucide-react";
import { tr } from "./i18n";
import { statusConfig, estimateCost, EG_PRICES } from "./helpers";
import { ProgressBar } from "./ProgressBar";
import type { Campaign, Lang } from "./types";

export function DetailsModal({ campaign, open, onClose, lang }: {
  campaign: Campaign | null; open: boolean; onClose: () => void; lang: Lang;
}) {
  if (!campaign) return null;
  const cfg = statusConfig(lang)[campaign.status] ?? statusConfig(lang).draft;
  const total = campaign.totalQueued || campaign.sentCount;

  const stats = [
    { label: tr("totalAudience", lang), value: total, icon: <Users className="w-5 h-5" />, color: "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300" },
    { label: tr("totalSent", lang), value: campaign.sentCount, icon: <Send className="w-5 h-5" />, color: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
    { label: tr("totalDelivered", lang), value: campaign.deliveredCount + campaign.readCount, icon: <CheckCircle className="w-5 h-5" />, color: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
    { label: tr("totalRead", lang), value: campaign.readCount, icon: <Eye className="w-5 h-5" />, color: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" },
    ...(campaign.failedCount > 0 ? [{ label: tr("failed", lang), value: campaign.failedCount, icon: <XCircle className="w-5 h-5" />, color: "bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400" }] : []),
    { label: tr("waiting", lang), value: campaign.queuedCount, icon: <Hourglass className="w-5 h-5" />, color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" dir={lang === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">{campaign.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
            </span>
            {campaign.template?.name && <span className="text-xs text-gray-500 dark:text-gray-400">{tr("template", lang)}: {campaign.template.name}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 my-2">
          {stats.map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-3 flex flex-col items-center text-center gap-1`}>
              {s.icon}
              <p className="text-xl font-bold">{s.value.toLocaleString()}</p>
              <p className="text-[10px] opacity-75 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {campaign.sentCount > 0 && (
          <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> {tr("performance", lang)}
            </p>
            <ProgressBar label={tr("sentPct", lang)} value={campaign.sentCount} max={total} color="bg-blue-400" textColor="text-blue-600 dark:text-blue-400" />
            <ProgressBar label={tr("deliveryRateL", lang)} value={campaign.deliveredCount + campaign.readCount} max={campaign.sentCount} color="bg-green-400" textColor="text-green-600 dark:text-green-400" />
            <ProgressBar label={tr("readRateL", lang)} value={campaign.readCount} max={campaign.sentCount} color="bg-purple-400" textColor="text-purple-600 dark:text-purple-400" />
            {campaign.failedCount > 0 && (
              <ProgressBar label={tr("failureRateL", lang)} value={campaign.failedCount} max={campaign.sentCount} color="bg-red-400" textColor="text-red-500 dark:text-red-400" />
            )}
          </div>
        )}

        {/* ── Cost Estimate ── */}
        {campaign.sentCount > 0 && (() => {
          const category = campaign.template?.category ?? "MARKETING";
          const cost = estimateCost(campaign.sentCount, category);
          const pricePerMsg = EG_PRICES[category.toUpperCase()] ?? EG_PRICES.MARKETING;
          return (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  💰 {tr("estimatedCost", lang)}
                </span>
                <span className="text-base font-bold text-amber-700 dark:text-amber-300">
                  ~${cost.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
                <span>{tr("costPerMsg", lang)}</span>
                <span className="font-medium">${pricePerMsg.toFixed(4)} × {campaign.sentCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-500">
                <span>{lang === "ar" ? "الكاتيجوري" : "Category"}</span>
                <span className="font-medium px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded-full">{category}</span>
              </div>
              <p className="text-[10px] text-amber-500 dark:text-amber-600 pt-1 border-t border-amber-200 dark:border-amber-800/40 leading-relaxed">
                {tr("costNote", lang)}
              </p>
            </div>
          );
        })()}

        <div className="text-xs text-gray-400 space-y-1 pt-1 border-t border-gray-100 dark:border-gray-700">
          <p>{tr("createdAt", lang)}: {new Date(campaign.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}</p>
          {campaign.scheduledAt && <p>{tr("scheduledAt", lang)}: {new Date(campaign.scheduledAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}</p>}
          {campaign.completedAt && <p>{tr("completedAt", lang)}: {new Date(campaign.completedAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}