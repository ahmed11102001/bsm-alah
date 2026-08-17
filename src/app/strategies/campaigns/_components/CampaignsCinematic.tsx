"use client";

// ── CampaignsCinematic ──────────────────────────────────────────────────────
// نفس ميكانيزم AbandonedCartCinematic / OrderConfirmationCinematic: كاميرا وهمية
// بتتحرك جوه "كادر" ثابت — "world" افتراضي 3× حجم الإطار، وكل مشهد متحط في
// إحداثيات ثابتة جواه، والكاميرا بتتنقل بينهم (translate + scale).
// المحتوى هنا مبني على الآلية الحقيقية للحملات في المشروع:
//   1) CreateStep1 — اختيار الجمهور: رفع إكسل، جهات اتصال، أو قوائم ذكية
//      (VIP / متفاعلون / لم يردوا) من /api/audiences.
//   2) CreateStep2 — اختيار قالب معتمد من واتساب + متغيرات ديناميكية لكل
//      عميل مُستخرَجة تلقائيًا من أعمدة ملف الإكسل (useTemplateParser).
//   3) CreateStep3 — إرسال فوري أو جدولة، ثم POST /api/campaigns
//      (consumeCampaignQuotaAtomic + enqueueCampaign + inngest "campaign/send").
//   4) processCampaign (Inngest) — معالجة على دفعات (chunked cursor pagination
//      200 رسالة/دفعة) بفاصل 350ms بين كل رسالة لحماية الرقم من حظر ميتا،
//      واحترام تصنيف الإرسال اليومي (messagingTier / dailySentCount / backoff).
//   5) تتبع لحظي: sentCount / deliveredCount (من Message) / readCount / failedCount.
//   6) handleRepeat — تكرار الحملة لنفس الجمهور، متاح بعد 48 ساعة من الإنشاء.

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
    Megaphone, Users, MessageSquareText, Send, Gauge, Eye,
    RefreshCcw, CheckCircle2, BarChart2, ListChecks, Timer,
    Play, Pause, ArrowLeft, ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

// ─── Camera math ──────────────────────────────────────────────────────────────
const WORLD_SCALE = 3;
const CAMERA_MS = 1100;
const ACCENT = "#22d3ee"; // نفس لون هوية "الحملات الذكية" في صفحة /strategies

interface CameraTarget { x: number; y: number; scale: number; }
type SceneId =
    | "badge" | "headline" | "requirements"
    | "node0" | "node1" | "node2" | "node3" | "node4" | "node5"
    | "kpis" | "practices" | "cta";
interface Scene { id: SceneId; duration: number; camera: CameraTarget; }

const SCENES: Scene[] = [
    { id: "badge", duration: 2400, camera: { x: 0.50, y: 0.09, scale: 2.6 } },
    { id: "headline", duration: 4200, camera: { x: 0.50, y: 0.25, scale: 1.15 } },
    { id: "requirements", duration: 3000, camera: { x: 0.50, y: 0.40, scale: 1.30 } },
    { id: "node0", duration: 3200, camera: { x: 0.10, y: 0.60, scale: 1.55 } },
    { id: "node1", duration: 3600, camera: { x: 0.26, y: 0.60, scale: 1.55 } },
    { id: "node2", duration: 3000, camera: { x: 0.42, y: 0.60, scale: 1.55 } },
    { id: "node3", duration: 4000, camera: { x: 0.58, y: 0.60, scale: 1.55 } },
    { id: "node4", duration: 3200, camera: { x: 0.74, y: 0.60, scale: 1.55 } },
    { id: "node5", duration: 3400, camera: { x: 0.90, y: 0.60, scale: 1.55 } },
    { id: "kpis", duration: 5200, camera: { x: 0.16, y: 0.85, scale: 1.05 } },
    { id: "practices", duration: 5200, camera: { x: 0.84, y: 0.85, scale: 1.05 } },
    { id: "cta", duration: 4400, camera: { x: 0.50, y: 0.98, scale: 1.30 } },
];

