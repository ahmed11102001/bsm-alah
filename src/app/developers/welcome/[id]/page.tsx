"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "../../_components/LanguageProvider";
import { Check, Rocket } from "lucide-react";

// ── Particle burst animation (premium, one-shot) ──────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  angle: number;
  speed: number;
  opacity: number;
}

function CelebrationBurst({ trigger }: { trigger: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedRef = useRef(false);

  const animate = useCallback(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const cx = canvas.offsetWidth / 2;
    const cy = canvas.offsetHeight / 2;

    const colors = ["#20d378", "#38bdf8", "#ffffff", "#20d378", "#38bdf8", "#ffffff", "#20d378", "#a78bfa"];
    const particles: Particle[] = [];

    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.4;
      particles.push({
        id: i,
        x: cx,
        y: cy,
        size: 3 + Math.random() * 4,
        color: colors[i % colors.length],
        angle,
        speed: 1.8 + Math.random() * 2.5,
        opacity: 1,
      });
    }

    let frame = 0;
    const totalFrames = 90; // ~1.5s at 60fps

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      frame++;
      const progress = frame / totalFrames;

      particles.forEach((p) => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed - 0.8; // slight upward bias
        p.speed *= 0.97; // decelerate
        p.opacity = Math.max(0, 1 - progress * 1.2);
        p.size *= 0.995;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.closePath();
      });

      ctx.globalAlpha = 1;

      if (frame < totalFrames) {
        requestAnimationFrame(draw);
      }
    }

    requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    if (trigger) {
      const timer = setTimeout(animate, 400); // slight delay after mount
      return () => clearTimeout(timer);
    }
  }, [trigger, animate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 2,
      }}
    />
  );
}

