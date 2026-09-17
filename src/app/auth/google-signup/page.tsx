"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DEVELOPERS_BASE_URL, isDevHostname } from "@/lib/dev-links";

export default function GoogleSignupContinuation() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const context = params.get("context") === "portal" ? "portal" : "dashboard";

  useEffect(() => {
    const returnTo = params.get("returnTo") || (context === "portal" ? "/developers/signup" : "/?openLogin=1");
    // اللغة اللي دخل بيها: من returnTo (الداشبورد بيبعت lang) وإلا الكوكي وإلا المتصفح
    let locale = "ar";
    try {
      const m = returnTo.match(/[?&]lang=(ar|en)\b/);
      const cm = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(ar|en)\b/);
      if (m) locale = m[1];
      else if (cm) locale = cm[1];
      else if (navigator.language?.toLowerCase().startsWith("ar")) locale = "ar";
      else locale = "en";
    } catch {}
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/signup/from-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (res.status === 401) {
        if (context === "portal") {
          window.location.href = `${DEVELOPERS_BASE_URL}/signin?error=no-session`;
        } else {
          router.replace("/?openLogin=1&authError=no-session");
        }
        return;
      }
      if (!res.ok) {
        setError(data.error || "This email is already registered. Please sign in.");
        setErrorCode(data.code || "");
        return;
      }
      await signOut({ redirect: false });
      // ── البورتال ساكن على developers.aiwni.com لكن NextAuth بيرجع على
      // الدومين الرئيسي (NEXTAUTH_URL) — فـ returnTo بشكل "/signup" لو اتحل
      // على الـ origin الحالي هيودي على صفحة مش موجودة (اللاندينج).
      // لو الـ returnTo بصيغة الـ subdomain وإحنا مش عليه، ننقل cross-host.
      if (context === "portal") {
        const isAbsolute = /^https?:\/\//i.test(returnTo);
        const isMainDomainStyle = returnTo === "/developers" || returnTo.startsWith("/developers/");
        const onDevHost =
          typeof window !== "undefined" && isDevHostname(window.location.hostname);
        if (!isAbsolute && !isMainDomainStyle && !onDevHost) {
          const url = new URL(returnTo, DEVELOPERS_BASE_URL);
          url.searchParams.set("signupToken", data.signupToken);
          url.searchParams.set("signupEmail", data.email || "");
          if (data.name) url.searchParams.set("signupName", data.name);
          window.location.href = url.toString();
          return;
        }
      }
      const url = new URL(returnTo, window.location.origin);
      url.searchParams.set("signupToken", data.signupToken);
      url.searchParams.set("signupEmail", data.email || "");
      if (data.name) url.searchParams.set("signupName", data.name);
      router.replace(`${url.pathname}${url.search}`);
    })().catch(() => setError("Could not continue with Google. Please try again."));
    return () => { cancelled = true; };
  }, [params, router, context]);

  // الإيميل مسجل قبل كده → رجّعه لتسجيل الدخول بدل صفحة مسدودة.
  // الداشبورد على نفس الهوست (/?openLogin=1 بيفتح مودال الدخول)،
  // البورتال على السب دومين (cross-host → href مباشر).
  const signInUrl =
    context === "portal" ? `${DEVELOPERS_BASE_URL}/signin` : "/?openLogin=1";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      {error ? (
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <p className="text-sm text-red-600 text-center">{error}</p>
          {errorCode === "EMAIL_EXISTS" ? (
            <a
              href={signInUrl}
              className="px-6 h-11 inline-flex items-center justify-center rounded-xl bg-[#25D366] text-white text-sm font-medium hover:brightness-95 transition"
            >
              Sign in instead
            </a>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 h-11 inline-flex items-center justify-center rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Try again
            </button>
          )}
        </div>
      ) : (
        <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
      )}
    </main>
  );
}
