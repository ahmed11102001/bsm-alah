"use client";
import { ListRowsSkeleton } from "@/components/dashboard/DashboardSkeletons";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Receipt, RefreshCw, Loader2, Clock, CheckCircle2, XCircle, AlertCircle,
    Package, CreditCard, Sparkles,
} from "lucide-react";

interface InvoiceItem {
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
}

interface SubscriptionInfo {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
}

function formatDate(d: string | null, locale: string): string {
    if (!d) return "—";
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return "—";
        return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
            timeZone: "Africa/Cairo",
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return "—";
    }
}

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
    subscription: { ar: "اشتراك", en: "Subscription" },
    token_package: { ar: "باقة توكن", en: "Token Package" },
    mcp_addon: { ar: "إضافة Claude", en: "Claude Addon" },
};

export default function InvoicesTab({ locale, dir }: { locale: string; dir: "rtl" | "ltr" }) {
    const isAr = locale === "ar";
    const router = useRouter();

    const [requests, setRequests] = useState<InvoiceItem[]>([]);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/payment/my-requests");
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || (isAr ? "تعذر تحميل الفواتير" : "Failed to load invoices"));
                return;
            }
            setRequests(data.requests ?? []);
            setSubscription(data.subscription ?? null);
        } catch {
            setError(isAr ? "تعذر تحميل الفواتير" : "Failed to load invoices");
        } finally {
            setLoading(false);
        }
    }, [isAr]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    // ── أول فاتورة اشتراك APPROVED هي أحدث حالة اشتراك فعلية (الباقي تاريخ سابق
    // انسحب/اتجدد) — دي الوحيدة اللي بنعرض عليها تاريخ الانتهاء الحقيقي من
    // Subscription نفسه (Single Source of Truth)، مش من الفاتورة.
    const latestApprovedSubscriptionId = requests.find(
        (r) => r.type === "subscription" && r.status === "APPROVED"
    )?.id;

    const isCurrentSubscriptionExpired =
        !!subscription?.currentPeriodEnd &&
        new Date(subscription.currentPeriodEnd) < new Date() &&
        subscription.plan !== "free";

    const statusBadge = (r: InvoiceItem) => {
        const showsAsExpired = r.id === latestApprovedSubscriptionId && isCurrentSubscriptionExpired;
        if (showsAsExpired) {
            return {
                label: isAr ? "منتهية" : "Expired",
                className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/40 dark:text-gray-400 dark:border-gray-600",
                icon: AlertCircle,
            };
        }
        switch (r.status) {
            case "PENDING":
                return {
                    label: isAr ? "معلقة" : "Pending",
                    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
                    icon: Clock,
                };
            case "APPROVED":
                return {
                    label: isAr ? "مقبولة / مدفوعة" : "Approved / Paid",
                    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
                    icon: CheckCircle2,
                };
            default: // REJECTED
                return {
                    label: isAr ? "مرفوضة" : "Rejected",
                    className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
                    icon: XCircle,
                };
        }
    };

    return (
        <div dir={dir}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#25D366]" />
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                        {isAr ? "الفواتير" : "Invoices"}
                    </h2>
                </div>
                <button
                    onClick={fetchInvoices}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    {isAr ? "تحديث" : "Refresh"}
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
                    {error}
                </div>
            )}

            {loading ? (
                <ListRowsSkeleton rows={4} />
            ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                    <Receipt className="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                        {isAr ? "لا توجد فواتير حتى الآن" : "No invoices yet"}
                    </p>
                    <button
                        onClick={() => router.push("/checkout")}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bb5a] text-white text-sm font-semibold transition"
                    >
                        <Sparkles className="w-4 h-4" />
                        {isAr ? "اشترك الآن" : "Subscribe now"}
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {requests.map((r) => {
                        const badge = statusBadge(r);
                        const BadgeIcon = badge.icon;
                        const typeLabel = TYPE_LABELS[r.type] ?? { ar: r.type, en: r.type };
                        const showsExpiryDate =
                            r.id === latestApprovedSubscriptionId &&
                            !isCurrentSubscriptionExpired &&
                            subscription?.currentPeriodEnd;

                        return (
                            <div
                                key={r.id}
                                className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3.5"
                            >
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                        <Package className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                            {r.productName}
                                        </p>
                                        <p className="text-xs text-gray-400">{isAr ? typeLabel.ar : typeLabel.en}</p>
                                    </div>
                                    <div className="text-sm font-black text-gray-900 dark:text-white">
                                        {r.amount.toLocaleString(isAr ? "ar-EG" : "en-US")} {r.currency}
                                    </div>
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border ${badge.className}`}>
                                        <BadgeIcon className="w-3 h-3" />
                                        {badge.label}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 pt-2.5 border-t border-gray-50 dark:border-gray-700/60 text-xs text-gray-400">
                                    <span>{isAr ? "تاريخ الطلب" : "Requested"}: {formatDate(r.createdAt, locale)}</span>
                                    {r.paymentMethod && (
                                        <span className="flex items-center gap-1">
                                            <CreditCard className="w-3 h-3" />
                                            {r.paymentMethod === "instapay" ? "InstaPay" : r.paymentMethod === "etisalat" ? "Etisalat Cash" : r.paymentMethod}
                                        </span>
                                    )}
                                    {showsExpiryDate && (
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            {isAr ? "ينتهي الاشتراك في" : "Subscription ends on"}: {formatDate(subscription!.currentPeriodEnd, locale)}
                                        </span>
                                    )}
                                </div>

                                {r.status === "REJECTED" && r.rejectionReason && (
                                    <div className="mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/60 text-xs">
                                        <span className="text-gray-400">{isAr ? "سبب الرفض" : "Rejection reason"}: </span>
                                        <span className="font-semibold text-rose-600 dark:text-rose-400">{r.rejectionReason}</span>
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