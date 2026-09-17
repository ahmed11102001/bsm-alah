"use client";

import { useState } from "react";
import { Loader2, Zap, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function TestConnectionButton({
  onTest,
  disabled,
}: {
  onTest?: () => Promise<boolean> | boolean;
  disabled?: boolean;
}) {
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (testing) return;
    setTesting(true);
    const toastId = toast.loading("جاري اختبار الاتصال بسيرفر SMTP...");

    try {
      // محاكاة استدعاء السيرفر لاختبار الاتصال في مرحلة الـ UI Mock
      await new Promise((r) => setTimeout(r, 1600));

      const success = onTest ? await onTest() : true;

      if (success) {
        toast.success("نجح الاتصال بسيرفر SMTP وتم التحقق من الصلاحيات! ✅", {
          id: toastId,
        });
      } else {
        toast.error("فشل الاتصال: تأكد من صحة بيانات الخادم وكلمة المرور.", {
          id: toastId,
        });
      }
    } catch {
      toast.error("حصل خطأ أثناء اختبار الاتصال بالسيرفر.", { id: toastId });
    } finally {
      setTesting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleTest}
      disabled={disabled || testing}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs font-bold text-blue-300 transition-all hover:bg-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {testing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          <span>جاري الاختبار...</span>
        </>
      ) : (
        <>
          <Zap className="h-4 w-4 text-blue-400" />
          <span>اختبار الاتصال (Test Connection)</span>
        </>
      )}
    </button>
  );
}
