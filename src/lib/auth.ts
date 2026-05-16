import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  // PrismaAdapter بيرجع Adapter type صح بس فيه version mismatch بين
  // @auth/prisma-adapter و next-auth — الـ cast لـ Adapter بدل any
  // بيحتفظ بالـ type safety بدل ما يسيب الموضوع مفتوح.
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("الرجاء إدخال البريد الإلكتروني وكلمة المرور");
        }

        // ── Rate Limit: 10 محاولات كل 15 دقيقة لنفس الإيميل ─────────────────
        const key    = `login:${credentials.email.toLowerCase()}`;
        const result = await rateLimit(key, { limit: 10, windowSecs: 15 * 60 });
        if (!result.success) {
          throw new Error(`كثير من المحاولات. حاول بعد ${result.retryAfter} ثانية.`);
        }

        const user = await prisma.user.findUnique({
          where:  { email: credentials.email.toLowerCase() },
          // نجيب isSuper صراحة من الـ DB
          select: {
            id:         true,
            name:       true,
            email:      true,
            password:   true,
            role:       true,
            parentId:   true,
            isSuper:    true,
            inviteCode: true,
          },
        });

        // رسالة موحدة — مش بنكشف هل الإيميل موجود أو لأ
        if (!user || !user.password) {
          throw new Error("بيانات الدخول غير صحيحة");
        }

        // حماية: منع دخول الموظف قبل تفعيل حسابه
        if (user.role !== "OWNER" && user.inviteCode) {
          throw new Error("يرجى تفعيل حسابك أولاً باستخدام كود الانضمام");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        // نفس الرسالة لو الباسورد غلط
        if (!isValid) {
          throw new Error("بيانات الدخول غير صحيحة");
        }

        // isSuper جاي من الـ DB مباشرة — مش محتاج as any
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
      // ── أول مرة: وقت الـ login — احفظ البيانات في الـ token ────────────────
      if (user) {
        token.id                = user.id;
        token.role              = user.role;
        token.parentId          = user.parentId;
        token.isSuper           = user.isSuper ?? false;
        token.isSuperVerifiedAt = Date.now();
        return token;
      }

      // ── كل request بعد كده: تحقق من isSuper كل 5 دقائق فقط ────────────────
      // بيضمن إن سحب صلاحية isSuper يسري خلال 5 دقائق كحد أقصى،
      // بدل 30 يوم — من غير DB query على كل request.
      const FIVE_MINUTES = 5 * 60 * 1000;
      const lastVerified  = token.isSuperVerifiedAt ?? 0;

      if (Date.now() - lastVerified > FIVE_MINUTES) {
        const freshUser = await prisma.user.findUnique({
          where:  { id: token.id },
          select: { isSuper: true, role: true },
        });

        // لو اليوزر اتحذف من الـ DB → اشيل الصلاحيات فوراً
        if (!freshUser) {
          token.isSuper = false;
          token.role    = "OWNER";
        } else {
          token.isSuper = freshUser.isSuper;
          token.role    = freshUser.role;
        }

        token.isSuperVerifiedAt = Date.now();
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // الـ types معرّفة في src/types/next-auth.d.ts
        // مش محتاج as string أو as boolean تاني
        session.user.id       = token.id;
        session.user.role     = token.role;
        session.user.parentId = token.parentId;
        session.user.isSuper  = token.isSuper;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};