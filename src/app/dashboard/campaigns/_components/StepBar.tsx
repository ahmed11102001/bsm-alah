import { CheckCircle } from "lucide-react";
import { tr } from "./i18n";
import type { Lang } from "./types";

export function StepBar({ step, lang }: { step: number; lang: Lang }) {
  const steps = [tr("stepAudience", lang), tr("stepTemplate", lang), tr("stepSettings", lang)];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = i + 1; const active = step === n; const done = step > n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                ${done ? "bg-green-500 text-white" : active ? "bg-green-500 text-white ring-4 ring-green-100 dark:ring-green-900/40" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
                {done ? <CheckCircle className="w-4 h-4" /> : n}
              </div>
              <span className={`text-xs mt-1.5 ${active ? "text-green-600 dark:text-green-400 font-medium" : "text-gray-400"}`}>{label}</span>
            </div>
            {i < 2 && <div className={`h-0.5 w-16 mx-1 mb-4 transition-colors ${step > n ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />}
          </div>
        );
      })}
    </div>
  );
}