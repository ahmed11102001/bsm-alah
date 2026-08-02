"use client";

// ── HeroCinematic ─────────────────────────────────────────────────────────────
// كاميرا وهمية بتتحرك جوه "كادر" واحد ثابت (مفيش scroll للصفحة، الحركة كلها
// داخلية) — بتزوم وتتنقل بين مشاهد المحتوى الحقيقي بالظبط اللي في الصفحة
// (نفس النصوص، نفس الكود، نفس المميزات) بدل ما تبقى كتلة ثابتة.
//
// الميكانيزم: عندنا "world" (كانفاس افتراضي 3× حجم الإطار) وكل مشهد متحط في
// إحداثيات ثابتة جواه. الكاميرا بتتحرك (translate + scale) بين نقط مختلفة —
// فوق/تحت/يمين/شمال/زوم — لكل ده بيتقص جوه إطار واحد بـ overflow:hidden.

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Zap, Shield, BarChart2, Play, Pause, Sparkles } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

// ─── Camera math ──────────────────────────────────────────────────────────────
const WORLD_SCALE = 3; // الـ world أكبر من الإطار بـ 3 أضعاف في كل بُعد
const CAMERA_MS = 1100; // مدة انتقال الكاميرا بين مشهدين

interface CameraTarget { x: number; y: number; scale: number; }
type SceneId = "badge" | "headline" | "stats" | "terminal" | "f1" | "f2" | "f3" | "benefits" | "cta";

interface Scene { id: SceneId; duration: number; camera: CameraTarget; }

// إحداثيات كل مشهد — المسار بيرسم "جولة" كاملة حوالين الإطار
const SCENES: Scene[] = [
  { id: "badge",    duration: 2600, camera: { x: 0.50, y: 0.26, scale: 2.6 } },
  { id: "headline", duration: 3800, camera: { x: 0.50, y: 0.42, scale: 1.18 } },
  { id: "stats",    duration: 3200, camera: { x: 0.50, y: 0.62, scale: 1.35 } },
  { id: "terminal", duration: 5800, camera: { x: 0.83, y: 0.50, scale: 1.05 } },
  { id: "f1",       duration: 2600, camera: { x: 0.74, y: 0.85, scale: 1.55 } },
  { id: "f2",       duration: 2600, camera: { x: 0.84, y: 0.85, scale: 1.55 } },
  { id: "f3",       duration: 2800, camera: { x: 0.94, y: 0.85, scale: 1.55 } },
  { id: "benefits", duration: 6400, camera: { x: 0.17, y: 0.84, scale: 1.05 } },
  { id: "cta",      duration: 4200, camera: { x: 0.17, y: 0.15, scale: 1.35 } },
];

const TYPE_STYLE: Record<string, string> = {
  comment: "text-white/25 italic",
  code: "text-white/70",
  key: "text-[#25D366]",
  blank: "",
};

// ─── Staggered Benefits Item ──────────────────────────────────────────────────
function BenefitItem({ title, subtitle, index, isActive, reducedMotion }: {
  title: string; subtitle: string; index: number; isActive: boolean; reducedMotion: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isActive && !reducedMotion) {
      const timer = setTimeout(() => setVisible(true), 300 + index * 420);
      return () => clearTimeout(timer);
    } else if (isActive && reducedMotion) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [isActive, index, reducedMotion]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: visible ? "rgba(37,211,102,0.04)" : "rgba(255,255,255,0.01)",
        padding: "10px 12px",
        borderRadius: "10px",
        border: visible ? "1px solid rgba(37,211,102,0.15)" : "1px solid rgba(255,255,255,0.04)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.95)",
        transition: reducedMotion ? "none" : "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: visible ? "rgba(37,211,102,0.15)" : "rgba(37,211,102,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: reducedMotion ? "none" : "background 0.4s",
        }}
      >
        <span
          style={{
            color: "#25D366",
            fontSize: "10px",
            fontWeight: 700,
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0)",
            transition: reducedMotion ? "none" : "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
            transitionDelay: visible ? "0.15s" : "0s",
          }}
        >
          ✓
        </span>
      </div>
      <div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.4)" }}>{subtitle}</div>
      </div>
    </div>
  );
}

