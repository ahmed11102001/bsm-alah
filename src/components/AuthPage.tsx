"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginModal from "@/components/LoginModal";

type AuthPageProps = { initialView?: "login" | "register" | "join" };

const STR = {
  ar: {
    brandSub: "منصة واتساب للأعمال",
    headlineA: "كل محادثات واتساب",
    headlineB: "في مكان واحد",
    sub: "رد آلي ذكي، فريق متكامل، وحملات واتساب — كل اللي محتاجه عشان تكبّر شغلك.",
    f1: "ردود تلقائية على مدار الساعة",
    f2: "فريق بصلاحيات مرنة",
    f3: "حملات ومتابعة ذكية للعملاء",
    loginTitle: "تسجيل الدخول",
    loginDesc: "أهلاً برجوعك — ادخل على حسابك وكمّل شغلك.",
    signupTitle: "حساب جديد",
    signupDesc: "اعمل حسابك في دقائق وابدأ استقبال محادثات عملائك.",
    joinTitle: "انضمام لفريق",
    joinDesc: "معاك كود دعوة؟ فعّل حسابك وانضم لفريقك.",
    backHome: "رجوع للرئيسية",
  },
  en: {
    brandSub: "WhatsApp Business Platform",
    headlineA: "All your WhatsApp",
    headlineB: "in one place",
    sub: "Smart auto-replies, a full team workspace, and WhatsApp campaigns — everything you need to grow.",
    f1: "24/7 automatic replies",
    f2: "Team with flexible roles",
    f3: "Campaigns & smart customer follow-up",
    loginTitle: "Sign in",
    loginDesc: "Welcome back — sign in and pick up where you left off.",
    signupTitle: "Create account",
    signupDesc: "Create your account in minutes and start receiving customer chats.",
    joinTitle: "Join a team",
    joinDesc: "Got an invite code? Activate your account and join your team.",
    backHome: "Back to home",
  },
} as const;

