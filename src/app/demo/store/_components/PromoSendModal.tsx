// نسخة الديمو من src/app/dashboard/store/_components/PromoSendModal.tsx
// الفرق الوحيد: handleSend بيعمل simulate بدل fetch("/api/store/automation/send")

import { useState } from "react";
import {
    X, Search, CheckCircle, Loader2, Send, CheckSquare, Square, Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Customer, Lang } from "./types";

export interface PromoSendModalProps {
    source: "shopify" | "easyorders" | "woocommerce";
    customers: Customer[];
    onClose: () => void;
    lang: Lang;
    onSent?: (sent: number) => void;
}

export function PromoSendModal({ customers, onClose, lang, onSent }: PromoSendModalProps) {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

    const filtered = customers.filter((c) => {
        const q = search.toLowerCase();
        return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
    });

    const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.phone));

    function toggleAll() {
        if (allSelected) {
            setSelected((prev) => { const next = new Set(prev); filtered.forEach((c) => next.delete(c.phone)); return next; });
        } else {
            setSelected((prev) => { const next = new Set(prev); filtered.forEach((c) => next.add(c.phone)); return next; });
        }
    }

    function toggleOne(phone: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(phone) ? next.delete(phone) : next.add(phone);
            return next;
        });
    }

    async function handleSend() {
        if (selected.size === 0) {
            toast.error(lang === "ar" ? "اختر عميلاً واحداً على الأقل" : "Select at least one customer");
            return;
        }
        setSending(true);
        // محاكاة زمن إرسال حقيقي بدل fetch("/api/store/automation/send")
        await new Promise(res => setTimeout(res, 1200));
        const sent = selected.size;
        const failed = 0;
        setResult({ sent, failed });
        onSent?.(sent);
        toast.success(lang === "ar" ? `✅ تم إرسال ${sent} رسالة` : `✅ Sent ${sent}`);
        setSending(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                    <div>
                        <p className="font-bold text-gray-800 dark:text-white">
                            🎁 {lang === "ar" ? "إرسال عرض لعملاء المتجر" : "Send promo to store customers"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {selected.size > 0
                                ? `${selected.size.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} ${lang === "ar" ? "عميل مختار" : "selected"}`
                                : lang === "ar" ? "اختر العملاء اللي هتبعتلهم" : "Choose which customers to send to"}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {result && (
                    <div className="mx-5 mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2 flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <p className="text-sm text-green-700 dark:text-green-400">
                            {lang === "ar" ? `تم إرسال ${result.sent} رسالة بنجاح` : `Sent ${result.sent} successfully`}
                        </p>
                    </div>
                )}

                <div className="px-5 pt-4 pb-2 flex-shrink-0 space-y-2">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={lang === "ar" ? "بحث باسم أو رقم..." : "Search by name or number..."}
                            className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
                        />
                    </div>

                    {filtered.length > 0 && (
                        <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-[#25D366] hover:underline">
                            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            {allSelected ? (lang === "ar" ? "إلغاء تحديد الكل" : "Deselect all") : (lang === "ar" ? "تحديد الكل" : "Select all")}
                            <span className="text-gray-400 text-xs">({filtered.length})</span>
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center">
                            <Users className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-2" />
                            <p className="text-sm text-gray-400">{lang === "ar" ? "لا يوجد عملاء مطابقون" : "No matching customers"}</p>
                        </div>
                    ) : (
                        filtered.map((c) => {
                            const isChecked = selected.has(c.phone);
                            return (
                                <button key={c.phone} onClick={() => toggleOne(c.phone)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-xl border text-right transition-all",
                                        isChecked ? "border-[#25D366]/40 bg-[#25D366]/5 dark:bg-[#25D366]/10" : "border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
                                    )}>
                                    <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                        isChecked ? "border-[#25D366] bg-[#25D366]" : "border-gray-300 dark:border-gray-600")}>
                                        {isChecked && <CheckCircle className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#25D366]">
                                        {c.name.trim().charAt(0).toUpperCase() || "ع"}
                                    </div>
                                    <div className="flex-1 min-w-0 text-right">
                                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{c.name}</p>
                                        <p className="text-xs text-gray-400 truncate">{c.phone}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{c.ordersCount} {lang === "ar" ? "طلب" : "orders"}</p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        {lang === "ar" ? "إلغاء" : "Cancel"}
                    </button>
                    <button onClick={handleSend} disabled={sending || selected.size === 0}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#25D366] text-white text-sm font-medium hover:bg-[#1fba59] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sending ? (lang === "ar" ? "جاري الإرسال..." : "Sending...") : `${lang === "ar" ? "إرسال لـ" : "Send to"} ${selected.size > 0 ? selected.size : ""} ${lang === "ar" ? "عميل" : "customers"}`}
                    </button>
                </div>
            </div>
        </div>
    );
}