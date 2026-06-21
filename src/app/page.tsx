"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import LandingPageSkeleton from "@/components/LandingPageSkeleton";

import Navbar       from "@/sections/Navbar";
import Hero         from "@/sections/Hero";
import Features     from "@/sections/Features";
import Partners     from "@/sections/Partners";
import HowItWorks   from "@/sections/HowItWorks";
import Pricing      from "@/sections/Pricing";
import Testimonials from "@/sections/Testimonials";
import FAQ          from "@/sections/FAQ";
import Footer       from "@/sections/Footer";
import LoginModal          from "@/components/LoginModal";
import AIAssistantWidget   from "@/components/AIAssistantWidget";
import RevealSection       from "@/components/RevealSection";
import type { Lang } from "@/lib/translations";

function HomeContent() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("ar");
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();

  // ── لو جاي من /checkout بدون session (عن طريق الـ middleware) ──────────────
  // بيوصل هنا بـ ?openLogin=1&callbackUrl=/checkout?plan=... فنفتح اللوجين
  // تلقائيًا ونحافظ على نفس الباقة المختارة عشان نرجّعه ليها بعد الدخول.
  const callbackUrl = params.get("callbackUrl");
  const shouldOpenLogin = params.get("openLogin") === "1";

  useEffect(() => {
    if (shouldOpenLogin) setIsLoginModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldOpenLogin]);

  // تغيير dir الصفحة كلها عند تغيير اللغة
  useEffect(() => {
    document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (session) router.push(callbackUrl || "/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, router]);

  if (status === "loading") return <LandingPageSkeleton />;
  if (session) return null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        onLoginClick={() => setIsLoginModalOpen(true)}
        lang={lang}
        onLangChange={setLang}
      />
      <Hero        onLoginClick={() => setIsLoginModalOpen(true)} lang={lang} />

      <Features    lang={lang} />
      <RevealSection><Partners    lang={lang} /></RevealSection>
      <RevealSection><HowItWorks  lang={lang} onLoginClick={() => setIsLoginModalOpen(true)} /></RevealSection>
      <RevealSection><Pricing     lang={lang} /></RevealSection>
      <RevealSection><Testimonials lang={lang} /></RevealSection>
      <RevealSection><FAQ         lang={lang} /></RevealSection>
      <RevealSection><Footer      lang={lang} /></RevealSection>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        callbackUrl={callbackUrl ?? undefined}
      />

      {/* ── AI Assistant Widget ── */}
      <AIAssistantWidget lang={lang} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LandingPageSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}