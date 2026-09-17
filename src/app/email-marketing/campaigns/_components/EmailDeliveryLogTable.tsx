"use client";

import { useState, useMemo } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  Search,
  Send,
  Users,
  Percent,
} from "lucide-react";
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
  const [filterStatus, setFilterStatus] = useState<"ALL" | "SENT" | "FAILED" | "QUEUED">("ALL");
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedError, setSelectedError] = useState<{ email: string; error: string } | null>(null);

  if (!isOpen || !campaign) return null;

  const campaignDeliveries = deliveries.filter((d) => d.campaignId === campaign.id);

  const filtered = campaignDeliveries.filter((d) => {
    if (filterStatus === "SENT" && d.status !== "SENT" && d.status !== "DELIVERED" && d.status !== "OPENED") return false;
    if (filterStatus === "FAILED" && d.status !== "FAILED") return false;
    if (filterStatus === "QUEUED" && d.status !== "QUEUED") return false;
    if (searchEmail.trim()) {
      const q = searchEmail.toLowerCase().trim();
      return (
        d.contactEmail.toLowerCase().includes(q) ||
        (d.contactName && d.contactName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const processedCount = campaign.sentCount || 0;
  const targetCount = campaign.targetCount || campaignDeliveries.length || 0;
  const progressPercent = targetCount > 0 ? Math.min(100, Math.round((processedCount / targetCount) * 100)) : 100;

  const getDeliveryStatus = (status: EmailDeliveryDTO["status"], error: string | null, email: string) => {
    switch (status) {
      case "OPENED":
        return (
          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
            <Eye className="h-3.5 w-3.5" />
            تم الفتح
          </span>
        );
      case "DELIVERED":
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 text-blue-400 font-semibold text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            مرسلة ومقبولة (SMTP)
          </span>
        );
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1 text-amber-400 text-xs">
            <Clock className="h-3.5 w-3.5" />
            في طابور الإرسال
          </span>
        );
      case "FAILED":
        return (
          <button
            type="button"
            onClick={() => setSelectedError({ email, error: error || "فشل الإرسال عبر خادم البريد" })}
            className="inline-flex items-center gap-1 text-red-400 font-semibold text-xs hover:underline"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>فشل الإرسال</span>
            <AlertCircle className="h-3 w-3 text-red-400/80 mr-0.5" />
          </button>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#031510] p-6 shadow-2xl backdrop-blur-2xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white">
                تفاصيل وسجل إرسال الحملة: {campaign.name}
              </h3>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-mono text-white/70">
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-1">
              الموضوع: <span className="text-white/80 font-medium">{campaign.subject}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress & Stat Cards */}
        <div className="mt-4 shrink-0 space-y-3">
          {/* Progress Bar */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-white/60 font-medium">تقدم معالجة الحملة</span>
              <span className="font-mono font-bold text-blue-400">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-center">
              <span className="text-[11px] text-white/40 block">إجمالي المستهدفين</span>
              <span className="font-mono text-base font-bold text-white mt-0.5 block">
                {targetCount.toLocaleString()}
              </span>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3 text-center">
              <span className="text-[11px] text-blue-300/70 block">المقبول عبر SMTP</span>
              <span className="font-mono text-base font-bold text-blue-400 mt-0.5 block">
                {(campaign.deliveredCount || 0).toLocaleString()}
              </span>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-center">
              <span className="text-[11px] text-red-300/70 block">فشل الإرسال</span>
              <span className="font-mono text-base font-bold text-red-400 mt-0.5 block">
                {(campaign.failedCount || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1">
            {(["ALL", "SENT", "FAILED", "QUEUED"] as const).map((st) => {
              const labels = {
                ALL: "الكل",
                SENT: "المقبول (SMTP)",
                FAILED: "الفاشل",
                QUEUED: "في الانتظار",
              };
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    filterStatus === st
                      ? "bg-blue-600 text-white"
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {labels[st]}
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-white/40" />
            <input
              type="text"
              placeholder="ابحث بالبريد..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-3 pr-8 py-1.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <table className="w-full text-right text-xs text-white/80">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-white/40 uppercase sticky top-0 bg-[#031510]">
                <th className="pb-3 pr-2">البريد المستلم</th>
                <th className="pb-3 px-3">الاسم</th>
                <th className="pb-3 px-3">الحالة الدقيقة</th>
                <th className="pb-3 pl-2 text-left">التوقيت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-white/40">
                    لا توجد سجلات تطابق الفلتر الحالي.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 pr-2 font-mono text-white">
                      <span>{d.contactEmail}</span>
                      {d.errorMessage && (
                        <div className="text-[10px] text-red-400/80 mt-0.5 max-w-[260px] truncate">
                          خطأ: {d.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-white/70">{d.contactName || "—"}</td>
                    <td className="py-3 px-3">{getDeliveryStatus(d.status, d.errorMessage ?? null, d.contactEmail)}</td>
                    <td className="py-3 pl-2 text-left text-white/40 text-[11px] font-mono">
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

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-white/40">
            عرض {filtered.length} من {campaignDeliveries.length} مستلم
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/15"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Error Popup */}
      {selectedError && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#0c1a17] p-5 shadow-2xl">
            <h4 className="text-sm font-bold text-white mb-1">تفاصيل خطأ SMTP</h4>
            <p className="text-xs text-white/40 font-mono mb-3">{selectedError.email}</p>
            <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-300 font-mono whitespace-pre-wrap leading-relaxed">
              {selectedError.error}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="rounded-xl bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
