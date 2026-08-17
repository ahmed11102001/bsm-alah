"use client";

// ── AIAgentCinematic ─────────────────────────────────────────────────────────
// نفس ميكانيزم الكاميرا الوهمية بتاع HeroCinematic/AbandonedCartCinematic، بس
// المحتوى هنا أشمل (وكيل واني الذكي بيعمل حاجات كتير: رد نصي، رد صوتي، فهم
// صوت، شخصية قابلة للتخصيص، مصادر معرفة، حواجز أمان، تصعيد للموظف، شغال ٢٤/٧)
// فالمشهد أطول ومتنوع في حركة النص بقصد — مش نفس نمط استراتيجية السلة المتروكة.

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
    Zap, MessageCircle, Mic, Type, Users, BookOpen, ShieldCheck,
    UserCheck, Moon, BarChart2, Clock, Smile, Sparkles,
    Play, Pause, ArrowLeft, ArrowRight, Check, ShoppingCart, Globe, FileText,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

// ─── Camera math ──────────────────────────────────────────────────────────────
const WORLD_SCALE = 3;
const CAMERA_MS = 1100;
const ACCENT = "#a78bfa"; // بنفسجي — هوية "الذكاء/الشخصية" في الداشبورد نفسه
const CYAN = "#22d3ee";
const AMBER = "#f2b84a";
const GREEN = "#25D366";
const ROSE = "#fb7185";

interface CameraTarget { x: number; y: number; scale: number; }
interface Scene { id: string; duration: number; camera: CameraTarget; }

const SCENES: Scene[] = [
    { id: "badge", duration: 2200, camera: { x: 0.50, y: 0.07, scale: 2.6 } },
    { id: "headline", duration: 4400, camera: { x: 0.50, y: 0.20, scale: 1.15 } },
    { id: "hook", duration: 3800, camera: { x: 0.50, y: 0.33, scale: 1.30 } },
    { id: "textReply", duration: 3800, camera: { x: 0.16, y: 0.48, scale: 1.55 } },
    { id: "voiceHear", duration: 3600, camera: { x: 0.40, y: 0.48, scale: 1.55 } },
    { id: "voiceReply", duration: 3600, camera: { x: 0.64, y: 0.48, scale: 1.55 } },
    { id: "personality", duration: 4000, camera: { x: 0.88, y: 0.48, scale: 1.55 } },
    { id: "knowledge", duration: 4200, camera: { x: 0.16, y: 0.67, scale: 1.35 } },
    { id: "guardrails", duration: 4600, camera: { x: 0.50, y: 0.67, scale: 1.30 } },
    { id: "handoff", duration: 3600, camera: { x: 0.84, y: 0.67, scale: 1.40 } },
    { id: "alwaysOn", duration: 3000, camera: { x: 0.50, y: 0.81, scale: 1.30 } },
    { id: "kpis", duration: 5000, camera: { x: 0.16, y: 0.93, scale: 1.05 } },
    { id: "practices", duration: 5000, camera: { x: 0.84, y: 0.93, scale: 1.05 } },
    { id: "cta", duration: 4400, camera: { x: 0.50, y: 1.02, scale: 1.30 } },
];

// ─── دايرة مرسومة باليد حوالين كلمة مهمة — بتترسم (stroke draw-on) لما المشهد يتفعّل ───
function Circled({ children, color, active, delay = 150 }: {
    children: React.ReactNode; color: string; active: boolean; delay?: number;
}) {
    return (
        <span style={{ position: "relative", display: "inline-block", padding: "0 10px", color }}>
            <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
            <svg viewBox="0 0 160 64" style={{ position: "absolute", left: "-8%", top: "-38%", width: "116%", height: "180%", zIndex: 0, overflow: "visible", pointerEvents: "none" }}>
                <path
                    d="M14,34 C10,12 36,3 80,3 C126,3 150,10 148,32 C146,54 120,60 80,60 C38,60 16,55 14,34 Z"
                    fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
                    style={{
                        strokeDasharray: 420,
                        strokeDashoffset: active ? 0 : 420,
                        transition: `stroke-dashoffset 850ms cubic-bezier(0.65,0,0.35,1) ${delay}ms`,
                        opacity: 0.85,
                    }}
                />
            </svg>
        </span>
    );
}

