"use client";

// ── OrderConfirmationCinematic ──────────────────────────────────────────────
// نفس ميكانيزم AbandonedCartCinematic (وHeroCinematic الأصلي): كاميرا وهمية
// بتتحرك جوه "كادر" ثابت — "world" افتراضي 3× حجم الإطار، وكل مشهد متحط في
// إحداثيات ثابتة جواه، والكاميرا بتتنقل بينهم (translate + scale).
// المحتوى هنا مبني على الآلية الحقيقية لتأكيد الأوردرات في المشروع:
//   1) StoreAutomation (order_confirm) بترسل القالب المعتمد فور وصول الأوردر
//      من المتجر (Shopify/EasyOrders/WooCommerce)، بزرارين: تأكيد/إلغاء.
//   2) SmartFollowUp (handleOrderConfirmReply) بتستقبل رد العميل:
//      — CONFIRM_ORDER → رسالة شكر وخلاص.
//      — CANCEL_ORDER  → سؤال عن السبب (3 خيارات)، صلاحية 48 ساعة.
//      — اختيار السبب  → رسالة شكر + تنبيه فوري لصاحب الحساب.

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
    PackageCheck, MessageCircle, CheckCircle2, HelpCircle,
    Timer, BarChart2, Play, Pause, ArrowLeft, ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

// ─── Camera math ──────────────────────────────────────────────────────────────
const WORLD_SCALE = 3;
const CAMERA_MS = 1100;
const ACCENT = "#bcd2ff"; // نفس لون هوية "تأكيد الطلب" في صفحة /strategies

interface CameraTarget { x: number; y: number; scale: number; }
type SceneId =
    | "badge" | "headline" | "requirements"
    | "node0" | "node1" | "node2" | "node3" | "node4"
    | "kpis" | "practices" | "cta";
interface Scene { id: SceneId; duration: number; camera: CameraTarget; }

