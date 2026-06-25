import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider       from "next-auth/providers/google";
import { PrismaAdapter }   from "@auth/prisma-adapter";
import prisma              from "@/lib/prisma";
import bcrypt              from "bcryptjs";
import { rateLimit }       from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,

  providers: [

    // ── Google ─────────────────────────────────────────────────────────────────
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // يسمح بربط حساب Google بحساب إيميل موجود بنفس العنوان
      allowDangerousEmailAccountLinking: true,
    }),

    // ── Email / Password ───────────────────────────────────────────────────────
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

        // ── Rate Limit: 10 محاولات كل 15 دقيقة لنفس الإيميل ──────────────────
        const key    = `login:${credentials.email.toLowerCase()}`;
        const result = await rateLimit(key, { limit: 10, windowSecs: 15 * 60 });
        if (!result.success) {
          throw new Error(`كثير من المحاولات. حاول بعد ${result.retryAfter} ثانية.`);
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
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
        if (!isValid) {
          throw new Error("بيانات الدخول غير صحيحة");
        }

        return {
          id:       user.id,
          name:     user.name,
          email:    user.email,
          role:     user.role,
          parentId: user.parentId,
          isSuper:  (user as any).isSuper ?? false,
          needsOnboarding: !user.phone,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 يوم
  },

  events: {
    // ── createUser: بيتنفذ مرة واحدة بس من الـ PrismaAdapter وقت إنشاء
    //    يوزر جديد (يعني أول تسجيل دخول بـ Google OAuth) ──────────────────────
    //    يوزر الـ credentials provider مش بيعدي من هنا لأنه بيتعمل في
    //    /api/register مباشرة (وعنده subscription "free" خلاص هناك).
    //
    //    بدون الـ hook ده، يوزر Google الجديد كان بيتعمله User بس من غير
    //    Subscription خالص، وأي مكان بيعتمد على وجود الـ record (مش بس على
    //    fallback القيمة) كان ممكن يطلع نتيجة غير متوقعة.
    async createUser({ user }) {
      await prisma.subscription.upsert({
        where:  { userId: user.id },
        update: {},   // لو موجودة بالفعل لأي سبب — متلمسهاش
        create: {
          userId:             user.id,
          plan:               "free",
          status:             "active",
          campaignsUsedThisMonth: 0,
          periodResetAt:      new Date(),
          currentPeriodStart: new Date(),
          currentPeriodEnd:   null, // free plan — لا ينتهي
        },
      });
    },
  },

  callbacks: {

    // ── signIn: تحقق قبل ما نكمل ────────────────────────────────────────────────
    async signIn({ user, account }) {
      // Credentials — التحقق بيتم بالكامل في authorize فوق
      if (account?.provider === "credentials") return true;

      // Google — تأكد إن اليوزر مش محذوف
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({
          where:  { email: user.email },
          select: { deletedAt: true },
        });
        if ((existing as any)?.deletedAt) return false;
      }

      return true;
    },

    // ── jwt ──────────────────────────────────────────────────────────────────────
    async jwt({ token, user, account }) {

      // ── أول مرة: وقت الـ login ─────────────────────────────────────────────
      if (user && account) {
        const dbUser = await prisma.user.findUnique({
          where:  { id: user.id },
          select: { role: true, parentId: true, isSuper: true, phone: true, inviteCode: true },
        });

        token.id                = user.id;
        token.role              = dbUser?.role     ?? "OWNER";
        token.parentId          = dbUser?.parentId ?? null;
        token.isSuper           = (dbUser as any)?.isSuper ?? false;
        token.isSuperVerifiedAt = Date.now();

        // ── Google فقط: هل محتاج Onboarding? (رقم الواتساب ناقص) ─────────────
        // اليوزر الجديد من جوجل مش عنده phone → نبعته لـ /onboarding
        // اليوزر القديم اللي ربط Google بحسابه عنده phone → Dashboard مباشرة
        if (account.provider === "google") {
          token.needsOnboarding = !dbUser?.phone;
        } else {
          token.needsOnboarding = false;
        }

        return token;
      }

      // ── كل request بعد كده: تحقق من isSuper كل 5 دقائق ───────────────────
      const FIVE_MINUTES = 5 * 60 * 1000;
      const lastVerified  = (token.isSuperVerifiedAt as number) ?? 0;

      if (Date.now() - lastVerified > FIVE_MINUTES) {
        const freshUser = await prisma.user.findUnique({
          where:  { id: token.id as string },
          select: { isSuper: true, role: true, phone: true },
        });

        if (!freshUser) {
          token.isSuper = false;
          token.role    = "OWNER";
        } else {
          token.isSuper = freshUser.isSuper;
          token.role    = freshUser.role;
        }

        token.needsOnboarding = !freshUser?.phone;
        token.isSuperVerifiedAt = Date.now();
      }

      return token;
    },

    // ── session ──────────────────────────────────────────────────────────────────
    async session({ session, token }) {
      if (session.user) {
        session.user.id             = token.id       as string;
        session.user.role           = token.role as "OWNER" | "FULL_ACCESS" | "CHAT_ONLY";
        session.user.parentId       = token.parentId as string | null;
        session.user.isSuper        = token.isSuper  as boolean;
        session.user.needsOnboarding = (token.needsOnboarding as boolean | undefined) ?? false;
      }
      return session;
    },
  },

  pages: {
    signIn: "/",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
