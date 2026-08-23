"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import type { Lang } from "@/lib/translations";

// ═══════════════════════════════════════════════════════════════════════════════
// رسالة كوكيز — بتظهر مرة واحدة بس لكل زائر (متسجلة في localStorage)
// ═══════════════════════════════════════════════════════════════════════════════
const STORAGE_KEY = "wani_cookie_consent_v1";

const COPY = {
    ar: {
        text: "بنستخدم ملفات ارتباط (كوكيز) ضرورية بس عشان نشغّل الموقع صح ونفتكر تفضيلاتك.",
        linkLabel: "التفاصيل في سياسة الخصوصية",
        accept: "تمام",
    },
    en: {
        text: "We use only the cookies necessary to run the site and remember your preferences.",
        linkLabel: "See our Privacy Policy",
        accept: "Got it",
    },
} as const;

interface CookieConsentProps {
    lang: Lang;
}

export default function CookieConsent({ lang }: CookieConsentProps) {
    const [visible, setVisible] = useState(false);
    const copy = COPY[lang];

    useEffect(() => {
        try {
            const alreadySeen = localStorage.getItem(STORAGE_KEY);
            if (!alreadySeen) setVisible(true);
        } catch {
            // localStorage مش متاح (خصوصية المتصفح مثلاً) — نسيب الرسالة تظهر افتراضيًا
            setVisible(true);
        }
    }, []);

    const handleAccept = () => {
        try {
            localStorage.setItem(STORAGE_KEY, "1");
        } catch { }
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div
            role="region"
            aria-label={lang === "ar" ? "إشعار الكوكيز" : "Cookie notice"}
            className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-4 sm:px-6 sm:pb-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
            <div
                className="mx-auto flex max-w-3xl flex-col items-start gap-3 rounded-2xl border border-white/10
                   bg-[#053b32] px-5 py-4 shadow-2xl shadow-black/30 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
            >
                <div className="flex flex-1 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366]/15">
                        <Cookie className="h-4 w-4 text-[#25D366]" />
                    </span>
                    <p className="text-sm leading-relaxed text-white/90">
                        {copy.text}{" "}
                        <a
                            href="/privacy"
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[#25D366] underline underline-offset-2 hover:text-[#25D366]/80"
                        >
                            {copy.linkLabel}
                        </a>
                    </p>
                </div>

                <button
                    onClick={handleAccept}
                    className="w-full flex-shrink-0 rounded-md border-2 border-[#0c6b34] bg-[#25D366] px-6 py-2
                     text-sm font-extrabold text-[#06371f] transition-colors hover:bg-[#25D366]/90 sm:w-auto"
                >
                    {copy.accept}
                </button>
            </div>
        </div>
    );
}