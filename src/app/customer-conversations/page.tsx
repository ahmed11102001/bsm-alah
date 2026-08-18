"use client";

import { useRouter } from "next/navigation";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import ConversationsCinematic from "./_components/ConversationsCinematic";

const copy = {
    ar: { back: "العودة للاستراتيجيات", eyebrow: "استراتيجية واني" },
    en: { back: "Back to strategies", eyebrow: "Wani Strategy" },
} as const;

function PageInner() {
    const router = useRouter();
    const { locale, setLocale, dir } = useLanguage();
    const t = copy[locale];
    const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

    return (
        <div dir={dir} className="min-h-screen relative overflow-hidden" style={{ background: "#050710" }}>
            {/* خلفية خضراء-زمردية خفيفة بلون هوية استراتيجية المحادثات */}
            <div
                className="pointer-events-none fixed inset-0"
                style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(52,211,153,0.08) 0%, rgba(5,7,16,1) 65%)" }}
            />
            <div
                className="pointer-events-none fixed inset-0 opacity-[0.05] mix-blend-overlay"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                }}
            />

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
                <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                    <button
                        onClick={() => router.push("/strategies")}
                        className="flex items-center gap-2 text-white/50 hover:text-white/85 text-sm font-medium transition-colors px-3 py-2 rounded-xl hover:bg-white/5"
                    >
                        <BackIcon className="w-4 h-4" />
                        <span className="hidden xs:inline">{t.back}</span>
                    </button>

                    <button
                        onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
                        className="text-[11px] font-semibold tracking-widest text-white/45 hover:text-white/80 border border-white/10 hover:border-white/25 rounded-full px-3 py-1.5 transition-colors"
                    >
                        {locale === "ar" ? "EN" : "AR"}
                    </button>
                </div>

                <div className="text-center mb-2 sm:mb-4">
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.3em] uppercase mb-1" style={{ color: "rgba(52,211,153,0.85)" }}>
                        <Sparkles className="w-3.5 h-3.5" />
                        {t.eyebrow}
                    </div>
                </div>

                <ConversationsCinematic />
            </div>
        </div>
    );
}

export default function CustomerConversationsStrategyPage() {
    return (
        <LanguageProvider>
            <PageInner />
        </LanguageProvider>
    );
}
