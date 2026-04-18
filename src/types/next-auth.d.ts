import "next-auth";
import { DefaultSession } from "next-auth";
import { UserRole } from "@prisma/client"; // سطر 3: استيراد الـ Enum

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole | string; // سطر 9: تعديل النوع هنا
      parentId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole | string; // سطر 16: تعديل النوع هنا
    parentId?: string | null;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role: UserRole | string; // سطر 23: تعديل النوع هنا
    parentId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    parentId?: string | null;
  }
}