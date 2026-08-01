import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { tr } from "./i18n";
import { estimateCost, EG_PRICES } from "./helpers";
import type { Template, Lang } from "./types";

export function CreateStep3({
  campaignName, setCampaignName, sendMode, setSendMode, scheduledAt, setScheduledAt,
  numbers, selectedTemplate, submitting, onBack, onSubmit, lang,
}: {
  campaignName: string; setCampaignName: (s: string) => void;
  sendMode: "now" | "scheduled"; setSendMode: (m: "now" | "scheduled") => void;
  scheduledAt: string; setScheduledAt: (s: string) => void;
  numbers: string[]; selectedTemplate: Template | null; submitting: boolean;
  onBack: () => void; onSubmit: () => void; lang: Lang;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{tr("campaignName", lang)}</Label>
        <Input placeholder={tr("namePlaceholder", lang)} value={campaignName} onChange={e => setCampaignName(e.target.value)} className="dark:bg-gray-700 dark:border-gray-600" />
      </div>
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{tr("sendTime", lang)}</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["now", "scheduled"] as const).map(mode => (
            <button key={mode} onClick={() => setSendMode(mode)}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${sendMode === mode ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300"}`}>
              {mode === "now" ? <><Send className="w-4 h-4" /> {tr("sendNow", lang)}</> : <><Calendar className="w-4 h-4" /> {tr("scheduleLater", lang)}</>}
            </button>
          ))}
        </div>
      </div>
      {sendMode === "scheduled" && (
        <Input type="datetime-local" value={scheduledAt}
          min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}
          onChange={e => setScheduledAt(e.target.value)} className="dark:bg-gray-700 dark:border-gray-600" />
      )}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{tr("summary", lang)}</p>
        {[
          { label: tr("sumName", lang), value: campaignName || "—" },
          { label: tr("sumRecipients", lang), value: `${numbers.length.toLocaleString()} ${tr("numbers", lang)}` },
          { label: tr("sumTemplate", lang), value: selectedTemplate?.name || "—" },
          { label: tr("sumSend", lang), value: sendMode === "now" ? tr("sumImmediate", lang) : scheduledAt ? new Date(scheduledAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB") : "—" },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{row.value}</span>
          </div>
        ))}
      </div>

      {/* ── Cost Estimate ── */}
      {numbers.length > 0 && selectedTemplate && (() => {
        const category = (selectedTemplate as any).category ?? "MARKETING";
        const cost = estimateCost(numbers.length, category);
        const pricePerMsg = EG_PRICES[category?.toUpperCase()] ?? EG_PRICES.MARKETING;
        return (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                💰 {tr("estimatedCost", lang)}
              </span>
              <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
                ~${cost.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
              <span>{tr("costPerMsg", lang)}</span>
              <span className="font-medium">${pricePerMsg.toFixed(4)} × {numbers.length.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-500">
              <span>{lang === "ar" ? "الكاتيجوري" : "Category"}</span>
              <span className="font-medium px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded-full">{category}</span>
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-500 pt-1 border-t border-amber-200 dark:border-amber-800/40 leading-relaxed">
              {tr("costNote", lang)}
            </p>
            <p className="text-[11px] text-amber-500 dark:text-amber-600">
              {tr("costEgOnly", lang)}
            </p>
          </div>
        );
      })()}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 gap-2 dark:border-gray-600 dark:text-gray-300" onClick={onBack}>
          {lang === "ar" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />} {tr("prev", lang)}
        </Button>
        <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2" onClick={onSubmit}
          disabled={submitting || !campaignName.trim() || !selectedTemplate}>
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {tr("launching", lang)}</>
            : sendMode === "now" ? <><Send className="w-4 h-4" /> {tr("sendCampaign", lang)}</>
              : <><Calendar className="w-4 h-4" /> {tr("scheduleCampaign", lang)}</>}
        </Button>
      </div>
    </div>
  );
}