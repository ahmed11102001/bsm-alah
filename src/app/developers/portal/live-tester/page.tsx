"use client";

import { useState } from "react";
import { Send, CheckCircle, XCircle, Loader2, Phone, KeyRound } from "lucide-react";

export default function LiveTesterPage() {
  const [phone, setPhone] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [step, setStep] = useState<"send" | "verify" | "done">("send");
  const [token, setToken] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState("");

  async function sendOtp() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/v1/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "فشل الإرسال");
        return;
      }

      setToken(data.token);
      setStep("verify");
    } catch {
      setLoading(false);
      setError("حصل خطأ في الاتصال");
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/v1/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ token, code }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "فشل التحقق");
        setResult({ success: false, message: data.error || "فشل التحقق" });
        return;
      }

      setResult({ success: true, message: "✓ OTP verified successfully!" });
      setStep("done");
    } catch {
      setLoading(false);
      setError("حصل خطأ في الاتصال");
    }
  }

  function reset() {
    setStep("send");
    setToken("");
    setCode("");
    setResult(null);
    setError("");
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Live Tester</h1>
        <p className="text-white/50">جرب الـ API مباشرة من هنا — أرسل OTP وتحقق منه</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {["إرسال", "التحقق", "تم"].map((label, i) => {
          const steps = ["send", "verify", "done"] as const;
          const currentIdx = steps.indexOf(step);
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;

          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isDone
                    ? "bg-[#25D366] text-black"
                    : isActive
                    ? "bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/50"
                    : "bg-white/5 text-white/30 border border-white/10"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                className={`text-sm ${
                  isActive ? "text-white" : isDone ? "text-[#25D366]" : "text-white/30"
                }`}
              >
                {label}
              </span>
              {i < 2 && <div className="flex-1 h-px bg-white/10 mx-2" />}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5">
        {/* API Key */}
        <div>
          <label className="block text-sm text-white/70 mb-1.5 flex items-center gap-2">
            <KeyRound size={14} className="text-[#25D366]" />
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="wani_live_xxxxxxxxxxxxxxxx"
            dir="ltr"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50 font-mono text-sm"
          />
        </div>

        {step === "send" && (
          <>
            <div>
              <label className="block text-sm text-white/70 mb-1.5 flex items-center gap-2">
                <Phone size={14} className="text-[#25D366]" />
                رقم التليفون
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+201234567890"
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50"
              />
            </div>

            <button
              onClick={sendOtp}
              disabled={loading || !phone || !apiKey}
              className="w-full py-3 rounded-xl bg-[#25D366] text-black font-semibold hover:bg-[#1ea855] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  إرسال OTP
                </>
              )}
            </button>
          </>
        )}

        {step === "verify" && (
          <>
            <div className="p-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20">
              <p className="text-[#25D366] text-sm">✓ OTP اتبعت لـ {phone}</p>
              <p className="text-white/40 text-xs mt-1">Token: {token.slice(0, 16)}...</p>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1.5">الكود اللي وصلك</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                dir="ltr"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50 text-center text-2xl font-mono tracking-widest"
              />
            </div>

            <button
              onClick={verifyOtp}
              disabled={loading || code.length < 4}
              className="w-full py-3 rounded-xl bg-[#25D366] text-black font-semibold hover:bg-[#1ea855] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle size={18} />
                  تحقق
                </>
              )}
            </button>
          </>
        )}

        {step === "done" && result && (
          <div className="text-center py-8">
            {result.success ? (
              <>
                <div className="w-16 h-16 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">تم التحقق بنجاح!</h3>
                <p className="text-white/50 mb-6">الـ OTP شغال مظبوط 🎉</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
                  <XCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">فشل التحقق</h3>
                <p className="text-white/50 mb-6">{result.message}</p>
              </>
            )}
            <button
              onClick={reset}
              className="px-6 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              جرب تاني
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
