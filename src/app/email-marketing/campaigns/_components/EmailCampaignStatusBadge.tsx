import { CheckCircle2, Clock, XCircle, FileEdit, Radio } from "lucide-react";
import type { EmailCampaignStatus } from "../../types";

export default function EmailCampaignStatusBadge({
  status,
}: {
  status: EmailCampaignStatus;
}) {
  switch (status) {
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          مكتملة
        </span>
      );
    case "SENDING":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-bold text-blue-300">
          <Radio className="h-3 w-3 animate-pulse text-blue-400" />
          جاري الإرسال
        </span>
      );
    case "QUEUED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
          <Clock className="h-3 w-3 animate-spin text-amber-400" />
          قيد الانتظار
        </span>
      );
    case "DRAFT":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-white/60">
          <FileEdit className="h-3 w-3" />
          مسودة
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-[11px] font-bold text-red-300">
          <XCircle className="h-3 w-3" />
          فشلت
        </span>
      );
  }
}
