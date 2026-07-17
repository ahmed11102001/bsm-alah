"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export function PhoneStats({ valid, invalid }: { valid: number; invalid: number }) {
  const { t } = useLanguage();
  const ps = t.contacts.phoneStats;
  const total = valid + invalid;
  return (
    <div className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm">
      <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
        <CheckCircle className="w-4 h-4" />
        <span className="font-semibold">{valid}</span> {ps.valid}
      </div>
      <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
        <XCircle className="w-4 h-4" />
        <span className="font-semibold">{invalid}</span> {ps.invalid}
      </div>
      <div className="mr-auto text-gray-400 dark:text-gray-500 text-xs">{total} {ps.total}</div>
    </div>
  );
}