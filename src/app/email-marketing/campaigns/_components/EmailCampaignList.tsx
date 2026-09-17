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
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
        <div>
          <h2 className="text-lg font-bold text-white">سجل الحملات البريدية ({campaigns.length})</h2>
          <p className="text-xs text-white/50">تتبع تقدم الإرسال ومعدلات وصول رسائلك لصناديق العملاء</p>
        </div>

        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>إنشاء حملة بريد جديدة</span>
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-right text-xs text-white/80">
          <thead>
            <tr className="border-b border-white/5 text-[11px] text-white/40 uppercase">
              <th className="pb-3 pr-3">اسم الحملة والعنوان</th>
              <th className="pb-3 px-3">القالب</th>
              <th className="pb-3 px-3">الجمهور المستهدف</th>
              <th className="pb-3 px-3">التسليم والوصول</th>
              <th className="pb-3 px-3">الحالة</th>
              <th className="pb-3 px-3">تاريخ الإنشاء</th>
              <th className="pb-3 pl-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-white/40">
                  لا توجد حملات بريد إلكتروني حتى الآن. اضغط على "إنشاء حملة بريد جديدة" للبدء.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 pr-3">
                    <span className="font-bold text-white block text-sm">{c.name}</span>
                    <span className="text-[11px] text-white/50 block truncate max-w-[220px]">
                      {c.subject}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-white/70">
                    <span className="rounded bg-white/5 border border-white/5 px-2 py-0.5 text-[11px]">
                      {c.templateName || "—"}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-mono font-bold text-white">{c.targetCount}</span> مستلم
                    {c.targetTag && (
                      <span className="mr-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">
                        {c.targetTag}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-emerald-400 font-semibold">{c.deliveredCount}</span>
                      <span className="text-white/30">/</span>
                      <span className="font-mono text-white/70">{c.sentCount}</span>
                    </div>
                    {c.failedCount > 0 && (
                      <span className="text-[10px] text-red-400 block mt-0.5">
                        فشل: {c.failedCount}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    <EmailCampaignStatusBadge status={c.status} />
                  </td>
                  <td className="py-3.5 px-3 text-white/40 text-[11px]">
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
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors"
                          title="إرسال الحملة الآن"
                        >
                          <Play className="h-3 w-3" />
                          <span>إرسال</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onViewLogs(c)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        title="عرض سجل إرسال الحملة"
                      >
                        <Eye className="h-3 w-3" />
                        <span className="hidden sm:inline">السجل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(c.id)}
                        className="rounded-lg p-1 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
