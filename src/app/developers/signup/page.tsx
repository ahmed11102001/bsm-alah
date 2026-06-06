// src/app/developers/signup/page.tsx
"use client";

import { useState }  from "react";
import { useRouter } from "next/navigation";
import Link          from "next/link";

const C = {
  bg: "#08090c", surface: "#0e1117", card: "#12151e",
  border: "#1e2333", green: "#25D366", text: "#e8eaf0",
  muted: "#6b7280", red: "#ef4444",
};

export default function DeveloperSignUp() {
  const router = useRouter();
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res  = await fetch("/api/developers/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }
    router.push(data.redirect);
  };

  return (
    <div dir="rtl" style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'IBM Plex Mono', monospace", color: C.text, padding: "24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input {
          width: 100%; background: ${C.surface}; color: ${C.text};
          border: 1px solid ${C.border}; border-radius: 8px;
          padding: 11px 14px; font-family: inherit; font-size: 14px;
          outline: none; transition: border-color .15s;
        }
        input:focus { border-color: ${C.green}60; }
      `}</style>

      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "36px 32px", width: "100%", maxWidth: 420,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <Link href="/developers" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: C.green,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "#000",
            }}>W</div>
            <span style={{ color: C.text, fontWeight: 700 }}>وني</span>
          </Link>
          <span style={{ color: C.muted, fontSize: 12 }}>/ Developer Portal</span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>حساب جديد</h1>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>
          50 رسالة مجاناً — بدون كارت بنكي
          {"  ·  "}
          <Link href="/developers/signin" style={{ color: C.green, textDecoration: "none" }}>
            دخول
          </Link>
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 6, fontWeight: 600 }}>
              الاسم (اختياري)
            </label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ahmed Developer"
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 6, fontWeight: 600 }}>
              الإيميل
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="dev@example.com" dir="ltr" required
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 6, fontWeight: 600 }}>
              كلمة المرور
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="8 أحرف على الأقل" dir="ltr" required minLength={8}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: C.red, background: `${C.red}10`,
              border: `1px solid ${C.red}30`, borderRadius: 8, padding: "8px 12px" }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "12px", borderRadius: 10, marginTop: 4,
            background: loading ? C.surface : C.green,
            border: `1px solid ${loading ? C.border : C.green}`,
            color: loading ? C.muted : "#000",
            fontWeight: 700, fontSize: 14, cursor: loading ? "wait" : "pointer",
            fontFamily: "inherit", transition: "all .2s",
          }}>
            {loading ? "جاري الإنشاء..." : "إنشاء الحساب ←"}
          </button>

          <p style={{ fontSize: 10, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
            بالتسجيل أنت توافق على{" "}
            <Link href="/terms" style={{ color: C.muted }}>الشروط والأحكام</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
