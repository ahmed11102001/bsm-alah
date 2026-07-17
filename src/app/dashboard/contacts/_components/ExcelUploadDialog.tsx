"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { DropZone } from "./DropZone";
import { PhoneStats } from "./PhoneStats";

interface ExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exStep: 1 | 2;
  setExStep: (s: 1 | 2) => void;
  parsed: { phone: string; name: string | null }[];
  invalid: number;
  audName: string;
  setAudName: (s: string) => void;
  audNotes: string;
  setAudNotes: (s: string) => void;
  saving: boolean;
  onParseFile: (file: File) => void;
  onSave: () => void;
}

export function ExcelUploadDialog({
  open, onOpenChange, exStep, setExStep, parsed, invalid,
  audName, setAudName, audNotes, setAudNotes, saving, onParseFile, onSave,
}: ExcelUploadDialogProps) {
  const { t, dir } = useLanguage();
  const ct = t.contacts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg dark:bg-gray-800 dark:border-gray-700" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold dark:text-white">{ct.excelDialog.title}</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            {exStep === 1 ? ct.excelDialog.step1Desc : ct.excelDialog.step2Desc}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                exStep >= s ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
                {exStep > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              <span className={`text-xs ${exStep === s ? "text-green-600 font-medium" : "text-gray-400 dark:text-gray-500"}`}>
                {s === 1 ? ct.excelDialog.step1Label : ct.excelDialog.step2Label}
              </span>
              {s < 2 && <div className={`h-0.5 w-8 ${exStep > s ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />}
            </div>
          ))}
        </div>

        {exStep === 1 && (
          <div className="space-y-4">
            <DropZone onFile={onParseFile} />
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">{ct.excelDialog.hint}</p>
          </div>
        )}

        {exStep === 2 && (
          <div className="space-y-4">
            <PhoneStats valid={parsed.length} invalid={invalid} />
            <div>
              <Label className="text-sm mb-1 block dark:text-gray-300">{ct.excelDialog.nameLabel} *</Label>
              <Input value={audName} onChange={e => setAudName(e.target.value)}
                placeholder={ct.excelDialog.namePlaceholder}
                className="dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <Label className="text-sm mb-1 block dark:text-gray-300">{ct.excelDialog.notesLabel}</Label>
              <Textarea value={audNotes} onChange={e => setAudNotes(e.target.value)}
                placeholder={ct.excelDialog.notesPlaceholder}
                className="min-h-[70px] resize-none text-sm dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1">
              {parsed.slice(0, 10).map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-gray-600 dark:text-gray-400">{p.phone}</span>
                  {p.name && <span className="text-gray-400 dark:text-gray-500">— {p.name}</span>}
                </div>
              ))}
              {parsed.length > 10 && <p className="text-xs text-gray-400">{ct.excelDialog.moreItems(parsed.length - 10)}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 dark:border-gray-600 dark:text-gray-300"
                onClick={() => setExStep(1)}>{ct.excelDialog.prevBtn}</Button>
              <Button className="flex-1 bg-[#25D366] hover:bg-[#1fb956] text-white gap-1.5"
                onClick={onSave} disabled={saving || !audName.trim() || parsed.length === 0}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {ct.excelDialog.saveBtn}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}