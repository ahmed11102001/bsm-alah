"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

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
