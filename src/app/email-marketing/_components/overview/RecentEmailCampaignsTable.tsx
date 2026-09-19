import Link from "next/link";
import { Send, ArrowLeft, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import type { EmailCampaignDTO } from "../../types";

export default function RecentEmailCampaignsTable({
  campaigns,
}: {
  campaigns: EmailCampaignDTO[];
}) {
  const getStatusBadge = (status: EmailCampaignDTO["status"]) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            مكتملة
          </span>
        );
      case "SENDING":
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700">
            <Clock className="h-3 w-3 animate-spin" />
            جاري الإرسال
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            مسودة
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] font-bold text-violet-700">
            <Clock className="h-3 w-3" />
            مجدولة
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-700">
            <XCircle className="h-3 w-3" />
            فشلت
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">آخر الحملات البريدية</h3>
          <p className="text-xs text-slate-500">أحدث حملات البريد التي تم إنشاؤها أو إرسالها</p>
        </div>

        <Link
          href="/dashboard/email/campaigns"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
        >
          <span>عرض الكل</span>
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-right text-xs text-slate-700">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] text-slate-500 uppercase">
              <th className="py-2.5 pr-3">الحملة</th>
              <th className="py-2.5 px-3">القالب</th>
              <th className="py-2.5 px-3">الجمهور</th>
              <th className="py-2.5 px-3">التسليم</th>
              <th className="py-2.5 px-3">الحالة</th>
              <th className="py-2.5 pl-3">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 pr-3 font-semibold text-slate-900">
                  {c.name}
                  <div className="text-[10px] font-normal text-slate-400 truncate max-w-[200px]">
                    {c.subject}
                  </div>
                </td>
                <td className="py-3.5 px-3 text-slate-600">
                  <span className="rounded bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px]">
                    {c.templateName || "—"}
                  </span>
                </td>
                <td className="py-3.5 px-3">
                  <span className="font-mono font-bold text-slate-800">{c.targetCount}</span> مستلم
                  {c.targetTag && (
                    <span className="mr-1.5 rounded bg-red-50 border border-red-100 px-1.5 py-0.5 text-[10px] text-red-700 font-semibold">
                      {c.targetTag}
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-3">
                  <span className="font-mono font-bold text-emerald-600">{c.deliveredCount}</span>
                  <span className="text-slate-400"> / {c.sentCount}</span>
                </td>
                <td className="py-3.5 px-3">{getStatusBadge(c.status)}</td>
                <td className="py-3.5 pl-3 text-slate-400 text-[11px]">
                  {new Date(c.createdAt).toLocaleDateString("ar-EG", {
                    day: "numeric",
                    month: "short",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
