import { CheckCircle2, Clock, XCircle, Ban, FileText, Megaphone, Package, Shield } from "lucide-react";
import type { TemplateStatus, TemplateCategory } from "./types";

export const STATUS_CONFIG: Record<TemplateStatus, { icon: React.ReactNode; cls: string; dot: string }> = {
    APPROVED: { icon: <CheckCircle2 className="w-3 h-3" />, cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700", dot: "bg-emerald-500" },
    PENDING: { icon: <Clock className="w-3 h-3" />, cls: "bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/30  dark:text-amber-300  dark:border-amber-700", dot: "bg-amber-400" },
    REJECTED: { icon: <XCircle className="w-3 h-3" />, cls: "bg-red-50    text-red-700    border-red-200    dark:bg-red-900/30    dark:text-red-300    dark:border-red-700", dot: "bg-red-500" },
    PAUSED: { icon: <Ban className="w-3 h-3" />, cls: "bg-gray-100  text-gray-600   border-gray-200   dark:bg-gray-700      dark:text-gray-400   dark:border-gray-600", dot: "bg-gray-400" },
    NOT_SENT: { icon: <FileText className="w-3 h-3" />, cls: "bg-gray-50   text-gray-500   border-gray-200   dark:bg-gray-700/50    dark:text-gray-400   dark:border-gray-600", dot: "bg-gray-300" },
};

export const CATEGORY_CONFIG: Record<TemplateCategory, { icon: React.ReactNode; cls: string; label_ar: string }> = {
    MARKETING: { icon: <Megaphone className="w-3.5 h-3.5" />, cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700", label_ar: "تسويقي" },
    UTILITY: { icon: <Package className="w-3.5 h-3.5" />, cls: "bg-blue-50   text-blue-700   border-blue-200   dark:bg-blue-900/30   dark:text-blue-300   dark:border-blue-700", label_ar: "خدمي" },
    AUTHENTICATION: { icon: <Shield className="w-3.5 h-3.5" />, cls: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700", label_ar: "مصادقة" },
};