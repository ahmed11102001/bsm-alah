"use client";

// ── RetargetingCinematic ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// نمط بصري مختلف عن باقي أفلام الاستراتيجيات عمدًا: قلب الفيلم مشهد "فرز"
// (SplitDiagram) — دايراميت بسيط بيوضح إزاي مصدر واحد (بيانات صفحة التقارير)
// بينقسم لمسارين: الكويسين (أخضر) والوحشين (أحمر)، كل واحد بخط متحرك ليه.
// باقي المشاهد بتستخدم نفس فكرة الكروت الموجودة في باقي الأفلام لكن بألوان
// دلالية (tone: good/bad) بدل اللون الموحّد، عشان التمييز البصري بين الفئتين
// يفضل واضح لحد آخر الفيلم. المحرك تحت (الكاميرا الافتراضية + الـ world)
// هو نفسه المستخدم في باقي الاستراتيجيات — الاختلاف كله في شكل وحركة المحتوى.
// ═══════════════════════════════════════════════════════════════════════════
// المحتوى هنا مبني على الآلية الحقيقية لصفحة التقارير في المشروع:
//   1) /dashboard/reports (تبويب "العملاء"): فرز جاهز فعليًا لخمس فئات —
//      engaged / no-response / new / archived / followup — عبر
//      /api/reports?type=customers&segment=... (route.ts).
//   2) /dashboard/reports/store: أعلى العملاء إنفاقًا (topCustomers) من
//      بيانات المتجر المربوط (Shopify / WooCommerce / EasyOrders).
//   3) القوائم دي بتتحول لجمهور حملة فعلي من /dashboard/campaigns
//      (audiences عبر /api/audiences) وترسل رسالة واتساب مستهدفة.

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
    Database, Filter, Users, Trophy, AlertTriangle, Rocket,
    RefreshCw, Repeat, MessageSquare, Target, CheckCircle2, Timer,
    Play, Pause, ArrowLeft, ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

// ─── Camera math (نفس محرك باقي الأفلام) ───────────────────────────────────
const WORLD_SCALE = 3;
const CAMERA_MS = 1100;
const ACCENT = "#fb7185"; // لون هوية استراتيجية "الريتاجت" في صفحة /strategies
const GOOD = "#34d399";   // لون دلالي لفئة "الكويسين"
const BAD = "#f87171";    // لون دلالي لفئة "الوحشين"

interface CameraTarget { x: number; y: number; scale: number; }
type SceneId =
    | "badge" | "headline" | "requirements"
    | "node0" | "node1" | "node2" | "node3" | "node4"
    | "kpis" | "practices" | "cta";
interface Scene { id: SceneId; duration: number; camera: CameraTarget; }

const SCENES: Scene[] = [
    { id: "badge", duration: 2400, camera: { x: 0.50, y: 0.09, scale: 2.6 } },
    { id: "headline", duration: 4600, camera: { x: 0.50, y: 0.25, scale: 1.15 } },
    { id: "requirements", duration: 3000, camera: { x: 0.50, y: 0.40, scale: 1.30 } },
    { id: "node0", duration: 2800, camera: { x: 0.12, y: 0.60, scale: 1.55 } },
    { id: "node1", duration: 4600, camera: { x: 0.34, y: 0.60, scale: 1.32 } },
    { id: "node2", duration: 3600, camera: { x: 0.56, y: 0.60, scale: 1.55 } },
    { id: "node3", duration: 3600, camera: { x: 0.75, y: 0.60, scale: 1.55 } },
    { id: "node4", duration: 3400, camera: { x: 0.94, y: 0.60, scale: 1.55 } },
    { id: "kpis", duration: 5200, camera: { x: 0.16, y: 0.85, scale: 1.05 } },
    { id: "practices", duration: 5200, camera: { x: 0.84, y: 0.85, scale: 1.05 } },
    { id: "cta", duration: 4400, camera: { x: 0.50, y: 0.98, scale: 1.30 } },
];

