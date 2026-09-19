"use client";

import { useState, useEffect } from "react";
import { X, FileText, Eye, Edit3, Code, Sparkles, Plus, Save, Send, Loader2 } from "lucide-react";
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
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-200">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {template ? "تعديل قالب البريد" : "إنشاء قالب بريد جديد"}
              </h3>
              <p className="text-[11px] text-slate-500">تخصيص عنوان ومحتوى القالب مع دعم المتغيرات</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switch between Editor and Preview */}
        <div className="flex items-center justify-between my-4 border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "edit"
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
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
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>معاينة حية</span>
            </button>
          </div>

          {/* Quick variable insert buttons */}
          <div className="hidden sm:flex items-center gap-1 text-[11px]">
            <span className="text-slate-400 ml-1">إدراج متغير:</span>
            <button
              type="button"
              onClick={() => handleInsertTag("{{name}}")}
              className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-red-700 hover:bg-red-100 font-mono"
            >
              &#123;&#123;name&#125;&#125;
            </button>
            <button
              type="button"
              onClick={() => handleInsertTag("{{email}}")}
              className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-red-700 hover:bg-red-100 font-mono"
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
                <label className="block font-semibold text-slate-700 mb-1">
                  اسم القالب (داخلي للإدارة) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: رسالة الترحيب، عرض نهاية الأسبوع"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  عنوان الرسالة (Subject Line) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خصم 30% حصري لك يا {{name}} 🎉"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  النص التمهيدي المختصر (Preview Text)
                </label>
                <input
                  type="text"
                  placeholder="النص الذي يظهر في صندوق الوارد بجوار العنوان..."
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  محتوى الرسالة (HTML / Text) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="اكتب كود أو نص الرسالة هنا..."
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono leading-relaxed"
                />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-900 min-h-[300px]">
              <div className="border-b border-slate-200 pb-3 mb-4 text-right">
                <div className="text-xs text-slate-400">العنوان:</div>
                <div className="text-base font-bold text-slate-900">
                  {subject.replace(/\{\{name\}\}/g, "أحمد خليل") || "(بدون عنوان)"}
                </div>
                {previewText && (
                  <div className="text-xs text-slate-500 mt-0.5">{previewText}</div>
                )}
              </div>

              <div
                className="prose max-w-none text-right bg-white p-4 rounded-xl border border-slate-200"
                dangerouslySetInnerHTML={{ __html: renderPreview() }}
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2.5 shrink-0">
            <div>
              <button
                type="button"
                onClick={() => setShowTestModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 active:scale-95 transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span>إرسال بريد تجريبي (Test Email)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-2.5 font-bold text-white shadow-md shadow-red-500/25 transition-all hover:from-red-700 hover:to-rose-700 active:scale-95 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? "جاري الحفظ..." : "حفظ القالب"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Test Email Popover/Modal */}
        {showTestModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Send className="h-4 w-4 text-red-600" />
                  <span>إرسال تجربة حية للقالب</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                أدخل عنوان بريدك الإلكتروني لمعاينة مظهر هذا القالب كما سيظهر للعميل في صندوق الوارد عبر خادم SMTP المربوط.
              </p>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  بريدك الإلكتروني لاستقبال التجربة:
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-red-500 focus:outline-none font-mono"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="rounded-xl px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={sendingTest || !testEmail.trim()}
                  onClick={async () => {
                    if (!testEmail.trim()) return;
                    setSendingTest(true);
                    const toastId = toast.loading("جاري إرسال البريد التجريبي...");
                    try {
                      const res = await fetch("/api/email/templates/test-send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          recipientEmail: testEmail.trim(),
                          subject: subject || "معاينة تجريبية",
                          bodyHtml: bodyHtml || "<p>مرحباً</p>",
                          previewText,
                        }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        toast.success(`تم إرسال البريد التجريبي إلى ${testEmail} بنجاح! 🚀`, { id: toastId });
                        setShowTestModal(false);
                      } else {
                        toast.error(data.error || "فشل إرسال البريد التجريبي", { id: toastId });
                      }
                    } catch {
                      toast.error("حدث خطأ في الاتصال أثناء إرسال التجربة", { id: toastId });
                    } finally {
                      setSendingTest(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 shadow-md shadow-red-500/20 disabled:opacity-50"
                >
                  {sendingTest && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{sendingTest ? "جاري الإرسال..." : "إرسال التجربة الآن"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
