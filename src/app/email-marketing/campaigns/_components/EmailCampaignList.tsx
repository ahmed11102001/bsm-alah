"use client";

import { Send, ListFilter, Plus, Trash2, Eye, Play } from "lucide-react";
import EmailCampaignStatusBadge from "./EmailCampaignStatusBadge";
import type { EmailCampaignDTO } from "../../types";

export default function EmailCampaignList({
  campaigns,
  onOpenCreate,
  onViewLogs,
  onSendNow,
  onDelete,
}: {
  campaigns: EmailCampaignDTO[];
  onOpenCreate: () => void;
  onViewLogs: (campaign: EmailCampaignDTO) => void;
  onSendNow: (campaign: EmailCampaignDTO) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">سجل الحملات البريدية ({campaigns.length})</h2>
          <p className="text-xs text-slate-500">تتبع تقدم الإرسال ومعدلات وصول رسائلك لصناديق العملاء</p>
        </div>

        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-500/25 hover:from-red-700 hover:to-rose-700 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>إنشاء حملة بريد جديدة</span>
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-right text-xs text-slate-700">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] text-slate-500 uppercase">
              <th className="py-2.5 pr-3">اسم الحملة والعنوان</th>
              <th className="py-2.5 px-3">القالب</th>
              <th className="py-2.5 px-3">الجمهور المستهدف</th>
              <th className="py-2.5 px-3">المقبول عبر SMTP</th>
              <th className="py-2.5 px-3">الحالة</th>
              <th className="py-2.5 px-3">تاريخ الإنشاء</th>
              <th className="py-2.5 pl-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  لا توجد حملات بريد إلكتروني حتى الآن. اضغط على "إنشاء حملة بريد جديدة" للبدء.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 pr-3">
                    <span className="font-bold text-slate-900 block text-sm">{c.name}</span>
                    <span className="text-[11px] text-slate-500 block truncate max-w-[220px]">
                      {c.subject}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    <span className="rounded bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px]">
                      {c.templateName || "—"}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-mono font-bold text-slate-800">{c.targetCount}</span> مستلم
                    {c.targetTag && (
                      <span className="mr-1.5 rounded-md bg-red-50 border border-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        {c.targetTag}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-emerald-600 font-semibold">{c.deliveredCount}</span>
                      <span className="text-slate-400">/</span>
                      <span className="font-mono text-slate-600">{c.sentCount}</span>
                    </div>
                    {c.failedCount > 0 && (
                      <span className="text-[10px] text-rose-600 block mt-0.5 font-medium">
                        فشل: {c.failedCount}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    <EmailCampaignStatusBadge status={c.status} />
                  </td>
                  <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                    {new Date(c.createdAt).toLocaleDateString("ar-EG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3.5 pl-3">
                    <div className="flex items-center justify-center gap-1">
                      {c.status === "DRAFT" && (
                        <button
                          type="button"
                          onClick={() => onSendNow(c)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors"
                          title="إرسال الحملة الآن"
                        >
                          <Play className="h-3 w-3" />
                          <span>إرسال</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onViewLogs(c)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="عرض سجل إرسال الحملة"
                      >
                        <Eye className="h-3 w-3" />
                        <span className="hidden sm:inline">السجل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(c.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="حذف الحملة"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
