import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider       from "next-auth/providers/google";
import { PrismaAdapter }   from "@auth/prisma-adapter";
import prisma              from "@/lib/prisma";
import bcrypt              from "bcryptjs";
import { rateLimit }       from "@/lib/rate-limit";
import { needsGoogleOnboarding } from "@/lib/onboarding";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,

  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

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

        const key    = `login:${credentials.email.toLowerCase()}`;
        const result = await rateLimit(key, { limit: 10, windowSecs: 15 * 60 });
        if (!result.success) {
          throw new Error(`كثير من المحاولات. حاول بعد ${result.retryAfter} ثانية.`);
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password || (user as any).deletedAt) {
          throw new Error("بيانات الدخول غير صحيحة");
        }

        if (user.role === "OWNER" && user.emailVerified === null) {
          throw new Error("يرجى تأكيد بريدك الإلكتروني أولًا");
        }

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
          needsOnboarding: false,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  events: {
    async createUser({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data:  { signupMethod: "GOOGLE" },
      });

      await prisma.subscription.upsert({
        where:  { userId: user.id },
        update: {},
        create: {
          userId:             user.id,
          plan:               "free",
          status:             "active",
          campaignsUsedThisMonth: 0,
          periodResetAt:      new Date(),
          currentPeriodStart: new Date(),
          currentPeriodEnd:   null,
        },
      });



      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const refCode = cookieStore.get("wani_ref")?.value;
        if (refCode) {
          const { trackReferralSignup } = await import("@/lib/referral/service");
          await trackReferralSignup({ referredUserId: user.id, refCode });
        }
      } catch (refErr) {
        console.error("[auth] Failed to track referral for Google user:", refErr);
      }
    },
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;

      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({
          where:  { email: user.email },
          select: { deletedAt: true },
        });
        if ((existing as any)?.deletedAt) return false;
      }

      return true;
    },

    async jwt({ token, user, account, trigger, session }) {
      if (trigger === "update" && session) {
        if (session.needsOnboarding !== undefined) {
          token.needsOnboarding = session.needsOnboarding;
        }
      }

      if (user && account) {
        const dbUser = await prisma.user.findUnique({
          where:  { id: user.id },
          select: {
            role: true, parentId: true, isSuper: true, inviteCode: true,
            signupMethod: true, onboardingCompleted: true,
          },
        });

        token.id                = user.id;
        token.role              = dbUser?.role     ?? "OWNER";
        token.parentId          = dbUser?.parentId ?? null;
        token.isSuper           = (dbUser as any)?.isSuper ?? false;
        token.signupMethod      = dbUser?.signupMethod ?? "MANUAL";
        token.isSuperVerifiedAt = Date.now();
        token.needsOnboarding = needsGoogleOnboarding(dbUser);

        return token;
      }

      const FIVE_MINUTES = 5 * 60 * 1000;
      const lastVerified  = (token.isSuperVerifiedAt as number) ?? 0;

      if (Date.now() - lastVerified > FIVE_MINUTES) {
        const freshUser = await prisma.user.findUnique({
          where:  { id: token.id as string },
          select: { isSuper: true, role: true, parentId: true, signupMethod: true, onboardingCompleted: true },
        });

        if (!freshUser) {
          token.isSuper = false;
          token.role    = "OWNER";
        } else {
          token.isSuper = freshUser.isSuper;
          token.role    = freshUser.role;
          token.parentId = freshUser.parentId;
          token.signupMethod = freshUser.signupMethod;
        }

        token.needsOnboarding = needsGoogleOnboarding(freshUser);
        token.isSuperVerifiedAt = Date.now();
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id             = token.id       as string;
        session.user.role           = token.role as "OWNER" | "FULL_ACCESS" | "CHAT_ONLY";
        session.user.parentId       = token.parentId as string | null;
        session.user.isSuper        = token.isSuper  as boolean;
        session.user.needsOnboarding = (token.needsOnboarding as boolean | undefined) ?? false;
        session.user.signupMethod   = (token.signupMethod as "MANUAL" | "GOOGLE" | "TEAM_INVITE" | undefined) ?? "MANUAL";
      }
      return session;
    },
  },

  pages: {
    signIn: "/",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