// ─── Staggered row (chips جوه كارت الخطوة) — بلون نقطة متغيّر حسب الفئة ─────
function StaggerRow({ text, index, isActive, reducedMotion, dotColor = ACCENT }: {
    text: string; index: number; isActive: boolean; reducedMotion: boolean; dotColor?: string;
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
            <span style={{ width: "14px", height: "2px", flexShrink: 0, opacity: 0.85, background: dotColor }} />
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

// ─── Split diagram (مشهد الفرز الذكي) ──────────────────────────────────────────
// مصدر واحد ("كل العملاء") بينقسم لمسارين برسمة SVG بسيطة: مسار أخضر
// للكويسين ومسار أحمر للوحشين، كل واحد بخط متحرك (dash flow) بيوحي بحركة
// البيانات وهي بتتفرز لحظة بلحظة.
function SplitDiagram({ isActive, reducedMotion, t }: {
    isActive: boolean; reducedMotion: boolean; t: (en: string, ar: string) => string;
}) {
    const [showGood, setShowGood] = useState(false);
    const [showBad, setShowBad] = useState(false);

    useEffect(() => {
        if (isActive && !reducedMotion) {
            const t1 = setTimeout(() => setShowGood(true), 500);
            const t2 = setTimeout(() => setShowBad(true), 850);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        } else if (isActive && reducedMotion) {
            setShowGood(true); setShowBad(true);
        } else {
            setShowGood(false); setShowBad(false);
        }
    }, [isActive, reducedMotion]);

    const pathStyle = (color: string): React.CSSProperties => ({
        stroke: color,
        strokeWidth: 2,
        fill: "none",
        strokeDasharray: "7 6",
        opacity: 0.85,
        animation: reducedMotion || !isActive ? "none" : "rt-dash 1.1s linear infinite",
    });

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Filter size={14} color={ACCENT} />
                </div>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace" }}>02</span>
            </div>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", marginBottom: "4px" }}>{t("Smart Split", "الفرز الذكي")}</h3>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "12px" }}>{t("Every customer takes a different path", "كل عميل بياخد مسار مختلف")}</p>

            <div style={{ position: "relative", width: "100%", aspectRatio: "250 / 140" }}>
                <svg viewBox="0 0 250 140" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                    <path d="M125,26 C125,52 70,52 70,80 L70,100" style={pathStyle(GOOD)} />
                    <path d="M125,26 C125,52 180,52 180,80 L180,100" style={pathStyle(BAD)} />
                </svg>

                {/* المصدر: كل العملاء */}
                <div style={{ position: "absolute", left: "50%", top: "8px", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: `1.5px solid ${ACCENT}`, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.03)" }}>
                        <Users size={12} color={ACCENT} />
                    </div>
                    <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{t("All customers", "كل العملاء")}</span>
                </div>

                {/* المسار الأخضر: الكويسين */}
                <div style={{
                    position: "absolute", left: "28%", top: "96px", transform: `translateX(-50%) translateY(${showGood ? 0 : 6}px)`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                    opacity: showGood ? 1 : 0,
                    transition: reducedMotion ? "none" : "opacity .4s, transform .4s",
                }}>
                    <Trophy size={13} color={GOOD} />
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: GOOD, whiteSpace: "nowrap" }}>{t("Good ones", "الكويسين")}</span>
                </div>

                {/* المسار الأحمر: الوحشين */}
                <div style={{
                    position: "absolute", left: "72%", top: "96px", transform: `translateX(-50%) translateY(${showBad ? 0 : 6}px)`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                    opacity: showBad ? 1 : 0,
                    transition: reducedMotion ? "none" : "opacity .4s, transform .4s",
                }}>
                    <AlertTriangle size={13} color={BAD} />
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: BAD, whiteSpace: "nowrap" }}>{t("At-risk ones", "الوحشين")}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Word-by-word reveal (زي كابشن فيديو) — بيتفكك النص لكلمات وكل كلمة
// بتظهر بتتابع بسيط (fade + rise + blur)، مع دعم تظليل كلمة أو أكتر بلون
// موحّد أو بلون مخصص لكل كلمة (highlightMap) — عشان نلوّن "الكويسين" أخضر
// و"الوحشين" أحمر جوه نفس الجملة.
function WordReveal({
    text, isActive, reducedMotion, highlight = [], highlightMap = [], baseDelay = 0, step = 90,
    style,
}: {
    text: string; isActive: boolean; reducedMotion: boolean;
    highlight?: string[]; highlightMap?: { word: string; color: string }[];
    baseDelay?: number; step?: number;
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
                const nw = norm(word).toLowerCase();
                const mapped = highlightMap.find((h) => norm(h.word).toLowerCase() === nw);
                const isHi = mapped ? true : highlight.some((h) => norm(h).toLowerCase() === nw);
                const hiColor = mapped ? mapped.color : ACCENT;
                const delay = baseDelay + i * step;
                return (
                    <span
                        key={i}
                        style={{
                            display: "inline-block",
                            opacity: visible || reducedMotion ? 1 : 0,
                            filter: visible || reducedMotion ? "blur(0px)" : "blur(4px)",
                            transform: visible || reducedMotion ? "translateY(0)" : "translateY(8px)",
                            transition: reducedMotion ? "none" : `opacity .5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, filter .5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform .5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
                            marginInlineEnd: "0.28em",
                            color: isHi ? hiColor : undefined,
                            fontWeight: isHi ? 800 : undefined,
                            backgroundImage: isHi ? `linear-gradient(${hiColor}, ${hiColor})` : undefined,
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

// ─── Node data type — الخطوة التقليدية (كارت أيقونة + شيبس) أو المشهد
// المخصص (custom: true) اللي بيترسم بيه SplitDiagram بدل الكارت العادي.
type NodeData =
    | { custom: true }
    | {
        custom: false;
        icon: React.ElementType;
        title: string;
        desc: string;
        chips?: string[];
        tag?: string;
        note?: string;
        tone?: "good" | "bad";
    };

export default function RetargetingCinematic() {
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

    // ─── محتوى حقيقي (مبني على /dashboard/reports و /dashboard/campaigns) ─────
    const NODES: NodeData[] = [
        {
            custom: false,
            icon: Database,
            title: t("Reading the Data", "قراءة البيانات"),
            desc: t("Wani reads every customer's report as it happens", "واني بتقرا تقرير كل عميل أول بأول"),
            chips: [
                t("Messages & replies", "الرسائل والردود") + " · Reports API",
                t("Last interaction", "آخر تفاعل") + " · lastMessageAt",
                t("Orders & spend", "الطلبات وقيمة الإنفاق") + " · StoreOrder",
            ],
            tag: "DataSync",
        },
        { custom: true },
        {
            custom: false,
            icon: Trophy,
            title: t("The Good Ones", "الكويسين"),
            desc: t("Most active, highest spending", "الأنشط وأعلى إنفاقًا") + " · VIP_SEGMENT",
            tone: "good",
            chips: [
                t("Reply within hours", "بيردوا خلال ساعات"),
                t("Repeat VIP purchases", "شراء متكرر من عملاء VIP"),
                t("High open & read rate", "معدل فتح وقراءة عالي"),
            ],
            note: t("Message: reward + exclusive offer", "الرسالة: مكافأة + عرض حصري"),
        },
        {
            custom: false,
            icon: AlertTriangle,
            title: t("The At-Risk Ones", "الوحشين"),
            desc: t("Least engaged, most likely to churn", "الأقل تفاعلًا والأكتر عرضة للفقد") + " · AT_RISK_SEGMENT",
            tone: "bad",
            chips: [
                t("No reply in 14+ days", "محدش رد من أكتر من 14 يوم"),
                t("Left the cart without finishing", "سابوا السلة من غير إتمام"),
                t("Archived the conversation", "أرشفوا المحادثة"),
            ],
            note: t("Message: we miss you + a reason to return", "الرسالة: افتقدناك + سبب للرجوع"),
        },
        {
            custom: false,
            icon: Rocket,
            title: t("Launch", "الإطلاق"),
            desc: t("Two separate campaigns, one click", "حملتين منفصلتين بضغطة واحدة"),
            chips: [
                t("Good-ones campaign → exclusive VIP offer", "حملة الكويسين → عرض حصري VIP"),
                t("At-risk campaign → win-back coupon", "حملة الوحشين → كوبون استرجاع"),
                t("Sent from the same campaigns screen", "الإرسال من نفس شاشة الحملات"),
            ],
            tag: "ReadyToSend",
        },
    ];

    const KPIS = [
        { icon: RefreshCw, name: t("Reactivation Rate", "معدل إعادة التفعيل"), desc: t("At-risk customers who engaged again ÷ those targeted", "الوحشين اللي رجعوا يتفاعلوا ÷ اللي استهدفناهم") },
        { icon: Repeat, name: t("VIP Repeat Purchase", "تكرار الشراء عند الكويسين"), desc: t("New orders from the same VIP customers", "طلبات جديدة من نفس عملاء الـ VIP") },
        { icon: MessageSquare, name: t("Win-back Reply Rate", "معدل الرد على رسائل الاسترجاع"), desc: t("Replies to the at-risk campaign ÷ messages sent", "ردود حملة الوحشين ÷ الرسائل المُرسلة") },
    ];

    const PRACTICES = [
        t("Re-run the split every couple of weeks — behavior changes fast", "أعد الفرز كل أسبوعين — سلوك العملاء بيتغيّر بسرعة"),
        t("Connect your store so spend, not just replies, shapes the split", "اربط متجرك عشان قيمة الإنفاق تدخل في الفرز مش الردود بس"),
        t("Make the at-risk message a question, not a pitch — it lifts replies", "خلّي رسالة الوحشين سؤال مش بيع مباشر — بترفع نسبة الرد"),
        t("Never send the same message to both segments — each has a different motive", "متبعتش نفس الرسالة للفئتين — كل فئة عندها دافع مختلف"),
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
                    background: "radial-gradient(ellipse at 50% 30%, #1a0e12 0%, #0a0708 70%)",
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
                            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}`, animation: reducedMotion ? "none" : "rt-pulse 2s infinite" }} />
                            {t("Wani Strategy · Retargeting", "استراتيجية واني · الريتاجت")}
                        </div>
                    </div>

                    {/* Scene 1: Headline */}
                    <div style={{ position: "absolute", left: `${SCENES[1].camera.x * 100}%`, top: `${SCENES[1].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(1), transition: "opacity .6s", textAlign: "center", width: "min(90%, 560px)" }}>
                        <h1 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, lineHeight: 1.25, letterSpacing: isAr ? "0" : "-1px", color: "#f0f0f0" }}>
                            <WordReveal
                                text={t("Retargeting", "الريتاجت")}
                                isActive={active === 1}
                                reducedMotion={reducedMotion}
                                highlight={[t("Retargeting", "الريتاجت")]}
                                baseDelay={80}
                                step={110}
                            />
                        </h1>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "12px", lineHeight: 1.7 }}>
                            <WordReveal
                                text={t(
                                    "Not all customers are alike — split the good ones from the at-risk ones, and speak to each in their own language.",
                                    "مش كل العملاء زي بعض — افرز الكويسين من الوحشين، وكلّم كل واحد بلغته."
                                )}
                                isActive={active === 1}
                                reducedMotion={reducedMotion}
                                highlightMap={[
                                    { word: t("good", "الكويسين"), color: GOOD },
                                    { word: t("at-risk", "الوحشين"), color: BAD },
                                ]}
                                baseDelay={480}
                                step={75}
                            />
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "18px", alignItems: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
                                <Target size={14} color={ACCENT} /> {t("From report data… to precise targeting", "من بيانات التقارير… لاستهداف دقيق")}
                            </div>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
                                <CheckCircle2 size={14} color={ACCENT} /> {t("Without opening a single spreadsheet", "من غير ما تفتح ملف إكسيل واحد")}
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
                                <div style={{ fontSize: "16px", fontWeight: 800, color: "#f0f0f0", marginTop: "5px" }}>{t("Professional & up", "Professional فأعلى")}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{t("Integration required", "التكامل المطلوب")}</div>
                                <div style={{ fontSize: "16px", fontWeight: 800, color: "#f0f0f0", marginTop: "5px" }}>{t("Reports data + store link (optional)", "بيانات التقارير + ربط المتجر (اختياري)")}</div>
                            </div>
                        </div>
                    </div>

                    {/* Scenes 3-7: Mechanism nodes (×5 — الفرز في النص) */}
                    {NODES.map((node, i) => {
                        const sceneIdx = 3 + i;
                        const cam = SCENES[sceneIdx].camera;
                        const borderColor = node.custom ? ACCENT : (node.tone === "good" ? GOOD : node.tone === "bad" ? BAD : ACCENT);
                        return (
                            <div
                                key={i}
                                style={{
                                    position: "absolute",
                                    left: `${cam.x * 100}%`,
                                    top: `${cam.y * 100}%`,
                                    transform: `translate(-50%,-50%) ${dimTransform(sceneIdx)}`,
                                    opacity: dim(sceneIdx),
                                    transition: "opacity .6s, transform .6s",
                                    width: node.custom ? "min(90%, 280px)" : "min(84%, 250px)",
                                }}
                            >
                                <div style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${borderColor}30`, background: "rgba(255,255,255,0.02)" }}>
                                    {node.custom ? (
                                        <SplitDiagram isActive={active === sceneIdx} reducedMotion={reducedMotion} t={t} />
                                    ) : (
                                        <>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                                <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `${borderColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    <node.icon size={14} color={borderColor} />
                                                </div>
                                                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace" }}>0{i + 1}</span>
                                            </div>
                                            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", marginBottom: "4px" }}>{node.title}</h3>
                                            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: node.chips ? "10px" : "0" }}>{node.desc}</p>
                                            {node.chips && (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    {node.chips.map((c, ci) => (
                                                        <StaggerRow key={ci} text={c} index={ci} isActive={active === sceneIdx} reducedMotion={reducedMotion} dotColor={borderColor} />
                                                    ))}
                                                </div>
                                            )}
                                            {node.tag && (
                                                <span style={{ display: "inline-block", marginTop: "8px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "2px 7px" }}>{node.tag}</span>
                                            )}
                                            {node.note && (
                                                <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>
                                                    <Timer size={12} color={borderColor} /> {node.note}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Scene 8: KPIs — staggered entry */}
                    <div style={{ position: "absolute", left: `${SCENES[8].camera.x * 100}%`, top: `${SCENES[8].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(8), transition: "opacity .6s", width: "min(88%, 360px)" }}>
                        <p style={{ fontSize: "11px", letterSpacing: "2px", color: ACCENT, fontFamily: "'JetBrains Mono',monospace", marginBottom: "16px" }}>
                            {t("SUCCESS METRICS", "مؤشرات النجاح")}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {KPIS.map((k, i) => (
                                <KpiRow key={k.name} icon={k.icon} name={k.name} desc={k.desc} index={i} isActive={active === 8} reducedMotion={reducedMotion} />
                            ))}
                        </div>
                    </div>

                    {/* Scene 9: Best practices — numbered, staggered */}
                    <div style={{ position: "absolute", left: `${SCENES[9].camera.x * 100}%`, top: `${SCENES[9].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(9), transition: "opacity .6s", width: "min(88%, 360px)" }}>
                        <p style={{ fontSize: "11px", letterSpacing: "2px", color: ACCENT, fontFamily: "'JetBrains Mono',monospace", marginBottom: "16px" }}>
                            {t("BEST PRACTICES", "أفضل الممارسات")}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {PRACTICES.map((p, i) => (
                                <TipRow key={i} n={i + 1} text={p} index={i} isActive={active === 9} reducedMotion={reducedMotion} />
                            ))}
                        </div>
                    </div>

                    {/* Scene 10: CTA */}
                    <div style={{ position: "absolute", left: `${SCENES[10].camera.x * 100}%`, top: `${SCENES[10].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(10), transition: "opacity .6s", textAlign: "center", width: "min(85%, 380px)" }}>
                        <div style={{ fontSize: "22px", fontWeight: 800, color: "#f0f0f0", lineHeight: 1.3, marginBottom: "8px", letterSpacing: isAr ? "0" : "-0.5px" }}>
                            <WordReveal
                                text={t("Ready to retarget your customers?", "جاهز تستهدف عملاءك من جديد؟")}
                                isActive={active === 10}
                                reducedMotion={reducedMotion}
                                highlight={[t("retarget", "تستهدف")]}
                                baseDelay={80}
                                step={110}
                            />
                        </div>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: "20px" }}>
                            {t("Start from the Reports page — the split is ready in minutes.", "ابدأ من صفحة التقارير — الفرز هيبقى جاهز في دقايق.")}
                        </p>
                        <Link
                            href="/dashboard/reports?tab=customers"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "8px",
                                padding: "14px 30px",
                                background: `linear-gradient(135deg, ${ACCENT} 0%, #c94f63 100%)`,
                                color: "#210a0e", fontWeight: 700, fontSize: "14px", borderRadius: "12px",
                                textDecoration: "none", whiteSpace: "nowrap",
                                animation: reducedMotion ? "none" : "rt-cta-pulse 2s ease-in-out infinite",
                                boxShadow: `0 4px 20px ${ACCENT}4d`,
                            }}
                        >
                            {t("Open Reports", "افتح صفحة التقارير")}
                            <ForwardIcon size={15} />
                        </Link>
                        <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.25)", marginTop: "12px" }}>
                            {t("From the Customers tab in Reports", "من تبويب العملاء في التقارير")}
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
                    animation: playing && !reducedMotion ? `rt-progress ${SCENES[active].duration}ms linear` : "none",
                    zIndex: 6,
                    width: "100%",
                    transformOrigin: "left",
                }} key={`progress-${active}-${playing}`} />
            </div>

            <style>{`
        @keyframes rt-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes rt-cta-pulse {
          0%,100% { box-shadow: 0 4px 20px ${ACCENT}4d, 0 0 0 0 ${ACCENT}66; }
          50% { box-shadow: 0 4px 20px ${ACCENT}4d, 0 0 0 12px ${ACCENT}00; }
        }
        @keyframes rt-progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        @keyframes rt-dash {
          to { stroke-dashoffset: -26; }
        }
      `}
            </style>
        </div>
    );
}
