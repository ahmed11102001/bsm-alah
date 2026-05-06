"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import Navbar       from "@/sections/Navbar";
import Hero         from "@/sections/Hero";
import Features     from "@/sections/Features";
import HowItWorks   from "@/sections/HowItWorks";
import Pricing      from "@/sections/Pricing";
import Testimonials from "@/sections/Testimonials";
import FAQ          from "@/sections/FAQ";
import Footer       from "@/sections/Footer";
import LoginModal   from "@/components/LoginModal";
import type { Lang } from "@/lib/translations";

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("ar");
  const { data: session, status } = useSession();
  const router = useRouter();

  // تغيير dir الصفحة كلها عند تغيير اللغة
  useEffect(() => {
    document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (session) router.push("/dashboard");
  }, [session, router]);

  if (status === "loading") return <div>جاري التحميل...</div>;
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
      <HowItWorks  lang={lang} />
      <Pricing     lang={lang} />
      <Testimonials lang={lang} />
      <FAQ         lang={lang} />
      <Footer      lang={lang} />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
