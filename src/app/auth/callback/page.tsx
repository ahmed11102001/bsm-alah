"use client";

// src/app/auth/callback/page.tsx
// صفحة بيمر عليها اليوزر بعد Google OAuth
// بتشوف هل محتاج onboarding أو dashboard مباشرة

import { useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams }  from "next/navigation";
import { Loader2 }    from "lucide-react";

function AuthCallbackInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();

  // ── الباقة/الصفحة اللي اليوزر كان قاصدها قبل ما يدخل اللوجين
  //    (مثلاً /checkout?plan=pro&cycle=annual) — لو موجودة، الأولوية
  //    ليها بعد ما نتأكد إنه مش محتاج onboarding. ────────────────────────────
  const next = params.get("next");
  const lang = params.get("lang") || params.get("locale");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      const fallback = lang === "en" ? "/en" : "/ar";
      router.replace(fallback);
      return;
    }

    if (session.user.needsOnboarding) {
      // لازم يكمل الـ onboarding الأول — منمرر next وlang معاه
      const query = new URLSearchParams();
      if (next) query.set("next", next);
      if (lang) query.set("lang", lang);
      const qStr = query.toString();
      router.replace(qStr ? `/onboarding?${qStr}` : "/onboarding");
    } else {
      router.replace(next || "/dashboard");
    }
  }, [session, status, router, next, lang]);

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