/**
 * src/lib/permissions.ts
 *
 * نظام صلاحيات مركزي (Permission Matrix) على مستوى القدرات (Capabilities)،
 * مش على مستوى الـ routes حرفيًا. أي API route أو Server Action جديد لازم
 * يستخدم requirePermission() صراحةً — مفيش صلاحية بتتاخد تلقائي (deny-by-default).
 *
 * الـ matrix النقي (PERMISSIONS / hasPermission / ...) اتنقل لـ
 * permissions-core.ts عشان يبقى قابل للاستخدام من Client Components كمان
 * (مثلاً فلترة الـ Sidebar) بدون ما نستورد next/server هناك. الملف ده
 * بيعمل re-export لنفس الحاجات، فمفيش أي تغيير على أي مكان مستخدمها حاليًا.
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
import { PERMISSIONS, hasPermission } from "@/lib/permissions-core";
import type { UserRole, Permission } from "@/lib/permissions-core";

export { PERMISSIONS, hasPermission };
export type { UserRole, Permission };

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
