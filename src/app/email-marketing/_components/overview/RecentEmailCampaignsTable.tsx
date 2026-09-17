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
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            مكتملة
          </span>
        );
      case "SENDING":
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[11px] font-bold text-blue-300">
            <Clock className="h-3 w-3 animate-spin" />
            جاري الإرسال
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-white/10 border border-white/20 px-2 py-0.5 text-[11px] font-medium text-white/60">
            مسودة
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[11px] font-bold text-red-300">
            <XCircle className="h-3 w-3" />
            فشلت
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h3 className="text-base font-bold text-white">آخر الحملات البريدية</h3>
          <p className="text-xs text-white/50">أحدث حملات البريد التي تم إنشاؤها أو إرسالها</p>
        </div>

        <Link
          href="/dashboard/email/campaigns"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span>عرض الكل</span>
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-right text-xs text-white/80">
          <thead>
            <tr className="border-b border-white/5 text-[11px] text-white/40 uppercase">
              <th className="pb-3 pr-2">الحملة</th>
              <th className="pb-3 px-3">القالب</th>
              <th className="pb-3 px-3">الجمهور</th>
              <th className="pb-3 px-3">التسليم</th>
              <th className="pb-3 px-3">الحالة</th>
              <th className="pb-3 pl-2">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 pr-2 font-semibold text-white">
                  {c.name}
                  <div className="text-[10px] font-normal text-white/40 truncate max-w-[200px]">
                    {c.subject}
                  </div>
                </td>
                <td className="py-3.5 px-3 text-white/70">{c.templateName || "—"}</td>
                <td className="py-3.5 px-3">
                  <span className="font-mono">{c.targetCount}</span> مستلم
                  {c.targetTag && (
                    <span className="mr-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                      {c.targetTag}
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-3">
                  <span className="font-mono text-emerald-300">{c.deliveredCount}</span>
                  <span className="text-white/40"> / {c.sentCount}</span>
                </td>
                <td className="py-3.5 px-3">{getStatusBadge(c.status)}</td>
                <td className="py-3.5 pl-2 text-white/40 text-[11px]">
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
