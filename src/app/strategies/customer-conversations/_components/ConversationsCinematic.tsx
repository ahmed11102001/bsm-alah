"use client";

// ── ConversationsCinematic ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// نمط بصري مختلف عن باقي أفلام الاستراتيجيات عمدًا:
//   - النص الرئيسي بيتكتب حرف بحرف (TypeLine + كيرسور وامض) بدل التلاشي
//     كلمة-كلمة المستخدم في باقي الأفلام.
//   - الكلام المهم عليه "علامة تظليل" (Mark) بتتحرك زي قلم الهايلايتر
//     بدل الـ underline/gradient البسيط.
//   - مشاهد المحادثات نفسها فقاعات شات حقيقية (ChatBubble) بمؤشر
//     "بيكتب…" (TypingDots) قبل ظهور كل رسالة، ومشاهد الفريق بصور
//     أفاتار "AvatarPop" بحركة ارتداد بدل الكروت النمطية.
// المحرك تحت (الكاميرا الافتراضية + الـ world) هو نفسه المستخدم في باقي
// الاستراتيجيات (مجرّب وموثوق) — الاختلاف كله في شكل وحركة المحتوى.
// ═══════════════════════════════════════════════════════════════════════════
// المحتوى هنا مبني على الآلية الحقيقية للمحادثات في المشروع:
//   1) الردود على الحملة بتوصل لصندوق محادثات موحّد (dashboard/chat).
//   2) بوت الكلمات (automation/page.tsx: KEYWORD / FIRST_MESSAGE / قائمة
//      تفاعلية) بيرد فورًا — وده مختلف عن "وكيل واني الذكي" (AI Agent)
//      اللي بيبيع فعليًا وليه استراتيجية منفصلة بالكامل.
//   3) لو الموضوع محتاج إنسان، الـ AI بيحوّل المحادثة (aiStatus: NEEDS_HUMAN
//      + handoffReason) وبيوصل تنبيه فوري.
//   4) صفحة الفريق (dashboard/team): أدوار Full Access / Chat Only.
//   5) تعيين المحادثة لعضو فريق (assignedToUserId عبر PATCH
//      /api/chat/assignment)، وعضو Chat Only بيشوف بس اللي اتعيّنله.
//   6) مؤشرات حقيقية من /api/reports/automation: avgResponseTime،
//      humanHandoffs، estimatedHoursSaved.

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
    Inbox, Zap, ArrowRightLeft, ShieldCheck, UserPlus, Lock,
    Timer, Users, Clock, Play, Pause, ArrowLeft, ArrowRight, ExternalLink,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

// ─── Camera math (نفس محرك باقي الأفلام) ───────────────────────────────────
const WORLD_SCALE = 3;
const CAMERA_MS = 1100;
const ACCENT = "#34d399"; // نفس لون هوية "محادثات ما بعد الحملة" في صفحة /strategies

interface CameraTarget { x: number; y: number; scale: number; }
type SceneId =
    | "badge" | "headline" | "requirements"
    | "node0" | "node1" | "node2" | "node3" | "node4" | "node5"
    | "kpis" | "practices" | "cta";
interface Scene { id: SceneId; duration: number; camera: CameraTarget; }

const SCENES: Scene[] = [
    { id: "badge", duration: 2400, camera: { x: 0.50, y: 0.09, scale: 2.6 } },
    { id: "headline", duration: 4600, camera: { x: 0.50, y: 0.25, scale: 1.15 } },
    { id: "requirements", duration: 3000, camera: { x: 0.50, y: 0.40, scale: 1.30 } },
    { id: "node0", duration: 3400, camera: { x: 0.10, y: 0.60, scale: 1.55 } },
    { id: "node1", duration: 4400, camera: { x: 0.26, y: 0.60, scale: 1.55 } },
    { id: "node2", duration: 3600, camera: { x: 0.42, y: 0.60, scale: 1.55 } },
    { id: "node3", duration: 3400, camera: { x: 0.58, y: 0.60, scale: 1.55 } },
    { id: "node4", duration: 3200, camera: { x: 0.74, y: 0.60, scale: 1.55 } },
    { id: "node5", duration: 3200, camera: { x: 0.90, y: 0.60, scale: 1.55 } },
    { id: "kpis", duration: 5200, camera: { x: 0.16, y: 0.85, scale: 1.05 } },
    { id: "practices", duration: 5200, camera: { x: 0.84, y: 0.85, scale: 1.05 } },
    { id: "cta", duration: 4400, camera: { x: 0.50, y: 0.98, scale: 1.30 } },
];

