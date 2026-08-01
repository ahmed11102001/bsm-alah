// src/app/dashboard/store/_components/ExportExcelButton.tsx
// ─── زر تصدير قائمة العملاء إلى Excel ───────────────────────────────────────

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Lang } from "./types";

export function ExportExcelButton({
  source, search, lang,
}: { source: string; search: string; lang: Lang }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/store/export?source=${source}&search=${encodeURIComponent(search)}`
      );
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error((d as any).error ?? (lang === "ar" ? "فشل التصدير" : "Export failed"));
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `customers-${source}-${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(lang === "ar" ? "✅ تم تصدير الملف" : "✅ File exported");
    } catch {
      toast.error(lang === "ar" ? "خطأ في الاتصال" : "Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      title={lang === "ar" ? "تصدير Excel" : "Export Excel"}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-green-400 hover:text-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <Download className="w-3.5 h-3.5" />}
      {lang === "ar" ? "تصدير Excel" : "Export Excel"}
    </button>
  );
}