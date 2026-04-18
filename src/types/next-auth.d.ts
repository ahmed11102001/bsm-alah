import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * هنا بنعدل شكل الـ Session اللي بنستخدمها في الـ Hooks زي useSession
   */
  interface Session {
    user: {
      id: string;
      role: string;           // ضفنا الـ Role
      parentId?: string | null; // ضفنا الـ ParentId
    } & DefaultSession["user"]; // دي عشان نحافظ على name و email و image الأصليين
  }

  /**
   * هنا بنعدل شكل الـ User اللي بيرجع من الـ authorize في الـ CredentialsProvider
   */
  interface User {
    id: string;
    role: string;
    parentId?: string | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * هنا بنعدل شكل الـ JWT اللي بيتباصى في الـ callbacks
   */
  interface JWT {
    id: string;
    role: string;
    parentId?: string | null;
  }
}