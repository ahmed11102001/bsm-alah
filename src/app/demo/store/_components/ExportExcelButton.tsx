// نسخة الديمو من src/app/dashboard/store/_components/ExportExcelButton.tsx
// الفرق: مفيش fetch("/api/store/export") حقيقي — بس toast قفل الميزة.

import { Download } from "lucide-react";
import { toast } from "sonner";
import type { Lang } from "./types";

export function ExportExcelButton({ lang }: { source: string; search: string; lang: Lang }) {
    function handleExport() {
        toast.message(lang === "ar" ? "🔒 متاح في النسخة الكاملة" : "🔒 Available in the full version", {
            description: lang === "ar" ? "سجّل مجانًا عشان تقدر تصدّر بيانات عملائك الحقيقية." : "Sign up free to export your real customer data.",
        });
    }

    return (
        <button
            onClick={handleExport}
            title={lang === "ar" ? "تصدير Excel" : "Export Excel"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-green-400 hover:text-green-600 transition-all"
        >
            <Download className="w-3.5 h-3.5" />
            {lang === "ar" ? "تصدير Excel" : "Export Excel"}
        </button>
    );
}