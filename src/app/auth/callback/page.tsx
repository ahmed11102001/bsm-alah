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

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.replace("/"); return; }

    if (session.user.needsOnboarding) {
      // لازم يكمل الـ onboarding الأول — منمرر next معاه عشان يكمل بعده
      router.replace(next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding");
    } else {
      router.replace(next || "/dashboard");
    }
  }, [session, status, router, next]);

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