import {
    Home, MessageSquare, Users, Send, FileText, Bot, ShoppingBag,
    BarChart3, UserCheck, Code, Shield,
} from "lucide-react";

// ─── Sidebar items (built at render time from translations) ──────────────────
export const SIDEBAR_IDS = [
    { icon: Home, id: "home" },
    { icon: MessageSquare, id: "chat" },
    { icon: Users, id: "contacts" },
    { icon: Send, id: "campaigns" },
    { icon: FileText, id: "templates" },
    { icon: Bot, id: "automation" },
    { icon: ShoppingBag, id: "store" },
    { icon: BarChart3, id: "reports" },
    { icon: UserCheck, id: "team" },
    { icon: Code, id: "api" },
] as const;

// id "home" بيروح لـ "/dashboard" نفسها، الباقي "/dashboard/{id}"
export function sidebarHref(id: string) {
    return id === "home" ? "/dashboard" : `/dashboard/${id}`;
}

export const adminItem = { icon: Shield, id: "admin" };

export const PLAN_COLORS: Record<string, string> = {
    free: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    pro: "bg-[#25D366]/10 text-[#25D366]",
    enterprise: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export const STATUS_BADGE: Record<string, string> = {
    completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    running: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    scheduled: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    draft: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

export function limitLabel(n: number) { return n === -1 ? "∞" : n.toLocaleString(); }
export function usagePct(used: number, limit: number) {
    if (limit === -1) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
}