// ─── Typing cursor for terminal ───────────────────────────────────────────────
function TypingLine({ line, lineNum, isTerminalActive, lineIndex, reducedMotion }: {
  line: { text: string; type: string };
  lineNum: number;
  isTerminalActive: boolean;
  lineIndex: number;
  reducedMotion: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isTerminalActive && !reducedMotion) {
      const timer = setTimeout(() => setVisible(true), 200 + lineIndex * 350);
      return () => clearTimeout(timer);
    } else if (isTerminalActive && reducedMotion) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [isTerminalActive, lineIndex, reducedMotion]);

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        lineHeight: 1.65,
        minHeight: "20px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-6px)",
        transition: reducedMotion ? "none" : "all 0.35s ease-out",
      }}
    >
      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.12)", fontFamily: "'JetBrains Mono',monospace", minWidth: "14px", textAlign: "right" }}>
        {line.type !== "blank" ? lineNum : ""}
      </span>
      <code style={{ fontSize: "11px", fontFamily: "'JetBrains Mono','Fira Code',monospace" }} className={TYPE_STYLE[line.type]}>
        {line.text || "\u00A0"}
      </code>
    </div>
  );
}

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

  // ─── محتوى حقيقي ────────────────────────────────────────────────────────────
  const LINES = [
    { text: t("// 1. Send OTP — one line does it all", "// ١. أرسل OTP — سطر واحد يكفي"), type: "comment" },
    { text: 'await fetch("/api/v1/otp/send", {', type: "code" },
    { text: '  headers: { "x-api-key": "wani_live_••••" },', type: "key" },
    { text: '  body: JSON.stringify({ phone: "+201234567890" })', type: "code" },
    { text: "});", type: "code" },
    { text: "", type: "blank" },
    { text: t("// 2. Verify — and you're done ✓", "// ٢. تحقق — وخلاص ✓"), type: "comment" },
    { text: 'const { verified } = await fetch("/api/v1/otp/verify", { ... });', type: "code" },
  ];

  const FEATURES = [
    {
      icon: Zap,
      title: t("Two Lines, Done", "سطرين وخلاص"),
      body: t(
        "One POST sends the code. One POST verifies it. Zero config, zero SDKs.",
        "POST واحد يرسل الكود. POST واحد يتحقق. بدون config، بدون SDKs."
      ),
    },
    {
      icon: Shield,
      title: t("Built-in Protection", "حماية مدمجة"),
      body: t(
        "Automatic rate limiting: 5 msgs/number/hour. Brute-force protection built in.",
        "Rate limiting تلقائي: 5 رسائل/رقم/ساعة. حماية brute-force مدمجة."
      ),
    },
    {
      icon: BarChart2,
      title: t("Live Dashboard", "داشبورد حي"),
      body: t(
        "Track delivery, verification, failures & response times — all in real-time.",
        "تتابع الإرسال والتحقق والفشل والأوقات — كل ده لحظياً."
      ),
    },
  ];

  const BENEFITS = [
    { t: isAr ? "مشاريع غير محدودة" : "Unlimited projects", s: isAr ? "كل مشروع معزول ببياناته وإحصائياته" : "Each project fully isolated with its own data" },
    { t: isAr ? "رصيد تجريبي لكل مشروع" : "Trial balance per project", s: isAr ? "ابني وجرّب بدون أي تكلفة مقدمة" : "Build & test with zero upfront costs" },
    { t: isAr ? "ربط Meta مخصص" : "Custom Meta integration", s: isAr ? "رقم WhatsApp Business خاص بكل مشروع" : "Dedicated WhatsApp Business number per project" },
    { t: isAr ? "تسليم المشروع بضغطة زر" : "One-click handover", s: isAr ? "انقل الملكية للعميل في ثواني" : "Transfer ownership to your client instantly" },
    { t: isAr ? "إدارة كاملة من Dashboard وحدة" : "Unified dashboard", s: isAr ? "تابع وتحكم في كل مشاريعك من مكان واحد" : "Monitor & manage all projects from one place" },
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
          {/* Scene 0: Badge */}
          <div style={{ position: "absolute", left: `${SCENES[0].camera.x * 100}%`, top: `${SCENES[0].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(0), transition: "opacity .6s" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "7px 16px", borderRadius: "100px", border: "1px solid rgba(37,211,102,0.25)", background: "rgba(37,211,102,0.06)", fontSize: "14px", color: "#25D366", fontFamily: "'JetBrains Mono','Fira Code',monospace", whiteSpace: "nowrap" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#25D366", boxShadow: "0 0 8px #25D366", animation: reducedMotion ? "none" : "hc-pulse 2s infinite" }} />
              WhatsApp OTP API · BETA
            </div>
          </div>

          {/* Scene 1: Headline */}
          <div style={{ position: "absolute", left: `${SCENES[1].camera.x * 100}%`, top: `${SCENES[1].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(1), transition: "opacity .6s", textAlign: "center", width: "min(90%, 560px)" }}>
            <h1 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, lineHeight: 1.2, letterSpacing: "-1px", color: "#f0f0f0" }}>
              {t("Verify your customers", "تحقق من عملائك")}
              <br />
              <span style={{ color: "#25D366" }}>{t("via WhatsApp", "عبر واتساب")}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}> {t("— in two lines", "— في سطرين")}</span>
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", marginTop: "12px", lineHeight: 1.6 }}>
              {t(
                "No SDKs. No dependencies. Just a simple REST API.",
                "بدون SDKs. بدون dependencies. مجرد REST API بسيط."
              )}
            </p>
          </div>

          {/* Scene 2: Stats */}
          <div style={{ position: "absolute", left: `${SCENES[2].camera.x * 100}%`, top: `${SCENES[2].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(2), transition: "opacity .6s", textAlign: "center", width: "min(85%, 460px)" }}>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(255,255,255,0.45)", marginBottom: "22px" }}>
              {t(
                "Lightweight API that sends OTP via WhatsApp and verifies it. No SMS, no hassle — just the app with 98% open rate.",
                "API خفيف يرسل OTP على واتساب المستخدم ويتحقق منه. بدون SMS، بدون تعقيد — فقط الـ app اللي عنده 98% open rate."
              )}
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

          {/* Scene 3: Terminal — with typing effect */}
          <div style={{ position: "absolute", left: `${SCENES[3].camera.x * 100}%`, top: `${SCENES[3].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(3), transition: "opacity .6s", width: "min(90%, 420px)" }}>
            <div style={{ borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "#0d0d0d", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
                  <div key={c} style={{ width: "8px", height: "8px", borderRadius: "50%", background: c, opacity: 0.7 }} />
                ))}
                <span style={{ marginRight: "6px", fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace" }}>otp.js</span>
                {/* blinking cursor indicator */}
                <span style={{
                  marginLeft: "auto",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: active === 3 ? "#25D366" : "rgba(255,255,255,0.1)",
                  animation: active === 3 && !reducedMotion ? "hc-pulse 1.2s infinite" : "none",
                  transition: "background 0.3s",
                }} />
              </div>
              <div style={{ padding: "16px 16px 18px", direction: "ltr" }}>
                {LINES.map((line, i) => (
                  <TypingLine
                    key={i}
                    line={line}
                    lineNum={i + 1}
                    isTerminalActive={active === 3}
                    lineIndex={i}
                    reducedMotion={reducedMotion}
                  />
                ))}
                {/* Blinking cursor at end */}
                {active === 3 && (
                  <span style={{
                    display: "inline-block",
                    width: "7px",
                    height: "14px",
                    background: "#25D366",
                    marginLeft: "28px",
                    marginTop: "4px",
                    borderRadius: "1px",
                    animation: reducedMotion ? "none" : "hc-blink 1s step-end infinite",
                  }} />
                )}
              </div>
            </div>
            {/* Response badge below terminal */}
            <div style={{
              marginTop: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: active === 3 ? 0.6 : 0,
              transition: "opacity 0.5s",
              transitionDelay: active === 3 ? "2.8s" : "0s",
            }}>
              <span style={{ fontSize: "10px", color: "#25D366", fontFamily: "'JetBrains Mono',monospace" }}>✓</span>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono',monospace" }}>
                {t("200 OK · OTP sent in 1.2s", "200 OK · OTP اتبعت في 1.2 ثانية")}
              </span>
            </div>
          </div>

          {/* Scenes 4-6: Features (×3 — pan يمين على كل كارت) */}
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

          {/* Scene 7: Developer Benefits — staggered entry */}
          <div style={{ position: "absolute", left: `${SCENES[7].camera.x * 100}%`, top: `${SCENES[7].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(7), transition: "opacity .6s", width: "min(88%, 420px)" }}>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 14px",
                borderRadius: "100px",
                background: "rgba(37,211,102,0.08)",
                border: "1px solid rgba(37,211,102,0.2)",
                marginBottom: "10px",
              }}>
                <Sparkles size={12} color="#25D366" />
                <span style={{ fontSize: "11px", color: "#25D366", fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>
                  {isAr ? "للمطورين" : "FOR DEVELOPERS"}
                </span>
              </div>
              <p style={{ fontSize: "17px", fontWeight: 800, color: "#f0f0f0" }}>
                {isAr ? "مجاني بالكامل — ابني وادفع بعدين" : "100% Free — Build Now, Pay Later"}
              </p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
                {isAr ? "كل اللي محتاجه عشان تبدأ متوفرلك من اليوم" : "Everything you need to start building, available today"}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {BENEFITS.map(({ t: title, s }, i) => (
                <BenefitItem
                  key={title}
                  title={title}
                  subtitle={s}
                  index={i}
                  isActive={active === 7}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>
          </div>

          {/* Scene 8: CTA — with headline and description */}
          <div style={{
            position: "absolute",
            left: `${SCENES[8].camera.x * 100}%`,
            top: `${SCENES[8].camera.y * 100}%`,
            transform: "translate(-50%,-50%)",
            opacity: dim(8),
            transition: "opacity .6s",
            textAlign: "center",
            width: "min(85%, 380px)",
          }}>
            <div style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#f0f0f0",
              lineHeight: 1.3,
              marginBottom: "8px",
              letterSpacing: "-0.5px",
            }}>
              {t("Ready to ship?", "جاهز تطلق مشروعك؟")}
            </div>
            <p style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.4)",
              lineHeight: 1.6,
              marginBottom: "20px",
            }}>
              {t(
                "Create your free account, grab your API key, and start verifying users in under 5 minutes.",
                "أنشئ حسابك المجاني، خد الـ API key، وابدأ تحقق من المستخدمين في أقل من 5 دقائق."
              )}
            </p>
            <Link
              href="/developers/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 30px",
                background: "linear-gradient(135deg, #25D366 0%, #1fb855 100%)",
                color: "#000",
                fontWeight: 700,
                fontSize: "14px",
                borderRadius: "12px",
                textDecoration: "none",
                whiteSpace: "nowrap",
                animation: reducedMotion ? "none" : "hc-cta-pulse 2s ease-in-out infinite",
                boxShadow: "0 4px 20px rgba(37,211,102,0.3)",
              }}
            >
              {t("Start for Free", "ابدأ مجاناً")}
              <ArrowRight size={15} />
            </Link>
            <p style={{
              fontSize: "10.5px",
              color: "rgba(255,255,255,0.25)",
              marginTop: "12px",
            }}>
              {t("No credit card required · 50 free messages", "بدون بطاقة ائتمان · 50 رسالة مجانية")}
            </p>
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

        {/* ── Progress bar for current scene ── */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "2px",
          background: "linear-gradient(90deg, #25D366, rgba(37,211,102,0.3))",
          borderRadius: "0 2px 2px 0",
          animation: playing && !reducedMotion ? `hc-progress ${SCENES[active].duration}ms linear` : "none",
          zIndex: 6,
          width: "100%",
          transformOrigin: "left",
        }} key={`progress-${active}-${playing}`} />
      </div>

      <style>{`
        @keyframes hc-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes hc-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes hc-cta-pulse {
          0%,100% { box-shadow: 0 4px 20px rgba(37,211,102,0.3), 0 0 0 0 rgba(37,211,102,0.4); }
          50% { box-shadow: 0 4px 20px rgba(37,211,102,0.3), 0 0 0 12px rgba(37,211,102,0); }
        }
        @keyframes hc-progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}
      </style>
    </div>
  );
}