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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">خادم البريد (SMTP) متصل ونشط</h4>
            <p className="text-xs text-white/60">
              يتم إرسال الحملات عبر: <span className="font-mono text-emerald-300">{fromEmail || "smtp.configured"}</span>
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/email/settings"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>تعديل الإعدادات</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-transparent p-5 backdrop-blur-md">
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-white">لم تقم بربط خادم البريد (SMTP) بعد!</h4>
          <p className="mt-0.5 text-xs text-white/70 max-w-xl">
            للبدء في إرسال الحملات وتأكيد وصول الرسائل لصندوق عملائك، اربط خادم SMTP الخاص بك (مثل Google Workspace, SendGrid, Mailgun, أو استضافتك الخاصة).
          </p>
        </div>
      </div>

      <Link
        href="/dashboard/email/settings"
        className="inline-flex items-center justify-center gap-2 shrink-0 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 active:scale-95"
      >
        <span>اربط بريدك الآن</span>
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </div>
  );
}
