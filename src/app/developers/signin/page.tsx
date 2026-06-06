"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function DevSignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/developers/portal";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (errorParam === "suspended") {
      setError("الحساب موقف، تواصل مع الدعم");
    }
  }, [errorParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/developers/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "حصل خطأ، حاول تاني");
        return;
      }

      // Redirect based on server response
      router.push(data.redirect || callbackUrl);
      router.refresh();
    } catch {
      setLoading(false);
      setError("حصل خطأ في الاتصال، حاول تاني");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/developers" className="inline-flex items-center gap-2 text-white">
            <span className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center text-black font-bold text-xl">
              W
            </span>
            <span className="text-lg font-medium">
              وني<span className="text-white/40">/ Developer Portal</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            دخول المطورين
          </h1>
          <p className="text-white/50 text-center text-sm mb-6">
            ادخل حسابك عشان تدير الـ API Keys والـ OTP
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-white/70 mb-1.5">الإيميل</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@example.com"
                dir="ltr"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/20 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-white/70 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
                  جاري الدخول...
                </>
              ) : (
                <>
                  دخول
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-white/50 text-sm">
              ماعندكش حساب؟{" "}
              <Link
                href="/developers/signup"
                className="text-[#25D366] hover:underline font-medium"
              >
                سجّل جديد
              </Link>
            </p>
          </div>
        </div>

        {/* Back to landing */}
        <div className="text-center mt-6">
          <Link
            href="/developers"
            className="text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            ← رجوع للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
