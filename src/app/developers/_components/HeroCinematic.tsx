"use client";

// ── HeroCinematic ─────────────────────────────────────────────────────────────
// كاميرا وهمية بتتحرك جوه "كادر" واحد ثابت (مفيش scroll للصفحة، الحركة كلها
// داخلية) — بتزوم وتتنقل بين مشاهد المحتوى الحقيقي بالظبط اللي في الصفحة
// (نفس النصوص، نفس الكود، نفس المميزات) بدل ما تبقى كتلة ثابتة.
//
// الميكانيزم: عندنا "world" (كانفاس افتراضي 3× حجم الإطار) وكل مشهد متحط في
// إحداثيات ثابتة جواه. الكاميرا بتتحرك (translate + scale) بين نقط مختلفة —
// فوق/تحت/يمين/شمال/زوم — لكن كل ده بيتقص جوه إطار واحد بـ overflow:hidden.

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Zap, Shield, BarChart2, Play, Pause } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

// ─── Camera math ──────────────────────────────────────────────────────────────
const WORLD_SCALE = 3; // الـ world أكبر من الإطار بـ 3 أضعاف في كل بُعد
const CAMERA_MS = 1100; // مدة انتقال الكاميرا بين مشهدين

interface CameraTarget { x: number; y: number; scale: number; }
type SceneId = "badge" | "headline" | "stats" | "terminal" | "f1" | "f2" | "f3" | "benefits" | "cta";

interface Scene { id: SceneId; duration: number; camera: CameraTarget; }

// إحداثيات كل مشهد كنسبة (0..1) من حجم الـ world — المسار بيرسم "جولة"
// كاملة حوالين الإطار: نزول جوه العمود النصّي → يمين (الكود) → تحت مع pan
// يمين على المميزات التلاتة → قفزة كبيرة شمال (مميزات المطورين) → فوق (CTA)
// → قطرية رجوع لأول المشهد تاني.
const SCENES: Scene[] = [
  { id: "badge",    duration: 2400, camera: { x: 0.50, y: 0.26, scale: 2.6 } },
  { id: "headline", duration: 3600, camera: { x: 0.50, y: 0.42, scale: 1.18 } },
  { id: "stats",    duration: 3000, camera: { x: 0.50, y: 0.62, scale: 1.35 } },
  { id: "terminal", duration: 5400, camera: { x: 0.83, y: 0.50, scale: 1.05 } },
  { id: "f1",       duration: 2400, camera: { x: 0.74, y: 0.85, scale: 1.55 } },
  { id: "f2",       duration: 2400, camera: { x: 0.84, y: 0.85, scale: 1.55 } },
  { id: "f3",       duration: 2600, camera: { x: 0.94, y: 0.85, scale: 1.55 } },
  { id: "benefits", duration: 5000, camera: { x: 0.17, y: 0.84, scale: 1.05 } },
  { id: "cta",      duration: 3400, camera: { x: 0.17, y: 0.15, scale: 1.35 } },
];

const TYPE_STYLE: Record<string, string> = {
  comment: "text-white/25 italic",
  code: "text-white/70",
  key: "text-[#25D366]",
  blank: "",
};

