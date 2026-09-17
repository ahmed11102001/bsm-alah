"use client";

import { X, CheckCircle2, XCircle, Clock, Eye, AlertCircle } from "lucide-react";
import type { EmailDeliveryDTO, EmailCampaignDTO } from "../../types";

export default function EmailDeliveryLogTable({
  isOpen,
  campaign,
  deliveries,
  onClose,
}: {
  isOpen: boolean;
  campaign: EmailCampaignDTO | null;
  deliveries: EmailDeliveryDTO[];
  onClose: () => void;
}) {
  if (!isOpen || !campaign) return null;

  const campaignDeliveries = deliveries.filter((d) => d.campaignId === campaign.id);

  const getDeliveryStatus = (status: EmailDeliveryDTO["status"]) => {
    switch (status) {
      case "OPENED":
        return (
          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
            <Eye className="h-3.5 w-3.5" />
            تم الفتح
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 text-blue-400 font-semibold text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            تم التسليم
          </span>
        );
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 text-sky-400 font-semibold text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            مرسلة
          </span>
        );
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1 text-amber-400 text-xs">
            <Clock className="h-3.5 w-3.5" />
            في الانتظار
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 text-red-400 font-semibold text-xs">
            <XCircle className="h-3.5 w-3.5" />
            فشل الإرسال
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#04241b] p-6 shadow-2xl backdrop-blur-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">سجل إرسال الحملة: {campaign.name}</h3>
            <p className="text-xs text-white/50 mt-0.5">
              إجمالي المستهدفين: {campaign.targetCount} | تم التسليم: {campaign.deliveredCount} | فشل: {campaign.failedCount}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Table */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <table className="w-full text-right text-xs text-white/80">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-white/40 uppercase">
                <th className="pb-3 pr-2">البريد المستلم</th>
                <th className="pb-3 px-3">الاسم</th>
                <th className="pb-3 px-3">الحالة</th>
                <th className="pb-3 pl-2">وقت الإرسال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {campaignDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-white/40">
                    لا توجد سجلات إرسال متاحة لهذه الحملة حتى الآن.
                  </td>
                </tr>
              ) : (
                campaignDeliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 pr-2 font-mono text-white">
                      {d.contactEmail}
                      {d.errorMessage && (
                        <div className="text-[10px] text-red-400/90 mt-0.5 max-w-[240px] truncate">
                          خطأ: {d.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-white/70">{d.contactName || "—"}</td>
                    <td className="py-3 px-3">{getDeliveryStatus(d.status)}</td>
                    <td className="py-3 pl-2 text-white/40 text-[11px]">
                      {d.sentAt
                        ? new Date(d.sentAt).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/15"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
