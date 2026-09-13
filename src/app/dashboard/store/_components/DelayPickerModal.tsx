// src/app/dashboard/store/_components/DelayPickerModal.tsx
// â”€â”€â”€ Ù…ÙˆØ¯Ø§Ù„ ØªØ­Ø¯ÙŠØ¯ ÙˆÙ‚Øª Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø£ØªÙ…ØªØ© (delay) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Lang } from "./types";

export interface DelayPickerModalProps {
  currentDelay: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (minutes: number) => void;
  lang: Lang;
}

export function DelayPickerModal({ currentDelay, onClose, onConfirm, lang }: DelayPickerModalProps) {
  const [selected, setSelected] = useState(currentDelay);

  const options = [
    { value: 0, label: { ar: "âš¡ ÙÙˆØ±ÙŠ (Ø¨Ø¯ÙˆÙ† ØªØ£Ø®ÙŠØ±)", en: "âš¡ Immediate (no delay)" } },
    { value: 15, label: { ar: "â±ï¸ Ø¨Ø¹Ø¯ 15 Ø¯Ù‚ÙŠÙ‚Ø©", en: "â±ï¸ After 15 minutes" } },
    { value: 30, label: { ar: "â±ï¸ Ø¨Ø¹Ø¯ 30 Ø¯Ù‚ÙŠÙ‚Ø©", en: "â±ï¸ After 30 minutes" } },
    { value: 60, label: { ar: "â±ï¸ Ø¨Ø¹Ø¯ Ø³Ø§Ø¹Ø©", en: "â±ï¸ After 1 hour" } },
    { value: 120, label: { ar: "â±ï¸ Ø¨Ø¹Ø¯ Ø³Ø§Ø¹ØªÙŠÙ†", en: "â±ï¸ After 2 hours" } },
    { value: 180, label: { ar: "â±ï¸ Ø¨Ø¹Ø¯ 3 Ø³Ø§Ø¹Ø§Øª", en: "â±ï¸ After 3 hours" } },
    { value: 360, label: { ar: "â±ï¸ Ø¨Ø¹Ø¯ 6 Ø³Ø§Ø¹Ø§Øª", en: "â±ï¸ After 6 hours" } },
    { value: 720, label: { ar: "â±ï¸ Ø¨Ø¹Ø¯ 12 Ø³Ø§Ø¹Ø©", en: "â±ï¸ After 12 hours" } },
    { value: 1440, label: { ar: "â±ï¸ Ø¨Ø¹Ø¯ 24 Ø³Ø§Ø¹Ø© (ÙŠÙˆÙ…)", en: "â±ï¸ After 24 hours (1 day)" } },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col p-5 overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in duration-200 text-right">
        <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1 text-center">
          {lang === "ar" ? "ØªØ­Ø¯ÙŠØ¯ ÙˆÙ‚Øª Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø£ØªÙ…ØªØ©" : "Set Automation Delay"}
        </h3>
        <p className="text-xs text-gray-400 mb-4 text-center">
          {lang === "ar"
            ? "Ø³ÙŠØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠØ© Ù„Ù„Ø¹Ù…ÙŠÙ„ Ø¨Ø¹Ø¯ Ù…Ø±ÙˆØ± Ø§Ù„ÙˆÙ‚Øª Ø§Ù„Ù…Ø­Ø¯Ø¯ Ù…Ù† Ø§Ø³ØªÙ„Ø§Ù Ø§Ù„Ø·Ù„Ø¨/Ø§Ù„ØªØ­Ø¯ÙŠØ«."
            : "The automated message will be sent after the specified delay once the event occurs."}
        </p>

        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-all",
                lang === "ar" ? "flex-row-reverse text-right" : "flex-row text-left",
                selected === opt.value
                  ? "border-primary bg-primary/5 text-gray-800 dark:text-white font-medium"
                  : "border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300"
              )}
            >
              <span>{opt.label[lang]}</span>
              {selected === opt.value && (
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={() => onConfirm(selected)}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#1fba59] transition-colors"
          >
            {lang === "ar" ? "ØªØ£ÙƒÙŠØ¯ ÙˆØªÙØ¹ÙŠÙ„" : "Confirm & Enable"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            {lang === "ar" ? "Ø¥Ù„ØºØ§Ø¡" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
