// src/app/payment/fail/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export default function PaymentFailPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
            <div className="text-center space-y-5 max-w-sm px-6">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="w-12 h-12 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">لم يتم الدفع</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                    لم تتم عملية الدفع بنجاح. لم يتم خصم أي مبلغ من حسابك.
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2.5 bg-[#25D366] hover:bg-[#20bb5a] text-white text-sm font-semibold rounded-xl transition-all"
                    >
                        حاول مرة أخرى
                    </button>
                    <button
                        onClick={() => router.replace("/dashboard")}
                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all"
                    >
                        العودة للوحة التحكم
                    </button>
                </div>
            </div>
        </div>
    );
}