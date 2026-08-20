// src/app/dashboard/admin/_components/PaymentsTab.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet, Search, RefreshCw, Check, X, Loader2, Clock, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, User as UserIcon, Package, CreditCard,
} from "lucide-react";

interface PaymentRequestItem {
  id: string;
  type: "subscription" | "token_package" | "mcp_addon";
  planSlug: string | null;
  cycle: string | null;
  packageId: string | null;
  productName: string;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; phone: string | null };
  reviewedBy: { id: string; name: string | null; email: string } | null;
}

interface PaymentsTabProps {
  locale: string;
  dir: "rtl" | "ltr";
  onPendingCountChange?: (count: number) => void;
}

const STATUS_BADGES: Record<
  string,
  { labelAr: string; labelEn: string; className: string; icon: any }
> = {
  PENDING: {
    labelAr: "قيد المراجعة",
    labelEn: "Pending",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    icon: Clock,
  },
  APPROVED: {
    labelAr: "مؤكّد",
    labelEn: "Approved",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  REJECTED: {
    labelAr: "مرفوض",
    labelEn: "Rejected",
    className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
    icon: XCircle,
  },
};

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  subscription: { ar: "اشتراك", en: "Subscription" },
  token_package: { ar: "باقة توكن", en: "Token Package" },
  mcp_addon: { ar: "إضافة Claude", en: "Claude Addon" },
};

