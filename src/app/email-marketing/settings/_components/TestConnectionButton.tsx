"use client";

import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import type { SmtpConfigDTO } from "../../types";

export default function TestConnectionButton({
  getConfig,
  disabled,
}: {
  getConfig?: () => SmtpConfigDTO;
  disabled?: boolean;
}) {
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (testing) return;
    setTesting(true);
    const toastId = toast.loading("جاري اختبار الاتصال بسيرفر SMTP...");

    try {
      const config = getConfig ? getConfig() : undefined;

      const res = await fetch("/api/email/connection/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config || {}),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        toast.success(data.message || "نجح الاتصال بسيرفر SMTP وتم التحقق من الصلاحيات! ✅", {
          id: toastId,
        });
      } else {
        toast.error(data.message || data.error || "فشل الاتصال: تأكد من صحة بيانات الخادم وكلمة المرور.", {
          id: toastId,
        });
      }
    } catch {
      toast.error("حصل خطأ في الشبكة أثناء اختبار الاتصال بالسيرفر.", { id: toastId });
    } finally {
      setTesting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleTest}
      disabled={disabled || testing}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 transition-all hover:bg-red-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {testing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-red-600" />
          <span>جاري الاختبار...</span>
        </>
      ) : (
        <>
          <Zap className="h-4 w-4 text-red-600" />
          <span>اختبار الاتصال (Test Connection)</span>
        </>
      )}
    </button>
  );
}