// ─── تايبرايتر — بتتكتب حرف حرف ─────────────────────────────────────────────────
function Typewriter({ text, active, speed = 32 }: { text: string; active: boolean; speed?: number }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!active) { setCount(0); return; }
        let i = 0;
        const id = setInterval(() => {
            i++;
            setCount(i);
            if (i >= text.length) clearInterval(id);
        }, speed);
        return () => clearInterval(id);
    }, [active, text, speed]);
    return (
        <span>
            {text.slice(0, count)}
            <span style={{ opacity: active && count < text.length ? 1 : 0, animation: "aiw-blink 0.9s steps(1) infinite" }}>▍</span>
        </span>
    );
}

// ─── كلمة بكلمة (Stagger words) ────────────────────────────────────────────────
function WordsReveal({ text, active, baseDelay = 0 }: { text: string; active: boolean; baseDelay?: number }) {
    const words = text.split(" ");
    return (
        <span>
            {words.map((w, i) => (
                <span key={i} style={{
                    display: "inline-block",
                    opacity: active ? 1 : 0,
                    transform: active ? "translateY(0)" : "translateY(10px)",
                    transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${baseDelay + i * 90}ms`,
                    marginInlineEnd: "0.28em",
                }}>{w}</span>
            ))}
        </span>
    );
}

// ─── فليب-إن للـchips ──────────────────────────────────────────────────────────
function FlipChip({ text, active, delay, color }: { text: string; active: boolean; delay: number; color: string }) {
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", padding: "8px 18px", borderRadius: "100px",
            border: `1px solid ${color}55`, background: `${color}18`, color, fontSize: "13px", fontWeight: 700,
            opacity: active ? 1 : 0,
            transform: active ? "perspective(400px) rotateX(0deg)" : "perspective(400px) rotateX(-90deg)",
            transformOrigin: "bottom",
            transition: `all 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
        }}>{text}</span>
    );
}

// ─── سطر checklist بيدخل من الجنب مع علامة صح بترسم ────────────────────────────
function CheckRow({ text, active, delay }: { text: string; active: boolean; delay: number }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            opacity: active ? 1 : 0,
            transform: active ? "translateX(0)" : "translateX(14px)",
            transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        }}>
            <span style={{
                width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                background: `${GREEN}22`, border: `1.5px solid ${GREEN}`,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <Check size={12} color={GREEN} />
            </span>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.68)" }}>{text}</span>
        </div>
    );
}

// ─── كارت بيدخل بـwipe أفقي (تنوّع تاني عن الـzoom) ─────────────────────────────
function WipeCard({ children, active, delay }: { children: React.ReactNode; active: boolean; delay: number }) {
    return (
        <div style={{
            position: "relative", overflow: "hidden", borderRadius: "14px",
            opacity: active ? 1 : 0,
            transition: `opacity 0.4s ease ${delay}ms`,
        }}>
            <div style={{
                transform: active ? "translateX(0)" : "translateX(100%)",
                transition: `transform 0.6s cubic-bezier(0.65,0,0.35,1) ${delay}ms`,
            }}>
                {children}
            </div>
        </div>
    );
}

// ─── Waveform بسيط (CSS bars) ───────────────────────────────────────────────────
function Waveform({ color, active }: { color: string; active: boolean }) {
    const heights = [10, 22, 14, 28, 18, 24, 12, 20, 16];
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "30px" }}>
            {heights.map((h, i) => (
                <span key={i} style={{
                    width: "3.5px", borderRadius: "3px", background: color,
                    height: `${h}px`,
                    animation: active ? `aiw-wave 900ms ease-in-out ${i * 80}ms infinite alternate` : "none",
                    opacity: active ? 1 : 0.35,
                }} />
            ))}
        </div>
    );
}

