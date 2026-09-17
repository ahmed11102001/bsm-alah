// src/app/auth/callback/page.tsx
// صفحة بيمر عليها اليوزر بعد Google OAuth — server-side عشان الجلسة تتقرأ
// من الكوكي مباشرة (useSession على العميل كان بيرجع no-session قبل ما تجهز).

import { redirect } from "next/navigation";
import { getAppServerSession } from "@/lib/auth";
import { DEVELOPERS_BASE_URL } from "@/lib/dev-links";
import prisma from "@/lib/prisma";

type AuthCallbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const value = params[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function noSessionRedirect(
  signupContext: string | null,
  signupReturnTo: string | null,
  lang: string
): never {
  if (signupContext === "portal") {
    redirect(`${DEVELOPERS_BASE_URL}/signin?error=no-session`);
  }
  if (signupContext === "dashboard") {
    try {
      const base = process.env.NEXTAUTH_URL || "https://aiwni.com";
      const target = new URL(
        signupReturnTo || (lang === "en" ? "/en?openLogin=1" : "/ar?openLogin=1"),
        base
      );
      target.searchParams.set("authError", "no-session");
      redirect(`${target.pathname}${target.search}`);
    } catch {
      redirect("/ar?openLogin=1&authError=no-session");
    }
  }
  redirect(lang === "en" ? "/en" : "/ar");
}

export default async function AuthCallbackPage({ searchParams }: AuthCallbackPageProps) {
  const params = await searchParams;
  const next = pickParam(params, "next");
  const lang = pickParam(params, "lang") || pickParam(params, "locale") || "ar";
  const signupContext = pickParam(params, "signupContext");
  const signupReturnTo = pickParam(params, "returnTo");
  const authContext = pickParam(params, "authContext");

  const session = await getAppServerSession();
  if (!session?.user) {
    noSessionRedirect(signupContext, signupReturnTo, lang);
  }

  // Google login: completed accounts go straight to the dashboard. A Google
  // shell created by NextAuth for a new/unfinished account uses the existing
  // signup flow (phone + password + OTP), never the legacy onboarding page.
  if (authContext === "login") {
    const user = session.user.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { phone: true, password: true, onboardingCompleted: true, signupMethod: true },
        })
      : null;
    const isUnfinishedGoogleAccount =
      user?.signupMethod === "GOOGLE" &&
      !user.phone &&
      !user.password &&
      !user.onboardingCompleted;

    if (!isUnfinishedGoogleAccount) {
      redirect(next || "/dashboard");
    }

    const query = new URLSearchParams({ context: "dashboard" });
    // Google login for a new account continues on the standalone signup page.
    const returnUrl = new URL("/auth", "http://localhost");
    returnUrl.searchParams.set("mode", "signup");
    returnUrl.searchParams.set("lang", lang === "en" ? "en" : "ar");
    if (next) returnUrl.searchParams.set("callbackUrl", next);
    const returnTo = `${returnUrl.pathname}${returnUrl.search}`;
    query.set("returnTo", returnTo);
    redirect(`/auth/google-signup?${query.toString()}`);
  }

  // Google signup must enter the new phone/password/OTP flow before the
  // legacy onboarding page. This marker is set only by signup buttons.
  if (signupContext === "dashboard" || signupContext === "portal") {
    const query = new URLSearchParams({ context: signupContext });
    if (signupReturnTo) query.set("returnTo", signupReturnTo);
    redirect(`/auth/google-signup?${query.toString()}`);
  }

  redirect(next || "/dashboard");
}
