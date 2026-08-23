// src/app/onboarding/page.tsx
// Google onboarding: accepts valid international WhatsApp numbers with full bilingual support.

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Phone,
  MessageCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { normalizePhone } from "@/lib/phone";

type Locale = "ar" | "en";

const tDict = {
  ar: {
    back: "رجوع",
    switchLang: "English",
    greeting: (name: string) => `أهلاً، ${name} 👋`,
    subtitle: "خطوة أخيرة — أدخل رقم واتساب الخاص بك\nعشان تبدأ ترسل وتستقبل الرسائل",
    phoneLabel: "رقم الواتساب",
    phonePlaceholder: "+201234567890",
    phoneHint: "اكتب الرقم بصيغة دولية، مثال: +201234567890 أو +966501234567",
    steps: [
      "إنشاء الحساب ✓",
      "إدخال رقم الواتساب ← أنت هنا",
      "ربط الواتساب Business API",
    ],
    submit: "ابدأ الاستخدام",
    submitting: "جاري الإعداد...",
    toastSuccess: "مرحباً بك في وني 🎉",
    invalidPhone: "أدخل رقم واتساب صحيح بالصيغة الدولية — مثال: +201234567890 أو +966501234567",
    phoneExists: "هذا الرقم مستخدم بالفعل من حساب آخر",
    genericError: "حدث خطأ، حاول مرة أخرى",
  },
  en: {
    back: "Back",
    switchLang: "العربية",
    greeting: (name: string) => `Welcome, ${name} 👋`,
    subtitle: "One last step — enter your WhatsApp number\nto start sending and receiving messages",
    phoneLabel: "WhatsApp Number",
    phonePlaceholder: "+1234567890",
    phoneHint: "Enter your number in international format, e.g., +201234567890 or +966501234567",
    steps: [
      "Account created ✓",
      "Enter WhatsApp number ← You are here",
      "Connect WhatsApp Business API",
    ],
    submit: "Get Started",
    submitting: "Setting up...",
    toastSuccess: "Welcome to Wani 🎉",
    invalidPhone: "Please enter a valid WhatsApp number in international format — e.g. +201234567890 or +966501234567",
    phoneExists: "This phone number is already registered to another account",
    genericError: "An error occurred, please try again",
  },
};

function resolveClientLocale(searchParams: ReturnType<typeof useSearchParams>): Locale {
  // 1. URL search param (?lang=en or ?locale=en)
  const paramLang = searchParams.get("lang") || searchParams.get("locale");
  if (paramLang === "ar" || paramLang === "en") return paramLang;

  // 2. Cookie NEXT_LOCALE
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    if (match) {
      const val = decodeURIComponent(match[1].trim()).toLowerCase();
      if (val === "ar" || val === "en") return val as Locale;
    }

    // 3. LocalStorage
    try {
      const local = localStorage.getItem("locale");
      if (local === "ar" || local === "en") return local as Locale;
    } catch {}

    // 4. HTML lang attribute
    const docLang = document.documentElement.lang?.toLowerCase();
    if (docLang === "ar" || docLang === "en") return docLang as Locale;
  }

  return "ar";
}

function OnboardingInner() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const params = useSearchParams();

  const next = params.get("next");

  const [locale, setLocale] = useState<Locale>(() => resolveClientLocale(params));
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [backBusy, setBackBusy] = useState(false);
  const [err, setErr] = useState("");

  const t = tDict[locale];
  const isRtl = locale === "ar";

  useEffect(() => {
    const detected = resolveClientLocale(params);
    setLocale(detected);
    document.documentElement.lang = detected;
    document.documentElement.dir = detected === "ar" ? "rtl" : "ltr";
  }, [params]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace(`/${locale}`);
      return;
    }
    if (!session.user.needsOnboarding) {
      router.replace(next || "/dashboard");
    }
  }, [session, status, router, next, locale]);

  const handleLangChange = (newLang: Locale) => {
    setLocale(newLang);
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem("locale", newLang);
    } catch {}
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const handleBack = async () => {
    setBackBusy(true);
    try {
      await signOut({ callbackUrl: `/${locale}` });
    } catch {
      router.replace(`/${locale}`);
    } finally {
      setBackBusy(false);
    }
  };

  if (status === "loading" || !session?.user.needsOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      setErr(t.invalidPhone);
      return;
    }

    setBusy(true);
    try {
      const r = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      const d = await r.json();

      if (!r.ok) {
        if (d.code === "PHONE_EXISTS") {
          setErr(t.phoneExists);
        } else {
          setErr(d.error ?? t.genericError);
        }
        return;
      }

      await update({ needsOnboarding: false });
      toast.success(t.toastSuccess);
      router.replace(next || "/dashboard");
    } catch {
      setErr(t.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#25D366] via-[#128C7E] to-[#25D366]" />

        <div className="px-8 py-7">
          {/* Top Bar: Back Button & Language Switcher */}
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={backBusy || busy}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors py-1.5 px-2.5 rounded-xl hover:bg-gray-100 active:scale-95 disabled:opacity-50"
            >
              {backBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isRtl ? (
                <ArrowRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowLeft className="w-3.5 h-3.5" />
              )}
              <span>{t.back}</span>
            </button>

            <button
              type="button"
              onClick={() => handleLangChange(locale === "ar" ? "en" : "ar")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#128C7E] transition-colors py-1.5 px-3 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50/50 active:scale-95 shadow-sm"
            >
              <Globe className="w-3.5 h-3.5 text-[#25D366]" />
              <span>{t.switchLang}</span>
            </button>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[#25D366] flex items-center justify-center shadow-lg shadow-green-200">
              <MessageCircle className="w-9 h-9 text-white" />
            </div>
          </div>

          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t.greeting(session.user.name?.split(" ")[0] || "")}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
              {t.subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t.phoneLabel}
              </Label>

              <div className="relative">
                <Phone
                  className={`absolute top-3.5 w-4 h-4 text-gray-400 ${
                    isRtl ? "right-3" : "left-3"
                  }`}
                />
                <Input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.phonePlaceholder}
                  className={`rounded-xl h-12 text-sm font-mono ${
                    isRtl ? "pr-10 pl-4" : "pl-10 pr-4"
                  }`}
                  dir="ltr"
                />
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                {t.phoneHint}
              </p>
            </div>

            <div className="bg-green-50/80 border border-green-100 rounded-2xl p-4 space-y-2.5">
              {t.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      i === 0
                        ? "bg-green-500"
                        : i === 1
                        ? "bg-[#25D366]"
                        : "bg-gray-200"
                    }`}
                  >
                    {i === 0 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                    {i === 1 && (
                      <span className="w-2 h-2 bg-white rounded-full" />
                    )}
                    {i === 2 && (
                      <span className="text-xs text-gray-400 font-bold">3</span>
                    )}
                  </div>

                  <span
                    className={
                      i === 0
                        ? "text-green-700 font-medium"
                        : i === 1
                        ? "text-[#128C7E] font-semibold"
                        : "text-gray-400"
                    }
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {err && (
              <p className="text-sm text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-200 p-2.5 rounded-xl">
                <span>⚠️</span> {err}
              </p>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-12 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold text-sm gap-2 shadow-md shadow-green-100"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.submitting}</span>
                </>
              ) : (
                <>
                  {isRtl ? (
                    <ArrowLeft className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>{t.submit}</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
        </div>
      }
    >
      <OnboardingInner />
    </Suspense>
  );
}