"use client";

import { Users, Phone, Mail, Layers } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { tx, type CrmStats } from "../types";

export default function CrmStatsBar({ stats }: { stats: CrmStats }) {
  const { locale, dir } = useLanguage();

  const cards = [
    { icon: Users, label: tx("الإجمالي", "Total", locale), value: stats.total, cls: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" },
    { icon: Phone, label: tx("رقم بس", "Phone only", locale), value: stats.phoneOnly, cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
    { icon: Mail, label: tx("إيميل بس", "Email only", locale), value: stats.emailOnly, cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
    { icon: Layers, label: tx("الاتنين مع بعض", "Both channels", locale), value: stats.both, cls: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5" dir={dir}>
      {cards.map(({ icon: Icon, label, value, cls }) => (
        <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 shadow-sm">
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cls}`}>
            <Icon className="w-5 h-5" />
          </span>
          <span>
            <span className="block text-xl font-extrabold text-gray-900 dark:text-white leading-none">
              {value.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
