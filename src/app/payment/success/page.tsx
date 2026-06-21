// src/app/payment/success/page.tsx
"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

function SuccessContent() {
  const router = useRouter();
  const params = useSearchParams();
  const invoiceId = params.get("invoiceId");

  useEffect(() => {
    // انتظر ٣ ثواني ثم روّح للـ dashboard
    const t = setTimeout(() => router.replace("/dashboard"), 3000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="text-center space-y-5 max-w-sm px-6">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-12 h-12 text-[#25D366]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">تم الدفع بنجاح! 🎉</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          شكراً لك — تم استلام مدفوعاتك وجاري تفعيل حسابك الآن.
          {invoiceId && (
            <span className="block mt-1 text-xs text-gray-400">رقم الفاتورة: {invoiceId}</span>
          )}
        </p>
        <p className="text-xs text-gray-400">سيتم توجيهك للوحة التحكم تلقائياً…</p>
        <button
          onClick={() => router.replace("/dashboard")}
          className="mt-2 px-6 py-2.5 bg-[#25D366] hover:bg-[#20bb5a] text-white text-sm font-semibold rounded-xl transition-all"
        >
          الذهاب للوحة التحكم
        </button>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}