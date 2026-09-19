"use client";

import { CheckCircle2, XCircle, ShieldCheck, Server, KeyRound, Mail, AlertTriangle } from "lucide-react";
import type { SmtpConfigDTO } from "../../types";

export default function EmailConnectionStatusCard({
  config,
}: {
  config: SmtpConfigDTO;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 border border-red-100 text-red-600">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">حالة الاتصال بالبريد</h3>
            <p className="text-xs text-slate-500">معلومات الخادم النشط والبروتوكول</p>
          </div>
        </div>

        {config.isConfigured ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            متصل بنجاح
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            غير مهيأ
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <span className="text-slate-500 block mb-1">الخادم (SMTP Host):</span>
          <span className="font-mono text-slate-900 font-medium">
            {config.host || "لم يتم التحديد"}
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <span className="text-slate-500 block mb-1">المنفذ والتشفير:</span>
          <span className="font-mono text-slate-900 font-medium">
            Port {config.port} — {config.secure ? "SSL مشفر" : "TLS / STARTTLS"}
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <span className="text-slate-500 block mb-1">بريد الإرسال (From Email):</span>
          <span className="font-mono text-slate-900 font-medium">
            {config.fromEmail || "لم يتم التحديد"}
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <span className="text-slate-500 block mb-1">اسم المرسل (Sender Name):</span>
          <span className="text-slate-900 font-medium">
            {config.fromName || "لم يتم التحديد"}
          </span>
        </div>
      </div>

      {/* Helpful provider guidance */}
      <div className="mt-5 rounded-xl border border-red-100 bg-red-50/50 p-4 text-xs text-slate-700">
        <h5 className="font-bold text-red-700 mb-1 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-red-600" />
          تنبيه أمان وكلمات مرور التطبيقات (App Passwords)
        </h5>
        <p className="leading-relaxed text-[11px] text-slate-600">
          إذا كنت تستخدم <strong>Google Workspace / Gmail</strong>، تأكد من تفعيل التحقق بخطوتين (2FA) وإنشاء <strong>App Password</strong> مخصص واستخدامه هنا بدلاً من كلمة مرور حسابك الشخصي.
        </p>
      </div>
    </div>
  );
}
