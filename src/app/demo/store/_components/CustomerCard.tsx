// src/app/dashboard/store/_components/CustomerCard.tsx
// ─── كارد عرض بيانات عميل واحد ──────────────────────────────────────────────

import { useState } from "react";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer, Lang } from "./types";
import { STATUS_BADGE, tr } from "./constants";
import { formatPhone, formatMoney, formatDate } from "./store-utils";

export interface CustomerCardProps {
    customer: Customer;
    onChat: (phone: string) => void;
    lang: Lang;
}

export function CustomerCard({ customer, onChat, lang }: CustomerCardProps) {
    const [expanded, setExpanded] = useState(false);

    const statusKey = customer.lastOrder?.status?.toLowerCase() ?? "";
    const statusClass = STATUS_BADGE[statusKey] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
    const initial = customer.name.trim().charAt(0).toUpperCase() || (lang === "ar" ? "ع" : "C");

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#25D366] font-bold text-sm">{initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">{customer.name}</p>
                    <p className="text-xs text-gray-400 font-mono" dir="ltr">{formatPhone(customer.phone)}</p>
                </div>
                <div className="text-left flex-shrink-0">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        {formatMoney(customer.totalSpent, lang, customer.currency)}
                    </p>
                    <p className="text-[10px] text-gray-400 text-left">{customer.ordersCount} {tr("ordersCount", lang)}</p>
                </div>
            </div>

            {/* Last Order Badge */}
            {customer.lastOrder && (
                <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full font-medium", statusClass)}>
                        {customer.lastOrder.status ?? "pending"}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {customer.lastOrder.orderNumber ? `#${customer.lastOrder.orderNumber}` : "—"}
                        {customer.lastOrder.total != null
                            ? ` · ${formatMoney(customer.lastOrder.total, lang, customer.currency)}`
                            : ""}
                    </span>
                </div>
            )}

            {/* Actions */}
            <div className="px-4 pb-4 flex gap-2">
                <button
                    onClick={() => onChat(customer.phone)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20bb5a] active:bg-[#1aaa52] text-white text-xs font-medium py-2.5 rounded-xl transition-colors"
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {tr("openChat", lang)}
                </button>
                <button
                    onClick={() => setExpanded((p) => !p)}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    {expanded
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
            </div>

            {/* Expanded Info */}
            {expanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{tr("totalOrders", lang)}: <strong className="text-gray-700 dark:text-gray-200">{customer.ordersCount}</strong></span>
                        <span>
                            {customer.lastOrder
                                ? `${tr("lastSync", lang)}: ${formatDate(customer.lastOrder.orderedAt, lang)}`
                                : (lang === "ar" ? "لا توجد طلبات" : "No orders")}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}