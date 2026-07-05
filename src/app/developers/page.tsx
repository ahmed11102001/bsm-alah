"use client";

import Link from "next/link";
import { ArrowRight, Terminal, Zap, Shield, BarChart2 } from "lucide-react";
import HeroAnimation from "./_components/HeroAnimation";
import { LanguageProvider, useLanguage } from "./_components/LanguageProvider";

const TYPE_STYLE: Record<string, string> = {
  comment: "text-white/25 italic",
  code: "text-white/70",
  key: "text-[#25D366]",
  blank: "",
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function DevelopersLandingPage() {
  return (
    <LanguageProvider>
      <PageContent />
    </LanguageProvider>
  );
}

function PageContent() {
  const { language, toggleLanguage, t } = useLanguage();

  // ─── Code snippet displayed in the terminal block ───────────────────────────
  const LINES = [
    { text: t("// 1. Send OTP", "// ١. أرسل OTP"), type: "comment" },
    { text: 'await fetch("/api/v1/otp/send", {', type: "code" },
    { text: '  headers: { "x-api-key": "wani_live_••••" },', type: "key" },
    { text: '  body: JSON.stringify({ phone: "+201234567890" })', type: "code" },
    { text: "});", type: "code" },
    { text: "", type: "blank" },
    { text: t("// 2. Verify OTP - that's it", "// ٢. تحقق من الكود — وخلاص"), type: "comment" },
    { text: 'await fetch("/api/v1/otp/verify", { ... });', type: "code" },
  ];

  // ─── 3 focused features — not 6 scattered ones ──────────────────────────────
  const FEATURES = [
    {
      icon: Zap,
      title: t("Two Lines, Done", "سطرين وخلاص"),
      body: t("One POST sends the code. One POST verifies it. No SDK or complex configuration required.", "POST واحد يرسل الكود. POST واحد يتحقق منه. مفيش SDK أو config معقد.")
    },
    {
      icon: Shield,
      title: t("Built-in Protection", "حماية مدمجة"),
      body: t("Automatic rate limiting: 5 messages/number/hour. Without writing an extra line of code.", "Rate limiting تلقائي: 5 رسائل/رقم/ساعة. بدون ما تكتب سطر كود إضافي."),
    },
    {
      icon: BarChart2,
      title: t("Live Dashboard", "داشبورد حي"),
      body: t("Monitor delivery, verification, failure, and average response times in real time.", "تتابع الإرسال والتحقق والفشل ومتوسط الاستجابة في الوقت الفعلي."),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#f0f0f0",
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        direction: language === 'ar' ? "rtl" : "ltr",
      }}
    >
      <HeroAnimation />

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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img src="/favicon.svg" alt="Wani API" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "-0.3px" }}>
            Wani <span style={{ color: "#25D366" }}>API</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link
            href="/developers/signin"
            className="nav-link-secondary"
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.5)",
              textDecoration: "none",
              borderRadius: "8px",
              transition: "color 0.15s",
            }}
          >
            {t('Sign In', 'تسجيل دخول')}
          </Link>
          <Link
            href="/developers/signup"
            className="nav-link-primary"
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
            {t('Start for Free', 'ابدأ مجاناً')}
            <ArrowRight size={13} />
          </Link>
          <button onClick={toggleLanguage} style={{ padding: "6px 10px", fontSize: "12px", background: "#333", color: "#fff", borderRadius: "6px", border: "none", cursor: "pointer" }}>
            {language === 'ar' ? 'EN' : 'AR'}
          </button>
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
          {t('Verify your customers', 'تحقق من عملائك')}
          <br />
          <span style={{ color: "#25D366" }}>{t('via WhatsApp', 'عبر واتساب')}</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}> {t('— in two lines', '— في سطرين')}</span>
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
          {t('Lightweight API that sends OTP via WhatsApp and verifies it. No SMS, no hassle — just the app with 98% open rate.', 'API خفيف يرسل OTP على واتساب المستخدم ويتحقق منه. بدون SMS، بدون تعقيد — فقط الـ app اللي عنده 98% open rate.')}
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
            {t('Start for Free — 14 day trial', 'ابدأ مجاناً — 14 يوم تجربة')}
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
            {t('View Docs', 'شوف الـ Docs')}
          </Link>
        </div>

        {/* Micro-stats */}
        <div
          className="hero-stats"
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
            { n: "98%", l: t("open rate", "معدل فتح") },
            { n: t("< 3s", "< ٣ث"), l: t("avg delivery", "وصول متوسط") },
            { n: "50", l: t("free messages", "رسالة مجانية") },
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
          <div className="terminal-body" style={{ padding: "20px 20px 24px", direction: "ltr", overflowX: "auto" }}>
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
          {language === 'ar' ? 'ليه Wani OTP؟' : 'Why Wani OTP?'}
        </p>

        <div className="features-grid">
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

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: "820px", margin: "0 auto", padding: "0 24px 96px" }}>
        {/* label */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", background: "rgba(37,211,102,0.07)", border: "1px solid rgba(37,211,102,0.15)", marginBottom: "16px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#25D366", display: "inline-block" }} />
            <span style={{ fontSize: "11px", fontFamily: "'JetBrains Mono',monospace", color: "#25D366", letterSpacing: "0.08em" }}>pricing</span>
          </div>
          <h2 style={{ fontSize: "30px", fontWeight: 800, letterSpacing: "-0.8px", marginBottom: "10px" }}>{language === 'ar' ? 'سعر واضح، بدون مفاجآت' : 'Clear pricing, no surprises'}</h2>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.35)" }}>{language === 'ar' ? 'ابدأ مجاناً وانتقل للخطة المدفوعة وأنت مرتاح' : 'Start for free, upgrade when you are ready'}</p>
        </div>

        {/* cards */}
        <div className="pricing-grid">

          {/* Trial */}
          <div className="pricing-card" style={{ borderRadius: "20px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", position: "relative", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "11px", fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: "20px" }}>TRIAL</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "6px" }}>
              <span style={{ fontSize: "40px", fontWeight: 800, letterSpacing: "-1.5px" }}>0</span>
              <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{language === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>

            {/* Trial counters */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <div style={{ flex: 1, padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
                <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>14</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{language === 'ar' ? 'يوم' : 'Days'}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>{language === 'ar' ? 'أو' : 'OR'}</div>
              <div style={{ flex: 1, padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
                <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>50</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{language === 'ar' ? 'رسالة' : 'Messages'}</div>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginBottom: "24px", lineHeight: 1.6 }}>{language === 'ar' ? 'اللي ينتهي الأول يوقف الـ trial — وقت كافي تبني وتتأكد' : 'Whichever ends first stops the trial — enough time to build and verify'}</p>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px", flex: 1 }}>
              {[
                { t: language === 'ar' ? "API Key واحد" : "1 API Key", s: language === 'ar' ? "للمشروع التجريبي" : "for the trial project" },
                { t: language === 'ar' ? "كل الـ Endpoints" : "All Endpoints", s: "send · verify · status" },
                { t: language === 'ar' ? "Dashboard كامل" : "Full Dashboard", s: language === 'ar' ? "سجلات، إحصائيات" : "logs, stats" },
                { t: language === 'ar' ? "بدون كارت بنكي" : "No credit card", s: language === 'ar' ? "بدون أي التزام" : "no commitments" },
              ].map(({ t, s }) => (
                <div key={t} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ color: "#25D366", marginTop: "1px", flexShrink: 0, fontSize: "14px" }}>✓</span>
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{t} <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>— {s}</span></span>
                </div>
              ))}
            </div>

            <a href="/developers/signup" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "12px 0", borderRadius: "11px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: "13px", fontWeight: 600, textDecoration: "none", transition: "all .2s" }}>
              {language === 'ar' ? 'ابدأ مجاناً' : 'Start for free'}
            </a>
          </div>

          {/* Owner Plan */}
          <div className="pricing-card" style={{ borderRadius: "20px", border: "1.5px solid rgba(37,211,102,0.3)", background: "linear-gradient(145deg, rgba(37,211,102,0.06) 0%, rgba(0,0,0,0) 60%)", position: "relative", display: "flex", flexDirection: "column" }}>
            {/* Popular badge */}
            <div style={{ position: "absolute", top: "20px", left: language === 'ar' ? "20px" : "auto", right: language === 'ar' ? "auto" : "20px", padding: "3px 10px", borderRadius: "20px", background: "#25D366", color: "#000", fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em" }}>{language === 'ar' ? 'الأكثر طلباً' : 'Most Popular'}</div>

            <div style={{ fontSize: "11px", fontFamily: "'JetBrains Mono',monospace", color: "#25D366", letterSpacing: "0.08em", marginBottom: "20px" }}>OWNER PLAN</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "6px" }}>
              <span style={{ fontSize: "40px", fontWeight: 800, letterSpacing: "-1.5px" }}>249</span>
              <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{language === 'ar' ? 'ج.م / شهر / للمشروع' : 'EGP / month / project'}</span>
            </div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginBottom: "28px", lineHeight: 1.5 }}>{language === 'ar' ? 'لأصحاب المشاريع — كل ما تحتاجه للإنتاج بلا حدود' : 'For project owners — everything you need for production without limits'}</p>

            <div style={{ borderTop: "1px solid rgba(37,211,102,0.1)", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px", flex: 1 }}>
              {[
                { t: language === 'ar' ? "رسائل OTP غير محدودة*" : "Unlimited OTP*", s: language === 'ar' ? "حسب باقة الواتساب" : "based on WhatsApp plan" },
                { t: language === 'ar' ? "ربط Meta مخصص" : "Custom Meta connection", s: language === 'ar' ? "رقم WhatsApp Business خاص" : "custom WhatsApp Business number" },
                { t: language === 'ar' ? "قوالب OTP مخصصة" : "Custom OTP templates", s: language === 'ar' ? "موافقة Meta مدمجة" : "integrated Meta approval" },
                { t: language === 'ar' ? "API Key منفصل" : "Dedicated API Key", s: "Production ready" },
                { t: language === 'ar' ? "سجلات وإحصائيات" : "Logs & Analytics", s: language === 'ar' ? "داشبورد تفاعلي" : "interactive dashboard" },
                { t: language === 'ar' ? "دعم فني" : "Technical Support", s: language === 'ar' ? "أولوية في الرد" : "priority support" },
              ].map(({ t, s }) => (
                <div key={t} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ color: "#25D366", marginTop: "1px", flexShrink: 0, fontSize: "14px" }}>✓</span>
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)" }}>{t} <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>— {s}</span></span>
                </div>
              ))}
            </div>

            <a href="/developers/signup" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "13px 0", borderRadius: "11px", background: "#25D366", color: "#000", fontSize: "14px", fontWeight: 700, textDecoration: "none" }}>
              {language === 'ar' ? 'اشترك دلوقتي' : 'Subscribe Now'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </a>
          </div>
        </div>

        {/* footnote */}
        <p style={{ textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "20px", lineHeight: 1.6 }}>
          * {language === 'ar' ? 'عدد الرسائل مرتبط بباقة Meta Business الخاصة بيك — وني مش بيحدد الرسائل من جانبه' : 'Message limits are tied to your Meta Business plan — Wani does not limit messages.'}
        </p>
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
            {language === 'ar' ? 'جاهز تبدأ؟' : 'Ready to start?'}
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "24px",
            }}
          >
            {language === 'ar' ? '14 يوم مجاناً أو 50 رسالة — اللي ينتهي الأول' : '14 days free or 50 messages — whichever ends first'}
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
            {language === 'ar' ? 'سجّل حساب مجاناً' : 'Create a free account'}
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
            {language === 'ar' ? 'Docs' : 'Docs'}
          </Link>
          <Link
            href="/developers/signin"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {language === 'ar' ? 'تسجيل دخول' : 'Sign In'}
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
        .pricing-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }
        .pricing-card {
          padding: 32px;
        }
        @media (max-width: 768px) {
          .pricing-grid {
            grid-template-columns: 1fr;
          }
          .features-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 600px) {
          nav { padding: 16px 20px !important; }
          section { padding-left: 16px !important; padding-right: 16px !important; }
          .pricing-card {
            padding: 20px !important;
          }
          footer { flex-direction: column; gap: 12px; text-align: center; }
        }
        @media (max-width: 480px) {
          .nav-link-secondary {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
          .nav-link-primary {
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
          .hero-stats {
            gap: 16px !important;
          }
          .terminal-body {
            padding: 12px 12px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}