/**
 * src/lib/permissions.ts
 *
 * نظام صلاحيات مركزي (Permission Matrix) على مستوى القدرات (Capabilities)،
 * مش على مستوى الـ routes حرفيًا. أي API route أو Server Action جديد لازم
 * يستخدم requirePermission() صراحةً — مفيش صلاحية بتتاخد تلقائي (deny-by-default).
 *
 * الاستخدام في أي API route:
 *
 *   import { requirePermission } from "@/lib/permissions";
 *
 *   export async function POST(req: NextRequest) {
 *     const session = await getServerSession(authOptions);
 *     const denied = requirePermission(session, "CAMPAIGNS_MANAGE");
 *     if (denied) return denied; // NextResponse جاهزة بـ 401/403
 *     ...
 *   }
 */

import { NextResponse } from "next/server";
import type { Session } from "next-auth";

// ─── الأدوار المتاحة في النظام (مطابقة next-auth.d.ts) ─────────────────────
export type UserRole = "OWNER" | "FULL_ACCESS" | "CHAT_ONLY";

// ─── كل القدرات (Capabilities) الموجودة في WhatsPro ─────────────────────────
// أي ميزة جديدة تتضاف للمشروع، لازم يتضاف ليها permission هنا الأول قبل
// ما تتربط بأي route — لو نسيت، الـ helper هيرفضها افتراضيًا (deny-by-default).
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
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ─── مصفوفة الصلاحيات لكل Role ────────────────────────────────────────────
// OWNER: كل حاجة. بيتحسب تلقائي في hasPermission()، مش لازم يتكرر هنا.
//
// FULL_ACCESS: كل حاجة تشغيلية (شات، حملات، قوالب، أتمتة، جهات اتصال،
// تقارير، تكاملات) ما عدا الحاجات الحساسة: الفريق، الفوترة، إعدادات
// الحساب/الواتساب، ومفاتيح الـ API.
//
// CHAT_ONLY: الشات والرسائل + عرض جهات الاتصال بس (محتاجها عشان يشوف
// اسم/بيانات العميل وهو بيرد عليه)، مفيش أي إدارة أو صلاحيات تانية.
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
  ],
  CHAT_ONLY: [
    "CHAT_VIEW",
    "CHAT_SEND",
    "CONTACTS_VIEW",
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

/**
 * الـ helper المستخدم في الـ API routes.
 * بيرجع null لو مسموح (كمّل تنفيذ الـ route عادي)،
 * أو NextResponse جاهزة بـ 401/403 لو لازم توقف.
 *
 *   const denied = requirePermission(session, "CAMPAIGNS_MANAGE");
 *   if (denied) return denied;
 */
export function requirePermission(
  session: Session | null | undefined,
  permission: Permission
): NextResponse | null {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // sub-accounts (team members) بس هما اللي عندهم role !== OWNER فعليًا.
  // isSuper (سوبر أدمن Wani الداخلي) مش جزء من نظام الـ role/permission ده.
  if (!hasPermission(session.user.role, permission)) {
    return NextResponse.json(
      { error: "ليس لديك صلاحية للقيام بهذا الإجراء" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * نسخة بترمي Error بدل ما ترجع NextResponse — مفيدة جوه Server Actions
 * أو أماكن مش بترجع Response مباشرة.
 */
export function assertPermission(
  session: Session | null | undefined,
  permission: Permission
): void {
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  if (!hasPermission(session.user.role, permission)) {
    throw new Error("FORBIDDEN");
  }
}
