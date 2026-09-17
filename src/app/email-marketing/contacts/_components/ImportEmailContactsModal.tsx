"use client";

import { useState } from "react";
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { EmailContactDTO } from "../../types";

export default function ImportEmailContactsModal({
  isOpen,
  onClose,
  onImportComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (newContacts: EmailContactDTO[]) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tagToAssign, setTagToAssign] = useState("استيراد_جديد");
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleStartImport = async () => {
    if (!selectedFile) {
      toast.error("يرجى اختيار ملف CSV أو Excel للاستيراد أولاً");
      return;
    }

    setImporting(true);
    // محاكاة قراءة الملف والاستيراد في مرحلة الـ UI Mock
    await new Promise((r) => setTimeout(r, 1400));

    const mockImported: EmailContactDTO[] = [
      {
        id: `cnt_imp_${Date.now()}_1`,
        email: "customer1@shop.com",
        firstName: "كريم",
        lastName: "محمود",
        tags: [tagToAssign || "مستورد"],
        status: "SUBSCRIBED",
        createdAt: new Date().toISOString(),
      },
      {
        id: `cnt_imp_${Date.now()}_2`,
        email: "mona.adel@store.org",
        firstName: "منى",
        lastName: "عادل",
        tags: [tagToAssign || "مستورد"],
        status: "SUBSCRIBED",
        createdAt: new Date().toISOString(),
      },
      {
        id: `cnt_imp_${Date.now()}_3`,
        email: "tarek.youssef@domain.com",
        firstName: "طارق",
        lastName: "يوسف",
        tags: [tagToAssign || "مستورد"],
        status: "SUBSCRIBED",
        createdAt: new Date().toISOString(),
      },
    ];

    onImportComplete(mockImported);
    setImporting(false);
    toast.success(`تم استيراد ${mockImported.length} جهات اتصال بنجاح من ${selectedFile.name}! 🎉`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#04241b] p-6 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">استيراد جهات اتصال من ملف</h3>
              <p className="text-[11px] text-white/50">يدعم ملفات CSV أو Excel (.xlsx)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="mt-5 space-y-4 text-xs">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              selectedFile
                ? "border-emerald-500/50 bg-emerald-500/10"
                : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
            }`}
          >
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <FileSpreadsheet className="h-10 w-10 text-emerald-400 mb-2" />
                <span className="font-bold text-white text-sm">{selectedFile.name}</span>
                <span className="text-[11px] text-white/50 mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="mt-3 text-xs text-red-400 hover:underline"
                >
                  إلغاء واختيار ملف آخر
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center cursor-pointer">
                <UploadCloud className="h-10 w-10 text-white/40 mb-3" />
                <span className="font-bold text-white text-sm">اسحب وأفلت ملف جهات الاتصال هنا</span>
                <span className="text-[11px] text-white/40 mt-1">أو تصفح الملفات من جهازك</span>
                <label className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer">
                  <span>اختر ملف من جهازك</span>
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-white/80 mb-1.5">
              وسم موحد لكل جهات الاتصال المستوردة:
            </label>
            <input
              type="text"
              placeholder="مثال: قائمة_سبتمبر_2026"
              value={tagToAssign}
              onChange={(e) => setTagToAssign(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] text-white/50">
            💡 <strong>تنسيق الأعمدة الموصى به:</strong> عمود البريد (email) إلزامي، والأعمدة الاختيارية تشمل: first_name, last_name, tags.
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 font-medium text-white/60 hover:bg-white/5 hover:text-white"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleStartImport}
              disabled={!selectedFile || importing}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2 font-bold text-black shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>جاري الاستيراد...</span>
                </>
              ) : (
                <span>بدء الاستيراد</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