// ─── TypeLine — كتابة حرف بحرف مع كيرسور وامض (بدل التلاشي كلمة-كلمة) ──────
function TypeLine({
    text, isActive, reducedMotion, speed = 26, startDelay = 0, style,
}: {
    text: string; isActive: boolean; reducedMotion: boolean;
    speed?: number; startDelay?: number; style?: React.CSSProperties;
}) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!isActive) { setCount(0); return; }
        if (reducedMotion) { setCount(text.length); return; }
        let cancelled = false;
        let timeoutId: ReturnType<typeof setTimeout>;
        const startId = setTimeout(function tick(i = 1) {
            if (cancelled) return;
            setCount(i);
            if (i < text.length) timeoutId = setTimeout(() => tick(i + 1), speed);
        }, startDelay);
        return () => { cancelled = true; clearTimeout(startId); clearTimeout(timeoutId); };
    }, [isActive, reducedMotion, text, speed, startDelay]);

    const done = count >= text.length;

    return (
        <span style={style}>
            {text.slice(0, count)}
            <span
                aria-hidden
                style={{
                    display: "inline-block",
                    width: "2px",
                    height: "0.85em",
                    marginInlineStart: "2px",
                    verticalAlign: "-0.08em",
                    background: ACCENT,
                    opacity: isActive && !done ? 1 : 0,
                    animation: isActive && !done && !reducedMotion ? "cc-blink 0.9s step-end infinite" : "none",
                }}
            />
        </span>
    );
}

// ─── Mark — علامة تظليل (هايلايتر) للكلام المهم ────────────────────────────
function Mark({ text, isActive, reducedMotion, dir = "ltr" }: {
    text: string; isActive: boolean; reducedMotion: boolean; dir?: "ltr" | "rtl";
}) {
    const [sweep, setSweep] = useState(false);
    useEffect(() => {
        if (isActive && !reducedMotion) {
            const timer = setTimeout(() => setSweep(true), 120);
            return () => clearTimeout(timer);
        } else if (isActive && reducedMotion) setSweep(true);
        else setSweep(false);
    }, [isActive, reducedMotion]);

    return (
        <span style={{ position: "relative", display: "inline-block", padding: "0 3px" }}>
            <span
                aria-hidden
                style={{
                    position: "absolute",
                    inset: "8% -1px 4%",
                    borderRadius: "3px",
                    background: `${ACCENT}38`,
                    transform: sweep || reducedMotion ? "scaleX(1)" : "scaleX(0)",
                    transformOrigin: dir === "rtl" ? "right" : "left",
                    transition: reducedMotion ? "none" : "transform 0.6s cubic-bezier(0.16,1,0.3,1)",
                    zIndex: 0,
                }}
            />
            <span style={{ position: "relative", zIndex: 1, fontWeight: 800, color: "#f0f0f0" }}>{text}</span>
        </span>
    );
}

// ─── TypingDots — مؤشر "بيكتب…" ────────────────────────────────────────────
function TypingDots() {
    return (
        <span style={{ display: "inline-flex", gap: "3px", alignItems: "center", padding: "3px 2px" }}>
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    style={{
                        width: "5px", height: "5px", borderRadius: "50%",
                        background: "rgba(255,255,255,0.5)",
                        animation: `cc-bounce 1s ${i * 0.15}s infinite`,
                    }}
                />
            ))}
        </span>
    );
}

