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
import AIAssistantWidget from "@/components/AIAssistantWidget";
import RevealSection from "@/components/RevealSection";
import type { Lang } from "@/lib/translations";

interface LandingPageProps {
  initialLang: Lang;
}

function LandingPageContent({ initialLang }: LandingPageProps) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();

  // ── لو جاي من /checkout بدون session (عن طريق الـ middleware) ──────────────
  const callbackUrl = params.get("callbackUrl");
  const shouldOpenLogin = params.get("openLogin") === "1";
  const hasSignupContinuation = params.has("signupToken");

  useEffect(() => {
    if (hasSignupContinuation) {
      router.replace(`/auth?mode=signup${params.toString() ? `&${params.toString()}` : ""}`);
    } else if (params.get("login") === "join" || params.get("tab") === "join") {
      router.replace(`/auth?mode=join${params.toString() ? `&${params.toString()}` : ""}`);
    } else if (shouldOpenLogin) {
      router.replace(`/auth?mode=login${params.toString() ? `&${params.toString()}` : ""}`);
    }
  }, [shouldOpenLogin, hasSignupContinuation, params, router]);

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
    if (session && !shouldOpenLogin && !hasSignupContinuation) {
      router.push(callbackUrl || "/dashboard");
    }
  }, [session, router, callbackUrl, shouldOpenLogin, hasSignupContinuation]);

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

  const openLoginPage = () => router.push(`/auth?mode=login&lang=${lang}`);

  if (status === "loading") return <LandingPageSkeleton lang={lang} />;
  if (session && !shouldOpenLogin && !hasSignupContinuation) return null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        onLoginClick={openLoginPage}
        lang={lang}
        onLangChange={handleLangChange}
      />
      <Hero onLoginClick={openLoginPage} lang={lang} />

      <Features lang={lang} />
      <RevealSection><Partners lang={lang} /></RevealSection>
      <RevealSection><HowItWorks lang={lang} onLoginClick={openLoginPage} /></RevealSection>
      <RevealSection><Pricing lang={lang} /></RevealSection>
      <RevealSection><Testimonials lang={lang} onLoginClick={openLoginPage} /></RevealSection>
      <RevealSection><FAQ lang={lang} onLoginClick={openLoginPage} /></RevealSection>
      <RevealSection><Footer lang={lang} /></RevealSection>

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
