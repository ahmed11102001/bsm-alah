import "next-auth";
import { DefaultSession } from "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id:       string;
      role:     UserRole | string;
      parentId?: string | null;
      isSuper?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id:       string;
    role:     UserRole | string;
    parentId?: string | null;
    isSuper?: boolean;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role:     UserRole | string;
    parentId?: string | null;
    isSuper?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:       string;
    role:     string;
    parentId?: string | null;
    isSuper?: boolean;
  }
}