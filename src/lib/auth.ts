import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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

        // 1. التأكد من وجود المستخدم وكلمة مرور مخزنة
        if (!user || !user.password) {
          throw new Error("المستخدم غير موجود");
        }

        // 2. حماية: منع دخول الموظف إذا لم يقم بالتفعيل عبر كود الانضمام
        // إذا كان لديه inviteCode فهذا يعني أنه لم ينهِ خطوة اختيار الباسورد الخاصة به
        if (user.role !== "OWNER" && user.inviteCode) {
          throw new Error("يرجى تفعيل حسابك أولاً باستخدام كود الانضمام");
        }

        // 3. التحقق من صحة كلمة المرور باستخدام bcrypt
        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("كلمة المرور غير صحيحة");
        }

        // 4. إرجاع البيانات (الآن ستعمل مع TypeScript بسلاسة بفضل ملف الـ types)
        return { 
          id: user.id, 
          name: user.name, 
          email: user.email,
          role: user.role, 
          parentId: user.parentId 
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
        token.id = user.id;
        token.role = user.role;
        token.parentId = user.parentId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // بفضل التعديلات السابقة، TypeScript الآن يتعرف على هذه الحقول تلقائياً
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.parentId = token.parentId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // أو مسار صفحة اللوجن عندك
  },
  secret: process.env.NEXTAUTH_SECRET,
};