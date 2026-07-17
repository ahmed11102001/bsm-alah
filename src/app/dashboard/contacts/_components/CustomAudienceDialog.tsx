"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { normalizePhone, isValidPhone } from "./phone-utils";
import { PhoneStats } from "./PhoneStats";

interface CustomAudienceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  custName: string;
  setCustName: (s: string) => void;
  custInput: string;
  setCustInput: (s: string) => void;
  custSaving: boolean;
  onSave: () => void;
}

export function CustomAudienceDialog({
  open, onOpenChange, custName, setCustName, custInput, setCustInput, custSaving, onSave,
}: CustomAudienceDialogProps) {
  const { t, dir } = useLanguage();
  const ct = t.contacts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md dark:bg-gray-800 dark:border-gray-700" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold dark:text-white">{ct.customDialog.title}</DialogTitle>
          <DialogDescription className="dark:text-gray-400">{ct.customDialog.desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm mb-1 block dark:text-gray-300">{ct.customDialog.nameLabel} *</Label>
            <Input value={custName} onChange={e => setCustName(e.target.value)}
              placeholder={ct.customDialog.namePlaceholder}
              className="dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <Label className="text-sm mb-1 block dark:text-gray-300">{ct.customDialog.phonesLabel}</Label>
            <Textarea dir="ltr" value={custInput} onChange={e => setCustInput(e.target.value)}
              placeholder={"201234567890 Ahmed\n447911123456\n9715551234"}
              className="font-mono text-sm min-h-[140px] resize-none dark:bg-gray-700 dark:border-gray-600" />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{ct.customDialog.hint}</p>
          </div>
          {custInput.trim() && (() => {
            const lines = custInput.split(/[\n,،]+/).map(s => s.trim()).filter(Boolean);
            const v = lines.filter(l => l.split(/\s+/).some(p => isValidPhone(normalizePhone(p)))).length;
            return <PhoneStats valid={v} invalid={lines.length - v} />;
          })()}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 dark:border-gray-600 dark:text-gray-300"
              onClick={() => onOpenChange(false)}>{ct.customDialog.cancelBtn}</Button>
            <Button className="flex-1 bg-[#25D366] hover:bg-[#1fb956] text-white gap-1.5"
              onClick={onSave} disabled={custSaving || !custName.trim() || !custInput.trim()}>
              {custSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {ct.customDialog.saveBtn}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}