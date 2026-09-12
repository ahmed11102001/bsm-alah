"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wifi, Copy, CheckCircle2, RefreshCw, Trash2, Loader2, CheckCircle } from "lucide-react";
import EmbeddedSignupButton from "@/components/dashboard/EmbeddedSignupButton";

export interface WhatsAppIntegrationProps {
  initialData?: any;
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  labels: { savingBtn: string; saveBtn: string };
  connected: boolean;
  onDisconnect: () => void;
  locale: string;
  onAutoConnectSuccess?: (phone_number_id: string, waba_id: string) => void;
}

export function WhatsAppIntegration({
  initialData,
  loading,
  onSubmit,
  labels,
  connected,
  onDisconnect,
  locale,
  onAutoConnectSuccess,
}: WhatsAppIntegrationProps) {
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyField = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  // ── الحالة المربوطة: عرض المعرفات وخيارات التعديل وفك الربط ──
  if (connected && initialData && !showForm) {
    return (
      <div className="space-y-3.5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
            <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              {locale === "ar" ? "تم ربط Meta بنجاح ✅" : "Meta connected successfully ✅"}
            </p>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
              {locale === "ar" ? "حسابك مربوط ويعمل بكفاءة" : "Your account is active and connected"}
            </p>
          </div>
        </div>

        {initialData.wabaId && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">WABA ID</p>
              <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mt-0.5">{initialData.wabaId}</p>
            </div>
            <button
              type="button"
              onClick={() => copyField(initialData.wabaId, "waba")}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-emerald-600"
            >
              {copied === "waba" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {initialData.phoneNumberId && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Phone Number ID</p>
              <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mt-0.5">{initialData.phoneNumberId}</p>
            </div>
            <button
              type="button"
              onClick={() => copyField(initialData.phoneNumberId, "phone")}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-emerald-600"
            >
              {copied === "phone" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* أزرار التحكم بالأسفل */}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="flex-1 gap-2 text-xs font-medium dark:border-gray-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {locale === "ar" ? "تعديل البيانات" : "Edit credentials"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDisconnect}
            className="gap-2 text-xs font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {locale === "ar" ? "فك الربط" : "Disconnect"}
          </Button>
        </div>
      </div>
    );
  }

  // ── نموذج إدخال البيانات المنظم — زر الربط بالأسفل ──
  return (
    <div className="space-y-4">
      <form id="manual-connect-form" onSubmit={onSubmit} className="space-y-3.5" autoComplete="off">
        <div>
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Access Token *</Label>
          <Input
            name="accessToken"
            id="wa_access_token"
            defaultValue={initialData?.accessToken || ""}
            placeholder="EAA..."
            required
            autoComplete="off"
            spellCheck={false}
            className="mt-1 dark:bg-gray-800 dark:border-gray-700 font-mono text-xs"
            dir="ltr"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Phone Number ID *</Label>
          <Input
            name="phoneNumberId"
            id="wa_phone_number_id"
            defaultValue={initialData?.phoneNumberId || ""}
            placeholder="123456789..."
            required
            autoComplete="off"
            spellCheck={false}
            className="mt-1 dark:bg-gray-800 dark:border-gray-700 font-mono text-xs"
            dir="ltr"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">WABA ID *</Label>
          <Input
            name="wabaId"
            id="wa_waba_id"
            defaultValue={initialData?.wabaId || ""}
            placeholder="987654321..."
            required
            autoComplete="off"
            spellCheck={false}
            className="mt-1 dark:bg-gray-800 dark:border-gray-700 font-mono text-xs"
            dir="ltr"
          />
        </div>

        {/* ── زر الربط بالأسفل ── */}
        <div className="pt-2 space-y-2.5">
          <Button
            type="submit"
            disabled={loading}
            size="default"
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {labels.savingBtn}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> {locale === "ar" ? "ربط Meta وحفظ البيانات" : "Connect Meta & Save"}
              </>
            )}
          </Button>

          {/* خيار الربط التلقائي بضغطة واحدة */}
          {onAutoConnectSuccess && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <EmbeddedSignupButton
                locale={locale}
                onSuccess={({ phone_number_id, waba_id }) => {
                  onAutoConnectSuccess(phone_number_id, waba_id);
                }}
              />
            </div>
          )}

          {showForm && connected && (
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition py-1"
            >
              {locale === "ar" ? "إلغاء التعديل" : "Cancel"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
