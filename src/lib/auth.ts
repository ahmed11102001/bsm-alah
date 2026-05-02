import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  // استخدام as any هنا لحل تعارض الـ Types في Vercel بخصوص الحقول الإضافية
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("الرجاء إدخال البريد الإلكتروني وكلمة المرور");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) {
          throw new Error("المستخدم غير موجود");
        }

        // حماية: منع دخول الموظف إذا لم يقم بالتفعيل عبر كود الانضمام
        if (user.role !== "OWNER" && user.inviteCode) {
          throw new Error("يرجى تفعيل حسابك أولاً باستخدام كود الانضمام");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("كلمة المرور غير صحيحة");
        }

        return { 
          id:       user.id, 
          name:     user.name, 
          email:    user.email,
          role:     user.role, 
          parentId: user.parentId,
          isSuper:  user.isSuper,
        };
      },
    }),
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 يوم
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) { 
        token.id       = user.id;
        token.role     = user.role;
        token.parentId = user.parentId;
        token.isSuper  = user.isSuper;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id       = token.id       as string;
        session.user.role     = token.role     as string;
        session.user.parentId = token.parentId as string | null;
        session.user.isSuper  = token.isSuper  as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};