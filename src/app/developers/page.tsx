"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Zap, Shield, MessageSquare, Code, TrendingUp, Check } from "lucide-react";

const SNIPPET = `// Send OTP in 2 lines
const res = await fetch("/api/v1/otp/send", {
  method: "POST",
  headers: { "x-api-key": "wani_live_xxx", "Content-Type": "application/json" },
  body: JSON.stringify({ phone: "+201234567890" })
});
// ✓ OTP sent via WhatsApp`;

export default function DevelopersLandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-sm font-medium mb-6">
            <Zap size={14} />
            WhatsApp OTP API — BETA
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            تحقق من أرقام عملائك<br />
            <span className="text-[#25D366]">عبر واتساب</span> في سطرين
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto mb-8">
            API بسيط يرسل كود OTP على واتساب المستخدم ويتحقق منه.
            بدون SMS، بدون تعقيد — فقط WhatsApp اللي كلهم بيستخدموه.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/developers/signup"
              className="px-8 py-3.5 rounded-xl bg-[#25D366] text-black font-semibold hover:bg-[#1ea855] transition-all flex items-center gap-2"
            >
              ابدأ مجاناً
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/developers/portal/quick-start"
              className="px-8 py-3.5 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all"
            >
              كيف يعمل؟
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-16">
          {[
            { n: "98", s: "%", label: "معدل التسليم" },
            { n: "3", s: "ث", label: "متوسط الوصول" },
            { n: "50", s: "", label: "رسالة مجانية" },
          ].map(({ n, s, label }) => (
            <div key={label} className="text-center p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-3xl font-bold text-[#25D366] mb-1">{n}{s}</div>
              <div className="text-white/40 text-sm">{label}</div>
            </div>
          ))}
        </div>

        {/* Code Preview */}
        <div className="max-w-2xl mx-auto mb-20">
          <div className="rounded-2xl bg-[#0f0f0f] border border-white/10 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              {["#ef4444", "#f59e0b", "#25D366"].map((c) => (
                <div key={c} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
              ))}
              <span className="text-white/30 text-xs ml-2 font-mono">otp-send.js</span>
            </div>
            <div className="p-6 overflow-x-auto">
              <pre className="text-sm font-mono leading-relaxed">
                {SNIPPET.split("\n").map((line, i) => (
                  <div key={i} className="flex">
                    <span className="text-white/20 w-8 text-right mr-4 select-none">{i + 1}</span>
                    <code className={line.trim().startsWith("//") ? "text-white/30" : line.includes("x-api-key") ? "text-[#25D366]" : "text-white/80"}>
                      {line || " "}
                    </code>
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-10">ليه Wani OTP؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "سطرين وخلاص", desc: "POST واحد يرسل الكود. POST واحد يتحقق منه. مفيش SDK أو config معقد." },
              { icon: Shield, title: "Wani يولد الكود", desc: "مش محتاج Redis أو DB للكودات. Wani بيتولى التوليد والحفظ والانتهاء تلقائياً." },
              { icon: MessageSquare, title: "واتساب فقط", desc: "معدل قراءة 98% مقارنة بـ 20% للـ SMS. المستخدم شايف الرسالة على الـ app اللي بيفتحه ألف مرة في اليوم." },
              { icon: Code, title: "Rate limiting مدمج", desc: "5 رسائل/رقم/ساعة تلقائياً. حماية من الـ abuse من غير ما تكتب سطر كود." },
              { icon: TrendingUp, title: "تحكم كامل", desc: "تقدر تولد الكود أنت وتبعته لـ Wani يرسله. مناسب لو عندك منطق خاص في السيرفر." },
              { icon: Check, title: "Dashboard كامل", desc: "تتابع الإرسال، التحقق، الفشل، ومتوسط وقت الاستجابة في لحظتها." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center mb-4">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-12 rounded-3xl bg-gradient-to-br from-[#25D366]/10 to-transparent border border-[#25D366]/20">
          <h2 className="text-3xl font-bold mb-4">جاهز تبدأ؟</h2>
          <p className="text-white/50 mb-8">50 رسالة مجانية — لا كارت بنكي، لا تعقيد</p>
          <Link
            href="/developers/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#25D366] text-black font-semibold hover:bg-[#1ea855] transition-all"
          >
            سجّل حساب مجاناً
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