// ─── ChatBubble — فقاعة شات: "بيكتب…" ثم النص يظهر ─────────────────────────
function ChatBubble({ text, isActive, reducedMotion, from, delay = 0, badge }: {
    text: string; isActive: boolean; reducedMotion: boolean;
    from: "in" | "out" | "bot"; delay?: number; badge?: string;
}) {
    const [phase, setPhase] = useState<"hidden" | "typing" | "shown">("hidden");
    useEffect(() => {
        if (!isActive) { setPhase("hidden"); return; }
        if (reducedMotion) { setPhase("shown"); return; }
        const t1 = setTimeout(() => setPhase("typing"), delay);
        const t2 = setTimeout(() => setPhase("shown"), delay + 850);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [isActive, reducedMotion, delay]);

    const visible = phase !== "hidden";
    const isIncoming = from === "in";
    const bg = from === "out" ? `${ACCENT}22` : from === "bot" ? "rgba(167,139,250,0.14)" : "rgba(255,255,255,0.06)";
    const border = from === "out" ? `${ACCENT}45` : from === "bot" ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.09)";

    return (
        <div style={{
            display: "flex", justifyContent: isIncoming ? "flex-start" : "flex-end",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0) scale(1)" : "translateY(6px) scale(0.9)",
            transition: reducedMotion ? "none" : "all 0.35s cubic-bezier(0.16,1,0.3,1)",
            marginBottom: "7px",
        }}>
            <div style={{
                maxWidth: "82%",
                padding: phase === "typing" ? "2px 10px" : "7px 11px",
                borderRadius: isIncoming ? "3px 12px 12px 12px" : "12px 3px 12px 12px",
                background: bg,
                border: `1px solid ${border}`,
                fontSize: "11px", color: "rgba(255,255,255,0.78)", lineHeight: 1.5,
            }}>
                {badge && phase === "shown" && (
                    <span style={{ display: "block", fontSize: "9px", color: ACCENT, fontWeight: 700, marginBottom: "2px", fontFamily: "'JetBrains Mono',monospace" }}>{badge}</span>
                )}
                {phase === "typing" ? <TypingDots /> : text}
            </div>
        </div>
    );
}

// ─── AvatarPop — أفاتار بحركة ارتداد (بدل الكروت النمطية) ──────────────────
function AvatarPop({ label, role, index, isActive, reducedMotion, tint }: {
    label: string; role: string; index: number; isActive: boolean; reducedMotion: boolean; tint?: string;
}) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (isActive && !reducedMotion) {
            const timer = setTimeout(() => setVisible(true), 220 + index * 240);
            return () => clearTimeout(timer);
        } else if (isActive && reducedMotion) setVisible(true);
        else setVisible(false);
    }, [isActive, index, reducedMotion]);

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.4)",
            transition: reducedMotion ? "none" : "all 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
            <div style={{
                width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${tint ?? ACCENT}, ${(tint ?? ACCENT)}90)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 800, color: "#04241c",
            }}>{label}</div>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.62)" }}>{role}</span>
        </div>
    );
}

// ─── Chip row — سطر شرح بسيط (خط علوي رفيع بدل الشريط الجانبي) ────────────
function ChipLine({ text, index, isActive, reducedMotion }: {
    text: string; index: number; isActive: boolean; reducedMotion: boolean;
}) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (isActive && !reducedMotion) {
            const timer = setTimeout(() => setVisible(true), 260 + index * 240);
            return () => clearTimeout(timer);
        } else if (isActive && reducedMotion) setVisible(true);
        else setVisible(false);
    }, [isActive, index, reducedMotion]);

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : "translateX(8px)",
            transition: reducedMotion ? "none" : "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0, background: ACCENT }} />
            <span style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(255,255,255,0.6)" }}>{text}</span>
        </div>
    );
}

// ─── Numbered tip row (أفضل الممارسات) ─────────────────────────────────────────
function TipRow({ n, text, index, isActive, reducedMotion }: {
    n: number; text: string; index: number; isActive: boolean; reducedMotion: boolean;
}) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (isActive && !reducedMotion) {
            const timer = setTimeout(() => setVisible(true), 300 + index * 300);
            return () => clearTimeout(timer);
        } else if (isActive && reducedMotion) setVisible(true);
        else setVisible(false);
    }, [isActive, index, reducedMotion]);

    return (
        <div style={{
            display: "flex", alignItems: "flex-start", gap: "10px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
            transition: reducedMotion ? "none" : "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
            <span style={{
                width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                border: `1.5px solid ${ACCENT}`, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: 700, color: ACCENT, fontFamily: "'JetBrains Mono',monospace",
            }}>{n}</span>
            <span style={{ fontSize: "12px", lineHeight: 1.6, color: "rgba(255,255,255,0.55)" }}>{text}</span>
        </div>
    );
}

// ─── KPI row (مؤشرات النجاح) ────────────────────────────────────────────────────
function KpiRow({ icon: Icon, name, desc, index, isActive, reducedMotion }: {
    icon: React.ElementType; name: string; desc: string;
    index: number; isActive: boolean; reducedMotion: boolean;
}) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (isActive && !reducedMotion) {
            const timer = setTimeout(() => setVisible(true), 280 + index * 320);
            return () => clearTimeout(timer);
        } else if (isActive && reducedMotion) setVisible(true);
        else setVisible(false);
    }, [isActive, index, reducedMotion]);

    return (
        <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transition: reducedMotion ? "none" : "all 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon size={15} color={ACCENT} />
                <span style={{ fontSize: "13.5px", fontWeight: 700, color: ACCENT }}>{name}</span>
            </div>
            <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginTop: "3px", marginRight: "23px" }}>{desc}</p>
        </div>
    );
}

