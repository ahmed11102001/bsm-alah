"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { Bot, Key, Hand, CalendarClock, FlaskConical, Feather, ArrowLeft, ArrowRight } from "lucide-react";

export default function DemoAutomationPage() {
    const { locale, dir } = useLanguage();
    const isAr = locale === "ar";
    const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

    const items = [
        { icon: Key, ar: "أتمتة بالكلمات المفتاحية", en: "Keyword automation" },
        { icon: Hand, ar: "رسائل الترحيب", en: "Welcome messages" },
        { icon: CalendarClock, ar: "أتمتة زمنية مجدولة", en: "Scheduled automation" },
        { icon: FlaskConical, ar: "اختبار A/B للحملات", en: "A/B campaign testing" },
        { icon: Feather, ar: "Wani — مساعد المبيعات الذكي", en: "Wani — AI sales assistant" },
    ];

    return (
        <div dir={dir} className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#25D366]/10 flex items-center justify-center mb-5">
                <Bot className="w-8 h-8 text-[#25D366]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {isAr ? "صفحة الأتمتة تجربة تفاعلية، مش أرقام بس" : "Automation is a hands-on flow, not just numbers"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
                {isAr
                    ? "بتبني فيها قواعدك خطوة بخطوة وتدرّب Wani بنفسك، فمعاينتها بشكل حقيقي أفيد بكتير من شكل ثابت. سجّل مجانًا وجرّبها في لوحة التحكم بتاعتك."
                    : "You build your own rules step by step and train Wani yourself here, so a static preview wouldn't do it justice. Sign up free and try it in your own dashboard."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md mb-8">
                {items.map((it) => (
                    <div
                        key={it.ar}
                        className="flex items-center gap-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-3.5 py-3 text-right"
                    >
                        <span className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <it.icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{isAr ? it.ar : it.en}</span>
                    </div>
                ))}
            </div>

            <Link
                href="/#pricing"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bb5a] text-white font-bold text-sm px-6 py-3 rounded-2xl transition-colors"
            >
                {isAr ? "سجّل مجانًا وجرّبها بنفسك" : "Sign up free and try it yourself"}
                <ArrowIcon className="w-4 h-4" />
            </Link>
        </div>
    );
}