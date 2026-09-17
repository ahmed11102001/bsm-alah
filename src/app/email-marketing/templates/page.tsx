"use client";

import { useState } from "react";
import EmailTemplateList from "./_components/EmailTemplateList";
import EmailTemplateEditorModal from "./_components/EmailTemplateEditorModal";
import { MOCK_TEMPLATES } from "../constants";
import type { EmailTemplateDTO } from "../types";
import { toast } from "sonner";

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplateDTO[]>(MOCK_TEMPLATES);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateDTO | null>(null);

  const handleCreateOpen = () => {
    setSelectedTemplate(null);
    setEditorOpen(true);
  };

  const handleEditOpen = (tpl: EmailTemplateDTO) => {
    setSelectedTemplate(tpl);
    setEditorOpen(true);
  };

  const handleSaveTemplate = (saved: EmailTemplateDTO) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("تم حذف القالب بنجاح.");
  };

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
