"use client";

import { Crown, Star, Eye, ChevronRight, MessageCircle, ShoppingBag, Info } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { Audience } from "./types";

export function VipCard({ audience, onView }: { audience: Audience; onView: () => void }) {
  const { t, locale } = useLanguage();
  const c = t.contacts.card;
  const vc = t.contacts.vipCriteria;
  const numFmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-800
      bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50
      dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/40
      shadow-md hover:shadow-xl transition-all duration-300 group">

      {/* Shimmer strip */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 rounded-t-2xl" />

      {/* Subtle background crown */}
      <div className="absolute -top-3 -left-3 opacity-5 dark:opacity-10 pointer-events-none">
        <Crown className="w-28 h-28 text-amber-500" />
      </div>

      <div className="p-4 flex flex-col gap-3 relative">

        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 shadow-sm
              flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <Crown className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                {audience.name}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
                bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 mt-0.5">
                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                VIP
              </span>
            </div>
          </div>
          <button onClick={onView}
            className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-500 transition-colors">
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Count */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-amber-600 dark:text-amber-400 leading-none">
            {numFmt(audience.contactCount)}
          </span>
          <span className="text-sm font-normal text-amber-500/70 dark:text-amber-400/60">{c.contact}</span>
        </div>

        {/* Phone pills */}
        <div className="flex flex-wrap gap-1">
          {audience.contacts.slice(0, 3).map(ct => (
            <span key={ct.id}
              className="text-[11px] bg-amber-100/80 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700
              px-2 py-0.5 rounded-lg text-amber-700 dark:text-amber-300 font-mono">
              {ct.phone}
            </span>
          ))}
          {audience.contactCount > 3 && (
            <span className="text-[11px] text-amber-500/70">+{numFmt(audience.contactCount - 3)}</span>
          )}
        </div>

        {/* Criteria tooltip strip */}
        <div className="flex items-start gap-2 bg-amber-100/60 dark:bg-amber-900/20 rounded-xl px-3 py-2 mt-1">
          <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
            <p className="font-semibold">{vc.badge}</p>
            <p className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" /> {vc.rule1}
            </p>
            <p className="flex items-center gap-1">
              <ShoppingBag className="w-3 h-3" /> {vc.rule2}
            </p>
          </div>
        </div>

        {/* View link */}
        <button onClick={onView}
          className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200
          flex items-center gap-1 mt-auto font-medium transition-colors">
          {c.viewDetails} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}