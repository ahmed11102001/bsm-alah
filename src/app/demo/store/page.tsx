"use client";

// نسخة الديمو من src/app/dashboard/store/page.tsx
// الفرق: مفيش fetch("/api/store") ولا حالة تحميل — بيانات متجر واحد (Shopify)
// جاهزة من store-data.ts. "فتح الشات" بيوجهك فعليًا لصفحة /demo/chat.

import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import type { Lang } from "./_components/types";
import { StoreTab } from "./_components/StoreTab";
import {
    DEMO_STORE_INFO, DEMO_AUTOMATIONS, DEMO_PROMO_TEMPLATES, DEMO_STORE_CUSTOMERS,
} from "../_lib/store-data";

export default function DemoStorePage() {
    const { locale } = useLanguage();
    const lang: Lang = locale === "en" ? "en" : "ar";
    const router = useRouter();

    return (
        <div className="max-w-6xl mx-auto">
            {/* ── Page Header ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {DEMO_STORE_INFO.storeName}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            {lang === "ar" ? "متصل" : "Connected"}
                        </span>
                        <span className="text-xs text-gray-400">Shopify</span>
                    </div>
                </div>
            </div>

            <StoreTab
                store={DEMO_STORE_INFO}
                onOpenChat={() => router.push("/demo/chat")}
                lang={lang}
                initialAutomations={DEMO_AUTOMATIONS}
                promoTemplates={DEMO_PROMO_TEMPLATES}
                allCustomers={DEMO_STORE_CUSTOMERS}
            />
        </div>
    );
}