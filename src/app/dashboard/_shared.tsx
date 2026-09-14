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
    free: "bg-muted text-muted-foreground",
    starter: "bg-info/10 text-info dark:bg-info/10 dark:text-info",
    pro: "bg-primary/10 text-primary",
    enterprise: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
};

export const STATUS_BADGE: Record<string, string> = {
    completed: "bg-success/10 text-success dark:bg-success/20 dark:text-success",
    running: "bg-info/10 text-info dark:bg-info/20 dark:text-info",
    scheduled: "bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning",
    failed: "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive",
    draft: "bg-muted text-muted-foreground",
};

export function limitLabel(n: number) { return n === -1 ? "∞" : n.toLocaleString(); }
export function usagePct(used: number, limit: number) {
    if (limit === -1) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
}
