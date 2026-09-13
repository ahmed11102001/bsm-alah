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
                ${done ? "bg-primary text-primary-foreground" : active ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
                {done ? <CheckCircle className="w-4 h-4" /> : n}
              </div>
              <span className={`text-xs mt-1.5 ${active ? "text-primary font-medium" : "text-gray-400"}`}>{label}</span>
            </div>
            {i < 2 && <div className={`h-0.5 w-16 mx-1 mb-4 transition-colors ${step > n ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}`} />}
          </div>
        );
      })}
    </div>
  );
}