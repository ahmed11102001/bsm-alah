import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Users, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { tr } from "./i18n";
import type { AudienceOption, Lang } from "./types";

export function CreateStep1({
  numbers, setNumbers, audiences, selectedAudienceId, setSelectedAudienceId,
  importingAudience, onExcelChange, onImportAudience, onNext, lang,
}: {
  numbers: string[]; setNumbers: (n: string[]) => void;
  audiences: AudienceOption[]; selectedAudienceId: string; setSelectedAudienceId: (id: string) => void;
  importingAudience: boolean;
  onExcelChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportAudience: () => void;
  onNext: () => void;
  lang: Lang;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{tr("uploadExcel", lang)}</Label>
        <label htmlFor="excel-input" className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-8 cursor-pointer hover:border-green-400 hover:bg-green-50/30 dark:hover:bg-green-900/10 transition-all">
          <FileSpreadsheet className="w-10 h-10 text-green-500" />
          <span className="font-medium text-gray-700 dark:text-gray-300">{tr("dragHere", lang)}</span>
          <span className="text-xs text-gray-400">.xlsx / .xls</span>
          <input id="excel-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={onExcelChange} />
        </label>
      </div>
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{tr("orImport", lang)}</Label>
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 space-y-3">
          <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
            <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600">
              <SelectValue placeholder={tr("chooseList", lang)} />
            </SelectTrigger>
            <SelectContent>
              {audiences.length === 0
                ? <SelectItem value="no-audiences" disabled>{tr("noLists", lang)}</SelectItem>
                : audiences.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.contactCount.toLocaleString()})</SelectItem>)
              }
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-full gap-2 dark:border-gray-600 dark:text-gray-300" onClick={onImportAudience} disabled={!selectedAudienceId || importingAudience}>
            {importingAudience ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {tr("importBtn", lang)}
          </Button>
        </div>
      </div>
      {numbers.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {numbers.length.toLocaleString()} {tr("numbers", lang)}
            </span>
            <button onClick={() => setNumbers([])} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
              <X className="w-3 h-3" /> {tr("clearAll", lang)}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {numbers.slice(0, 15).map((n, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-white dark:bg-gray-700 text-xs px-2 py-1 rounded-lg border border-green-200 dark:border-green-800 text-gray-700 dark:text-gray-300">
                {n}
                <button onClick={() => setNumbers(numbers.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {numbers.length > 15 && <span className="text-xs text-gray-400 self-center">+{numbers.length - 15}</span>}
          </div>
        </div>
      )}
      <Button onClick={() => { if (!numbers.length) { toast.error(tr("errAddNumbersFirst", lang)); return; } onNext(); }}
        className="w-full bg-green-500 hover:bg-green-600 text-white gap-2" disabled={numbers.length === 0}>
        {tr("nextTemplate", lang)} {lang === "ar" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>
    </div>
  );
}