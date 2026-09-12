"use client";

import React, { useState } from "react";
import { Lock, ChevronDown, BookOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardId, CARD_VISUALS, StepItem, ExternalLinkItem } from "../_types";

export interface IntegrationCardProps {
  id: CardId;
  title: string;
  subtitle: string;
  steps?: StepItem[];
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  locked?: boolean;
  lockMessage?: string;
  externalLink?: ExternalLinkItem;
  locale?: string;
  connected?: boolean;
  connectedLabel?: string;
}

export function IntegrationCard({
  id,
  title,
  subtitle,
  steps,
  isOpen,
  onToggle,
  children,
  locked = false,
  lockMessage = "",
  externalLink,
  locale = "ar",
  connected = false,
  connectedLabel,
}: IntegrationCardProps) {
  const [showGuide, setShowGuide] = useState(false);
  const v = CARD_VISUALS.find(c => c.id === id);
  const hasGuide = Boolean((steps && steps.length > 0) || externalLink);

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300 overflow-hidden",
      isOpen
        ? "bg-white dark:bg-gray-850 border-emerald-500/40 dark:border-emerald-500/40 shadow-sm"
        : "bg-white dark:bg-gray-850 border-gray-200 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-xs"
    )}>
      <button
        type="button"
        onClick={onToggle}
        title={locked ? lockMessage : undefined}
        className="w-full text-right p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform bg-gray-100 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60",
            isOpen && "scale-105 shadow-xs"
          )}>
            {v?.icon}
          </div>
          <div className="text-right min-w-0">
            <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <span className="truncate">{title}</span>
              {locked && <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {locked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Lock className="w-3 h-3" />
              {locale === "ar" ? "باقة Pro" : "Pro Plan"}
            </span>
          ) : connected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {locale === "ar" ? "متصل" : "Connected"}
              {connectedLabel && (
                <span className="hidden sm:inline font-mono text-[10px] text-emerald-600 dark:text-emerald-400 max-w-[130px] truncate">
                  ({connectedLabel})
                </span>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              {locale === "ar" ? "غير متصل" : "Not connected"}
            </span>
          )}
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700/50 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-700/60 pt-4 animate-in fade-in duration-200">
          {/* ── زر دليل الربط والشرح (Collapsible Guide) ── */}
          {hasGuide && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowGuide(prev => !prev)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-xs font-semibold text-gray-700 dark:text-gray-300 select-none cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{locale === "ar" ? "دليل الربط وشرح الخطوات" : "Connection Guide & Setup Steps"}</span>
                </span>
                <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                  <span>{showGuide ? (locale === "ar" ? "إخفاء الدليل" : "Hide guide") : (locale === "ar" ? "عرض الدليل" : "View guide")}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showGuide && "rotate-180")} />
                </div>
              </button>

              {showGuide && (
                <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/70 dark:border-gray-700/70 space-y-3 animate-in fade-in duration-200">
                  {steps && steps.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {steps.map((step, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200/70 dark:border-gray-700/60 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                              {i + 1}
                            </span>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{step.title}</p>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 pr-7 leading-relaxed">{step.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {externalLink && (
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                      <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                        {externalLink.label}
                      </span>
                      <a
                        href={externalLink.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
                      >
                        <span>{locale === "ar" ? "فتح المنصة في نافذة جديدة" : "Open platform in new tab"}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── نموذج البيانات وزر الربط بالأسفل ── */}
          <div className="bg-white dark:bg-gray-850 rounded-xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
