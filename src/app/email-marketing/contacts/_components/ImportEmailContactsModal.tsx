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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">استيراد جهات اتصال من ملف</h3>
              <p className="text-[11px] text-slate-500">يدعم ملفات CSV أو Excel (.xlsx)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
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
                ? "border-red-500/50 bg-red-50/50"
                : "border-slate-200 bg-slate-50 hover:border-red-300 hover:bg-red-50/20"
            }`}
          >
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <FileSpreadsheet className="h-10 w-10 text-red-600 mb-2" />
                <span className="font-bold text-slate-900 text-sm">{selectedFile.name}</span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="mt-3 text-xs text-red-600 font-semibold hover:underline"
                >
                  إلغاء واختيار ملف آخر
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center cursor-pointer">
                <UploadCloud className="h-10 w-10 text-slate-400 mb-3" />
                <span className="font-bold text-slate-900 text-sm">اسحب وأفلت ملف جهات الاتصال هنا</span>
                <span className="text-[11px] text-slate-500 mt-1">أو تصفح الملفات من جهازك</span>
                <label className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors">
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
            <label className="block font-semibold text-slate-700 mb-1.5">
              وسم موحد لكل جهات الاتصال المستوردة:
            </label>
            <input
              type="text"
              placeholder="مثال: قائمة_سبتمبر_2026"
              value={tagToAssign}
              onChange={(e) => setTagToAssign(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
            💡 <strong>تنسيق الأعمدة الموصى به:</strong> عمود البريد (email) إلزامي، والأعمدة الاختيارية تشمل: first_name, last_name, tags.
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleStartImport}
              disabled={!selectedFile || importing}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-2 font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
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
