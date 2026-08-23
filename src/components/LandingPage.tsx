"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import LandingPageSkeleton from "@/components/LandingPageSkeleton";

import Navbar from "@/sections/Navbar";
import Hero from "@/sections/Hero";
import Features from "@/sections/Features";
import Partners from "@/sections/Partners";
import HowItWorks from "@/sections/HowItWorks";
import Pricing from "@/sections/Pricing";
import Testimonials from "@/sections/Testimonials";
import FAQ from "@/sections/FAQ";
import Footer from "@/sections/Footer";
import LoginModal from "@/components/LoginModal";
import AIAssistantWidget from "@/components/AIAssistantWidget";
import RevealSection from "@/components/RevealSection";
import type { Lang } from "@/lib/translations";

interface LandingPageProps {
  initialLang: Lang;
}

function LandingPageContent({ initialLang }: LandingPageProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(initialLang);
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();

  // ── لو جاي من /checkout بدون session (عن طريق الـ middleware) ──────────────
  const callbackUrl = params.get("callbackUrl");
  const shouldOpenLogin = params.get("openLogin") === "1";

  useEffect(() => {
    if (shouldOpenLogin) setIsLoginModalOpen(true);
  }, [shouldOpenLogin]);

  useEffect(() => {
    setLang(initialLang);
    document.documentElement.dir = initialLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = initialLang;
    document.cookie = `NEXT_LOCALE=${initialLang}; path=/; max-age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem("locale", initialLang);
    } catch {}
  }, [initialLang]);

  useEffect(() => {
    if (session) router.push(callbackUrl || "/dashboard");
  }, [session, router, callbackUrl]);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem("locale", newLang);
    } catch {}
    const search = window.location.search || "";
    router.push(`/${newLang}${search}`);
  };

  if (status === "loading") return <LandingPageSkeleton lang={lang} />;
  if (session) return null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        onLoginClick={() => setIsLoginModalOpen(true)}
        lang={lang}
        onLangChange={handleLangChange}
      />
      <Hero onLoginClick={() => setIsLoginModalOpen(true)} lang={lang} />

      <Features lang={lang} />
      <RevealSection><Partners lang={lang} /></RevealSection>
      <RevealSection><HowItWorks lang={lang} onLoginClick={() => setIsLoginModalOpen(true)} /></RevealSection>
      <RevealSection><Pricing lang={lang} /></RevealSection>
      <RevealSection><Testimonials lang={lang} onLoginClick={() => setIsLoginModalOpen(true)} /></RevealSection>
      <RevealSection><FAQ lang={lang} onLoginClick={() => setIsLoginModalOpen(true)} /></RevealSection>
      <RevealSection><Footer lang={lang} /></RevealSection>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        callbackUrl={callbackUrl ?? undefined}
        lang={lang}
      />

      {/* ── AI Assistant Widget ── */}
      <AIAssistantWidget lang={lang} />
    </div>
  );
}

export default function LandingPage({ initialLang }: LandingPageProps) {
  return (
    <Suspense fallback={<LandingPageSkeleton lang={initialLang} />}>
      <LandingPageContent initialLang={initialLang} />
    </Suspense>
  );
}