function AuthPageContent({ initialView = "login" }: AuthPageProps) {
  const params = useSearchParams();
  const router = useRouter();
  const lang = params.get("lang") === "en" ? "en" : "ar";
  const callbackUrl = params.get("callbackUrl") || undefined;
  const mode = params.get("mode");
  const selectedView = mode === "signup" ? "register" : mode === "join" ? "join" : initialView;
  const t = STR[lang];
  const isAr = lang === "ar";

  useEffect(() => {
    try {
      document.documentElement.dir = isAr ? "rtl" : "ltr";
      document.documentElement.lang = lang;
    } catch {}
  }, [isAr, lang]);

  const switchLang = () => {
    try {
      const next = new URLSearchParams(window.location.search);
      next.set("lang", isAr ? "en" : "ar");
      router.replace(`/auth?${next.toString()}`, { scroll: false });
    } catch {}
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');

        .dash-auth-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          background: linear-gradient(160deg, #04241b 0%, #064e3b 55%, #053c2d 100%);
          position: relative;
          overflow: hidden;
        }
        .dash-auth-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(37,211,102,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,211,102,0.05) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(ellipse 90% 70% at 50% 0%, black 20%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 90% 70% at 50% 0%, black 20%, transparent 100%);
          pointer-events: none;
        }
        .dash-auth-blob {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .dash-auth-blob-1 {
          width: 520px; height: 520px;
          background: radial-gradient(circle, rgba(37,211,102,0.14) 0%, transparent 70%);
          top: -200px; ${isAr ? "left" : "right"}: -100px;
        }
        .dash-auth-blob-2 {
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(18,140,126,0.16) 0%, transparent 70%);
          bottom: -120px; ${isAr ? "right" : "left"}: -100px;
        }

        /* ── Brand panel (portal-style) ── */
        .dash-auth-brand {
          width: 440px;
          flex-shrink: 0;
          padding: 56px 48px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border-${isAr ? "left" : "right"}: 1px solid rgba(255,255,255,0.08);
          position: relative;
          z-index: 1;
        }
        .dash-auth-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 54px; }
        .dash-auth-logo-badge {
          width: 46px; height: 46px; border-radius: 14px;
          background: #25D366;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
          box-shadow: 0 8px 24px rgba(37,211,102,0.35);
        }
        .dash-auth-logo-name { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: 1px; }
        .dash-auth-logo-sub { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; }
        .dash-auth-headline { font-size: 34px; font-weight: 700; line-height: 1.35; color: #fff; margin: 0 0 14px; }
        .dash-auth-headline span { color: #25D366; }
        .dash-auth-sub { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.8; margin: 0 0 38px; }
        .dash-auth-features { display: flex; flex-direction: column; gap: 14px; margin: 0; padding: 0; list-style: none; }
        .dash-auth-features li { display: flex; align-items: center; gap: 12px; font-size: 14px; color: rgba(255,255,255,0.75); }
        .dash-auth-dot { width: 7px; height: 7px; border-radius: 50%; background: #25D366; flex-shrink: 0; box-shadow: 0 0 10px rgba(37,211,102,0.8); }

        /* ── Form panel ── */
        .dash-auth-form-panel {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 44px 24px;
          position: relative;
          z-index: 1;
          overflow-y: auto;
        }
        .dash-auth-card {
          width: 100%;
          max-width: 440px;
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.45);
        }
        .dash-auth-back {
          margin-top: 22px;
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; color: rgba(255,255,255,0.45);
          background: none; border: none; cursor: pointer;
          transition: color 0.2s;
        }
        .dash-auth-back:hover { color: rgba(255,255,255,0.8); }

        .dash-auth-lang {
          position: absolute;
          top: 20px;
          ${isAr ? "left" : "right"}: 20px;
          z-index: 10;
          padding: 7px 14px;
          font-size: 12px; font-weight: 700;
          font-family: inherit;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 9px;
          color: rgba(255,255,255,0.65);
          cursor: pointer;
          transition: all 0.2s;
        }
        .dash-auth-lang:hover { background: rgba(255,255,255,0.14); color: #fff; }

        @media (max-width: 900px) {
          .dash-auth-root { flex-direction: column; overflow-y: auto; }
          .dash-auth-brand {
            width: 100%;
            padding: 36px 24px 24px;
            border: none;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            text-align: center;
            align-items: center;
          }
          .dash-auth-logo { margin-bottom: 22px; }
          .dash-auth-headline { font-size: 26px; }
          .dash-auth-sub { margin-bottom: 22px; font-size: 14px; }
          .dash-auth-features { max-width: 320px; margin: 0 auto; text-align: start; }
          .dash-auth-form-panel { padding: 28px 16px 40px; flex: none; width: 100%; }
        }
      `}</style>

      <main className="dash-auth-root" dir={isAr ? "rtl" : "ltr"}>
        <div className="dash-auth-blob dash-auth-blob-1" />
        <div className="dash-auth-blob dash-auth-blob-2" />

        <button type="button" className="dash-auth-lang" onClick={switchLang}>
          {isAr ? "EN" : "AR"}
        </button>

        {/* Brand panel */}
        <div className="dash-auth-brand">
          <div className="dash-auth-logo">
            <span className="dash-auth-logo-badge">
              <img src="/faviconlink.svg" alt="Wani" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </span>
            <span>
              <span className="dash-auth-logo-name">WANI</span>
              <div className="dash-auth-logo-sub">{t.brandSub}</div>
            </span>
          </div>
          <h1 className="dash-auth-headline">
            {t.headlineA}
            <br />
            <span>{t.headlineB}</span>
          </h1>
          <p className="dash-auth-sub">{t.sub}</p>
          <ul className="dash-auth-features">
            <li><span className="dash-auth-dot" />{t.f1}</li>
            <li><span className="dash-auth-dot" />{t.f2}</li>
            <li><span className="dash-auth-dot" />{t.f3}</li>
          </ul>
        </div>

        {/* Form panel */}
        <div className="dash-auth-form-panel">
          <div className="dash-auth-card">
            <LoginModal
              isOpen
              onClose={() => { window.location.href = `/${lang}`; }}
              callbackUrl={callbackUrl}
              lang={lang}
              standalone
              initialView={selectedView}
            />
          </div>
          <button type="button" className="dash-auth-back" onClick={() => { window.location.href = `/${lang}`; }}>
            {isAr ? "→" : "←"} {t.backHome}
          </button>
        </div>
      </main>
    </>
  );
}

export default function AuthPage(props: AuthPageProps) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#064e3b]" />}>
      <AuthPageContent {...props} />
    </Suspense>
  );
}