const SCENES: Scene[] = [
    { id: "badge", duration: 2400, camera: { x: 0.50, y: 0.09, scale: 2.6 } },
    { id: "headline", duration: 4200, camera: { x: 0.50, y: 0.25, scale: 1.15 } },
    { id: "requirements", duration: 3000, camera: { x: 0.50, y: 0.40, scale: 1.30 } },
    { id: "node0", duration: 2600, camera: { x: 0.13, y: 0.60, scale: 1.55 } },
    { id: "node1", duration: 3600, camera: { x: 0.32, y: 0.60, scale: 1.55 } },
    { id: "node2", duration: 3000, camera: { x: 0.51, y: 0.60, scale: 1.55 } },
    { id: "node3", duration: 3800, camera: { x: 0.70, y: 0.60, scale: 1.55 } },
    { id: "node4", duration: 3600, camera: { x: 0.89, y: 0.60, scale: 1.55 } },
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

export default function OrderConfirmationCinematic() {
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

    // ─── محتوى حقيقي (مبني على smart-followup.ts + store-automation.ts) ────────
    const NODES = [
        {
            icon: PackageCheck,
            title: t("Order Received", "استلام الطلب"),
            desc: t("The store order triggers the automation instantly", "الأوردر بييجي من المتجر ويشغّل الأتمتة تلقائيًا"),
            tag: "StoreAutomation · order_confirm",
        },
        {
            icon: MessageCircle,
            title: t("Confirmation Sent", "إرسال رسالة التأكيد"),
            desc: t("Approved template with two buttons", "قالب معتمد فيه زرارين") + " · SENT",
            chips: [
                t("Meta-approved template", "قالب معتمد من واتساب") + " · Meta",
                t("Confirm order button", "زرار تأكيد الطلب") + " · CONFIRM_ORDER",
                t("Cancel order button", "زرار إلغاء الطلب") + " · CANCEL_ORDER",
            ],
        },
        {
            icon: CheckCircle2,
            title: t("Customer Confirms", "تأكيد العميل"),
            desc: t("Instant thank-you reply", "رد شكر فوري") + " · CONFIRM_ORDER",
            chips: [
                t("\u201cThanks for confirming, we're preparing it now\u201d", "«شكرًا لتأكيد طلبك، جاري تجهيزه الآن»"),
            ],
        },
        {
            icon: HelpCircle,
            title: t("Cancellation & Reason", "إلغاء ومعرفة السبب"),
            desc: t("Why? 3 possible reasons", "ليه؟ 3 أسباب محتملة") + " · AWAITING_REASON",
            chips: [
                t("Price is too high", "السعر مرتفع"),
                t("Changed my mind", "غيرت رأيي"),
                t("Other reason", "سبب تاني"),
            ],
            warn: true,
            note: t("48h validity window", "48 ساعة صلاحية للرد"),
        },
        {
            icon: CheckCircle2,
            title: t("Closing", "الإغلاق"),
            desc: t("Two things happen at once", "حاجتين بيحصلوا مع بعض") + " · DONE",
            chips: [
                t("Thank-you message sent to the customer", "رسالة شكر للعميل"),
                t("Instant alert to the account owner", "تنبيه فوري لصاحب الحساب") + " · notifySmartFollowUpAlert",
            ],
        },
    ];

    const KPIS = [
        { icon: BarChart2, name: t("Confirmation Rate", "معدل تأكيد الطلبات"), desc: t("\u201cConfirm order\u201d replies ÷ orders sent", "ردود «تأكيد الطلب» ÷ الأوردرات المُرسلة") },
        { icon: HelpCircle, name: t("Top Cancellation Reason", "أهم سبب إلغاء"), desc: t("Aggregated reasons: price / hesitation / other", "الأسباب المجمّعة: سعر / تردد / سبب تاني") },
        { icon: Timer, name: t("Response Time", "زمن الاستجابة"), desc: t("Gap between the order and the customer's reply", "الفرق بين وقت الأوردر ورد العميل") },
    ];

    const PRACTICES = [
        t("Send the confirmation the moment the order lands — don't delay it", "ابعت التأكيد لحظة ما الأوردر يوصل، من غير أي تأخير"),
        t("Link \u201cprice too high\u201d cancellations to a simple auto-discount", "اربط إلغاءات «السعر مرتفع» بخصم تلقائي بسيط"),
        t("Watch the confirmation template's approval status closely", "راقب حالة اعتماد قالب التأكيد أول بأول"),
        t("Review cancellation reasons weekly to catch real problems early", "راجع أسباب الإلغاء أسبوعيًا عشان تلاحظ أي مشكلة حقيقية بدري"),
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
                            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}`, animation: reducedMotion ? "none" : "oc-pulse 2s infinite" }} />
                            {t("Wani Strategy · Order Confirmation", "استراتيجية واني · تأكيد الطلب")}
                        </div>
                    </div>

                    {/* Scene 1: Headline */}
                    <div style={{ position: "absolute", left: `${SCENES[1].camera.x * 100}%`, top: `${SCENES[1].camera.y * 100}%`, transform: "translate(-50%,-50%)", opacity: dim(1), transition: "opacity .6s", textAlign: "center", width: "min(90%, 560px)" }}>
                        <h1 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, lineHeight: 1.25, letterSpacing: isAr ? "0" : "-1px", color: "#f0f0f0" }}>
                            <WordReveal
                                text={t("Order Confirmation", "تأكيد الطلب")}
                                isActive={active === 1}
                                reducedMotion={reducedMotion}
                                highlight={[t("Confirmation", "تأكيد")]}
                                baseDelay={80}
                                step={110}
                            />
                        </h1>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "12px", lineHeight: 1.7 }}>
                            <WordReveal
                                text={t("The first reassurance a customer feels after buying.", "أول طمأنينة يحسها العميل بعد الشراء.")}
                                isActive={active === 1}
                                reducedMotion={reducedMotion}
                                highlight={[t("reassurance", "طمأنينة")]}
                                baseDelay={480}
                                step={85}
                            />
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "18px", alignItems: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
                                <PackageCheck size={14} color={ACCENT} /> {t("From a placed order… to a confirmed one", "من أوردر واصل… لأوردر متأكّد")}
                            </div>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
                                <CheckCircle2 size={14} color={ACCENT} /> {t("Without any manual intervention", "من غير أي تدخل يدوي")}
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
                                <div style={{ fontSize: "16px", fontWeight: 800, color: "#f0f0f0", marginTop: "5px" }}>{t("Store integration", "ربط المتجر")}</div>
                            </div>
                        </div>
                    </div>

                    {/* Scenes 3-7: Mechanism nodes (×5 — pan يمين على كل خطوة) */}
                    {NODES.map((node, i) => {
                        const sceneIdx = 3 + i;
                        const cam = SCENES[sceneIdx].camera;
                        const Icon = node.icon;
                        return (
                            <div key={node.title} style={{ position: "absolute", left: `${cam.x * 100}%`, top: `${cam.y * 100}%`, transform: `translate(-50%,-50%) ${dimTransform(sceneIdx)}`, opacity: dim(sceneIdx), transition: "opacity .6s, transform .6s", width: "min(84%, 250px)" }}>
                                <div style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${(node as any).warn ? "#7a322055" : ACCENT + "30"}`, background: "rgba(255,255,255,0.02)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                        <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <Icon size={14} color={ACCENT} />
                                        </div>
                                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace" }}>0{i + 1}</span>
                                    </div>
                                    <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#f0f0f0", marginBottom: "4px" }}>{node.title}</h3>
                                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: (node as any).chips ? "10px" : "0" }}>{node.desc}</p>
                                    {(node as any).chips && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                            {(node as any).chips.map((c: string, ci: number) => (
                                                <StaggerRow key={ci} text={c} index={ci} isActive={active === sceneIdx} reducedMotion={reducedMotion} warn={(node as any).warn} />
                                            ))}
                                        </div>
                                    )}
                                    {(node as any).tag && (
                                        <span style={{ display: "inline-block", marginTop: "8px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "2px 7px" }}>{(node as any).tag}</span>
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
                                text={t("Ready to activate the strategy?", "جاهز نفعّل الاستراتيجية؟")}
                                isActive={active === 10}
                                reducedMotion={reducedMotion}
                                highlight={[t("activate", "نفعّل")]}
                                baseDelay={80}
                                step={110}
                            />
                        </div>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: "20px" }}>
                            {t("Turn it on right from the dashboard — no code, no setup steps.", "فعّلها من الداشبورد مباشرة — من غير أي كود أو خطوات إعداد.")}
                        </p>
                        <Link
                            href="/dashboard/store"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "8px",
                                padding: "14px 30px",
                                background: `linear-gradient(135deg, ${ACCENT} 0%, #7d9dd9 100%)`,
                                color: "#0b1220", fontWeight: 700, fontSize: "14px", borderRadius: "12px",
                                textDecoration: "none", whiteSpace: "nowrap",
                                animation: reducedMotion ? "none" : "oc-cta-pulse 2s ease-in-out infinite",
                                boxShadow: `0 4px 20px ${ACCENT}4d`,
                            }}
                        >
                            {t("Activate Now", "فعّل الاستراتيجية الآن")}
                            <ForwardIcon size={15} />
                        </Link>
                        <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.25)", marginTop: "12px" }}>
                            {t("From store automation settings", "من إعدادات أتمتة المتجر")}
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
                    animation: playing && !reducedMotion ? `oc-progress ${SCENES[active].duration}ms linear` : "none",
                    zIndex: 6,
                    width: "100%",
                    transformOrigin: "left",
                }} key={`progress-${active}-${playing}`} />
            </div>

            <style>{`
        @keyframes oc-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes oc-cta-pulse {
          0%,100% { box-shadow: 0 4px 20px ${ACCENT}4d, 0 0 0 0 ${ACCENT}66; }
          50% { box-shadow: 0 4px 20px ${ACCENT}4d, 0 0 0 12px ${ACCENT}00; }
        }
        @keyframes oc-progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}
            </style>
        </div>
    );
}