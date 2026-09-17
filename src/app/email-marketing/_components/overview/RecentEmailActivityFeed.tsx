"use client";

import Link from "next/link";
import { Activity, ArrowLeft, CheckCircle2, XCircle, Clock, Eye } from "lucide-react";

interface ActivityItem {
  id: string;
  campaignName: string;
  subject: string;
  contactEmail: string;
  contactName: string | null;
  status: "QUEUED" | "SENT" | "DELIVERED" | "OPENED" | "FAILED";
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export default function RecentEmailActivityFeed({ items }: { items: ActivityItem[] }) {
  const getStatusBadge = (status: ActivityItem["status"]) => {
    switch (status) {
      case "OPENED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <Eye className="h-3 w-3" />
            مفتوح
          </span>
        );
      case "DELIVERED":
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400">
            <CheckCircle2 className="h-3 w-3" />
            مقبول (SMTP)
          </span>
        );
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
            <Clock className="h-3 w-3" />
            في الطابور
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400">
            <XCircle className="h-3 w-3" />
            فشل
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-bold text-white">آخر نشاطات الإرسال (Live Activity)</h3>
        </div>
        <Link
          href="/dashboard/email/activity"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span>عرض الكل</span>
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 divide-y divide-white/5">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/40">
            لا توجد نشاطات إرسال حديثة حتى الآن.
          </div>
        ) : (
          items.map((act) => (
            <div key={act.id} className="py-3 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white font-medium truncate">{act.contactEmail}</span>
                  {getStatusBadge(act.status)}
                </div>
                <p className="text-[11px] text-white/40 truncate mt-0.5">
                  حملة: {act.campaignName} — {act.subject}
                </p>
              </div>

              <div className="text-left shrink-0 text-[10px] text-white/40 font-mono">
                {act.sentAt || act.createdAt ? (
                  new Date(act.sentAt || act.createdAt).toLocaleTimeString("ar-EG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                ) : (
                  "—"
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
