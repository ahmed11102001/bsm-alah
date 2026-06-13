
"use client";

import Link from "next/link";
import { ArrowRight, Terminal, Zap, Shield, BarChart2 } from "lucide-react";

// ─── Code snippet displayed in the terminal block ───────────────────────────
const LINES = [
  { text: "// ١. أرسل OTP", type: "comment" },
  { text: 'await fetch("/api/v1/otp/send", {', type: "code" },
  { text: '  headers: { "x-api-key": "wani_live_••••" },', type: "key" },
  { text: '  body: JSON.stringify({ phone: "+201234567890" })', type: "code" },
  { text: "});", type: "code" },
  { text: "", type: "blank" },
  { text: "// ٢. تحقق من الكود — وخلاص", type: "comment" },
  { text: 'await fetch("/api/v1/otp/verify", { ... });', type: "code" },
];

const TYPE_STYLE: Record<string, string> = {
  comment: "text-white/25 italic",
  code: "text-white/70",
  key: "text-[#25D366]",
  blank: "",
};

// ─── 3 focused features — not 6 scattered ones ──────────────────────────────
const FEATURES = [
  {
    icon: Zap,
     title: "سطرين وخلاص",
      body: "POST واحد يرسل الكود. POST واحد يتحقق منه. مفيش SDK أو config معقد." },
  {
    icon: Shield,
    title: "حماية مدمجة",
    body: "Rate limiting تلقائي: 5 رسائل/رقم/ساعة. بدون ما تكتب سطر كود إضافي.",
  },
  {
    icon: BarChart2,
    title: "داشبورد حي",
    body: "تتابع الإرسال والتحقق والفشل ومتوسط الاستجابة في الوقت الفعلي.",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function DevelopersLandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#f0f0f0",
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        direction: "rtl",
      }}
    >
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          position: "sticky",
          top: 0,
          background: "rgba(8,8,8,0.9)",
          backdropFilter: "blur(12px)",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "#25D366",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Terminal size={14} color="#000" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "-0.3px" }}>
            Wani <span style={{ color: "#25D366" }}>API</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link
            href="/developers/signin"
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.5)",
              textDecoration: "none",
              borderRadius: "8px",
              transition: "color 0.15s",
            }}
          >
            تسجيل دخول
          </Link>
          <Link
            href="/developers/signup"
            style={{
              padding: "8px 18px",
              fontSize: "13px",
              background: "#25D366",
              color: "#000",
              fontWeight: 600,
              borderRadius: "8px",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ابدأ مجاناً
            <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          padding: "80px 24px 64px",
          textAlign: "center",
        }}
      >
        {/* Pill badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "100px",
            border: "1px solid rgba(37,211,102,0.25)",
            background: "rgba(37,211,102,0.06)",
            fontSize: "12px",
            color: "#25D366",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            marginBottom: "28px",
            letterSpacing: "0.02em",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#25D366",
              boxShadow: "0 0 6px #25D366",
              animation: "pulse 2s infinite",
            }}
          />
          WhatsApp OTP API · BETA
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-1.2px",
            marginBottom: "16px",
            color: "#f0f0f0",
          }}
        >
          تحقق من عملائك
          <br />
          <span style={{ color: "#25D366" }}>عبر واتساب</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}> — في سطرين</span>
        </h1>

        {/* Sub */}
        <p
          style={{
            fontSize: "15px",
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.4)",
            maxWidth: "460px",
            margin: "0 auto 36px",
          }}
        >
          API خفيف يرسل OTP على واتساب المستخدم ويتحقق منه. بدون SMS، بدون
          تعقيد — فقط الـ app اللي عنده 98% open rate.
        </p>

        {/* CTAs */}
        <div
          style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}
        >
          <Link
            href="/developers/signup"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "12px 24px",
              background: "#25D366",
              color: "#000",
              fontWeight: 700,
              fontSize: "14px",
              borderRadius: "10px",
              textDecoration: "none",
              letterSpacing: "-0.2px",
            }}
          >
            ابدأ مجاناً — 50 رسالة
            <ArrowRight size={15} />
          </Link>
          <Link
            href="/developers/portal/quick-start"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "12px 24px",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
              fontWeight: 500,
              fontSize: "14px",
              borderRadius: "10px",
              textDecoration: "none",
              background: "transparent",
            }}
          >
            شوف الـ Docs
          </Link>
        </div>

        {/* Micro-stats */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            justifyContent: "center",
            marginTop: "48px",
            paddingTop: "32px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {[
            { n: "98%", l: "open rate" },
            { n: "< 3ث", l: "وصول متوسط" },
            { n: "50", l: "رسالة مجانية" },
          ].map(({ n, l }) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "#f0f0f0",
                  letterSpacing: "-0.5px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {n}
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
                {l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TERMINAL CODE BLOCK ─────────────────────────────────────────── */}
      <section style={{ maxWidth: "600px", margin: "0 auto", padding: "0 24px 72px" }}>
        <div
          style={{
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "#0d0d0d",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(37,211,102,0.04)",
          }}
        >
          {/* Window chrome */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "12px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
              <div
                key={c}
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: c,
                  opacity: 0.7,
                }}
              />
            ))}
            <span
              style={{
                marginRight: "8px",
                fontSize: "11px",
                color: "rgba(255,255,255,0.2)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              otp.js
            </span>
          </div>

          {/* Code */}
          <div style={{ padding: "20px 20px 24px", direction: "ltr" }}>
            {LINES.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "16px",
                  lineHeight: "1.7",
                  minHeight: "24px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.12)",
                    fontFamily: "'JetBrains Mono', monospace",
                    userSelect: "none",
                    minWidth: "16px",
                    textAlign: "right",
                    paddingTop: "1px",
                  }}
                >
                  {line.type !== "blank" ? i + 1 : ""}
                </span>
                <code
                  style={{
                    fontSize: "12.5px",
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    letterSpacing: "0.01em",
                  }}
                  className={TYPE_STYLE[line.type]}
                >
                  {line.text || "\u00A0"}
                </code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: "680px", margin: "0 auto", padding: "0 24px 80px" }}>
        {/* Section label */}
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.2)",
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          ليه Wani OTP؟
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              style={{
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.02)",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor =
                  "rgba(37,211,102,0.2)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor =
                  "rgba(255,255,255,0.07)")
              }
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(37,211,102,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                }}
              >
                <Icon size={15} color="#25D366" />
              </div>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  marginBottom: "6px",
                  color: "#f0f0f0",
                  letterSpacing: "-0.2px",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  lineHeight: 1.65,
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA STRIP ───────────────────────────────────────────────────── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "40px 40px",
            borderRadius: "16px",
            border: "1px solid rgba(37,211,102,0.15)",
            background:
              "linear-gradient(135deg, rgba(37,211,102,0.06) 0%, rgba(8,8,8,0) 100%)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontFamily: "'JetBrains Mono', monospace",
              color: "#25D366",
              letterSpacing: "0.08em",
              marginBottom: "12px",
              opacity: 0.7,
            }}
          >
            {">"} ready to ship?
          </div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 800,
              letterSpacing: "-0.6px",
              marginBottom: "8px",
            }}
          >
            جاهز تبدأ؟
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "24px",
            }}
          >
            50 رسالة مجانية — لا كارت بنكي، لا تعقيد
          </p>
          <Link
            href="/developers/signup"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 28px",
              background: "#25D366",
              color: "#000",
              fontWeight: 700,
              fontSize: "14px",
              borderRadius: "10px",
              textDecoration: "none",
              letterSpacing: "-0.2px",
            }}
          >
            سجّل حساب مجاناً
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "rgba(255,255,255,0.2)",
        }}
      >
        <span>Wani API — WhatsApp OTP</span>
        <div style={{ display: "flex", gap: "20px" }}>
          <Link
            href="/developers/portal/quick-start"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Docs
          </Link>
          <Link
            href="/developers/signin"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            تسجيل دخول
          </Link>
        </div>
      </footer>

      {/* ── GLOBAL STYLES ───────────────────────────────────────────────── */}
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @media (max-width: 600px) {
          nav { padding: 16px 20px !important; }
          section { padding-left: 16px !important; padding-right: 16px !important; }
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
          footer { flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>
    </div>
  );
}