function formatDate(d: string | null, locale: string): string {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
      timeZone: "Africa/Cairo",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function PaymentsTab({ locale, dir, onPendingCountChange }: PaymentsTabProps) {
  const isAr = locale === "ar";

  const [requests, setRequests] = useState<PaymentRequestItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (isAr ? "تعذر تحميل المدفوعات" : "Failed to load payments"));
        return;
      }
      setRequests(data.requests ?? []);
      setCounts(data.counts ?? { PENDING: 0, APPROVED: 0, REJECTED: 0 });
      onPendingCountChange?.(data.counts?.PENDING ?? 0);
    } catch {
      setError(isAr ? "تعذر تحميل المدفوعات" : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, isAr, onPendingCountChange]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleAction(id: string, action: "approve" | "reject") {
    if (action === "reject" && !confirm(isAr ? "متأكد إنك عايز ترفض طلب الدفع ده؟" : "Reject this payment request?")) {
      return;
    }
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: action === "reject" ? rejectReason[id] || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || (isAr ? "حدث خطأ" : "Something went wrong"));
        return;
      }
      await fetchRequests();
    } catch {
      alert(isAr ? "حدث خطأ أثناء تنفيذ الطلب" : "Something went wrong");
    } finally {
      setActingId(null);
    }
  }

  const filterTabs: { id: string; labelAr: string; labelEn: string; count?: number }[] = [
    { id: "PENDING", labelAr: "قيد المراجعة", labelEn: "Pending", count: counts.PENDING },
    { id: "APPROVED", labelAr: "مؤكّدة", labelEn: "Approved", count: counts.APPROVED },
    { id: "REJECTED", labelAr: "مرفوضة", labelEn: "Rejected", count: counts.REJECTED },
    { id: "all", labelAr: "الكل", labelEn: "All" },
  ];

  return (
    <div dir={dir}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#25D366]" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isAr ? "المدفوعات" : "Payments"}
          </h2>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {isAr ? "تحديث" : "Refresh"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === tab.id
                ? "bg-[#25D366] text-white"
                : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:text-gray-800"
            }`}
          >
            {isAr ? tab.labelAr : tab.labelEn}
            {typeof tab.count === "number" && tab.count > 0 && (
              <span className={`text-[10px] font-bold rounded-full px-1.5 min-w-4 h-4 flex items-center justify-center ${statusFilter === tab.id ? "bg-white/25 text-white" : "bg-amber-500 text-white"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث بالاسم أو الإيميل..." : "Search name or email..."}
            className="w-full ps-8 pe-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:border-[#25D366]"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
          <Wallet className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">{isAr ? "لا توجد طلبات دفع" : "No payment requests"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => {
            const badge = STATUS_BADGES[r.status];
            const BadgeIcon = badge.icon;
            const typeLabel = TYPE_LABELS[r.type] ?? { ar: r.type, en: r.type };
            const isExpanded = expandedId === r.id;

            return (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-start hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {r.user.name || r.user.email}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{r.user.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    <Package className="w-3.5 h-3.5 text-gray-400" />
                    {r.productName}
                  </div>
                  <div className="text-sm font-black text-gray-900 dark:text-white">
                    {r.amount.toLocaleString(isAr ? "ar-EG" : "en-US")} {r.currency}
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border ${badge.className}`}>
                    <BadgeIcon className="w-3 h-3" />
                    {isAr ? badge.labelAr : badge.labelEn}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(r.createdAt, locale)}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4 bg-gray-50/60 dark:bg-gray-900/20 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-gray-400 mb-0.5">{isAr ? "النوع" : "Type"}</p>
                        <p className="font-bold text-gray-800 dark:text-gray-200">{isAr ? typeLabel.ar : typeLabel.en}</p>
                      </div>
                      {r.cycle && (
                        <div>
                          <p className="text-gray-400 mb-0.5">{isAr ? "دورة الفوترة" : "Billing cycle"}</p>
                          <p className="font-bold text-gray-800 dark:text-gray-200">{r.cycle}</p>
                        </div>
                      )}
                      {r.paymentMethod && (
                        <div>
                          <p className="text-gray-400 mb-0.5">{isAr ? "طريقة الدفع" : "Payment method"}</p>
                          <p className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5" />
                            {r.paymentMethod === "instapay" ? "InstaPay" : r.paymentMethod === "etisalat" ? "Etisalat Cash" : r.paymentMethod}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-400 mb-0.5">{isAr ? "رقم الهاتف" : "Phone"}</p>
                        <p className="font-bold text-gray-800 dark:text-gray-200" dir="ltr">{r.user.phone || "—"}</p>
                      </div>
                      {r.reviewedAt && (
                        <div>
                          <p className="text-gray-400 mb-0.5">{isAr ? "تمت المراجعة" : "Reviewed"}</p>
                          <p className="font-bold text-gray-800 dark:text-gray-200">{formatDate(r.reviewedAt, locale)}</p>
                        </div>
                      )}
                      {r.reviewedBy && (
                        <div>
                          <p className="text-gray-400 mb-0.5">{isAr ? "بواسطة" : "By"}</p>
                          <p className="font-bold text-gray-800 dark:text-gray-200">{r.reviewedBy.name || r.reviewedBy.email}</p>
                        </div>
                      )}
                      {r.rejectionReason && (
                        <div className="col-span-2">
                          <p className="text-gray-400 mb-0.5">{isAr ? "سبب الرفض" : "Rejection reason"}</p>
                          <p className="font-bold text-rose-600">{r.rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    {r.status === "PENDING" && (
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <input
                          value={rejectReason[r.id] || ""}
                          onChange={(e) => setRejectReason((s) => ({ ...s, [r.id]: e.target.value }))}
                          placeholder={isAr ? "سبب الرفض (اختياري)" : "Rejection reason (optional)"}
                          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 px-3 py-2 text-xs focus:outline-none focus:border-[#25D366]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(r.id, "approve")}
                            disabled={actingId === r.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#25D366] hover:bg-[#1fb85a] disabled:opacity-50 transition"
                          >
                            {actingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            {isAr ? "تأكيد الدفع" : "Confirm payment"}
                          </button>
                          <button
                            onClick={() => handleAction(r.id, "reject")}
                            disabled={actingId === r.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 disabled:opacity-50 transition"
                          >
                            {actingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            {isAr ? "رفض الدفع" : "Reject payment"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
