"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DEVELOPERS_BASE_URL, isDevHostname } from "@/lib/dev-links";

export default function GoogleSignupContinuation() {
  const { data: session, status } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.email) {
      router.replace("/");
      return;
    }
    const context = params.get("context") === "portal" ? "portal" : "dashboard";
    const returnTo = params.get("returnTo") || (context === "portal" ? "/developers/signup" : "/?openLogin=1");
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/signup/from-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error || "This email is already registered. Please sign in.");
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
  }, [session, status, params, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      {error ? <p className="text-sm text-red-600 text-center">{error}</p> : <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />}
    </main>
  );
}
