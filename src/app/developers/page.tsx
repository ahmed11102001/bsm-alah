"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import HeroAnimation from "./_components/HeroAnimation";
import HeroCinematic from "./_components/HeroCinematic";
import { LanguageProvider, useLanguage } from "./_components/LanguageProvider";

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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#f0f0f0",
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        direction: language === "ar" ? "rtl" : "ltr",
      }}
    >
      <HeroAnimation />

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          position: "sticky",
          top: 0,
          background: "rgba(8,8,8,0.9)",
          backdropFilter: "blur(12px)",
          zIndex: 50,
        }}
      >
        {/* Brand + Nav Links */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
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
              <img
                src="/landingpage-dev.svg"
                alt="Wani API"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <span style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "-0.3px" }}>
              Wani <span style={{ color: "#25D366" }}>API</span>
            </span>
          </div>

          {/* Links moved from Bottom Bar to Top Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link
              href="/"
              className="marketers-nav-btn"
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#25D366",
                background: "rgba(37, 211, 102, 0.12)",
                border: "1px solid rgba(37, 211, 102, 0.3)",
                padding: "5px 14px",
                borderRadius: "20px",
                textDecoration: "none",
                transition: "all 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {t("Marketers", "المسوقين")}
            </Link>
            <Link
              href="/developers/docs"
              className="top-nav-link"
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.6)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              {t("Docs", "Docs")}
            </Link>
            <Link
              href="/developers/privacy"
              className="top-nav-link"
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.6)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              {t("Privacy", "الخصوصية")}
            </Link>
            <Link
              href="/developers/terms"
              className="top-nav-link"
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.6)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              {t("Terms", "الشروط")}
            </Link>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href="/developers/signin"
            className="nav-link-secondary"
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
              borderRadius: "8px",
              transition: "color 0.15s",
            }}
          >
            {t("Sign In", "تسجيل دخول")}
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
            {t("Start for Free", "ابدأ مجاناً")}
            <ArrowRight size={13} />
          </Link>
          <button
            onClick={toggleLanguage}
            style={{
              padding: "6px 10px",
              fontSize: "12px",
              background: "#333",
              color: "#fff",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            {language === "ar" ? "EN" : "AR"}
          </button>
        </div>
      </nav>

      {/* ── HERO / CINEMATIC FEED — الفيديو التفاعلي ── */}
      <HeroCinematic />

      {/* ── GLOBAL STYLES ───────────────────────────────────────────────── */}
      <style>{`
        .top-nav-link:hover {
          color: #ffffff !important;
        }
        .marketers-nav-btn:hover {
          background: rgba(37, 211, 102, 0.25) !important;
          border-color: rgba(37, 211, 102, 0.6) !important;
          box-shadow: 0 0 14px rgba(37, 211, 102, 0.35);
          color: #25D366 !important;
        }
        @media (max-width: 600px) {
          nav { padding: 12px 16px !important; flex-wrap: wrap; gap: 12px; }
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
        }
      `}</style>
    </div>
  );
}