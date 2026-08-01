"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Megaphone, Package, Shield, AlertCircle, ChevronLeft } from "lucide-react";
import { T } from "./i18n";
import type { FormState, Lang, TemplateCategory } from "./types";

export function Step1({ form, setForm, lang, onNext, onCancel }: {
    form: FormState; setForm: (f: FormState) => void; lang: Lang;
    onNext: () => void; onCancel: () => void;
}) {
    const t = T[lang];
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = t.validation.nameRequired;
        else if (/^\d/.test(form.name)) e.name = t.validation.nameStart;
        else if (!/^[a-z0-9_]+$/.test(form.name)) e.name = t.validation.nameChars;
        if (!form.category) e.cat = t.validation.categoryRequired;
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const CATS: { key: TemplateCategory; icon: React.ReactNode; title_ar: string; title_en: string; items_ar: string[]; items_en: string[] }[] = [
        {
            key: "MARKETING", icon: <Megaphone className="w-6 h-6" />,
            title_ar: "📢 تسويقي", title_en: "📢 Marketing",
            items_ar: ["عروض وخصومات", "استرجاع السلة", "حملات إعلانية"],
            items_en: ["Promotions", "Cart Recovery", "Ad Campaigns"]
        },
        {
            key: "UTILITY", icon: <Package className="w-6 h-6" />,
            title_ar: "📦 خدمي", title_en: "📦 Utility",
            items_ar: ["تأكيد الطلب", "تحديث الشحن", "الفواتير"],
            items_en: ["Order Confirmation", "Shipping Update", "Invoices"]
        },
        {
            key: "AUTHENTICATION", icon: <Shield className="w-6 h-6" />,
            title_ar: "🔐 مصادقة", title_en: "🔐 Authentication",
            items_ar: ["رمز OTP", "أكواد الدخول", "التحقق الثنائي"],
            items_en: ["OTP Code", "Login Codes", "2FA"]
        },
    ];

    const LANGS = [
        { code: "ar", label: "🇸🇦 العربية" }, { code: "en", label: "🇬🇧 English" },
        { code: "fr", label: "🇫🇷 Français" }, { code: "es", label: "🇪🇸 Español" },
    ];

    return (
        <div className="space-y-6">
            {/* Template name */}
            <div>
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                    {t.templateName} *
                </Label>
                <Input
                    value={form.name} dir="ltr"
                    onChange={e => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                    placeholder="order_confirmation"
                    className={`font-mono dark:bg-gray-700 dark:border-gray-600 ${errors.name ? "border-red-400" : ""}`}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t.templateNameHint}</p>
                {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
            </div>

            {/* Category */}
            <div>
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">{t.categoryLabel} *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {CATS.map(cat => {
                        const isAuth = cat.key === "AUTHENTICATION";
                        return (
                            <div key={cat.key} className="relative">
                                <button
                                    disabled={isAuth}
                                    onClick={() => { if (!isAuth) setForm({ ...form, category: cat.key }); }}
                                    className={`w-full text-start rounded-2xl border-2 p-4 transition-all
                    ${isAuth ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50" : "hover:shadow-sm"}
                    ${!isAuth && form.category === cat.key
                                            ? "border-[#25D366] bg-[#25D366]/5 dark:bg-[#25D366]/10 ring-1 ring-[#25D366]/30"
                                            : !isAuth ? "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800" : ""
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${cat.key === "MARKETING" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" :
                                        cat.key === "UTILITY" ? "bg-blue-100   dark:bg-blue-900/30   text-blue-600   dark:text-blue-400" :
                                            "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"}`}>
                                        {cat.icon}
                                    </div>
                                    <p className="font-bold text-sm text-gray-800 dark:text-white mb-2">
                                        {lang === "ar" ? cat.title_ar : cat.title_en}
                                    </p>
                                    <ul className="space-y-1">
                                        {(lang === "ar" ? cat.items_ar : cat.items_en).map(it => (
                                            <li key={it} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" /> {it}
                                            </li>
                                        ))}
                                    </ul>
                                </button>
                                {isAuth && (
                                    <div className="absolute -bottom-10 left-0 right-0 z-10 p-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-sm">
                                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 text-center leading-tight">
                                            {lang === "ar" ? "قوالب الـ OTP مخصصة للمطورين فقط." : "OTP templates are for developers only."}
                                            <br />
                                            <a href="/developers" className="font-bold underline hover:text-indigo-800 dark:hover:text-indigo-200">
                                                {lang === "ar" ? "اكتشف وني للمطورين ←" : "Explore Wani Developers ←"}
                                            </a>
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {errors.cat && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.cat}</p>}
            </div>

            {/* Language */}
            <div>
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">{t.languageLabel}</Label>
                <div className="flex flex-wrap gap-2">
                    {LANGS.map(l => (
                        <button key={l.code}
                            onClick={() => setForm({ ...form, language: l.code })}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                ${form.language === l.code
                                    ? "border-[#25D366] bg-[#25D366]/10 text-[#25D366] dark:text-[#25D366]"
                                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                                }`}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <Button variant="outline" onClick={onCancel} className="dark:border-gray-600 dark:text-gray-300">{t.cancel}</Button>
                <Button className="flex-1 bg-[#25D366] hover:bg-[#1fb956] text-white gap-2"
                    onClick={() => { if (validate()) onNext(); }}>
                    {t.next} <ChevronLeft className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}