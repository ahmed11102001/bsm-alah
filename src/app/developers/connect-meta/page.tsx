"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, MessageCircle, Shield, Key } from "lucide-react";

export default function ConnectMetaPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/developers/portal/meta/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          phoneNumberId,
          wabaId,
          displayPhone: displayPhone || undefined,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "حصل خطأ في الربط، حاول تاني");
        return;
      }

      // Success → redirect to portal
      router.push("/developers/portal");
      router.refresh();
    } catch {
      setLoading(false);
      setError("حصل خطأ في الاتصال، حاول تاني");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/developers" className="inline-flex items-center gap-2 text-white mb-6">
            <span className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center text-black font-bold text-xl">
              W
            </span>
            <span className="text-lg font-medium">
              وني<span className="text-white/40">/ Developer Portal</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">
            ربط حساب Meta
          </h1>
          <p className="text-white/50">
            ادخل بيانات WhatsApp Business API عشان تقدر ترسل OTP
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          {/* Steps indicator */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#25D366] text-black flex items-center justify-center text-sm font-bold">
                ✓
              </div>
              <span className="text-white/70 text-sm">حساب</span>
            </div>
            <div className="flex-1 h-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#25D366] text-black flex items-center justify-center text-sm font-bold">
                2
              </div>
              <span className="text-white font-medium text-sm">Meta</span>
            </div>
            <div className="flex-1 h-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 text-white/40 flex items-center justify-center text-sm font-bold">
                3
              </div>
              <span className="text-white/40 text-sm">API Key</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Access Token */}
            <div>
              <label className="block text-sm text-white/70 mb-1.5 flex items-center gap-2">
                <Key size={14} className="text-[#25D366]" />
                Access Token
              </label>
              <textarea
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAAxxxxxxxx..."
                dir="ltr"
                required
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/20 transition-all resize-none font-mono text-sm"
              />
              <p className="text-white/30 text-xs mt-1">
                من Meta for Developers → WhatsApp → API Setup → Access Token
              </p>
            </div>

            {/* Phone Number ID */}
            <div>
              <label className="block text-sm text-white/70 mb-1.5 flex items-center gap-2">
                <MessageCircle size={14} className="text-[#25D366]" />
                Phone Number ID
              </label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="123456789012345"
                dir="ltr"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/20 transition-all font-mono text-sm"
              />
            </div>

            {/* WABA ID */}
            <div>
              <label className="block text-sm text-white/70 mb-1.5 flex items-center gap-2">
                <Shield size={14} className="text-[#25D366]" />
                WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="123456789012345"
                dir="ltr"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/20 transition-all font-mono text-sm"
              />
            </div>

            {/* Display Phone (optional) */}
            <div>
              <label className="block text-sm text-white/70 mb-1.5">
                رقم الهاتف المعروض (اختياري)
              </label>
              <input
                type="text"
                value={displayPhone}
                onChange={(e) => setDisplayPhone(e.target.value)}
                placeholder="+20 1xx xxx xxxx"
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/20 transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#25D366] text-black font-semibold hover:bg-[#1ea855] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  جاري الربط...
                </>
              ) : (
                <>
                  ربط الحساب
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Help */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-white/40 text-sm text-center">
              محتاج مساعدة في الحصول على البيانات؟{" "}
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#25D366] hover:underline"
              >
                دليل Meta
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