export default function ConversationsCinematic() {
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
        const timer = setTimeout(() => {
            setActive((p) => (p + 1) % SCENES.length);
        }, SCENES[active].duration);
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

    // ─── محتوى حقيقي (مبني على dashboard/chat + automation + team + webhook) ──
    const KPIS = [
        { icon: Timer, name: t("Avg. Response Time", "متوسط زمن الرد"), desc: t("How fast the bot or AI replies to a customer", "سرعة رد البوت أو الذكاء الاصطناعي على العميل") },
        { icon: Users, name: t("Handoffs to Team", "التحويلات للفريق"), desc: t("Conversations that needed a human touch", "المحادثات اللي احتاجت تدخل بشري") },
        { icon: Clock, name: t("Hours Saved", "الوقت الموفر"), desc: t("Work hours saved by automated replies", "ساعات العمل اللي وفرتها الردود الآلية") },
    ];

    const PRACTICES = [
        t("Give team members the \u201cChat Only\u201d role so each one focuses on their own conversations", "عيّن أعضاء فريقك بصلاحية \u201cمحادثات فقط\u201d عشان كل واحد يركز في اللي يخصه"),
        t("Read the handoff reason before replying — it saves time understanding the issue", "راجع سبب التحويل قبل ما ترد — بيوفر وقت فهم المشكلة"),
        t("Spread assigned conversations evenly instead of piling them on one member", "وزّع المحادثات المُعيَّنة بالتساوي، بدل ما تتكدس عند عضو واحد"),
        t("If handoffs are high, add bot keywords that cover more common questions", "لو معدل التحويلات مرتفع، زوّد كلمات بوت جديدة تغطي أكتر أسئلة شائعة"),
    ];

    return (
        <div style={{ maxWidth: "980px", margin: "0 auto", padding: stage.w > 0 && stage.w < 640 ? "20px 12px 8px" : "32px 20px 8px" }}>
            <div
                ref={stageRef}
                style={{
                    position: "relative",
                    overflow: "hidden",
                    width: "100%",
                    height: "clamp(460px, 64vh, 640px)",
                    borderRadius: "20px",
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "radial-gradient(ellipse at 50% 30%, #0e1420 0%, #060810 70%)",
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
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "7px 16px", borderRadius: "100px", border: `1px solid ${ACCENT}40`, background: `${ACCENT}14`, fontSize: "13px", color: ACCENT, fontFamily: "'JetBrains Mono','Fira Code',monospace", whiteSpace: "nowrap" }}>
                            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}`, animation: reducedMotion ? "none" : "cc-pulse 2s infinite" }} />
                            {t("Wani Strategy · Post-Campaign Conversations", "استراتيجية واني · محادثات ما بعد الحملة")}
                        </div>
                    </div>

                    {/* Scene 1: Headline — TypeLine + Mark (نمط مختلف عن باقي الأفلام) */}
                    <div style={{ position: "absolute", left: `${SCENES[1].camera.x * 100}%`, top: `${SCENES[1].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(1), transition: "opacity .6s", textAlign: "center", width: "min(92%, 580px)" }}>
                        <h1 style={{ fontSize: "clamp(24px, 3.6vw, 38px)", fontWeight: 800, lineHeight: 1.3, letterSpacing: isAr ? "0" : "-1px", color: "#f0f0f0", minHeight: "1.3em" }}>
                            <TypeLine
                                text={t("Post-Campaign Conversations", "محادثات ما بعد الحملة")}
                                isActive={active === 1}
                                reducedMotion={reducedMotion}
                                startDelay={200}
                                speed={30}
                            />
                        </h1>
                        <p style={{ fontSize: "13.5px", color: "rgba(255,255,255,0.45)", marginTop: "14px", lineHeight: 1.8 }}>
                            {t("The campaign ends... but the conversation has ", "الحملة بتخلص… بس المحادثة ")}
                            <Mark
                                text={t("just begun.", "لسه بادئة.")}
                                isActive={active === 1}
                                reducedMotion={reducedMotion}
                                dir={isAr ? "rtl" : "ltr"}
                            />
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "20px", alignItems: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
                                <Zap size={14} color={ACCENT} /> {t("From an instant bot reply", "من رد بوت فوري")}
                            </div>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
                                <Users size={14} color={ACCENT} /> {t("To a dedicated team member, when it matters", "لعضو فريق مختص، وقت ما الأمر يستاهل")}
                            </div>
                        </div>
                    </div>

                    {/* Scene 2: Requirements */}
                    <div style={{ position: "absolute", left: `${SCENES[2].camera.x * 100}%`, top: `${SCENES[2].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(2), transition: "opacity .6s", textAlign: "center", width: "min(85%, 460px)" }}>
                        <p style={{ fontSize: "11px", letterSpacing: "2px", color: ACCENT, fontFamily: "'JetBrains Mono',monospace", marginBottom: "16px" }}>
                            {t("REQUIREMENTS", "المتطلبات")}
                        </p>
                        <div style={{ display: "flex", gap: "34px", justifyContent: "center", flexWrap: "wrap" }}>
                            <div>
                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{t("Plan required", "الباقة المطلوبة")}</div>
                                <div style={{ fontSize: "16px", fontWeight: 800, color: "#f0f0f0", marginTop: "5px" }}>{t("Starter & up", "Starter فأعلى")}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{t("Set up needed", "اللي محتاج تجهزه")}</div>
                                <div style={{ fontSize: "16px", fontWeight: 800, color: "#f0f0f0", marginTop: "5px" }}>{t("Bot keywords or a team", "بوت الكلمات أو فريق")}</div>
                            </div>
                        </div>
                    </div>

                    {/* Scene 3 (node0): صندوق موحّد — فقاعات شات وارده */}
                    <div style={{ position: "absolute", left: `${SCENES[3].camera.x * 100}%`, top: `${SCENES[3].camera.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(3)}`, opacity: dim(3), transition: "opacity .6s, transform .6s", width: "min(88%, 260px)" }}>
                        <div style={{ padding: "14px", borderRadius: "12px", border: `1px solid ${ACCENT}30`, background: "rgba(255,255,255,0.02)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <Inbox size={13} color={ACCENT} />
                                </div>
                                <h3 style={{ fontSize: "12.5px", fontWeight: 700, color: "#f0f0f0" }}>{t("Unified Inbox", "صندوق موحّد")}</h3>
                            </div>
                            <ChatBubble text={t("How much is shipping? \ud83d\ude4f", "الشحن بكام؟ \ud83d\ude4f")} isActive={active === 3} reducedMotion={reducedMotion} from="in" delay={300} badge="+201••• ••34" />
                            <ChatBubble text={t("When will my order arrive?", "الأوردر هيوصل امتى؟")} isActive={active === 3} reducedMotion={reducedMotion} from="in" delay={1500} badge="+201••• ••81" />
                            <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.35)", marginTop: "8px" }}>
                                {t("Every reply to your campaign lands in one place", "كل رد على حملتك بيوصل مكان واحد")}
                            </p>
                            <span style={{ display: "inline-block", marginTop: "8px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "2px 7px" }}>dashboard/chat</span>
                        </div>
                    </div>

                    {/* Scene 4 (node1): بوت الكلمات بيرد فورًا + إشارة لاستراتيجية AI Agent المنفصلة */}
                    <div style={{ position: "absolute", left: `${SCENES[4].camera.x * 100}%`, top: `${SCENES[4].camera.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(4)}`, opacity: dim(4), transition: "opacity .6s, transform .6s", width: "min(88%, 270px)" }}>
                        <div style={{ padding: "14px", borderRadius: "12px", border: `1px solid ${ACCENT}30`, background: "rgba(255,255,255,0.02)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <Zap size={13} color={ACCENT} />
                                </div>
                                <h3 style={{ fontSize: "12.5px", fontWeight: 700, color: "#f0f0f0" }}>{t("Keyword Bot Replies First", "بوت الكلمات بيرد الأول")}</h3>
                            </div>
                            <ChatBubble text={t("\u201cShipping\u201d \u2192 \u201cShipping takes 2\u20134 days \ud83d\ude9a\u201d", "\u201cشحن\u201d \u2190 \u201cالشحن بياخد 2-4 أيام \ud83d\ude9a\u201d")} isActive={active === 4} reducedMotion={reducedMotion} from="bot" delay={300} badge={t("AUTO REPLY", "رد تلقائي")} />
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                                <ChipLine text={t("Keyword \u2192 text reply or approved template", "كلمة مفتاحية \u2190 رد نصي أو قالب معتمد")} index={0} isActive={active === 4} reducedMotion={reducedMotion} />
                                <ChipLine text={t("First message \u2192 automatic welcome", "أول رسالة \u2190 ترحيب تلقائي")} index={1} isActive={active === 4} reducedMotion={reducedMotion} />
                                <ChipLine text={t("Interactive button menu when needed", "قائمة تفاعلية بأزرار لو محتاج")} index={2} isActive={active === 4} reducedMotion={reducedMotion} />
                            </div>
                            <div style={{ marginTop: "10px", padding: "8px 9px", borderRadius: "8px", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)" }}>
                                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                                    {t("Different from Wani's AI Agent (the one that actually sells) \u2014 it has its own full strategy.", "مختلف عن وكيل واني الذكي (اللي بيبيع فعليًا) \u2014 وده ليه استراتيجية كاملة لوحده.")}
                                </p>
                                <Link href="/strategies/ai-agent" style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "6px", fontSize: "10.5px", fontWeight: 700, color: "#a78bfa", textDecoration: "none" }}>
                                    {t("See the AI Agent strategy", "شوف استراتيجية الذكاء الاصطناعي")} <ExternalLink size={10} />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Scene 5 (node2): تحويل فوري للإنسان */}
                    <div style={{ position: "absolute", left: `${SCENES[5].camera.x * 100}%`, top: `${SCENES[5].camera.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(5)}`, opacity: dim(5), transition: "opacity .6s, transform .6s", width: "min(88%, 260px)" }}>
                        <div style={{ padding: "14px", borderRadius: "12px", border: "1px solid rgba(224,138,114,0.35)", background: "rgba(255,255,255,0.02)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "rgba(224,138,114,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <ArrowRightLeft size={13} color="#e08a72" />
                                </div>
                                <h3 style={{ fontSize: "12.5px", fontWeight: 700, color: "#f0f0f0" }}>{t("Instant Handoff to a Human", "تحويل فوري لإنسان")}</h3>
                            </div>
                            <ChatBubble text={t("I want a custom bulk order, can we talk numbers?", "عايز أوردر كبير بشروط خاصة، ينفع نتكلم؟")} isActive={active === 5} reducedMotion={reducedMotion} from="in" delay={300} />
                            <div style={{ marginTop: "6px", padding: "8px 9px", borderRadius: "8px", background: "rgba(224,138,114,0.1)", border: "1px solid rgba(224,138,114,0.3)" }}>
                                <p style={{ fontSize: "10px", color: "#e08a72", fontWeight: 700, marginBottom: "2px" }}>{t("NEEDS_HUMAN", "محتاج تدخل بشري")}</p>
                                <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                                    {t("Reason shown right next to the conversation, plus an instant team alert.", "السبب واضح جنب المحادثة، ومعاه تنبيه فوري للفريق.")}
                                </p>
                            </div>
                            <span style={{ display: "inline-block", marginTop: "8px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "2px 7px" }}>aiStatus · handoffReason</span>
                        </div>
                    </div>

                    {/* Scene 6 (node3): أدوار الفريق — أفاتار بحركة ارتداد */}
                    <div style={{ position: "absolute", left: `${SCENES[6].camera.x * 100}%`, top: `${SCENES[6].camera.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(6)}`, opacity: dim(6), transition: "opacity .6s, transform .6s", width: "min(88%, 260px)" }}>
                        <div style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${ACCENT}30`, background: "rgba(255,255,255,0.02)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                                <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <ShieldCheck size={13} color={ACCENT} />
                                </div>
                                <h3 style={{ fontSize: "12.5px", fontWeight: 700, color: "#f0f0f0" }}>{t("Your Team, Each With a Role", "فريقك، كل واحد بدوره")}</h3>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <AvatarPop label={t("OW", "مك")} role={t("Owner · Full Access", "المالك · صلاحية كاملة")} index={0} isActive={active === 6} reducedMotion={reducedMotion} />
                                <AvatarPop label={t("AD", "مد")} role={t("Admin · Full Access", "مدير · صلاحية كاملة")} index={1} isActive={active === 6} reducedMotion={reducedMotion} />
                                <AvatarPop label={t("AG", "مو")} role={t("Agent · Chat Only", "موظف · محادثات فقط")} index={2} isActive={active === 6} reducedMotion={reducedMotion} tint="#7fa0c9" />
                            </div>
                            <span style={{ display: "inline-block", marginTop: "12px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "2px 7px" }}>dashboard/team</span>
                        </div>
                    </div>

                    {/* Scene 7 (node4): تعيين المحادثة لعضو */}
                    <div style={{ position: "absolute", left: `${SCENES[7].camera.x * 100}%`, top: `${SCENES[7].camera.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(7)}`, opacity: dim(7), transition: "opacity .6s, transform .6s", width: "min(88%, 260px)" }}>
                        <div style={{ padding: "14px", borderRadius: "12px", border: `1px solid ${ACCENT}30`, background: "rgba(255,255,255,0.02)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <UserPlus size={13} color={ACCENT} />
                                </div>
                                <h3 style={{ fontSize: "12.5px", fontWeight: 700, color: "#f0f0f0" }}>{t("Every Conversation Has an Owner", "كل محادثة ليها مسؤول")}</h3>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "10px" }}>
                                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>{t("Assigned to", "معيّنة لـ")}</span>
                                <AvatarPop label={t("SA", "سا")} role={t("Sara", "سارة")} index={0} isActive={active === 7} reducedMotion={reducedMotion} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <ChipLine text={t("Assign right from the chat screen", "تعيين مباشر من شاشة الشات")} index={0} isActive={active === 7} reducedMotion={reducedMotion} />
                                <ChipLine text={t("Change who's responsible anytime", "غيّر المسؤول في أي وقت")} index={1} isActive={active === 7} reducedMotion={reducedMotion} />
                            </div>
                            <span style={{ display: "inline-block", marginTop: "8px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "2px 7px" }}>PATCH /api/chat/assignment</span>
                        </div>
                    </div>

                    {/* Scene 8 (node5): رؤية مخصّصة لعضو Chat Only */}
                    <div style={{ position: "absolute", left: `${SCENES[8].camera.x * 100}%`, top: `${SCENES[8].camera.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(8)}`, opacity: dim(8), transition: "opacity .6s, transform .6s", width: "min(88%, 260px)" }}>
                        <div style={{ padding: "14px", borderRadius: "12px", border: `1px solid ${ACCENT}30`, background: "rgba(255,255,255,0.02)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <Lock size={13} color={ACCENT} />
                                </div>
                                <h3 style={{ fontSize: "12.5px", fontWeight: 700, color: "#f0f0f0" }}>{t("Each Member Sees Only Theirs", "الموظف يشوف اللي يخصه بس")}</h3>
                            </div>
                            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>
                                {t("A \u201cChat Only\u201d member opens only their assigned conversations.", "عضو \u201cمحادثات فقط\u201d بيفتح المحادثات المعيّنة له وبس.")}
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <ChipLine text={t("More privacy for your customers", "خصوصية أعلى لعملائك")} index={0} isActive={active === 8} reducedMotion={reducedMotion} />
                                <ChipLine text={t("Sharper focus for every team member", "تركيز أكتر لكل عضو فريق")} index={1} isActive={active === 8} reducedMotion={reducedMotion} />
                                <ChipLine text={t("The account owner still sees everything", "صاحب الحساب شايف كل حاجة")} index={2} isActive={active === 8} reducedMotion={reducedMotion} />
                            </div>
                            <span style={{ display: "inline-block", marginTop: "8px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "2px 7px" }}>role: CHAT_ONLY</span>
                        </div>
                    </div>

                    {/* Scene 9: KPIs — staggered entry */}
                    <div style={{ position: "absolute", left: `${SCENES[9].camera.x * 100}%`, top: `${SCENES[9].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(9), transition: "opacity .6s", width: "min(88%, 360px)" }}>
                        <p style={{ fontSize: "11px", letterSpacing: "2px", color: ACCENT, fontFamily: "'JetBrains Mono',monospace", marginBottom: "16px" }}>
                            {t("SUCCESS METRICS", "مؤشرات النجاح")}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {KPIS.map((k, i) => (
                                <KpiRow key={k.name} icon={k.icon} name={k.name} desc={k.desc} index={i} isActive={active === 9} reducedMotion={reducedMotion} />
                            ))}
                        </div>
                    </div>

                    {/* Scene 10: Best practices — numbered, staggered */}
                    <div style={{ position: "absolute", left: `${SCENES[10].camera.x * 100}%`, top: `${SCENES[10].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(10), transition: "opacity .6s", width: "min(88%, 360px)" }}>
                        <p style={{ fontSize: "11px", letterSpacing: "2px", color: ACCENT, fontFamily: "'JetBrains Mono',monospace", marginBottom: "16px" }}>
                            {t("BEST PRACTICES", "أفضل الممارسات")}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {PRACTICES.map((p, i) => (
                                <TipRow key={i} n={i + 1} text={p} index={i} isActive={active === 10} reducedMotion={reducedMotion} />
                            ))}
                        </div>
                    </div>

                    {/* Scene 11: CTA */}
                    <div style={{ position: "absolute", left: `${SCENES[11].camera.x * 100}%`, top: `${SCENES[11].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(11), transition: "opacity .6s", textAlign: "center", width: "min(85%, 380px)" }}>
                        <div style={{ fontSize: "22px", fontWeight: 800, color: "#f0f0f0", lineHeight: 1.3, marginBottom: "8px", letterSpacing: isAr ? "0" : "-0.5px" }}>
                            {t("Ready to organize your conversations?", "جاهز تنظّم محادثاتك؟")}
                        </div>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: "20px" }}>
                            {t("Turn on the keyword bot and add your team \u2014 right from the dashboard.", "فعّل بوت الكلمات وضيف فريقك \u2014 من الداشبورد مباشرة.")}
                        </p>
                        <Link
                            href="/dashboard/team"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "8px",
                                padding: "14px 30px",
                                background: `linear-gradient(135deg, ${ACCENT} 0%, #0d9488 100%)`,
                                color: "#04241c", fontWeight: 700, fontSize: "14px", borderRadius: "12px",
                                textDecoration: "none", whiteSpace: "nowrap",
                                animation: reducedMotion ? "none" : "cc-cta-pulse 2s ease-in-out infinite",
                                boxShadow: `0 4px 20px ${ACCENT}4d`,
                            }}
                        >
                            {t("Manage Your Team Now", "أدر فريقك الآن")}
                            <ForwardIcon size={15} />
                        </Link>
                        <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.25)", marginTop: "12px" }}>
                            {t("From the team & conversations page", "من صفحة الفريق والمحادثات")}
                        </p>
                    </div>
                </div>

                {/* ── Controls: Play/Pause + نقط المشاهد ── */}
                <div style={{ position: "absolute", bottom: "14px", left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", zIndex: 5 }}>
                    <button
                        onClick={() => setPlaying((p) => !p)}
                        aria-label={playing ? t("Pause", "إيقاف") : t("Play", "تشغيل")}
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
                                    background: active === i ? ACCENT : "rgba(255,255,255,0.25)",
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
                    background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}4d)`,
                    borderRadius: "0 2px 2px 0",
                    animation: playing && !reducedMotion ? `cc-progress ${SCENES[active].duration}ms linear` : "none",
                    zIndex: 6,
                    width: "100%",
                    transformOrigin: "left",
                }} key={`progress-${active}-${playing}`} />
            </div>

            <style>{`
        @keyframes cc-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes cc-blink { 0%,45% { opacity: 1; } 50%,95% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes cc-bounce { 0%,60%,100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-3px); opacity: 1; } }
        @keyframes cc-cta-pulse {
          0%,100% { box-shadow: 0 4px 20px ${ACCENT}4d, 0 0 0 0 ${ACCENT}66; }
          50% { box-shadow: 0 4px 20px ${ACCENT}4d, 0 0 0 12px ${ACCENT}00; }
        }
        @keyframes cc-progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}
            </style>
        </div>
    );
}
