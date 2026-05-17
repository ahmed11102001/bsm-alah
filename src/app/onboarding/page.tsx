"use client";

// src/app/onboarding/page.tsx
// بتظهر بس لليوزر الجديد اللي سجل بـ Google وناقصه رقم الواتساب

import { useState, useEffect } from "react";
import { useSession }  from "next-auth/react";
import { useRouter }   from "next/navigation";
import { motion }      from "framer-motion";
import { Button }      from "@/components/ui/button";
import { Input }       from "@/components/ui/input";
import { Label }       from "@/components/ui/label";
import { Loader2, Phone, MessageCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState("");

  // لو مش محتاج onboarding → روح dashboard مباشرة
  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.replace("/"); return; }
    if (!session.user.needsOnboarding) router.replace("/dashboard");
  }, [session, status, router]);

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
    const cleaned = phone.replace(/\s|-/g, "");
    if (!/^2\d{11}$/.test(cleaned)) {
      setErr("أدخل رقم صحيح بالصيغة الدولية — مثال: 201234567890");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/onboarding", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone: cleaned }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "حدث خطأ"); return; }

      // حدّث الـ session عشان needsOnboarding يبقى false
      await update({ needsOnboarding: false });
      toast.success("مرحباً بك في WhatsPro 🎉");
      router.replace("/dashboard");
    } catch {
      setErr("حدث خطأ، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
      >
        {/* Top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#25D366] via-[#128C7E] to-[#25D366]" />

        <div className="px-8 py-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[#25D366] flex items-center justify-center shadow-lg shadow-green-200">
              <MessageCircle className="w-9 h-9 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              أهلاً، {session.user.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              خطوة أخيرة — أدخل رقم واتساب Business الخاص بك
              <br />
              عشان تبدأ ترسل وتستقبل الرسائل
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                رقم واتساب Business
              </Label>
              <div className="relative">
                <Phone className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" />
                <Input
                  required
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="201234567890"
                  className="rounded-xl pr-10 h-12 text-sm font-mono"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-gray-400">
                الصيغة الدولية بدون + — مثال: 201234567890
              </p>
            </div>

            {/* Steps indicator */}
            <div className="bg-green-50 rounded-2xl p-4 space-y-2.5">
              {[
                "إنشاء الحساب ✓",
                "إدخال رقم الواتساب ← أنت هنا",
                "ربط الواتساب Business API",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    i === 0 ? "bg-green-500" :
                    i === 1 ? "bg-[#25D366]" :
                    "bg-gray-200"
                  }`}>
                    {i === 0 && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    {i === 1 && <span className="w-2 h-2 bg-white rounded-full" />}
                    {i === 2 && <span className="text-xs text-gray-400 font-bold">3</span>}
                  </div>
                  <span className={
                    i === 0 ? "text-green-700 font-medium" :
                    i === 1 ? "text-[#25D366] font-semibold" :
                    "text-gray-400"
                  }>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {err && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <span>⚠️</span> {err}
              </p>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-12 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold text-sm gap-2"
            >
              {busy
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><ArrowLeft className="w-4 h-4" /> ابدأ الاستخدام</>
              }
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}