// ─── Word-by-word reveal (زي كابشن فيديو) ─────────────────────────────────────
function WordReveal({
    text, isActive, reducedMotion, highlight = [], baseDelay = 0, step = 90,
    style,
}: {
    text: string; isActive: boolean; reducedMotion: boolean;
    highlight?: string[]; baseDelay?: number; step?: number;
    style?: React.CSSProperties;
}) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (isActive && !reducedMotion) {
            const timer = setTimeout(() => setVisible(true), 60);
            return () => clearTimeout(timer);
        } else if (isActive && reducedMotion) setVisible(true);
        else setVisible(false);
    }, [isActive, reducedMotion]);

    const words = text.split(" ");
    const norm = (w: string) => w.replace(/[.,،؛!؟"'\u201c\u201d—-]/g, "");

    return (
        <span style={{ ...style }}>
            {words.map((word, i) => {
                const isHi = highlight.some((h) => norm(word).toLowerCase() === norm(h).toLowerCase());
                const delay = baseDelay + i * step;
                return (
                    <span
                        key={i}
                        style={{
                            display: "inline-block",
                            opacity: visible || reducedMotion ? 1 : 0,
                            filter: visible || reducedMotion ? "blur(0px)" : "blur(4px)",
                            transform: visible || reducedMotion ? "translateY(0)" : "translateY(8px)",
                            marginInlineEnd: "0.28em",
                            color: isHi ? ACCENT : undefined,
                            fontWeight: isHi ? 800 : undefined,
                            backgroundImage: isHi ? `linear-gradient(${ACCENT}, ${ACCENT})` : undefined,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "0 92%",
                            backgroundSize: isHi && (visible || reducedMotion) ? "100% 3px" : "0% 3px",
                            transitionProperty: reducedMotion ? "none" : "opacity, filter, transform, background-size",
                            transitionDuration: reducedMotion ? "0s" : ".5s, .5s, .5s, .45s",
                            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                            transitionDelay: reducedMotion ? "0s" : `${delay}ms, ${delay}ms, ${delay}ms, ${delay + 260}ms`,
                        }}
                    >
                        {word}
                    </span>
                );
            })}
        </span>
    );
}

// ─── Staggered row (chips جوه كارت الخطوة) ─────────────────────────────────────
function StaggerRow({ text, index, isActive, reducedMotion, warn }: {
    text: string; index: number; isActive: boolean; reducedMotion: boolean; warn?: boolean;
}) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (isActive && !reducedMotion) {
            const timer = setTimeout(() => setVisible(true), 260 + index * 260);
            return () => clearTimeout(timer);
        } else if (isActive && reducedMotion) setVisible(true);
        else setVisible(false);
    }, [isActive, index, reducedMotion]);

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : "translateX(10px)",
            transition: reducedMotion ? "none" : "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
            <span style={{ width: "14px", height: "2px", flexShrink: 0, opacity: 0.8, background: warn ? "#c97a63" : ACCENT }} />
            <span style={{ fontSize: "11.5px", lineHeight: 1.5, color: warn ? "#e08a72" : "rgba(255,255,255,0.6)" }}>{text}</span>
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

