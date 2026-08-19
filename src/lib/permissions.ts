/**
 * src/lib/permissions.ts
 *
 * Server-only permissions helpers.
 *
 * The permission matrix itself lives in permissions-core.ts so it can be
 * safely reused by Client Components. This file adds the NextResponse-based
 * guards used by API routes and Server Actions.
 */

import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { PERMISSIONS, hasPermission } from "@/lib/permissions-core";
import type { UserRole, Permission } from "@/lib/permissions-core";

export { PERMISSIONS, hasPermission };
export type { UserRole, Permission };

/**
 * API-route permission guard.
 *
 * Returns null when the current session has the requested permission.
 * Returns a ready-to-send 401/403 response when access must be denied.
 *
 * Usage:
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

  if (!hasPermission(session.user.role, permission)) {
    return NextResponse.json(
      { error: "ليس لديك صلاحية للقيام بهذا الإجراء" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Permission guard for Server Actions or other code paths that cannot
 * directly return a NextResponse.
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