import { CheckCircle2, Clock, XCircle, FileEdit, Radio, CalendarClock } from "lucide-react";
import type { EmailCampaignStatus } from "../../types";

export default function EmailCampaignStatusBadge({
  status,
}: {
  status: EmailCampaignStatus;
}) {
  switch (status) {
    case "SCHEDULED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700">
          <CalendarClock className="h-3 w-3" />
          مجدولة
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          مكتملة
        </span>
      );
    case "SENDING":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
          <Radio className="h-3 w-3 animate-pulse text-red-600" />
          جاري الإرسال
        </span>
      );
    case "QUEUED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
          <Clock className="h-3 w-3 animate-spin text-amber-600" />
          قيد الانتظار
        </span>
      );
    case "DRAFT":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
          <FileEdit className="h-3 w-3" />
          مسودة
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
          <XCircle className="h-3 w-3" />
          فشلت
        </span>
      );
  }
}
