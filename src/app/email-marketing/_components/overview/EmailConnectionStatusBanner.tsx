"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, ArrowLeft, Settings, ShieldAlert } from "lucide-react";

interface EmailConnectionStatusBannerProps {
  isConfigured: boolean;
  fromEmail?: string | null;
}

export default function EmailConnectionStatusBanner({
  isConfigured,
  fromEmail,
}: EmailConnectionStatusBannerProps) {
  if (isConfigured) {
    return (
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">خادم البريد (SMTP) متصل ونشط</h4>
            <p className="text-xs text-slate-500">
              يتم إرسال الحملات عبر: <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{fromEmail || "smtp.configured"}</span>
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/email/settings"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>تعديل الإعدادات</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50/70 p-5 shadow-sm">
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 border border-red-200">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900">لم تقم بربط خادم البريد (SMTP) بعد!</h4>
          <p className="mt-0.5 text-xs text-slate-600 max-w-xl">
            للبدء في إرسال الحملات وتأكيد وصول الرسائل لصندوق عملائك، اربط خادم SMTP الخاص بك (مثل Google Workspace, SendGrid, Mailgun, أو استضافتك الخاصة).
          </p>
        </div>
      </div>

      <Link
        href="/dashboard/email/settings"
        className="inline-flex items-center justify-center gap-2 shrink-0 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/25 transition-all hover:from-red-700 hover:to-rose-700 active:scale-95"
      >
        <span>اربط بريدك الآن</span>
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </div>
  );
}
