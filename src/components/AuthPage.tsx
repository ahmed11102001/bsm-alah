"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LoginModal from "@/components/LoginModal";

type AuthPageProps = { initialView?: "login" | "register" | "join" };

function AuthPageContent({ initialView = "login" }: AuthPageProps) {
  const params = useSearchParams();
  const lang = params.get("lang") === "en" ? "en" : "ar";
  const callbackUrl = params.get("callbackUrl") || undefined;
  const mode = params.get("mode");
  const selectedView = mode === "signup" ? "register" : mode === "join" ? "join" : initialView;

  return (
    <main className="min-h-screen bg-[#064e3b] flex items-center justify-center px-4 py-8">
      <LoginModal
        isOpen
        onClose={() => { window.location.href = `/${lang}`; }}
        callbackUrl={callbackUrl}
        lang={lang}
        standalone
        initialView={selectedView}
      />
    </main>
  );
}

export default function AuthPage(props: AuthPageProps) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#064e3b]" />}>
      <AuthPageContent {...props} />
    </Suspense>
  );
}