export default function HeroCinematic() {
  const { language, t } = useLanguage();
  const isAr = language === "ar";

  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  // ── قياس حجم الإطار (responsive) ──────────────────────────────────────────
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── احترام prefers-reduced-motion ─────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    if (mq.matches) setPlaying(false);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ── دورة السيناريو التلقائية ───────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      setActive((p) => (p + 1) % SCENES.length);
    }, SCENES[active].duration);
    return () => clearTimeout(timer);
  }, [active, playing]);

  const goTo = useCallback((i: number) => setActive(i), []);

  // ── تحويل الكاميرا لإحداثيات px ────────────────────────────────────────────
  function cameraTransform(target: CameraTarget): string {
    const { w, h } = stage;
    if (!w || !h) return "translate(0px,0px) scale(1)";
    const worldW = w * WORLD_SCALE;
    const worldH = h * WORLD_SCALE;
    const tx = w / 2 - target.x * worldW * target.scale;
    const ty = h / 2 - target.y * worldH * target.scale;
    return `translate(${tx}px, ${ty}px) scale(${target.scale})`;
  }

  // ─── محتوى حقيقي (نفس نصوص الصفحة بالظبط) ────────────────────────────────────
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

  const FEATURES = [
    { icon: Zap, title: t("Two Lines, Done", "سطرين وخلاص"), body: t("One POST sends the code. One POST verifies it. No SDK or complex configuration required.", "POST واحد يرسل الكود. POST واحد يتحقق منه. مفيش SDK أو config معقد.") },
    { icon: Shield, title: t("Built-in Protection", "حماية مدمجة"), body: t("Automatic rate limiting: 5 messages/number/hour. Without writing an extra line of code.", "Rate limiting تلقائي: 5 رسائل/رقم/ساعة. بدون ما تكتب سطر كود إضافي.") },
    { icon: BarChart2, title: t("Live Dashboard", "داشبورد حي"), body: t("Monitor delivery, verification, failure, and average response times in real time.", "تتابع الإرسال والتحقق والفشل ومتوسط الاستجابة في الوقت الفعلي.") },
  ];

  const BENEFITS = [
    { t: isAr ? "مشاريع غير محدودة" : "Unlimited projects", s: isAr ? "كل مشروع معزول ببياناته وإحصائياته" : "fully isolated projects" },
    { t: isAr ? "رصيد تجريبي لكل مشروع" : "Trial balance per project", s: isAr ? "عشان تبني براحتك بدون تكلفة" : "build without upfront costs" },
    { t: isAr ? "ربط Meta مخصص" : "Custom Meta connection", s: isAr ? "رقم WhatsApp Business خاص بكل مشروع" : "custom WhatsApp Business number per project" },
    { t: isAr ? "تسليم المشروع بضغطة زر" : "One-click project handover", s: isAr ? "انقل الملكية للعميل في ثواني" : "transfer ownership to clients instantly" },
    { t: isAr ? "إدارة كاملة من Dashboard وحدة" : "Manage from a single dashboard", s: isAr ? "تابع كل مشاريعك من مكان واحد" : "monitor all your projects centrally" },
  ];

  const dim = (i: number) => (active === i ? 1 : 0.08);
  const dimTransform = (i: number) => (active === i ? "scale(1)" : "scale(0.96)");

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto", padding: "32px 20px 8px" }}>
      <div
        ref={stageRef}
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          height: "clamp(460px, 64vh, 640px)",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.07)",
          background: "radial-gradient(ellipse at 50% 30%, #0d0d0d 0%, #060606 70%)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        }}
      >
        {/* ── World (canvas افتراضي 3× حجم الإطار) ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${WORLD_SCALE * 100}%`,
            height: `${WORLD_SCALE * 100}%`,
            transformOrigin: "0 0",
            transform: cameraTransform(SCENES[active].camera),
            transition: reducedMotion ? "none" : `transform ${CAMERA_MS}ms cubic-bezier(0.65,0,0.35,1)`,
          }}
        >
          {/* Scene: Badge */}
          <div style={{ position: "absolute", left: `${SCENES[0].camera.x * 100}%`, top: `${SCENES[0].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(0), transition: "opacity .6s" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "7px 16px", borderRadius: "100px", border: "1px solid rgba(37,211,102,0.25)", background: "rgba(37,211,102,0.06)", fontSize: "14px", color: "#25D366", fontFamily: "'JetBrains Mono','Fira Code',monospace", whiteSpace: "nowrap" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#25D366", boxShadow: "0 0 8px #25D366", animation: reducedMotion ? "none" : "hc-pulse 2s infinite" }} />
              WhatsApp OTP API · BETA
            </div>
          </div>

          {/* Scene: Headline */}
          <div style={{ position: "absolute", left: `${SCENES[1].camera.x * 100}%`, top: `${SCENES[1].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(1), transition: "opacity .6s", textAlign: "center", width: "min(90%, 560px)" }}>
            <h1 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, lineHeight: 1.2, letterSpacing: "-1px", color: "#f0f0f0" }}>
              {t("Verify your customers", "تحقق من عملائك")}
              <br />
              <span style={{ color: "#25D366" }}>{t("via WhatsApp", "عبر واتساب")}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}> {t("— in two lines", "— في سطرين")}</span>
            </h1>
          </div>

          {/* Scene: Subtitle + Stats */}
          <div style={{ position: "absolute", left: `${SCENES[2].camera.x * 100}%`, top: `${SCENES[2].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(2), transition: "opacity .6s", textAlign: "center", width: "min(85%, 460px)" }}>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(255,255,255,0.45)", marginBottom: "22px" }}>
              {t("Lightweight API that sends OTP via WhatsApp and verifies it. No SMS, no hassle — just the app with 98% open rate.", "API خفيف يرسل OTP على واتساب المستخدم ويتحقق منه. بدون SMS، بدون تعقيد — فقط الـ app اللي عنده 98% open rate.")}
            </p>
            <div style={{ display: "flex", gap: "28px", justifyContent: "center" }}>
              {[
                { n: "98%", l: t("open rate", "معدل فتح") },
                { n: t("< 3s", "< ٣ث"), l: t("avg delivery", "وصول متوسط") },
                { n: "50", l: t("free messages", "رسالة مجانية") },
              ].map(({ n, l }) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#f0f0f0", fontFamily: "'JetBrains Mono',monospace" }}>{n}</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scene: Terminal */}
          <div style={{ position: "absolute", left: `${SCENES[3].camera.x * 100}%`, top: `${SCENES[3].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(3), transition: "opacity .6s", width: "min(90%, 420px)" }}>
            <div style={{ borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "#0d0d0d", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
                  <div key={c} style={{ width: "8px", height: "8px", borderRadius: "50%", background: c, opacity: 0.7 }} />
                ))}
                <span style={{ marginRight: "6px", fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace" }}>otp.js</span>
              </div>
              <div style={{ padding: "16px 16px 18px", direction: "ltr" }}>
                {LINES.map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", lineHeight: 1.65, minHeight: "20px" }}>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.12)", fontFamily: "'JetBrains Mono',monospace", minWidth: "14px", textAlign: "right" }}>
                      {line.type !== "blank" ? i + 1 : ""}
                    </span>
                    <code style={{ fontSize: "11px", fontFamily: "'JetBrains Mono','Fira Code',monospace" }} className={TYPE_STYLE[line.type]}>
                      {line.text || "\u00A0"}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scenes: Features (×3 — pan يمين على كل كارت) */}
          {FEATURES.map(({ icon: Icon, title, body }, i) => {
            const sceneIdx = 4 + i;
            const cam = SCENES[sceneIdx].camera;
            return (
              <div key={title} style={{ position: "absolute", left: `${cam.x * 100}%`, top: `${cam.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(sceneIdx)}`, opacity: dim(sceneIdx), transition: "opacity .6s, transform .6s", width: "min(80%, 230px)" }}>
                <div style={{ padding: "18px", borderRadius: "12px", border: "1px solid rgba(37,211,102,0.18)", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(37,211,102,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                    <Icon size={14} color="#25D366" />
                  </div>
                  <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", marginBottom: "6px" }}>{title}</h3>
                  <p style={{ fontSize: "11.5px", lineHeight: 1.6, color: "rgba(255,255,255,0.4)" }}>{body}</p>
                </div>
              </div>
            );
          })}

          {/* Scene: Developer Benefits */}
          <div style={{ position: "absolute", left: `${SCENES[7].camera.x * 100}%`, top: `${SCENES[7].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(7), transition: "opacity .6s", width: "min(88%, 420px)" }}>
            <p style={{ textAlign: "center", fontSize: "16px", fontWeight: 800, color: "#f0f0f0", marginBottom: "14px" }}>
              {isAr ? "مجاني بالكامل للمطورين" : "100% Free for Developers"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {BENEFITS.slice(0, 3).map(({ t: title, s }) => (
                <div key={title} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "rgba(37,211,102,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#25D366", fontSize: "10px", fontWeight: 700 }}>✓</span>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{title}</div>
                    <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.4)" }}>{s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scene: CTA */}
          <div style={{ position: "absolute", left: `${SCENES[8].camera.x * 100}%`, top: `${SCENES[8].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(8), transition: "opacity .6s", textAlign: "center" }}>
            <Link
              href="/developers/signup"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "13px 26px", background: "#25D366", color: "#000", fontWeight: 700, fontSize: "14px", borderRadius: "10px", textDecoration: "none", whiteSpace: "nowrap", animation: reducedMotion ? "none" : "hc-cta-pulse 1.8s ease-in-out infinite" }}
            >
              {t("Start for Free — 14 day trial", "ابدأ مجاناً — 14 يوم تجربة")}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* ── Controls: Play/Pause + نقط المشاهد ── */}
        <div style={{ position: "absolute", bottom: "14px", left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", zIndex: 5 }}>
          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? (isAr ? "إيقاف" : "Pause") : (isAr ? "تشغيل" : "Play")}
            style={{ width: "26px", height: "26px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            {playing ? <Pause size={11} color="#fff" /> : <Play size={11} color="#fff" />}
          </button>
          <div style={{ display: "flex", gap: "5px", padding: "6px 10px", borderRadius: "100px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                aria-label={`scene ${i + 1}`}
                style={{
                  width: active === i ? "16px" : "6px",
                  height: "6px",
                  borderRadius: "3px",
                  background: active === i ? "#25D366" : "rgba(255,255,255,0.25)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all .3s",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hc-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes hc-cta-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(37,211,102,0.45); }
          50% { box-shadow: 0 0 0 10px rgba(37,211,102,0); }
        }
      `}</style>
    </div>
  );
}