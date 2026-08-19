/**
 * src/lib/permissions-core.ts
 *
 * الجزء "النقي" من نظام الصلاحيات (بدون أي import من next/server)، عشان
 * يبقى قابل للاستخدام في Client Components (Sidebar, Dashboard UI) وفي
 * Server Components/Routes في نفس الوقت من غير ما نكرر الـ matrix مرتين.
 *
 * src/lib/permissions.ts (server-only) بيعمل re-export لكل حاجة هنا،
 * وبيضيف عليها الـ helpers اللي محتاجة NextResponse (requirePermission).
 * أي كود جديد في Server Routes يفضل يستورد من permissions.ts زي ما هو عامل
 * دلوقتي؛ الملف ده بس للأماكن اللي محتاجة النسخة النقية (Client-side).
 */

// ─── الأدوار المتاحة في النظام (مطابقة next-auth.d.ts) ─────────────────────
export type UserRole = "OWNER" | "FULL_ACCESS" | "CHAT_ONLY";

// ─── كل القدرات (Capabilities) الموجودة في WhatsPro ─────────────────────────
export const PERMISSIONS = {
  CHAT_VIEW: "CHAT_VIEW",
  CHAT_SEND: "CHAT_SEND",
  CHAT_ASSIGN: "CHAT_ASSIGN",

  CONTACTS_VIEW: "CONTACTS_VIEW",
  CONTACTS_MANAGE: "CONTACTS_MANAGE",

  CAMPAIGNS_VIEW: "CAMPAIGNS_VIEW",
  CAMPAIGNS_MANAGE: "CAMPAIGNS_MANAGE",

  TEMPLATES_VIEW: "TEMPLATES_VIEW",
  TEMPLATES_MANAGE: "TEMPLATES_MANAGE",

  AUTOMATION_VIEW: "AUTOMATION_VIEW",
  AUTOMATION_MANAGE: "AUTOMATION_MANAGE",

  REPORTS_VIEW: "REPORTS_VIEW",

  AI_AGENT_MANAGE: "AI_AGENT_MANAGE",

  STORE_INTEGRATIONS_MANAGE: "STORE_INTEGRATIONS_MANAGE",

  TEAM_VIEW: "TEAM_VIEW",
  TEAM_MANAGE: "TEAM_MANAGE",

  WHATSAPP_SETTINGS: "WHATSAPP_SETTINGS",
  BILLING_MANAGE: "BILLING_MANAGE",
  ACCOUNT_SETTINGS: "ACCOUNT_SETTINGS",

  API_KEYS_MANAGE: "API_KEYS_MANAGE",

  // Owner-scoped dashboard capabilities. OWNER receives these automatically;
  // FULL_ACCESS receives only STRATEGIES_VIEW.
  USAGE_VIEW: "USAGE_VIEW",
  STRATEGIES_VIEW: "STRATEGIES_VIEW",
  WANI_PARTNER_MANAGE: "WANI_PARTNER_MANAGE",
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ─── مصفوفة الصلاحيات لكل Role ────────────────────────────────────────────
// OWNER: كل حاجة. بيتحسب تلقائي في hasPermission()، مش لازم يتكرر هنا.
const ROLE_PERMISSIONS: Record<Exclude<UserRole, "OWNER">, Permission[]> = {
  FULL_ACCESS: [
    "CHAT_VIEW",
    "CHAT_SEND",
    "CHAT_ASSIGN",
    "CONTACTS_VIEW",
    "CONTACTS_MANAGE",
    "CAMPAIGNS_VIEW",
    "CAMPAIGNS_MANAGE",
    "TEMPLATES_VIEW",
    "TEMPLATES_MANAGE",
    "AUTOMATION_VIEW",
    "AUTOMATION_MANAGE",
    "REPORTS_VIEW",
    "AI_AGENT_MANAGE",
    "STORE_INTEGRATIONS_MANAGE",
    "TEAM_VIEW",
    "TEAM_MANAGE",
    "STRATEGIES_VIEW",
  ],
  CHAT_ONLY: [
    "CHAT_VIEW",
    "CHAT_SEND",
    "TEAM_VIEW",
  ],
};

/**
 * هل الـ role عنده الصلاحية دي؟ (فحص خام، من غير NextResponse)
 * OWNER دايمًا true. أي role تاني لازم يكون موجود صراحةً في ROLE_PERMISSIONS.
 */
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  if (role === "OWNER") return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Explicit role helpers: Owner is a role, not a synonym for Full Control. */
export function isOwner(role: UserRole | undefined | null): boolean {
  return role === "OWNER";
}

export function isFullAccess(role: UserRole | undefined | null): boolean {
  return role === "FULL_ACCESS";
}