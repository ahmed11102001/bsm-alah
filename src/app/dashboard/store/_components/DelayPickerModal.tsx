// src/app/dashboard/store/_components/DelayPickerModal.tsx
// ─── مودال تحديد وقت إرسال الأتمتة (delay) ─────────────────────────────────

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
    { value: 0, label: { ar: "⚡ فوري (بدون تأخير)", en: "⚡ Immediate (no delay)" } },
    { value: 15, label: { ar: "⏱️ بعد 15 دقيقة", en: "⏱️ After 15 minutes" } },
    { value: 30, label: { ar: "⏱️ بعد 30 دقيقة", en: "⏱️ After 30 minutes" } },
    { value: 60, label: { ar: "⏱️ بعد ساعة", en: "⏱️ After 1 hour" } },
    { value: 120, label: { ar: "⏱️ بعد ساعتين", en: "⏱️ After 2 hours" } },
    { value: 180, label: { ar: "⏱️ بعد 3 ساعات", en: "⏱️ After 3 hours" } },
    { value: 360, label: { ar: "⏱️ بعد 6 ساعات", en: "⏱️ After 6 hours" } },
    { value: 720, label: { ar: "⏱️ بعد 12 ساعة", en: "⏱️ After 12 hours" } },
    { value: 1440, label: { ar: "⏱️ بعد 24 ساعة (يوم)", en: "⏱️ After 24 hours (1 day)" } },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col p-5 overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in duration-200 text-right">
        <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1 text-center">
          {lang === "ar" ? "تحديد وقت إرسال الأتمتة" : "Set Automation Delay"}
        </h3>
        <p className="text-xs text-gray-400 mb-4 text-center">
          {lang === "ar"
            ? "سيتم إرسال الرسالة التلقائية للعميل بعد مرور الوقت المحدد من استلاف الطلب/التحديث."
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
                  ? "border-[#25D366] bg-[#25D366]/5 text-gray-800 dark:text-white font-medium"
                  : "border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300"
              )}
            >
              <span>{opt.label[lang]}</span>
              {selected === opt.value && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#25D366]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={() => onConfirm(selected)}
            className="flex-1 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1fba59] transition-colors"
          >
            {lang === "ar" ? "تأكيد وتفعيل" : "Confirm & Enable"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            {lang === "ar" ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}