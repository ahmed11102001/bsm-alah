"use client";

// src/app/auth/callback/page.tsx
// صفحة بيمر عليها اليوزر بعد Google OAuth
// بتشوف هل محتاج onboarding أو dashboard مباشرة

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter }  from "next/navigation";
import { Loader2 }    from "lucide-react";

export default function AuthCallback() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.replace("/"); return; }

    if (session.user.needsOnboarding) {
      router.replace("/onboarding");
    } else {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
    </div>
  );
}