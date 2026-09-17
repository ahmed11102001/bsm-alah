"use client";

import { CheckCircle2, XCircle, ShieldCheck, Server, KeyRound, Mail, AlertTriangle } from "lucide-react";
import type { SmtpConfigDTO } from "../../types";

export default function EmailConnectionStatusCard({
  config,
}: {
  config: SmtpConfigDTO;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
      <div className="flex items-center justify-between pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">حالة الاتصال بالبريد</h3>
            <p className="text-xs text-white/50">معلومات الخادم النشط والبروتوكول</p>
          </div>
        </div>

        {config.isConfigured ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            متصل بنجاح
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            غير مهيأ
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
          <span className="text-white/40 block mb-1">الخادم (SMTP Host):</span>
          <span className="font-mono text-white font-medium">
            {config.host || "لم يتم التحديد"}
          </span>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
          <span className="text-white/40 block mb-1">المنفذ والتشفير:</span>
          <span className="font-mono text-white font-medium">
            Port {config.port} — {config.secure ? "SSL مشفر" : "TLS / STARTTLS"}
          </span>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
          <span className="text-white/40 block mb-1">بريد الإرسال (From Email):</span>
          <span className="font-mono text-white font-medium">
            {config.fromEmail || "لم يتم التحديد"}
          </span>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
          <span className="text-white/40 block mb-1">اسم المرسل (Sender Name):</span>
          <span className="text-white font-medium">
            {config.fromName || "لم يتم التحديد"}
          </span>
        </div>
      </div>

      {/* Helpful provider guidance */}
      <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-950/20 p-4 text-xs text-white/70">
        <h5 className="font-bold text-blue-300 mb-1 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4" />
          تنبيه أمان وكلمات مرور التطبيقات (App Passwords)
        </h5>
        <p className="leading-relaxed text-[11px] text-white/60">
          إذا كنت تستخدم <strong>Google Workspace / Gmail</strong>، تأكد من تفعيل التحقق بخطوتين (2FA) وإنشاء <strong>App Password</strong> مخصص واستخدامه هنا بدلاً من كلمة مرور حسابك الشخصي.
        </p>
      </div>
    </div>
  );
}
