"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LoginModal from "@/components/LoginModal";

function SignupContent() {
  const params = useSearchParams();
  const lang = params.get("lang") === "en" ? "en" : "ar";
  const callbackUrl = params.get("callbackUrl") || undefined;

  return (
    <main className="min-h-screen bg-[#064e3b] flex items-center justify-center px-4 py-8">
      <LoginModal
        isOpen
        onClose={() => { window.location.href = `/${lang}`; }}
        callbackUrl={callbackUrl}
        lang={lang}
        standalone
      />
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#064e3b]" />}>
      <SignupContent />
    </Suspense>
  );
}