// ── Main Welcome Page ──────────────────────────────────────────────────────────
export default function WelcomePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { language, t } = useLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";

  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [ready, setReady] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [developerFirstName, setDeveloperFirstName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch(`/api/developers/projects/${projectId}/welcome-info`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.alreadySeen || data.error) {
          router.replace(`/developers/portal/projects/${projectId}`);
          return;
        }

        setProjectName(data.projectName || t("Project", "المشروع"));
        setDeveloperFirstName(data.developerFirstName || null);
        setReady(true);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          router.replace(`/developers/portal/projects/${projectId}`);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId, router, t]);

  useEffect(() => {
    if (!ready) return;

    requestAnimationFrame(() => setMounted(true));
    const timer = setTimeout(() => setShowContent(true), 200);
    return () => clearTimeout(timer);
  }, [ready]);

  const developerName = developerFirstName || null;
  const displayProjectName = projectName || t("Project", "المشروع");

  if (loading) {
    return (
      <>
        <style>{welcomeStyles("rtl")}</style>
        <div className="welcome-root">
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
            {t("Loading...", "جاري التحميل...")}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{welcomeStyles(dir)}</style>

      <div className="welcome-root">
        {/* Background grid + blobs (same Wani identity) */}
        <div className="welcome-grid" />
        <div className="welcome-blob-1" />
        <div className="welcome-blob-2" />

        <div className={`welcome-card ${mounted ? "visible" : ""}`}>
          {/* Checkmark circle with particle burst */}
          <div className="check-wrapper">
            <CelebrationBurst trigger={mounted} />
            <div className={`check-circle ${showContent ? "pop" : ""}`}>
              <Check size={32} strokeWidth={3} />
            </div>
          </div>

          {/* Title */}
          <h1 className={`welcome-title ${showContent ? "fade-in" : ""}`}>
            🎉 {t("Your project has been delivered", "تم استلام مشروعك")}
          </h1>

          {/* Developer attribution */}
          <p className={`welcome-body ${showContent ? "fade-in delay-1" : ""}`}>
            {developerName ? (
              t(
                <><strong>{developerName}</strong> has set up project <strong>&quot;{displayProjectName}&quot;</strong> and delivered it to you successfully.</>,
                <>قام <strong>{developerName}</strong> بتجهيز مشروع <strong>&quot;{displayProjectName}&quot;</strong><br />وتسليمه إليك بالكامل.</>
              )
            ) : (
              t(
                <>Project <strong>&quot;{displayProjectName}&quot;</strong> has been set up and delivered to you successfully.</>,
                <>تم تجهيز مشروع <strong>&quot;{displayProjectName}&quot;</strong> وتسليمه إليك بنجاح.</>
              )
            )}
          </p>

          {/* Capabilities hint */}
          <p className={`welcome-hint ${showContent ? "fade-in delay-2" : ""}`}>
            {t(
              "You can now manage your project, connect WhatsApp, create API Keys, and send OTP messages.",
              "يمكنك الآن إدارة مشروعك، ربط واتساب، إنشاء API Keys، وإرسال رسائل OTP."
            )}
          </p>

          {/* CTA Button */}
          <button
            className={`btn-enter-portal ${showContent ? "fade-in delay-3" : ""}`}
            onClick={() => router.push(`/developers/portal/projects/${projectId}`)}
          >
            <Rocket size={18} />
            {t("Enter Project Dashboard", "دخول لوحة المشروع")}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
function welcomeStyles(dir: string) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');

    .welcome-root {
      min-height: 100vh;
      min-height: 100dvh;
      background: #060810;
      color: #fff;
      font-family: 'IBM Plex Sans Arabic', sans-serif;
      direction: ${dir};
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
      position: relative;
      overflow: hidden;
    }

    /* ── Background identity (same as signin) ── */
    .welcome-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(32,211,120,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(32,211,120,0.04) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse 80% 80% at 50% 0%, black 20%, transparent 100%);
      -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 0%, black 20%, transparent 100%);
      pointer-events: none;
    }
    .welcome-blob-1 {
      position: absolute;
      width: 500px; height: 500px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(32,211,120,0.07) 0%, transparent 70%);
      top: -180px; right: -80px;
      pointer-events: none;
    }
    .welcome-blob-2 {
      position: absolute;
      width: 350px; height: 350px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%);
      bottom: -80px; left: -80px;
      pointer-events: none;
    }

    /* ── Card ── */
    .welcome-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 480px;
      text-align: center;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .welcome-card.visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* ── Checkmark ── */
    .check-wrapper {
      position: relative;
      width: 88px;
      height: 88px;
      margin: 0 auto 32px;
    }
    .check-circle {
      position: relative;
      z-index: 3;
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: linear-gradient(135deg, #20d378 0%, #1aaf63 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 0 40px rgba(32,211,120,0.25), 0 0 80px rgba(32,211,120,0.1);
      transform: scale(0);
      transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .check-circle.pop {
      transform: scale(1);
    }

    /* ── Title ── */
    .welcome-title {
      font-size: 26px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 16px;
      line-height: 1.4;
    }

    /* ── Body text ── */
    .welcome-body {
      font-size: 16px;
      color: rgba(255,255,255,0.55);
      line-height: 1.9;
      margin-bottom: 12px;
    }
    .welcome-body strong {
      color: rgba(255,255,255,0.85);
      font-weight: 600;
    }

    /* ── Hint text ── */
    .welcome-hint {
      font-size: 13px;
      color: rgba(255,255,255,0.3);
      line-height: 1.7;
      margin-bottom: 36px;
      padding: 0 8px;
    }

    /* ── CTA Button ── */
    .btn-enter-portal {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      max-width: 320px;
      padding: 16px 32px;
      background: linear-gradient(135deg, #20d378 0%, #1aaf63 100%);
      color: #060810;
      font-size: 16px;
      font-weight: 600;
      font-family: inherit;
      border: none;
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 20px rgba(32,211,120,0.2);
    }
    .btn-enter-portal:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(32,211,120,0.3);
      background: linear-gradient(135deg, #2ae085 0%, #20d378 100%);
    }
    .btn-enter-portal:active {
      transform: translateY(0);
    }

    /* ── Fade-in animations ── */
    .fade-in {
      animation: fadeInUp 0.6s ease forwards;
    }
    .delay-1 { animation-delay: 0.15s; opacity: 0; }
    .delay-2 { animation-delay: 0.3s; opacity: 0; }
    .delay-3 { animation-delay: 0.45s; opacity: 0; }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ── Mobile ── */
    @media (max-width: 480px) {
      .welcome-root {
        padding: 32px 16px;
      }
      .welcome-title {
        font-size: 22px;
      }
      .welcome-body {
        font-size: 15px;
      }
      .check-wrapper,
      .check-circle {
        width: 72px;
        height: 72px;
      }
      .check-circle svg {
        width: 26px;
        height: 26px;
      }
      .btn-enter-portal {
        font-size: 15px;
        padding: 14px 24px;
      }
    }
  `;
}
