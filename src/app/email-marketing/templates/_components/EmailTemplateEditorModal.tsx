"use client";

import { useState, useEffect } from "react";
import { X, FileText, Eye, Edit3, Code, Sparkles, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import type { EmailTemplateDTO } from "../../types";

export default function EmailTemplateEditorModal({
  isOpen,
  template,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  template?: EmailTemplateDTO | null;
  onClose: () => void;
  onSave: (saved: EmailTemplateDTO) => void;
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setSubject(template.subject);
      setPreviewText(template.previewText || "");
      setBodyHtml(template.bodyHtml);
    } else {
      setName("");
      setSubject("");
      setPreviewText("");
      setBodyHtml(
        `<div style="font-family: sans-serif; padding: 20px; color: #333;">\n  <h2>مرحباً {{name}} 👋</h2>\n  <p>يسعدنا تواصلك معنا بخصوص...</p>\n</div>`
      );
    }
  }, [template, isOpen]);

  if (!isOpen) return null;

  const handleInsertTag = (tag: string) => {
    setBodyHtml((prev) => prev + ` ${tag} `);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !bodyHtml.trim()) {
      toast.error("يرجى ملء اسم القالب، عنوان الرسالة، ومحتوى الإيميل");
      return;
    }

    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));

    const saved: EmailTemplateDTO = {
      id: template?.id || `tpl_${Date.now()}`,
      name: name.trim(),
      subject: subject.trim(),
      previewText: previewText.trim() || null,
      bodyHtml: bodyHtml.trim(),
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(saved);
    setSaving(false);
    toast.success("تم حفظ القالب بنجاح! 🎉");
    onClose();
  };

  // Generate simulated preview replacing tags
  const renderPreview = () => {
    return bodyHtml
      .replace(/\{\{name\}\}/g, "أحمد خليل")
      .replace(/\{\{email\}\}/g, "ahmed.khalil@example.com");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#04241b] p-6 shadow-2xl backdrop-blur-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {template ? "تعديل قالب البريد" : "إنشاء قالب بريد جديد"}
              </h3>
              <p className="text-[11px] text-white/50">تخصيص عنوان ومحتوى القالب مع دعم المتغيرات</p>
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

        {/* Tab switch between Editor and Preview */}
        <div className="flex items-center justify-between my-4 border-b border-white/5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "edit"
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>المحرر</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "preview"
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>معاينة حية</span>
            </button>
          </div>

          {/* Quick variable insert buttons */}
          <div className="hidden sm:flex items-center gap-1 text-[11px]">
            <span className="text-white/40 ml-1">إدراج متغير:</span>
            <button
              type="button"
              onClick={() => handleInsertTag("{{name}}")}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-blue-300 hover:bg-white/10 font-mono"
            >
              &#123;&#123;name&#125;&#125;
            </button>
            <button
              type="button"
              onClick={() => handleInsertTag("{{email}}")}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-blue-300 hover:bg-white/10 font-mono"
            >
              &#123;&#123;email&#125;&#125;
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {activeTab === "edit" ? (
            <>
              <div>
                <label className="block font-semibold text-white/80 mb-1">
                  اسم القالب (داخلي للإدارة) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: رسالة الترحيب، عرض نهاية الأسبوع"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-white/80 mb-1">
                  عنوان الرسالة (Subject Line) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خصم 30% حصري لك يا {{name}} 🎉"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-white/80 mb-1">
                  النص التمهيدي المختصر (Preview Text)
                </label>
                <input
                  type="text"
                  placeholder="النص الذي يظهر في صندوق الوارد بجوار العنوان..."
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-white/80 mb-1">
                  محتوى الرسالة (HTML / Text) <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="اكتب كود أو نص الرسالة هنا..."
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono leading-relaxed"
                />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white p-6 text-black min-h-[300px]">
              <div className="border-b pb-3 mb-4 text-right">
                <div className="text-xs text-gray-500">العنوان:</div>
                <div className="text-base font-bold text-gray-900">
                  {subject.replace(/\{\{name\}\}/g, "أحمد خليل") || "(بدون عنوان)"}
                </div>
                {previewText && (
                  <div className="text-xs text-gray-400 mt-0.5">{previewText}</div>
                )}
              </div>

              <div
                className="prose max-w-none text-right"
                dangerouslySetInnerHTML={{ __html: renderPreview() }}
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 font-medium text-white/60 hover:bg-white/5 hover:text-white"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "جاري الحفظ..." : "حفظ القالب"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
