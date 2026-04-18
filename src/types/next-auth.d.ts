import "next-auth";
import { DefaultSession } from "next-auth";
import { AdapterUser } from "next-auth/adapters"; // ضيف دي

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      parentId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    parentId?: string | null;
  }
}

// 🛡️ ضيف الجزء ده عشان الـ Adapter ميعترضش وقت الـ Build
declare module "next-auth/adapters" {
  interface AdapterUser {
    role: string;
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