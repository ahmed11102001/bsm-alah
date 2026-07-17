"use client";

import { TrendingUp, Eye, ChevronRight, MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { Audience } from "./types";

export function EngagedCard({ audience, onView }: { audience: Audience; onView: () => void }) {
  const { t, locale } = useLanguage();
  const c = t.contacts.card;
  const numFmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");

  return (
    <div className="relative rounded-2xl border border-blue-200 dark:border-blue-800
      bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20
      shadow-sm hover:shadow-md transition-all duration-200 group">

      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-t-2xl" />

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center
              group-hover:scale-105 transition-transform duration-200 shadow-sm">
              <TrendingUp className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                {audience.name}
              </p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md
                bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {t.contacts.types.engaged}
              </span>
            </div>
          </div>
          <button onClick={onView}
            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-400 transition-colors">
            <Eye className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 leading-none">
            {numFmt(audience.contactCount)}
          </span>
          <span className="text-sm font-normal text-gray-400">{c.contact}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {audience.contacts.slice(0, 3).map(ct => (
            <span key={ct.id}
              className="text-[11px] bg-white/70 dark:bg-gray-700/70 border border-blue-200 dark:border-blue-700
              px-2 py-0.5 rounded-lg text-gray-600 dark:text-gray-400 font-mono">
              {ct.phone}
            </span>
          ))}
          {audience.contactCount > 3 && (
            <span className="text-[11px] text-gray-400">+{numFmt(audience.contactCount - 3)}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-blue-600/70 dark:text-blue-400/70">
          <MessageCircle className="w-3 h-3" />
          <span>ردّوا على رسائلك ولو مرة</span>
        </div>

        <button onClick={onView}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
          flex items-center gap-1 mt-auto transition-colors">
          {c.viewDetails} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}