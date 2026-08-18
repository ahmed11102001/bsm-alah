/**
 * src/types/next-auth.d.ts
 *
 * توسيع لـ NextAuth types عشان نضيف الـ fields الخاصة بينا
 * (role, parentId, isSuper) على الـ Session والـ JWT.
 *
 * بعد الملف ده، مش محتاج تكتب (session.user as any).parentId
 * أو (session.user as any).role في أي مكان تاني —
 * TypeScript هيعرفهم تلقائياً.
 */

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id:       string;
      name:     string | null;
      email:    string;
      image?:   string | null;
      /** دور المستخدم في النظام */
      role:     "OWNER" | "FULL_ACCESS" | "CHAT_ONLY";
      /** لو الأكاونت ده sub-account، ده الـ ID بتاع الأونر */
      parentId: string | null;
      /** صلاحية السوبر أدمن */
      isSuper:  boolean;
      /** هل المستخدم محتاج يكمل onboarding (Google signup فقط) */
      needsOnboarding: boolean;
      /** مصدر إنشاء الحساب: MANUAL / GOOGLE / TEAM_INVITE */
      signupMethod: "MANUAL" | "GOOGLE" | "TEAM_INVITE";
    };
  }

  interface User {
    role:     "OWNER" | "FULL_ACCESS" | "CHAT_ONLY";
    parentId: string | null;
    isSuper:  boolean;
    needsOnboarding?: boolean;
    signupMethod?: "MANUAL" | "GOOGLE" | "TEAM_INVITE";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:                 string;
    role:               "OWNER" | "FULL_ACCESS" | "CHAT_ONLY";
    parentId:           string | null;
    isSuper:            boolean;
    needsOnboarding?:   boolean;
    signupMethod?:      "MANUAL" | "GOOGLE" | "TEAM_INVITE";
    /** آخر مرة تحققنا من isSuper من الـ DB (timestamp) */
    isSuperVerifiedAt?: number;
  }
}
