"use client";

import { FileText, Edit, Trash2, Eye, Plus, Calendar, Copy } from "lucide-react";
import type { EmailTemplateDTO } from "../../types";

export default function EmailTemplateList({
  templates,
  onEdit,
  onDuplicate,
  onDelete,
  onOpenCreate,
}: {
  templates: EmailTemplateDTO[];
  onEdit: (template: EmailTemplateDTO) => void;
  onDuplicate: (template: EmailTemplateDTO) => void;
  onDelete: (id: string) => void;
  onOpenCreate: () => void;
}) {
  return (
    <div>
      {/* Action Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">قوالب الرسائل الجاهزة ({templates.length})</h2>
          <p className="text-xs text-slate-500">استخدم هذه القوالب لتجهيز حملاتك وإرسالها بضغطة زر</p>
        </div>

        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-500/25 hover:from-red-700 hover:to-rose-700 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>إنشاء قالب جديد</span>
        </button>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:border-red-200 hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-200">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDuplicate(tpl)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    title="تكرار القالب (Duplicate)"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(tpl)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    title="تعديل القالب"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(tpl.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="حذف القالب"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                {tpl.name}
              </h3>
              <p className="mt-1 text-xs text-slate-700 font-medium line-clamp-1">
                <span className="text-slate-400 font-normal">العنوان: </span>
                {tpl.subject}
              </p>

              {tpl.previewText && (
                <p className="mt-2 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {tpl.previewText}
                </p>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(tpl.updatedAt).toLocaleDateString("ar-EG", {
                  day: "numeric",
                  month: "short",
                })}
              </span>

              <button
                type="button"
                onClick={() => onEdit(tpl)}
                className="text-red-600 hover:text-red-700 font-semibold"
              >
                تعديل القالب ←
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
