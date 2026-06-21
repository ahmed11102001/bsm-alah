// src/app/payment/pending/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

export default function PaymentPendingPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
            <div className="text-center space-y-5 max-w-sm px-6">
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-12 h-12 text-yellow-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">الدفع قيد الانتظار</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                    طلبك في الانتظار — إذا اخترت الدفع عن طريق فوري أو أمان، يرجى سداد المبلغ خلال ٤٨ ساعة.
                    سيتم تفعيل حسابك تلقائياً بعد استلام الدفع.
                </p>
                <button
                    onClick={() => router.replace("/dashboard")}
                    className="px-6 py-2.5 bg-[#25D366] hover:bg-[#20bb5a] text-white text-sm font-semibold rounded-xl transition-all"
                >
                    العودة للوحة التحكم
                </button>
            </div>
        </div>
    );
}