export default function CampaignsCinematic() {
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

    // ─── محتوى حقيقي (مبني على campaigns/route.ts + inngest/functions.ts + audiences/route.ts) ────
    const NODES = [
        {
            icon: Users,
            title: t("Target Audience", "الجمهور المستهدف"),
            desc: t("Smart lists or an Excel upload — in one click", "قوائم ذكية جاهزة أو رفع إكسل بضغطة"),
            chips: [
                t("VIP customers · frequent or repeat buyers", "عملاء VIP · تكرار شراء أو تفاعل متكرر"),
                t("Engaged customers · replied at least once", "عملاء متفاعلون · ردوا على الأقل مرة"),
                t("No-response customers · re-target them", "لم يردوا · لإعادة الاستهداف"),
            ],
            tag: "api/audiences · smart lists",
        },
        {
            icon: MessageSquareText,
            title: t("Template & Personalization", "القالب والشخصنة"),
            desc: t("Approved WhatsApp template + dynamic variables", "قالب واتساب معتمد + متغيرات ديناميكية") + " · AUTO",
            chips: [
                t("Meta-approved template", "قالب معتمد من واتساب") + " · Meta",
                t("Excel columns imported automatically", "استيراد أعمدة الإكسل تلقائيًا"),
                t("Every customer gets their own name & variables", "كل عميل بيوصله اسمه ومتغيراته الخاصة"),
            ],
            tag: "CreateStep2 · templateVars",
        },
        {
            icon: Send,
            title: t("Launch", "الإطلاق"),
            desc: t("Send now, or schedule for later", "إرسال فوري أو جدولة لميعاد محدد"),
            chips: [
                t("Send immediately", "إرسال الآن"),
                t("Schedule for a specific day & time", "جدولة ليوم/ساعة معينة"),
                t("Smart quota consumption per plan", "استهلاك ذكي للحصة المسموحة"),
            ],
            tag: "consumeCampaignQuotaAtomic",
        },
        {
            icon: Gauge,
            title: t("Sending Engine", "محرك الإرسال"),
            desc: t("Processed in safe batches to protect your number", "معالجة على دفعات لحماية رقمك من الحظر"),
            chips: [
                t("200 messages per batch", "200 رسالة لكل دفعة"),
                t("350ms gap between every message", "فاصل 350 مللي ثانية بين كل رسالة"),
                t("Respects Meta's daily sending tier", "احترام تصنيف الإرسال اليومي من ميتا"),
            ],
            tag: "processCampaign · Inngest",
            note: t("Automatic protection from Meta backoff", "حماية تلقائية من إيقاف ميتا المؤقت"),
        },
        {
            icon: Eye,
            title: t("Live Tracking", "التتبع اللحظي"),
            desc: t("Real numbers, moment by moment", "أرقام حقيقية لحظة بلحظة") + " · LIVE",
            chips: [
                t("Sent → Delivered → Read", "تم الإرسال ← تم التسليم ← تمت القراءة"),
                t("Failed messages flagged instantly", "الرسائل الفاشلة تتضح فورًا"),
            ],
            tag: "sentCount / deliveredCount / readCount",
        },
        {
            icon: RefreshCcw,
            title: t("Smart Repeat", "التكرار الذكي"),
            desc: t("Re-run the same campaign in one click", "كرر نفس الحملة لنفس الجمهور بضغطة"),
            chips: [
                t("Available 48h after the original launch", "متاح بعد 48 ساعة من الإطلاق الأول"),
                t("Same template, same audience, automatically", "نفس القالب ونفس الأرقام تلقائيًا"),
            ],
            tag: "handleRepeat · 48h window",
        },
    ];

    const KPIS = [
        { icon: CheckCircle2, name: t("Delivery Rate", "معدل التسليم"), desc: t("Delivered messages ÷ sent messages", "الرسائل المُسلَّمة ÷ الرسائل المُرسَلة") },
        { icon: BarChart2, name: t("Read Rate", "معدل القراءة"), desc: t("Read messages ÷ sent messages", "الرسائل المقروءة ÷ الرسائل المُرسَلة") },
        { icon: ListChecks, name: t("Campaign Size", "حجم الحملة"), desc: t("Total queued vs. actually sent", "إجمالي الطابور مقابل المُرسَل فعليًا") },
    ];

    const PRACTICES = [
        t("Target the VIP or engaged segment for higher open rates", "استهدف شريحة VIP أو المتفاعلين لمعدلات فتح أعلى"),
        t("Use name variables — personalized messages get read more", "استخدم متغيرات الاسم في القالب — الرسائل الشخصية تُقرأ أكتر"),
        t("Schedule for your audience's active hours, not always \u201cnow\u201d", "جدول حملتك في وقت نشاط جمهورك بدل الإرسال الفوري دايمًا"),
        t("Watch the delivery rate in the first hour to catch issues early", "راقب معدل التسليم في أول ساعة عشان تلاحظ أي مشكلة بدري"),
    ];

    const dim = (i: number) => (active === i ? 1 : 0.08);
    const dimTransform = (i: number) => (active === i ? "scale(1)" : "scale(0.96)");

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
                            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}`, animation: reducedMotion ? "none" : "cp-pulse 2s infinite" }} />
                            {t("Wani Strategy · Smart Campaigns", "استراتيجية واني · الحملات الذكية")}
                        </div>
                    </div>

                    {/* Scene 1: Headline */}
                    <div style={{ position: "absolute", left: `${SCENES[1].camera.x * 100}%`, top: `${SCENES[1].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(1), transition: "opacity .6s", textAlign: "center", width: "min(90%, 560px)" }}>
                        <h1 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, lineHeight: 1.25, letterSpacing: isAr ? "0" : "-1px", color: "#f0f0f0" }}>
                            <WordReveal
                                text={t("Smart Campaigns", "الحملات الذكية")}
                                isActive={active === 1}
                                reducedMotion={reducedMotion}
                                highlight={[t("Smart", "الذكية")]}
                                baseDelay={80}
                                step={110}
                            />
                        </h1>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "12px", lineHeight: 1.7 }}>
                            <WordReveal
                                text={t("One voice reaching a thousand doors, all at once.", "صوت واحد بيوصل لألف باب، في نفس اللحظة.")}
                                isActive={active === 1}
                                reducedMotion={reducedMotion}
                                highlight={[t("thousand", "ألف")]}
                                baseDelay={480}
                                step={85}
                            />
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "18px", alignItems: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
                                <Users size={14} color={ACCENT} /> {t("From a precisely targeted audience", "من جمهور مستهدف بدقة")}
                            </div>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
                                <BarChart2 size={14} color={ACCENT} /> {t("To real-time analysis of every reply", "لتحليل لحظي لكل رد")}
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
                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{t("Integration required", "التكامل المطلوب")}</div>
                                <div style={{ fontSize: "16px", fontWeight: 800, color: "#f0f0f0", marginTop: "5px" }}>{t("Approved WhatsApp template", "قالب واتساب معتمد")}</div>
                            </div>
                        </div>
                    </div>

                    {/* Scenes 3-8: Mechanism nodes (×6 — pan يمين على كل خطوة) */}
                    {NODES.map((node, i) => {
                        const sceneIdx = 3 + i;
                        const cam = SCENES[sceneIdx].camera;
                        const Icon = node.icon;
                        return (
                            <div key={node.title} style={{ position: "absolute", left: `${cam.x * 100}%`, top: `${cam.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(sceneIdx)}`, opacity: dim(sceneIdx), transition: "opacity .6s, transform .6s", width: "min(84%, 250px)" }}>
                                <div style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${ACCENT}30`, background: "rgba(255,255,255,0.02)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                        <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <Icon size={14} color={ACCENT} />
                                        </div>
                                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace" }}>0{i + 1}</span>
                                    </div>
                                    <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", marginBottom: "4px" }}>{node.title}</h3>
                                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: node.chips ? "10px" : "0" }}>{node.desc}</p>
                                    {node.chips && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                            {node.chips.map((c: string, ci: number) => (
                                                <StaggerRow key={ci} text={c} index={ci} isActive={active === sceneIdx} reducedMotion={reducedMotion} />
                                            ))}
                                        </div>
                                    )}
                                    {node.tag && (
                                        <span style={{ display: "inline-block", marginTop: "8px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "2px 7px" }}>{node.tag}</span>
                                    )}
                                    {(node as any).note && (
                                        <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>
                                            <Timer size={12} color={ACCENT} /> {(node as any).note}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

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
                            <WordReveal
                                text={t("Ready to launch your first campaign?", "جاهز تطلق حملتك الأولى؟")}
                                isActive={active === 11}
                                reducedMotion={reducedMotion}
                                highlight={[t("launch", "تطلق")]}
                                baseDelay={80}
                                step={110}
                            />
                        </div>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: "20px" }}>
                            {t("Pick your audience, choose a template, and send — right from the dashboard.", "اختار جمهورك، اختار القالب، وابعت — من الداشبورد مباشرة.")}
                        </p>
                        <Link
                            href="/dashboard/campaigns"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "8px",
                                padding: "14px 30px",
                                background: `linear-gradient(135deg, ${ACCENT} 0%, #0ea5b8 100%)`,
                                color: "#04141a", fontWeight: 700, fontSize: "14px", borderRadius: "12px",
                                textDecoration: "none", whiteSpace: "nowrap",
                                animation: reducedMotion ? "none" : "cp-cta-pulse 2s ease-in-out infinite",
                                boxShadow: `0 4px 20px ${ACCENT}4d`,
                            }}
                        >
                            {t("Create Campaign Now", "أنشئ حملة الآن")}
                            <ForwardIcon size={15} />
                        </Link>
                        <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.25)", marginTop: "12px" }}>
                            {t("From the campaigns page", "من صفحة الحملات")}
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
                    animation: playing && !reducedMotion ? `cp-progress ${SCENES[active].duration}ms linear` : "none",
                    zIndex: 6,
                    width: "100%",
                    transformOrigin: "left",
                }} key={`progress-${active}-${playing}`} />
            </div>

            <style>{`
        @keyframes cp-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes cp-cta-pulse {
          0%,100% { box-shadow: 0 4px 20px ${ACCENT}4d, 0 0 0 0 ${ACCENT}66; }
          50% { box-shadow: 0 4px 20px ${ACCENT}4d, 0 0 0 12px ${ACCENT}00; }
        }
        @keyframes cp-progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}
            </style>
        </div>
    );
}
