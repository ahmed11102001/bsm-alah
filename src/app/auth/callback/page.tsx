"use client";

// src/app/auth/callback/page.tsx
// صفحة بيمر عليها اليوزر بعد Google OAuth
// بتشوف هل محتاج onboarding أو dashboard مباشرة

import { useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams }  from "next/navigation";
import { Loader2 }    from "lucide-react";
import { DEVELOPERS_BASE_URL } from "@/lib/dev-links";

function AuthCallbackInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();

  // ── الباقة/الصفحة اللي اليوزر كان قاصدها قبل ما يدخل اللوجين
  //    (مثلاً /checkout?plan=pro&cycle=annual) — لو موجودة، الأولوية
  //    ليها بعد ما نتأكد إنه مش محتاج onboarding. ────────────────────────────
  const next = params.get("next");
  const lang = params.get("lang") || params.get("locale");
  const signupContext = params.get("signupContext");
  const signupReturnTo = params.get("returnTo");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      // بدون جلسة مفيش توكن يتعمل — لكن بدل رمي اليوزر على لاندينج ميتة،
      // رجّعه لمكان يقدر يكمل منه (تسجيل الدخول) مع الحفاظ على السياق.
      if (signupContext === "portal") {
        window.location.href = `${DEVELOPERS_BASE_URL}/signin`;
        return;
      }
      if (signupContext === "dashboard") {
        router.replace(signupReturnTo || (lang === "en" ? "/en?openLogin=1" : "/ar?openLogin=1"));
        return;
      }
      const fallback = lang === "en" ? "/en" : "/ar";
      router.replace(fallback);
      return;
    }

    // Google signup must enter the new phone/password/OTP flow before the
    // legacy onboarding page. This marker is set only by signup buttons.
    if (signupContext === "dashboard" || signupContext === "portal") {
      const query = new URLSearchParams({ context: signupContext });
      if (signupReturnTo) query.set("returnTo", signupReturnTo);
      router.replace(`/auth/google-signup?${query.toString()}`);
      return;
    }

    router.replace(next || "/dashboard");
  }, [session, status, router, next, lang, signupContext, signupReturnTo]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