export default function AIAgentCinematic() {
    const { locale } = useLanguage();
    const isAr = locale === "ar";
    const t = (en: string, ar: string) => (isAr ? ar : en);
    const ForwardIcon = isAr ? ArrowLeft : ArrowRight;

    const stageRef = useRef<HTMLDivElement>(null);
    const [stage, setStage] = useState({ w: 0, h: 0 });
    const [active, setActive] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const update = () => setStage({ w: el.clientWidth, h: el.clientHeight });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReducedMotion(mq.matches);
        if (mq.matches) setPlaying(false);
        const onChange = () => setReducedMotion(mq.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    useEffect(() => {
        if (!playing) return;
        const timer = setTimeout(() => setActive((p) => (p + 1) % SCENES.length), SCENES[active].duration);
        return () => clearTimeout(timer);
    }, [active, playing]);

    const goTo = useCallback((i: number) => setActive(i), []);

    function cameraTransform(target: CameraTarget): string {
        const { w, h } = stage;
        if (!w || !h) return "translate(0px,0px) scale(1)";
        const worldW = w * WORLD_SCALE;
        const worldH = h * WORLD_SCALE;
        const mobileScale = Math.min(target.scale, Math.max(0.56, w / 560));
        const scale = w < 640 ? mobileScale : target.scale;
        const tx = w / 2 - target.x * worldW * scale;
        const ty = h / 2 - target.y * worldH * scale;
        return `translate(${tx}px, ${ty}px) scale(${scale})`;
    }

    const dim = (i: number) => (active === i ? 1 : 0.08);
    const dimTransform = (i: number) => (active === i ? "scale(1)" : "scale(0.96)");
    const idx = (id: string) => SCENES.findIndex((s) => s.id === id);

    return (
        <div style={{ maxWidth: "1020px", margin: "0 auto", padding: stage.w > 0 && stage.w < 640 ? "20px 12px 8px" : "32px 20px 8px" }}>
            <div
                ref={stageRef}
                style={{
                    position: "relative", overflow: "hidden", width: "100%",
                    height: "clamp(480px, 66vh, 660px)", borderRadius: "20px",
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "radial-gradient(ellipse at 50% 30%, #14101c 0%, #08070c 70%)",
                    boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
                }}
            >
                <div style={{
                    position: "absolute", top: 0, left: 0,
                    width: `${WORLD_SCALE * 100}%`, height: `${WORLD_SCALE * 100}%`,
                    transformOrigin: "0 0",
                    transform: cameraTransform(SCENES[active].camera),
                    transition: reducedMotion ? "none" : `transform ${CAMERA_MS}ms cubic-bezier(0.65,0,0.35,1)`,
                }}>

                    {/* 0: Badge */}
                    <div style={{ position: "absolute", left: `${SCENES[0].camera.x * 100}%`, top: `${SCENES[0].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(0), transition: "opacity .6s" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "7px 16px", borderRadius: "100px", border: `1px solid ${ACCENT}40`, background: `${ACCENT}14`, fontSize: "13px", color: ACCENT, fontFamily: "'JetBrains Mono','Fira Code',monospace", whiteSpace: "nowrap" }}>
                            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}`, animation: reducedMotion ? "none" : "aiw-pulse 2s infinite" }} />
                            {t("Wani Strategy · AI Agent", "استراتيجية واني · وكيل واني الذكي")}
                        </div>
                    </div>

                    {/* 1: Headline — كلمة بكلمة + كلمة مدايّرة */}
                    <div style={{ position: "absolute", left: `${SCENES[1].camera.x * 100}%`, top: `${SCENES[1].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(1), transition: "opacity .6s", textAlign: "center", width: "min(92%, 620px)" }}>
                        <h1 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 800, lineHeight: 1.3, color: "#f0f0f0" }}>
                            <WordsReveal text={t("Wani's AI Agent", "وكيل واني الذكي")} active={active === 1} />
                        </h1>
                        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", marginTop: "16px", lineHeight: 1.8 }}>
                            {t("Talks to your customers like a real teammate — ", "بيتكلم مع عملاءك زي موظف حقيقي — ")}
                            <Circled color={CYAN} active={active === 1} delay={900}>{t("text or voice", "نص أو صوت")}</Circled>
                            {t(", 24/7.", "، على مدار الساعة.")}
                        </p>
                    </div>

                    {/* 2: Hook — تايبرايتر */}
                    <div style={{ position: "absolute", left: `${SCENES[2].camera.x * 100}%`, top: `${SCENES[2].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(2), transition: "opacity .6s", textAlign: "center", width: "min(90%, 540px)" }}>
                        <p style={{ fontSize: "clamp(17px,2.6vw,22px)", fontWeight: 700, color: "#f0f0f0", lineHeight: 1.7, minHeight: "3.4em", fontFamily: "'JetBrains Mono',monospace" }}>
                            <Typewriter active={active === 2} text={t("Message arrives… read… understood… answered. In seconds.", "رسالة بتوصل… تتقرا… تتفهم… وتترد. في ثواني.")} />
                        </p>
                    </div>

                    {/* 3: Text reply — Chat mockup */}
                    <div style={{ position: "absolute", left: `${SCENES[3].camera.x * 100}%`, top: `${SCENES[3].camera.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(3)}`, opacity: dim(3), transition: "opacity .6s, transform .6s", width: "min(84%, 250px)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                            <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center" }}><Type size={13} color={ACCENT} /></div>
                            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>{t("Text Reply", "رد نصي")}</span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${ACCENT}25`, borderRadius: "14px", padding: "14px" }}>
                            <div style={{
                                background: "rgba(255,255,255,0.06)", borderRadius: "12px 12px 12px 3px", padding: "9px 13px", fontSize: "11.5px", color: "#f0f0f0", marginBottom: "8px", maxWidth: "85%",
                                opacity: active === 3 ? 1 : 0, transform: active === 3 ? "translateY(0)" : "translateY(8px)", transition: "all .5s ease .1s",
                            }}>{t("How much is shipping to Alex?", "الشحن للإسكندرية بكام؟")}</div>
                            <div style={{
                                background: `${ACCENT}22`, borderRadius: "12px 12px 3px 12px", padding: "9px 13px", fontSize: "11.5px", color: "#f0f0f0", marginInlineStart: "auto", maxWidth: "88%",
                                opacity: active === 3 ? 1 : 0, transform: active === 3 ? "translateY(0)" : "translateY(8px)", transition: "all .5s ease .9s",
                            }}>{t("60 EGP, arrives in 2 days 📦", "٦٠ جنيه، بيوصل خلال يومين 📦")}</div>
                        </div>
                    </div>

                    {/* 4: Voice understanding (STT) */}
                    <div style={{ position: "absolute", left: `${SCENES[4].camera.x * 100}%`, top: `${SCENES[4].camera.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(4)}`, opacity: dim(4), transition: "opacity .6s, transform .6s", width: "min(84%, 250px)", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", justifyContent: "center" }}>
                            <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${CYAN}18`, display: "flex", alignItems: "center", justifyContent: "center" }}><Mic size={13} color={CYAN} /></div>
                            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>{t("Voice Notes → Text", "رسايل صوتية → نص")}</span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${CYAN}25`, borderRadius: "14px", padding: "20px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                            <Waveform color={CYAN} active={active === 4} />
                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>↓</div>
                            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", opacity: active === 4 ? 1 : 0, transition: "opacity .5s ease .5s" }}>
                                {t("\u201cIs the red one available?\u201d", "«فيه لون أحمر متاح؟»")}
                            </p>
                        </div>
                        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "10px" }}>{t("Understands voice notes automatically", "بيسمع ويفهم الصوت تلقائيًا")}</p>
                    </div>

                    {/* 5: Voice reply (TTS) */}
                    <div style={{ position: "absolute", left: `${SCENES[5].camera.x * 100}%`, top: `${SCENES[5].camera.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(5)}`, opacity: dim(5), transition: "opacity .6s, transform .6s", width: "min(84%, 250px)", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", justifyContent: "center" }}>
                            <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${ROSE}18`, display: "flex", alignItems: "center", justifyContent: "center" }}><Zap size={13} color={ROSE} /></div>
                            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>{t("Replies with real voice", "بيرد بصوت حقيقي")}</span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${ROSE}25`, borderRadius: "14px", padding: "20px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", opacity: active === 5 ? 1 : 0, transition: "opacity .5s ease .1s" }}>
                                {t("\u201cYes! Red is in stock 🎙️\u201d", "«أيوة، الأحمر متوفر 🎙️»")}
                            </p>
                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>↓</div>
                            <Waveform color={ROSE} active={active === 5} />
                        </div>
                        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "10px" }}>{t("Not just text — an actual voice message", "مش نص بس — رسالة صوتية فعلية")}</p>
                    </div>

                    {/* 6: Personality — Flip chips */}
                    <div style={{ position: "absolute", left: `${SCENES[6].camera.x * 100}%`, top: `${SCENES[6].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(6), transition: "opacity .6s", width: "min(84%, 260px)", textAlign: "center" }}>
                        <p style={{ fontSize: "11px", letterSpacing: "2px", color: ACCENT, fontFamily: "'JetBrains Mono',monospace", marginBottom: "16px" }}>{t("PERSONALITY", "الشخصية")}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "10px" }}>
                            <FlipChip text={t("Friendly", "ودود")} active={active === 6} delay={100} color={ACCENT} />
                            <FlipChip text={t("Formal", "رسمي")} active={active === 6} delay={220} color={ACCENT} />
                            <FlipChip text={t("Egyptian slang", "عامية مصرية")} active={active === 6} delay={340} color={ACCENT} />
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                            <FlipChip text={t("Auto language", "لغة تلقائية")} active={active === 6} delay={500} color={CYAN} />
                            <FlipChip text={t("Arabic / English", "عربي / إنجليزي")} active={active === 6} delay={620} color={CYAN} />
                        </div>
                        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "14px" }}>{t("Speaks the way your brand does", "بيتكلم بالأسلوب اللي يناسب براندك")}</p>
                    </div>

                    {/* 7: Knowledge sources — Wipe cards */}
                    <div style={{ position: "absolute", left: `${SCENES[7].camera.x * 100}%`, top: `${SCENES[7].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(7), transition: "opacity .6s", width: "min(88%, 280px)" }}>
                        <p style={{ fontSize: "11px", letterSpacing: "2px", color: ACCENT, fontFamily: "'JetBrains Mono',monospace", marginBottom: "14px", textAlign: "center" }}>{t("KNOWLEDGE SOURCES", "مصادر المعرفة")}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {[
                                { icon: ShoppingCart, label: t("Product catalog", "كتالوج المنتجات") },
                                { icon: Globe, label: t("Your website", "موقعك الإلكتروني") },
                                { icon: FileText, label: t("Brand policies", "سياسات البراند") },
                            ].map((k, i) => (
                                <WipeCard key={i} active={active === 7} delay={i * 180}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.03)", border: `1px solid ${ACCENT}22`, borderRadius: "12px", padding: "10px 14px" }}>
                                        <k.icon size={15} color={ACCENT} />
                                        <span style={{ fontSize: "12px", color: "#f0f0f0" }}>{k.label}</span>
                                    </div>
                                </WipeCard>
                            ))}
                        </div>
                        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "12px", textAlign: "center" }}>{t("Learns from your data — never invents answers", "بيتعلم من بياناتك — مش بيخترع إجابات")}</p>
                    </div>

                    {/* 8: Guardrails */}
                    <div style={{ position: "absolute", left: `${SCENES[8].camera.x * 100}%`, top: `${SCENES[8].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(8), transition: "opacity .6s", width: "min(88%, 320px)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", marginBottom: "16px" }}>
                            <div style={{
                                width: "40px", height: "40px", borderRadius: "12px", background: `${GREEN}18`, display: "flex", alignItems: "center", justifyContent: "center",
                                transform: active === 8 ? "scale(1)" : "scale(0.5)", transition: "transform .6s cubic-bezier(0.34,1.56,0.64,1)",
                            }}>
                                <ShieldCheck size={20} color={GREEN} />
                            </div>
                            <span style={{ fontSize: "15px", fontWeight: 800, color: "#f0f0f0" }}>{t("Safety first", "أمان قبل الذكاء")}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <CheckRow text={t("Never invents prices", "مايخترعش أسعار")} active={active === 8} delay={200} />
                            <CheckRow text={t("Never mentions competitors", "مايذكرش المنافسين")} active={active === 8} delay={400} />
                            <CheckRow text={t("Escalates complaints to a human instantly", "يحوّل الشكاوى لموظف فورًا")} active={active === 8} delay={600} />
                        </div>
                    </div>

                    {/* 9: Handoff */}
                    <div style={{ position: "absolute", left: `${SCENES[9].camera.x * 100}%`, top: `${SCENES[9].camera.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(9)}`, opacity: dim(9), transition: "opacity .6s, transform .6s", width: "min(84%, 250px)", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "14px" }}>
                            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Sparkles size={18} color={ACCENT} />
                            </div>
                            <ForwardIcon size={16} color="rgba(255,255,255,0.3)" style={{
                                opacity: active === 9 ? 1 : 0, transform: active === 9 ? "translateX(0)" : (isAr ? "translateX(8px)" : "translateX(-8px)"), transition: "all .6s ease .3s",
                            }} />
                            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: `${GREEN}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <UserCheck size={18} color={GREEN} />
                            </div>
                        </div>
                        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#f0f0f0", marginBottom: "6px" }}>{t("Smart Human Handoff", "تصعيد ذكي للموظف")}</h3>
                        <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{t("Steps aside the moment a human touch is needed", "يسيب المكان بسلاسة وقت ما يحس إنه محتاج بني آدم")}</p>
                    </div>

                    {/* 10: Always-on */}
                    <div style={{ position: "absolute", left: `${SCENES[10].camera.x * 100}%`, top: `${SCENES[10].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(10), transition: "opacity .6s", textAlign: "center", width: "min(88%, 420px)" }}>
                        <div style={{
                            width: "56px", height: "56px", borderRadius: "50%", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center",
                            background: `${ACCENT}14`, border: `1px solid ${ACCENT}35`,
                            animation: active === 10 && !reducedMotion ? "aiw-spin-slow 6s linear infinite" : "none",
                        }}>
                            <Moon size={22} color={ACCENT} />
                        </div>
                        <p style={{ fontSize: "clamp(16px,2.4vw,20px)", fontWeight: 700, color: "#f0f0f0", lineHeight: 1.6 }}>
                            <WordsReveal active={active === 10} baseDelay={200} text={t("Working while you sleep, while you're in a meeting, while you're on vacation.", "شغال وانت نايم، وانت في اجتماع، وانت في إجازة.")} />
                        </p>
                    </div>

                    {/* 11: KPIs */}
                    <div style={{ position: "absolute", left: `${SCENES[11].camera.x * 100}%`, top: `${SCENES[11].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(11), transition: "opacity .6s", width: "min(88%, 360px)" }}>
                        <p style={{ fontSize: "11px", letterSpacing: "2px", color: ACCENT, fontFamily: "'JetBrains Mono',monospace", marginBottom: "16px" }}>{t("SUCCESS METRICS", "مؤشرات النجاح")}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {[
                                { icon: Zap, name: t("Instant Reply Rate", "نسبة الرد الفوري"), desc: t("Messages answered within seconds", "الرسائل اللي بترد عليها في ثواني") },
                                { icon: Clock, name: t("Avg. Response Time", "متوسط وقت الاستجابة"), desc: t("From message received to reply sent", "من وقت استلام الرسالة لحد الرد") },
                                { icon: Smile, name: t("Customer Satisfaction", "رضا العملاء"), desc: t("Based on conversation outcomes", "حسب نتيجة المحادثات") },
                            ].map((k, i) => (
                                <div key={i} style={{
                                    opacity: active === 11 ? 1 : 0, transform: active === 11 ? "translateY(0)" : "translateY(10px)",
                                    transition: `all .45s cubic-bezier(0.16,1,0.3,1) ${280 + i * 320}ms`,
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <k.icon size={15} color={ACCENT} />
                                        <span style={{ fontSize: "13.5px", fontWeight: 700, color: ACCENT }}>{k.name}</span>
                                    </div>
                                    <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginTop: "3px", marginInlineStart: "23px" }}>{k.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 12: Best practices */}
                    <div style={{ position: "absolute", left: `${SCENES[12].camera.x * 100}%`, top: `${SCENES[12].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(12), transition: "opacity .6s", width: "min(88%, 360px)" }}>
                        <p style={{ fontSize: "11px", letterSpacing: "2px", color: ACCENT, fontFamily: "'JetBrains Mono',monospace", marginBottom: "16px" }}>{t("BEST PRACTICES", "أفضل الممارسات")}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {[
                                t("Fill the product catalog well — better data, better replies", "املا كتالوج المنتجات كويس — بيانات أدق، ردود أدق"),
                                t("Write your brand policies clearly so it never guesses", "اكتب سياسات البراند بوضوح عشان مايخمّنش"),
                                t("Turn on \u201calways escalate complaints\u201d for sensitive accounts", "فعّل «تحويل الشكاوى فورًا» في الحسابات الحساسة"),
                                t("Review conversations weekly and tune the tone if needed", "راجع المحادثات أسبوعيًا واضبط النبرة لو محتاجة"),
                            ].map((p, i) => (
                                <div key={i} style={{
                                    display: "flex", alignItems: "flex-start", gap: "10px",
                                    opacity: active === 12 ? 1 : 0, transform: active === 12 ? "translateY(0)" : "translateY(8px)",
                                    transition: `all .4s cubic-bezier(0.16,1,0.3,1) ${300 + i * 300}ms`,
                                }}>
                                    <span style={{
                                        width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                                        border: `1.5px solid ${ACCENT}`, display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "10px", fontWeight: 700, color: ACCENT, fontFamily: "'JetBrains Mono',monospace",
                                    }}>{i + 1}</span>
                                    <span style={{ fontSize: "12px", lineHeight: 1.6, color: "rgba(255,255,255,0.55)" }}>{p}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 13: CTA */}
                    <div style={{ position: "absolute", left: `${SCENES[13].camera.x * 100}%`, top: `${SCENES[13].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(13), transition: "opacity .6s", textAlign: "center", width: "min(85%, 400px)" }}>
                        <div style={{ fontSize: "22px", fontWeight: 800, color: "#f0f0f0", lineHeight: 1.3, marginBottom: "8px" }}>
                            {t("Ready to let Wani's AI Agent take over?", "جاهز تسيب وكيل واني الذكي يشتغل بدالك؟")}
                        </div>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: "20px" }}>
                            {t("Text, voice, personality, safety — all in one place.", "نص، صوت، شخصية، وأمان — كله في مكان واحد.")}
                        </p>
                        <Link href="/dashboard/automation" style={{
                            display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 30px",
                            background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cd6 100%)`,
                            color: "#0d0716", fontWeight: 700, fontSize: "14px", borderRadius: "12px",
                            textDecoration: "none", whiteSpace: "nowrap",
                            animation: reducedMotion ? "none" : "aiw-cta-pulse 2s ease-in-out infinite",
                            boxShadow: `0 4px 20px ${ACCENT}4d`,
                        }}>
                            {t("Activate AI Agent", "فعّل وكيل واني الذكي")}
                            <ForwardIcon size={15} />
                        </Link>
                        <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.25)", marginTop: "12px" }}>{t("From Automation → AI Agent tab", "من الأتمتة → تاب الذكاء الاصطناعي")}</p>
                    </div>

                </div>

                {/* Controls */}
                <div style={{ position: "absolute", bottom: "14px", left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", zIndex: 5 }}>
                    <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? t("Pause", "إيقاف") : t("Play", "تشغيل")}
                        style={{ width: "26px", height: "26px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        {playing ? <Pause size={11} color="#fff" /> : <Play size={11} color="#fff" />}
                    </button>
                    <div style={{ display: "flex", gap: "4px", padding: "6px 10px", borderRadius: "100px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.06)", maxWidth: "min(70vw, 340px)", overflowX: "auto" }}>
                        {SCENES.map((s, i) => (
                            <button key={s.id} onClick={() => goTo(i)} aria-label={`scene ${i + 1}`} style={{
                                width: active === i ? "14px" : "5px", height: "5px", borderRadius: "3px",
                                background: active === i ? ACCENT : "rgba(255,255,255,0.25)", border: "none", cursor: "pointer",
                                transition: "all .3s", padding: 0, flexShrink: 0,
                            }} />
                        ))}
                    </div>
                </div>

                <div style={{
                    position: "absolute", top: 0, left: 0, height: "2px",
                    background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}4d)`, borderRadius: "0 2px 2px 0",
                    animation: playing && !reducedMotion ? `aiw-progress ${SCENES[active].duration}ms linear` : "none",
                    zIndex: 6, width: "100%", transformOrigin: "left",
                }} key={`progress-${active}-${playing}`} />
            </div>

            <style>{`
        @keyframes aiw-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes aiw-blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
        @keyframes aiw-wave { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
        @keyframes aiw-spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes aiw-cta-pulse {
          0%,100% { box-shadow: 0 4px 20px ${ACCENT}4d, 0 0 0 0 ${ACCENT}66; }
          50% { box-shadow: 0 4px 20px ${ACCENT}4d, 0 0 0 12px ${ACCENT}00; }
        }
        @keyframes aiw-progress { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
      `}</style>
        </div>
    );
}