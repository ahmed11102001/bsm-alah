"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Mail,
} from "lucide-react";

interface ActivityItem {
  id: string;
  campaignId: string;
  campaignName: string;
  subject: string;
  contactEmail: string;
  contactName: string | null;
  status: "QUEUED" | "SENT" | "DELIVERED" | "OPENED" | "FAILED";
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export default function EmailActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [campaignFilter, setCampaignFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedError, setSelectedError] = useState<{ email: string; error: string } | null>(null);

  const fetchActivity = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: "30",
        status: statusFilter,
        campaignId: campaignFilter,
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/email/activity?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
        if (data.campaigns) setCampaigns(data.campaigns);
      }
    } catch (err) {
      console.error("[EmailActivityPage] Failed to fetch activity:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, campaignFilter, searchQuery]);

  useEffect(() => {
    fetchActivity(1);
  }, [fetchActivity]);

  const getStatusBadge = (status: ActivityItem["status"], error: string | null, email: string) => {
    switch (status) {
      case "OPENED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
            <Eye className="h-3 w-3" />
            تم الفتح
          </span>
        );
      case "DELIVERED":
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400">
            <CheckCircle2 className="h-3 w-3" />
            مرسل ومقبول (SMTP)
          </span>
        );
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
            <Clock className="h-3 w-3" />
            في طابور الإرسال
          </span>
        );
      case "FAILED":
        return (
          <button
            type="button"
            onClick={() => setSelectedError({ email, error: error || "تعذر الإرسال عبر خادم البريد" })}
            className="inline-flex items-center gap-1 rounded-md bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
            title="اضغط لعرض سبب الفشل"
          >
            <XCircle className="h-3 w-3" />
            <span>فشل الإرسال</span>
            <AlertCircle className="h-3 w-3 text-red-400/70 mr-0.5" />
          </button>
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Activity className="h-7 w-7 text-blue-400" />
            <span>سجل نشاط الإرسال (Email Activity)</span>
          </h1>
          <p className="mt-1 text-sm text-white/60">
            متابعة لحظية ومفصلة لجميع الرسائل المرسلة وحالات قبولها من خادم SMTP أو أسباب الفشل.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchActivity(page)}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "الكل" },
              { id: "SENT", label: "مرسل ومقبول" },
              { id: "FAILED", label: "فشل الإرسال" },
              { id: "QUEUED", label: "قيد الانتظار" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === tab.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Campaign Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {campaigns.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-white/40" />
                <select
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#031510] px-3 py-1.5 text-xs text-white/80 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">جميع الحملات</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative min-w-[220px]">
              <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-white/40" />
              <input
                type="text"
                placeholder="ابحث بالبريد أو الاسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-3 pr-9 py-1.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-white/80">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-white/40 uppercase">
                <th className="pb-3 pr-3">المستلم (Recipient)</th>
                <th className="pb-3 px-3">الحملة وعنوان الرسالة</th>
                <th className="pb-3 px-3">الحالة (SMTP Status)</th>
                <th className="pb-3 pl-3 text-left">التاريخ والتوقيت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-white/40">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-500 mb-2" />
                    <span>جاري تحميل سجل النشاط...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-white/40">
                    <Mail className="h-8 w-8 mx-auto text-white/20 mb-2" />
                    <p className="font-semibold">لا يوجد نشاط إرسال يطابق الفلتر الحالي.</p>
                    <p className="text-[11px] text-white/30 mt-1">
                      عند إطلاق حملاتك البريدية ستظهر سجلات التسليم وتفاصيل الخادم هنا لحظة بلحظة.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pr-3">
                      <span className="font-mono font-semibold text-white block">
                        {row.contactEmail}
                      </span>
                      {row.contactName && (
                        <span className="text-[11px] text-white/50 block mt-0.5">
                          {row.contactName}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-white block">{row.campaignName}</span>
                      <span className="text-[11px] text-white/50 block truncate max-w-[260px]">
                        {row.subject}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {getStatusBadge(row.status, row.errorMessage, row.contactEmail)}
                    </td>
                    <td className="py-3.5 pl-3 text-left text-white/50 text-[11px] font-mono">
                      {row.sentAt || row.createdAt ? (
                        <div>
                          <span>
                            {new Date(row.sentAt || row.createdAt).toLocaleDateString("ar-EG", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="block text-white/30 text-[10px]">
                            {new Date(row.sentAt || row.createdAt).toLocaleTimeString("ar-EG", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/60">
            <span>
              عرض {items.length} من إجمالي {total.toLocaleString()} رسالة
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchActivity(page - 1)}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-white/10 bg-white/5 p-1.5 hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="font-mono text-white">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => fetchActivity(page + 1)}
                disabled={page >= totalPages || loading}
                className="rounded-lg border border-white/10 bg-white/5 p-1.5 hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#0c1a17] p-6 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">تفاصيل خطأ الإرسال</h3>
                <p className="text-xs text-white/50 font-mono">{selectedError.email}</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-300/90 font-mono whitespace-pre-wrap leading-relaxed">
              {selectedError.error}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
