"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// ── Tokens ────────────────────────────────────────────────────────────────────
const G = "#25D366";
const C = {
  bg:      "#08090c",
  surface: "#0e1117",
  card:    "#12151e",
  border:  "#1e2333",
  green:   G,
  cyan:    "#00d4ff",
  amber:   "#f59e0b",
  text:    "#e8eaf0",
  muted:   "#6b7280",
  faint:   "#1f2937",
};

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = to / 40;
      const t = setInterval(() => {
        start += step;
        if (start >= to) { setVal(to); clearInterval(t); }
        else setVal(Math.floor(start));
      }, 30);
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ── Code snippet ──────────────────────────────────────────────────────────────
const SNIPPET = `// إرسال OTP بسطر واحد
const res = await fetch("https://wani.app/api/v1/otp/send", {
  method: "POST",
  headers: { "Authorization": "Bearer wani_live_••••" },
  body: JSON.stringify({ phone: "+201234567890" })
});

const { token } = await res.json();
// ✓ الكود وصل على واتساب في ثوانٍ`;

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DevelopersLanding() {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleStart = () => {
    if (session) router.push("/dashboard");
    else router.push("/auth/signin?callbackUrl=/dashboard");
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
        color: C.text,
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: ${G}30; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }

        @keyframes fadeUp   { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
        @keyframes glow     { 0%,100%{box-shadow:0 0 20px ${G}20} 50%{box-shadow:0 0 40px ${G}40} }
        @keyframes ticker   { from{transform:translateX(0)} to{transform:translateX(-50%)} }

        .fade-up   { opacity: 0; }
        .fade-up.in { animation: fadeUp .6s cubic-bezier(.16,1,.3,1) forwards; }

        .cta-btn {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 14px 32px; border-radius: 10px;
          background: ${G}; color: #000; font-weight: 700;
          font-size: 15px; font-family: inherit; cursor: pointer;
          border: none; transition: transform .15s, box-shadow .15s;
          text-decoration: none;
        }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px ${G}40; }

        .ghost-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px; border-radius: 10px;
          background: transparent; color: ${C.text}; font-weight: 600;
          font-size: 14px; font-family: inherit; cursor: pointer;
          border: 1px solid ${C.border}; transition: border-color .15s, background .15s;
          text-decoration: none;
        }
        .ghost-btn:hover { border-color: ${C.muted}; background: ${C.faint}; }

        .feature-card {
          background: ${C.card}; border: 1px solid ${C.border};
          border-radius: 16px; padding: 24px;
          transition: border-color .2s, transform .2s;
        }
        .feature-card:hover { border-color: ${G}30; transform: translateY(-3px); }

        .step-line::after {
          content: ''; position: absolute;
          top: 20px; right: -50%;
          width: 100%; height: 1px;
          background: linear-gradient(90deg, ${C.border}, transparent);
        }
      `}</style>

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: `${C.bg}ee`, backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8,
                background: G, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, color: "#000" }}>W</div>
              <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>وني</span>
            </Link>
            <span style={{ color: C.border, fontSize: 18, fontWeight: 200 }}>|</span>
            <span style={{ color: C.muted, fontSize: 12 }}>Developers</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/" style={{ color: C.muted, fontSize: 12, textDecoration: "none",
              transition: "color .15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = C.text)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
              العودة للرئيسية
            </Link>
            <button onClick={handleStart} className="cta-btn"
              style={{ padding: "8px 20px", fontSize: 12 }}>
              ابدأ مجاناً ←
            </button>
          </div>
        </div>
      </nav>

      {/* ── Ticker ────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 56, background: `${G}10`, borderBottom: `1px solid ${G}20`,
        overflow: "hidden", height: 32, display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 0, animation: "ticker 20s linear infinite", whiteSpace: "nowrap" }}>
          {Array(2).fill([
            "✓ WhatsApp OTP API", "• بدون تعقيد", "• 50 رسالة مجاناً",
            "• Meta Verified", "• أرسل في ثوانٍ", "• REST API بسيط",
            "• تحقق آمن", "• دعم فوري"
          ].join("   ")).flat().join("   ").split("").map((c, i) => c).join("")}
          {["✓ WhatsApp OTP API", "• بدون تعقيد", "• 50 رسالة مجاناً",
            "• Meta Verified", "• أرسل في ثوانٍ", "• REST API بسيط",
            "• تحقق آمن", "• دعم فوري"].join("   ")}
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          {["✓ WhatsApp OTP API", "• بدون تعقيد", "• 50 رسالة مجاناً",
            "• Meta Verified", "• أرسل في ثوانٍ", "• REST API بسيط",
            "• تحقق آمن", "• دعم فوري"].join("   ")}
        </div>
        <div style={{ display: "flex", gap: 0, animation: "ticker 20s linear infinite", whiteSpace: "nowrap" }}>
          &nbsp;&nbsp;&nbsp;
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section style={{ padding: "80px 0 60px", textAlign: "center" }}>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: `${G}12`, border: `1px solid ${G}30`,
            borderRadius: 100, padding: "6px 16px", marginBottom: 28,
            animation: visible ? "fadeUp .5s ease forwards" : "none",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: G,
              animation: "pulse 2s ease infinite" }} />
            <span style={{ fontSize: 11, color: G, fontWeight: 700, letterSpacing: ".05em" }}>
              WhatsApp OTP API — BETA
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(32px, 5vw, 58px)", fontWeight: 800,
            lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.02em",
            animation: visible ? "fadeUp .6s .1s ease forwards" : "none", opacity: 0,
          }}>
            تحقق من أرقام عملائك<br />
            <span style={{ color: G }}>عبر واتساب</span>
            <span style={{ color: C.muted }}> في سطرين</span>
          </h1>

          <p style={{
            fontSize: 16, color: C.muted, maxWidth: 520, margin: "0 auto 36px",
            lineHeight: 1.8,
            animation: visible ? "fadeUp .6s .2s ease forwards" : "none", opacity: 0,
          }}>
            API بسيط يرسل كود OTP على واتساب المستخدم ويتحقق منه.
            بدون SMS، بدون تعقيد — فقط WhatsApp اللي كلهم بيستخدموه.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap",
            animation: visible ? "fadeUp .6s .3s ease forwards" : "none", opacity: 0 }}>
            <button onClick={handleStart} className="cta-btn">
              ابدأ مجاناً — 50 رسالة
            </button>
            <a href="#how" className="ghost-btn">
              كيف يعمل؟
            </a>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 40, justifyContent: "center", marginTop: 56,
            flexWrap: "wrap",
            animation: visible ? "fadeUp .6s .4s ease forwards" : "none", opacity: 0 }}>
            {[
              { n: 98, s: "%", label: "معدل التسليم" },
              { n: 3,  s: "ث", label: "متوسط الوصول" },
              { n: 50, s: "",  label: "رسالة مجانية" },
            ].map(({ n, s, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: 36, fontWeight: 800, color: G, lineHeight: 1 }}>
                  <Counter to={n} suffix={s} />
                </p>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Code Preview ──────────────────────────────────────────────── */}
        <section style={{ marginBottom: 80 }}>
          <div style={{
            background: "#0a0c10", border: `1px solid ${C.border}`,
            borderRadius: 16, overflow: "hidden",
            boxShadow: `0 0 60px ${G}10`,
            animation: "glow 4s ease infinite",
          }}>
            {/* Window bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "12px 18px",
              borderBottom: `1px solid ${C.border}`, background: C.card }}>
              {["#ef4444","#f59e0b","#25D366"].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
              <span style={{ fontSize: 11, color: C.muted, marginRight: 8, flex: 1, textAlign: "center" }}>
                otp-send.js
              </span>
              <button
                onClick={() => { navigator.clipboard.writeText(SNIPPET); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 5,
                  padding: "3px 10px", cursor: "pointer", fontSize: 10,
                  color: copied ? G : C.muted, fontFamily: "inherit", transition: "color .15s" }}>
                {copied ? "✓ تم" : "نسخ"}
              </button>
            </div>
            {/* Code */}
            <pre style={{ padding: "20px 24px", fontSize: 13, lineHeight: 2, overflowX: "auto",
              margin: 0, color: C.text }}>
              {SNIPPET.split("\n").map((line, i) => {
                const isComment   = line.trim().startsWith("//");
                const isKey       = line.includes("Authorization") || line.includes("Bearer");
                const isSuccess   = line.includes("✓");
                const isMethod    = line.includes("POST") || line.includes("fetch") || line.includes("await");
                return (
                  <span key={i} style={{ display: "block" }}>
                    <span style={{ color: C.faint, fontSize: 10, userSelect: "none", marginLeft: 12 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {"  "}
                    <span style={{
                      color: isComment ? "#4b6070" : isSuccess ? G : isKey ? C.amber : isMethod ? C.cyan : C.text
                    }}>
                      {line}
                    </span>
                  </span>
                );
              })}
            </pre>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 40,
            letterSpacing: "-0.01em" }}>
            ليه Wani OTP؟
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {[
              { icon: "⚡", title: "سطرين وخلاص", desc: "POST واحد يرسل الكود. POST واحد يتحقق منه. مفيش SDK أو config معقد." },
              { icon: "🔐", title: "Wani يولد الكود", desc: "مش محتاج Redis أو DB للكودات. Wani بيتولى التوليد والحفظ والانتهاء تلقائياً." },
              { icon: "📱", title: "واتساب فقط", desc: "معدل قراءة 98% مقارنة بـ 20% للـ SMS. المستخدم شايف الرسالة على الـ app اللي بيفتحه ألف مرة في اليوم." },
              { icon: "🛡", title: "Rate limiting مدمج", desc: "5 رسائل/رقم/ساعة تلقائياً. حماية من الـ abuse من غير ما تكتب سطر كود." },
              { icon: "🔑", title: "تحكم كامل", desc: "تقدر تولد الكود أنت وتبعته لـ Wani يرسله. مناسب لو عندك منطق خاص في السيرفر." },
              { icon: "📊", title: "Dashboard كامل", desc: "تتابع الإرسال، التحقق، الفشل، ومتوسط وقت الاستجابة في لحظتها." },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: C.text }}>{f.title}</h3>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.8 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section id="how" style={{ marginBottom: 80, textAlign: "center" }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.01em" }}>
            اشتغل خلال 5 دقايق
          </h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 48 }}>
            من التسجيل لأول رسالة OTP في 4 خطوات
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 2 }}>
            {[
              { n: "01", title: "سجّل حسابك", desc: "مجاناً — بدون كارت بنكي", color: G },
              { n: "02", title: "اربط Meta", desc: "حساب WhatsApp Business موجود عندك", color: C.cyan },
              { n: "03", title: "فعّل القالب", desc: "قالب OTP جاهز من Meta", color: C.amber },
              { n: "04", title: "API Key وابدأ", desc: "مفتاح واحد، REST API بسيط", color: "#8b5cf6" },
            ].map((s, i) => (
              <div key={s.n} style={{ position: "relative", padding: "0 16px" }}>
                {i < 3 && (
                  <div style={{ position: "absolute", top: 20, left: 0, right: "-50%",
                    height: 1, background: `linear-gradient(90deg, ${C.border}, transparent)`,
                    display: "block" }} />
                )}
                <div style={{ width: 40, height: 40, borderRadius: 12,
                  background: `${s.color}15`, border: `1px solid ${s.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px", fontSize: 13, fontWeight: 800, color: s.color }}>
                  {s.n}
                </div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.title}</h4>
                <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 40,
            letterSpacing: "-0.01em" }}>
            سعر واضح، بدون مفاجآت
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 640, margin: "0 auto" }}>
            {/* Free */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 20, padding: 28 }}>
              <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 12, letterSpacing: ".08em" }}>
                STARTER
              </p>
              <p style={{ fontSize: 36, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                $0<span style={{ fontSize: 14, color: C.muted, fontWeight: 400 }}>/شهر</span>
              </p>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 20, lineHeight: 1.7 }}>
                جرب قبل ما تقرر
              </p>
              {["50 رسالة OTP", "API Key واحد", "Developer Dashboard", "دعم المجتمع"].map(f => (
                <p key={f} style={{ fontSize: 12, color: C.muted, marginBottom: 8, display: "flex", gap: 8 }}>
                  <span style={{ color: G }}>✓</span> {f}
                </p>
              ))}
              <button onClick={handleStart} className="ghost-btn"
                style={{ width: "100%", justifyContent: "center", marginTop: 20 }}>
                ابدأ مجاناً
              </button>
            </div>

            {/* Pro */}
            <div style={{ background: `${G}0a`, border: `1px solid ${G}40`,
              borderRadius: 20, padding: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 14, left: 14,
                background: G, borderRadius: 100, padding: "3px 10px",
                fontSize: 10, fontWeight: 700, color: "#000" }}>
                الأكثر طلباً
              </div>
              <p style={{ fontSize: 11, color: G, fontWeight: 700, marginBottom: 12, letterSpacing: ".08em" }}>
                PRO
              </p>
              <p style={{ fontSize: 36, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                $300<span style={{ fontSize: 14, color: C.muted, fontWeight: 400 }}>/شهر</span>
              </p>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 20, lineHeight: 1.7 }}>
                رسائل غير محدودة + تكلفة Meta مباشرة عليك
              </p>
              {["رسائل غير محدودة ✦", "API Keys متعددة", "Webhook للأحداث", "Priority Support", "Analytics متقدمة"].map(f => (
                <p key={f} style={{ fontSize: 12, color: C.text, marginBottom: 8, display: "flex", gap: 8 }}>
                  <span style={{ color: G }}>✓</span> {f}
                </p>
              ))}
              <button onClick={handleStart} className="cta-btn"
                style={{ width: "100%", justifyContent: "center", marginTop: 20 }}>
                ابدأ الآن ←
              </button>
            </div>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 16 }}>
            * تكلفة رسائل Meta محسوبة عليك مباشرة (~$0.0125 للرسالة في مصر)
          </p>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section style={{ textAlign: "center", marginBottom: 80, padding: "60px 0",
          borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>
            جاهز تبدأ؟
          </h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 32 }}>
            50 رسالة مجانية — لا كارت بنكي، لا تعقيد
          </p>
          <button onClick={handleStart} className="cta-btn" style={{ fontSize: 16, padding: "16px 40px" }}>
            ابدأ مجاناً الآن →
          </button>
        </section>

      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ textAlign: "center", padding: "24px", borderTop: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 11, color: C.muted }}>
          © 2025 Wani · <Link href="/" style={{ color: C.muted, textDecoration: "none" }}>الرئيسية</Link>
          {" · "}
          <Link href="/privacy" style={{ color: C.muted, textDecoration: "none" }}>الخصوصية</Link>
          {" · "}
          <Link href="/terms" style={{ color: C.muted, textDecoration: "none" }}>الشروط</Link>
        </p>
      </footer>
    </div>
  );
}