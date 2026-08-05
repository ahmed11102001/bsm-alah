// src/app/dashboard/store/_components/CopyPhonesButton.tsx
// ─── زر نسخ أرقام العملاء ───────────────────────────────────────────────────

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Customer, Lang } from "./types";

export function CopyPhonesButton({ customers, lang }: { customers: Customer[]; lang: Lang }) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        if (customers.length === 0) {
            toast.error(lang === "ar" ? "لا يوجد عملاء للنسخ" : "No customers to copy");
            return;
        }
        const text = customers.map((c) => c.phone).join("\n");
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            toast.success(
                lang === "ar"
                    ? `✅ تم نسخ ${customers.length} رقم`
                    : `✅ Copied ${customers.length} numbers`
            );
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            toast.error(lang === "ar" ? "تعذّر النسخ" : "Copy failed");
        });
    }

    return (
        <button
            onClick={handleCopy}
            title={lang === "ar" ? "نسخ أرقام العملاء" : "Copy customer phones"}
            className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                copied
                    ? "border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366]"
                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-[#25D366]/30 hover:text-[#25D366]"
            )}
        >
            {copied
                ? <Check className="w-3.5 h-3.5" />
                : <Copy className="w-3.5 h-3.5" />}
            {lang === "ar" ? "نسخ الأرقام" : "Copy numbers"}
        </button>
    );
}