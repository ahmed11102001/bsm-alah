"use client";

import { useState, useEffect, useCallback } from "react";
import EmailTemplateList from "./_components/EmailTemplateList";
import EmailTemplateEditorModal from "./_components/EmailTemplateEditorModal";
import type { EmailTemplateDTO } from "../types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateDTO | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/email/templates");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setTemplates(data);
      }
    } catch (err) {
      console.error("[EmailTemplatesPage] Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateOpen = () => {
    setSelectedTemplate(null);
    setEditorOpen(true);
  };

  const handleEditOpen = (tpl: EmailTemplateDTO) => {
    setSelectedTemplate(tpl);
    setEditorOpen(true);
  };

  const handleSaveTemplate = async (saved: EmailTemplateDTO) => {
    const isEdit = Boolean(selectedTemplate?.id);
    const url = isEdit
      ? `/api/email/templates/${selectedTemplate!.id}`
      : "/api/email/templates";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saved),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("تم حفظ القالب بنجاح! 🎉");
        loadTemplates();
      } else {
        toast.error(data.error || "فشل حفظ القالب");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال أثناء حفظ القالب.");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/email/templates/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        toast.success("تم حذف القالب بنجاح.");
      } else {
        toast.error("فشل حذف القالب.");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال أثناء الحذف.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-white">قوالب البريد الإلكتروني (Email Templates)</h1>
        <p className="mt-1 text-sm text-white/60">
          صمّم قوالب جذابة ومتوافقة مع الهواتف وصناديق البريد، واستخدم المتغيرات لتخصيص كل رسالة باسم العميل.
        </p>
      </div>

      {/* Templates List Grid */}
      <EmailTemplateList
        templates={templates}
        onEdit={handleEditOpen}
        onDelete={handleDeleteTemplate}
        onOpenCreate={handleCreateOpen}
      />

      {/* Editor Modal */}
      <EmailTemplateEditorModal
        isOpen={editorOpen}
        template={selectedTemplate}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}
