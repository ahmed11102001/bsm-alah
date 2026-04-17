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
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("المستخدم غير موجود");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("كلمة المرور غير صحيحة");
        }

        // إرجاع البيانات الأساسية
        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      // عند تسجيل الدخول لأول مرة، الـ user بيبقى موجود
      if (user) {
        token.id = user.id; // نأكد إن الـ id اتخزن في التوكن
      }
      return token;
    },
    async session({ session, token }) {
      // نقل الـ id من التوكن للسيشن بشكل صريح
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id || token.sub; 
      }
      
      console.log("✅ [AUTH] Session user ID set to:", session.user?.id);
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};