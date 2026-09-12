"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Lock, Zap } from "lucide-react";

export function DisconnectModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  loading,
  locale = "ar",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  loading?: boolean;
  locale?: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4 border border-red-200 dark:border-red-900/50" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">{title}</h3>
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">
              {locale === "ar" ? "إجراء حساس — يؤثر على الأتمتة الحالية" : "Sensitive action — affects active automations"}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
          {description}
        </p>
        <div className="flex gap-2 pt-2">
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {locale === "ar" ? "نعم، تأكيد فك الربط" : "Yes, Disconnect"}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="dark:border-gray-700 dark:text-gray-300"
          >
            {locale === "ar" ? "إلغاء" : "Cancel"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function UpgradeModal({
  isOpen,
  onClose,
  title,
  description,
  price = "599 ج/شهر",
  plan = "pro",
  locale = "ar",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  price?: string;
  plan?: string;
  locale?: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4 border border-amber-200 dark:border-amber-900/50" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-1.5">
              {title}
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                PRO+
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {locale === "ar" ? "هذه الميزة متوفرة للباقات المتقدمة" : "Available on Pro and Enterprise plans"}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-100/70 dark:border-amber-900/30">
          {description}
        </p>
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => { onClose(); window.location.href = `/checkout?plan=${plan}`; }}
            className="flex-1 gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <Zap className="w-4 h-4" />
            {locale === "ar" ? `ترقية الباقة الآن (${price})` : `Upgrade Plan Now (${price})`}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="dark:border-gray-700 dark:text-gray-300"
          >
            {locale === "ar" ? "لاحقاً" : "Later"}
          </Button>
        </div>
      </div>
    </div>
  );
}
