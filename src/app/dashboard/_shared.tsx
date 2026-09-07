import {
    Home, MessageSquare, Users, Send, FileText, Bot, ShoppingBag,
    BarChart3, UserCheck, Code, Shield,
} from "lucide-react";
import { hasPermission, type UserRole, type Permission } from "@/lib/permissions-core";

// ─── Sidebar items (built at render time from translations) ──────────────────
// كل item مربوط بـ permission — لو الـ role مش عنده الصلاحية دي، العنصر
// مبيتعرضش خالص (وموجود له server-side guard في proxy.ts).
// "home" مالوش permission خاص بيه — كل الأدوار بتاخده.
export const SIDEBAR_IDS = [
    { icon: Home, id: "home", permission: null },
    { icon: MessageSquare, id: "chat", permission: "CHAT_VIEW" },
    { icon: Users, id: "contacts", permission: "CONTACTS_VIEW" },
    { icon: Send, id: "campaigns", permission: "CAMPAIGNS_VIEW" },
    { icon: FileText, id: "templates", permission: "TEMPLATES_VIEW" },
    { icon: Bot, id: "automation", permission: "AUTOMATION_VIEW" },
    { icon: ShoppingBag, id: "store", permission: "STORE_INTEGRATIONS_MANAGE" },
    { icon: BarChart3, id: "reports", permission: "REPORTS_VIEW" },
    { icon: UserCheck, id: "team", permission: "TEAM_VIEW" },
    { icon: Code, id: "api", permission: "API_KEYS_MANAGE" },

] as const satisfies ReadonlyArray<{ icon: any; id: string; permission: Permission | null }>;

// ─── العناصر اللي مسموح للـ role يشوفها في الـ Sidebar ────────────────────
// OWNER بياخد كل حاجة تلقائي (hasPermission بترجع true ليه في أي permission).
export function visibleSidebarIds(role: UserRole | undefined | null) {
    // CHAT_ONLY is intentionally restricted to the inbox and team pages only.
    if (role === "CHAT_ONLY") {
        return SIDEBAR_IDS.filter(item => item.id === "chat" || item.id === "team");
    }
    return SIDEBAR_IDS.filter(item => item.permission === null || hasPermission(role, item.permission));
}

// id "home" بيروح لـ "/dashboard"، والباقي "/dashboard/{id}".
export function sidebarHref(id: string) {
    if (id === "home") return "/dashboard";
    return `/dashboard/${id}`;
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
