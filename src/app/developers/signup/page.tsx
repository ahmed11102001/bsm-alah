"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

export default function DevSignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/developers/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "حصل خطأ");
        return;
      }

      router.push(data.redirect || "/developers/connect-meta");
      router.refresh();
    } catch {
      setLoading(false);
      setError("حصل خطأ في الاتصال");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/developers" className="inline-flex items-center gap-2 text-white">
            <span className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center text-black font-bold text-xl">W</span>
            <span className="text-lg font-medium">وني<span className="text-white/40">/ Developer Portal</span></span>
          </Link>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">حساب جديد</h1>
          <p className="text-white/50 text-center text-sm mb-6">50 رسالة مجاناً — بدون كارت بنكي</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1.5">الاسم (اختياري)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ahmed Developer"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">الإيميل</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@example.com"
                dir="ltr"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  dir="ltr"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#25D366] text-black font-semibold hover:bg-[#1ea855] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> جاري التسجيل...</> : <><>سجّل</><ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-white/50 text-sm">
              عندك حساب؟{" "}
              <Link href="/developers/signin" className="text-[#25D366] hover:underline">دخول</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
