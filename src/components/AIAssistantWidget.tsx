"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Bot, Loader2, ChevronDown } from "lucide-react";
import type { Lang } from "@/lib/translations";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════
interface Message {
  id:   string;
  role: "bot" | "user";
  text: string;
}
type Step = "welcome" | "business" | "goal" | "volume" | "form" | "done";
interface Selections {
  business?: string;
  businessLabel?: string;
  goal?:     string;
  volume?:   string;
}

const STORAGE_KEY = "wp_widget_v1"; // "dismissed" | "done"

// ═══════════════════════════════════════════════════════════════════════════════
// Flow content  (AR + EN)
// ═══════════════════════════════════════════════════════════════════════════════
const FLOW = {
  ar: {
    title:    "مساعد واتس +AI",
    online:   "متصل الآن",
    powered:  "مدعوم بالذكاء الاصطناعي",
    proactive:"عايز تعرف إذا واتس برو مناسب لنشاطك؟ 👋",

    welcome:  "👋 أهلاً بيك في واتس برو!\nأقدر أساعدك تعرف إذا السيستم مناسب لنشاطك في دقيقة واحدة بس.",
    welcomeButtons: [
      { label: "ابدأ 🚀",   value: "start"  },
      { label: "لاحقاً",    value: "later"  },
    ],

    step1Q: "ممتاز! نشاطك إيه؟ 👇",
    step1Buttons: [
      { label: "🛍️ متجر إلكتروني", value: "store"       },
      { label: "🏢 شركة خدمات",    value: "services"    },
      { label: "🏥 عيادة",          value: "clinic"      },
      { label: "🏠 عقارات",         value: "real_estate" },
      { label: "🍕 مطعم",           value: "restaurant"  },
      { label: "💼 نشاط آخر",       value: "other"       },
    ],
    valueProps: {
      store:       "🚀 ممتاز! أغلب المتاجر بتستخدم واتس برو لتأكيد الطلبات، استرجاع السلات المتروكة، وزيادة المبيعات تلقائياً.",
      services:    "🚀 ممتاز! شركات الخدمات بتستخدم واتس برو لمتابعة الليدز تلقائياً وتقليل وقت الرد جداً.",
      clinic:      "🚀 ممتاز! العيادات بتستخدم واتس برو لتأكيد المواعيد وتقليل الـ no-shows بنسبة تصل لـ 60%.",
      real_estate: "🚀 ممتاز! المطورين العقاريين بيستخدموا واتس برو لمتابعة العملاء المهتمين على مدار الساعة.",
      restaurant:  "🚀 ممتاز! المطاعم بتستخدم واتس برو لتأكيد الطلبات، التوصيل، والعروض الخاصة.",
      other:       "🚀 ممتاز! واتس برو مناسب لأي نشاط تجاري بيتعامل مع عملاء على الواتساب.",
    } as Record<string, string>,

    step2Q: "إيه أهم حاجة محتاجها؟ 🎯",
    step2Buttons: [
      { label: "🤖 أتمتة الردود",   value: "automation"   },
      { label: "📢 حملات واتساب",   value: "campaigns"    },
      { label: "🔗 ربط المتجر",     value: "integration"  },
      { label: "✨ كل ده",           value: "all"          },
    ],

    socialProof: "🔥 +200 بيزنس بيستخدم واتس برو يومياً لزيادة مبيعاتهم على الواتساب.",
    step3Q:      "تقريبًا بيوصلك كام رسالة يوميًا؟ 📊",
    step3Buttons: [
      { label: "أقل من 50",  value: "<50"      },
      { label: "50 – 200",   value: "50-200"   },
      { label: "200 – 1000", value: "200-1000" },
      { label: "+1000",      value: "+1000"    },
    ],

    step4Msg:  "👌 أقدر أجهزلك أفضل Setup مناسب لنشاطك تمامًا.\n\nسيب بياناتك وفريقنا هيتواصل معاك خلال ساعات! 🎉",
    namePh:    "اسمك...",
    phonePh:   "رقم الواتساب (مثال: 01012345678)",
    submitBtn: "احجز Setup مجاني ✅",
    sending:   "جاري الإرسال...",
    nameErr:   "من فضلك اكتب اسمك",
    phoneErr:  "من فضلك اكتب رقم واتساب صحيح",

    doneMsg:      "✅ تم! فريق واتس برو هيتواصل معاك قريبًا.",
    ctaWhatsapp:  "💬 تواصل مع السيلز",
    ctaPricing:   "💰 شوف الأسعار",
    ctaScroll:    "📖 اعرف أكتر",
    waMsg:        (name: string, biz: string, goal: string) =>
      `مرحباً! اسمي ${name}، عندي ${biz} وأهتم بـ ${goal} — عايز أعرف أكتر عن واتس برو.`,
    progress:     (step: number, total: number) => `${step} / ${total}`,
  },

  en: {
    title:    "WhatsPro +AI Assistant",
    online:   "Online now",
    powered:  "Powered by AI",
    proactive:"Want to know if WhatsPro fits your business? 👋",

    welcome:  "👋 Welcome to WhatsPro!\nI can help you find out if our system fits your business — in just a minute.",
    welcomeButtons: [
      { label: "Let's Start 🚀", value: "start" },
      { label: "Maybe Later",    value: "later" },
    ],

    step1Q: "Great! What's your business type? 👇",
    step1Buttons: [
      { label: "🛍️ Online Store",    value: "store"       },
      { label: "🏢 Service Company", value: "services"    },
      { label: "🏥 Clinic",          value: "clinic"      },
      { label: "🏠 Real Estate",     value: "real_estate" },
      { label: "🍕 Restaurant",      value: "restaurant"  },
      { label: "💼 Other",           value: "other"       },
    ],
    valueProps: {
      store:       "🚀 Great! Most online stores use WhatsPro to confirm orders, recover abandoned carts, and automate sales.",
      services:    "🚀 Great! Service companies use WhatsPro to follow up on leads automatically and cut response times.",
      clinic:      "🚀 Great! Clinics use WhatsPro to confirm appointments and reduce no-shows by up to 60%.",
      real_estate: "🚀 Great! Real estate developers use WhatsPro to follow up with interested clients 24/7.",
      restaurant:  "🚀 Great! Restaurants use WhatsPro for order confirmations, delivery updates, and special offers.",
      other:       "🚀 Great! WhatsPro works for any business that communicates with customers on WhatsApp.",
    } as Record<string, string>,

    step2Q: "What's your top priority? 🎯",
    step2Buttons: [
      { label: "🤖 Automate Replies",   value: "automation"  },
      { label: "📢 WhatsApp Campaigns", value: "campaigns"   },
      { label: "🔗 Store Integration",  value: "integration" },
      { label: "✨ All of the above",   value: "all"         },
    ],

    socialProof: "🔥 200+ businesses use WhatsPro daily to boost their WhatsApp sales.",
    step3Q:      "How many messages do you receive daily? 📊",
    step3Buttons: [
      { label: "Less than 50", value: "<50"      },
      { label: "50 – 200",     value: "50-200"   },
      { label: "200 – 1,000",  value: "200-1000" },
      { label: "+1,000",       value: "+1000"    },
    ],

    step4Msg:  "👌 I can help you set up the perfect plan for your business.\n\nLeave your info and our team will reach out within hours! 🎉",
    namePh:    "Your name...",
    phonePh:   "WhatsApp number (e.g. +201012345678)",
    submitBtn: "Book Free Setup ✅",
    sending:   "Sending...",
    nameErr:   "Please enter your name",
    phoneErr:  "Please enter a valid WhatsApp number",

    doneMsg:      "✅ Done! The WhatsPro team will contact you soon.",
    ctaWhatsapp:  "💬 Chat with Sales",
    ctaPricing:   "💰 View Pricing",
    ctaScroll:    "📖 Learn More",
    waMsg:        (name: string, biz: string, goal: string) =>
      `Hi! My name is ${name}, I have a ${biz} and I'm interested in ${goal} — I'd love to learn more about WhatsPro.`,
    progress:     (step: number, total: number) => `${step} / ${total}`,
  },
} as const;

const TOTAL_STEPS = 4; // 1:business 2:goal 3:volume 4:form

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════
let _msgId = 0;
const uid = () => `m${++_msgId}`;

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-gray-400 opacity-60"
          style={{ animation: `wpBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function AIAssistantWidget({ lang }: { lang: Lang }) {
  const f   = FLOW[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [isOpen,     setIsOpen]     = useState(false);
  const [step,       setStep]       = useState<Step>("welcome");
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [isTyping,   setIsTyping]   = useState(false);
  const [selections, setSelections] = useState<Selections>({});
  const [showForm,   setShowForm]   = useState(false);
  const [formName,   setFormName]   = useState("");
  const [formPhone,  setFormPhone]  = useState("");
  const [formErr,    setFormErr]    = useState<{name?:string;phone?:string}>({});
  const [formStartT, setFormStartT] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [proactive,  setProactive]  = useState(false);
  const [dismissed,  setDismissed]  = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const openTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proactiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SALES_WA = process.env.NEXT_PUBLIC_SALES_WHATSAPP ?? "201281657907";

  // ── Scroll to bottom on new messages ────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, showForm]);

  // ── Session storage read ─────────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "done") {
      setStep("done");
    }
    if (stored === "dismissed" || stored === "done") {
      setDismissed(true);
      return;
    }
    // Auto-open after 7s + proactive bubble after 5s
    proactiveTimerRef.current = setTimeout(() => setProactive(true), 5000);
    openTimerRef.current      = setTimeout(() => {
      setIsOpen(true);
      setProactive(false);
    }, 7000);

    return () => {
      if (openTimerRef.current)      clearTimeout(openTimerRef.current);
      if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    };
  }, []);

  // ── Initialize messages when opened ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen || messages.length > 0) return;
    // لو المستخدم كان عنده progress قديم — بنبدأ من الأول دلوقتي (single session)
    pushBotMessage(f.welcome);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const pushBotMessage = useCallback(
    (text: string, delay = 600) => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: uid(), role: "bot", text }]);
      }, delay);
    },
    []
  );

  const pushUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: uid(), role: "user", text }]);
  };

  // ── Open / Close ─────────────────────────────────────────────────────────
  const handleOpen = () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    setProactive(false);
    setIsOpen(true);
  };
  const handleClose = () => {
    setIsOpen(false);
    if (step !== "done") {
      sessionStorage.setItem(STORAGE_KEY, "dismissed");
      setDismissed(true);
    }
  };

  // ── Welcome step buttons ─────────────────────────────────────────────────
  const handleWelcomeBtn = (value: string) => {
    if (value === "later") {
      handleClose();
      return;
    }
    pushUserMessage(f.welcomeButtons[0].label);
    setStep("business");
    setTimeout(() => pushBotMessage(f.step1Q, 800), 200);
  };

  // ── Step 1: Business ─────────────────────────────────────────────────────
  const handleBusiness = (value: string, label: string) => {
    pushUserMessage(label);
    setSelections(s => ({ ...s, business: value, businessLabel: label }));
    setStep("goal");
    const vp = f.valueProps[value] ?? f.valueProps["other"];
    setTimeout(() => {
      pushBotMessage(vp, 800);
      setTimeout(() => pushBotMessage(f.step2Q, 1800), 800);
    }, 200);
  };

  // ── Step 2: Goal ─────────────────────────────────────────────────────────
  const handleGoal = (value: string, label: string) => {
    pushUserMessage(label);
    setSelections(s => ({ ...s, goal: value }));
    setStep("volume");
    setTimeout(() => {
      pushBotMessage(f.socialProof, 800);
      setTimeout(() => pushBotMessage(f.step3Q, 1800), 800);
    }, 200);
  };

  // ── Step 3: Volume ───────────────────────────────────────────────────────
  const handleVolume = (value: string, label: string) => {
    pushUserMessage(label);
    setSelections(s => ({ ...s, volume: value }));
    setStep("form");
    setFormStartT(Date.now());
    setTimeout(() => {
      pushBotMessage(f.step4Msg, 800);
      setTimeout(() => setShowForm(true), 1600);
    }, 200);
  };

  // ── Step 4: Form submit ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs: typeof formErr = {};
    if (!formName.trim())                         errs.name  = f.nameErr;
    if (!/\d{7,15}/.test(formPhone.replace(/\D/g, ""))) errs.phone = f.phoneErr;
    if (Object.keys(errs).length) { setFormErr(errs); return; }
    setFormErr({});

    setSubmitting(true);
    try {
      await fetch("/api/leads", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     formName.trim(),
          phone:    formPhone.trim(),
          business: selections.business  ?? "other",
          goal:     selections.goal      ?? "all",
          volume:   selections.volume    ?? "unknown",
          lang,
          source:   typeof window !== "undefined" ? window.location.href : null,
          _t:       formStartT,   // honeypot: server checks elapsed time
        }),
      });
    } catch {
      // silent fail — user still sees success
    }
    setSubmitting(false);
    setShowForm(false);
    setStep("done");
    sessionStorage.setItem(STORAGE_KEY, "done");
    pushUserMessage(`${formName} — ${formPhone}`);
    setTimeout(() => pushBotMessage(f.doneMsg, 800), 300);
  };

  // ── Current step number for progress ────────────────────────────────────
  const stepNum =
    step === "welcome" ? 0 :
    step === "business" ? 1 :
    step === "goal"     ? 2 :
    step === "volume"   ? 3 :
    step === "form"     ? 4 : 4;

  // ── Buttons to show under messages ───────────────────────────────────────
  const showWelcomeBtns = step === "welcome"  && !isTyping && messages.length > 0;
  const showBiz         = step === "business" && !isTyping && messages.length >= 2;
  const showGoal        = step === "goal"     && !isTyping && messages.length >= 4;
  const showVolume      = step === "volume"   && !isTyping && messages.length >= 6;

  // ── WhatsApp CTA link ────────────────────────────────────────────────────
  const waHref = `https://wa.me/${SALES_WA}?text=${encodeURIComponent(
    f.waMsg(formName || "زائر", selections.businessLabel ?? selections.business ?? "", selections.goal ?? "")
  )}`;

  // ═════════════════════════════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── CSS animations ────────────────────────────────────────────── */}
      <style>{`
        @keyframes wpBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .6; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes wpGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,211,102,.5); }
          50%       { box-shadow: 0 0 0 12px rgba(37,211,102,0); }
        }
        @keyframes wpSlideUp {
          from { opacity:0; transform: translateY(16px) scale(.97); }
          to   { opacity:1; transform: translateY(0)    scale(1);   }
        }
        @keyframes wpFadeIn {
          from { opacity:0; transform: translateY(6px); }
          to   { opacity:1; transform: translateY(0);   }
        }
        .wp-slide-up  { animation: wpSlideUp .3s ease forwards; }
        .wp-fade-in   { animation: wpFadeIn .25s ease forwards; }
        .wp-glow-btn  { animation: wpGlow 2.5s ease-in-out infinite; }
      `}</style>

      {/* ── Proactive bubble ──────────────────────────────────────────── */}
      {proactive && !isOpen && !dismissed && (
        <button
          onClick={handleOpen}
          dir={dir}
          className="fixed bottom-24 left-6 z-40 bg-white text-gray-800 text-sm font-medium
                     px-4 py-2.5 rounded-2xl shadow-xl border border-gray-100 wp-fade-in
                     hover:shadow-2xl transition-shadow max-w-[220px] text-right"
          style={{ direction: dir }}
        >
          {f.proactive}
        </button>
      )}

      {/* ── Chat window ───────────────────────────────────────────────── */}
      {isOpen && (
        <div
          dir={dir}
          className="fixed bottom-24 left-4 z-50 w-[calc(100vw-2rem)] max-w-[360px]
                     bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl
                     flex flex-col overflow-hidden wp-slide-up"
          style={{ maxHeight: "min(600px, calc(100vh - 120px))" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center flex-shrink-0">
                <Bot className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-gray-900" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{f.title}</p>
                <p className="text-green-400 text-[10px] leading-tight">{f.online}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {step !== "done" && stepNum > 0 && (
                <span className="text-gray-500 text-[10px]">{f.progress(stepNum, TOTAL_STEPS)}</span>
              )}
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-300 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {step !== "done" && stepNum > 0 && (
            <div className="h-0.5 bg-gray-800 flex-shrink-0">
              <div
                className="h-full bg-[#25D366] transition-all duration-500"
                style={{ width: `${(stepNum / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex wp-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E]
                                  flex items-center justify-center flex-shrink-0 mt-1 mx-1.5">
                    <Bot style={{ width: 12, height: 12, color: "white" }} />
                  </div>
                )}
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#25D366] text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-start wp-fade-in">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E]
                                flex items-center justify-center flex-shrink-0 mt-1 mx-1.5">
                  <Bot style={{ width: 12, height: 12, color: "white" }} />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-bl-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* ── Welcome buttons ── */}
            {showWelcomeBtns && (
              <div className="flex gap-2 flex-wrap justify-end wp-fade-in">
                {f.welcomeButtons.map(b => (
                  <button key={b.value} onClick={() => handleWelcomeBtn(b.value)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-100 text-sm
                               px-4 py-2 rounded-xl border border-gray-700 hover:border-[#25D366]
                               transition-all duration-200 active:scale-95">
                    {b.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Business buttons ── */}
            {showBiz && (
              <div className="grid grid-cols-2 gap-1.5 wp-fade-in">
                {f.step1Buttons.map(b => (
                  <button key={b.value} onClick={() => handleBusiness(b.value, b.label)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-100 text-xs
                               px-3 py-2.5 rounded-xl border border-gray-700 hover:border-[#25D366]
                               transition-all duration-200 active:scale-95 text-center">
                    {b.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Goal buttons ── */}
            {showGoal && (
              <div className="grid grid-cols-2 gap-1.5 wp-fade-in">
                {f.step2Buttons.map(b => (
                  <button key={b.value} onClick={() => handleGoal(b.value, b.label)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-100 text-xs
                               px-3 py-2.5 rounded-xl border border-gray-700 hover:border-[#25D366]
                               transition-all duration-200 active:scale-95 text-center">
                    {b.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Volume buttons ── */}
            {showVolume && (
              <div className="grid grid-cols-2 gap-1.5 wp-fade-in">
                {f.step3Buttons.map(b => (
                  <button key={b.value} onClick={() => handleVolume(b.value, b.label)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-100 text-xs
                               px-3 py-2.5 rounded-xl border border-gray-700 hover:border-[#25D366]
                               transition-all duration-200 active:scale-95 text-center">
                    {b.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Lead form ── */}
            {showForm && step === "form" && (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 space-y-3 wp-fade-in">
                <div>
                  <input
                    value={formName}
                    onChange={e => { setFormName(e.target.value); setFormErr(p => ({ ...p, name: undefined })); }}
                    placeholder={f.namePh}
                    className={`w-full bg-gray-800 border ${formErr.name ? "border-red-500" : "border-gray-700"}
                                focus:border-[#25D366] rounded-xl px-3 py-2.5 text-sm text-gray-100
                                placeholder-gray-500 outline-none transition`}
                  />
                  {formErr.name && <p className="text-red-400 text-xs mt-1">{formErr.name}</p>}
                </div>
                <div>
                  <input
                    value={formPhone}
                    onChange={e => { setFormPhone(e.target.value); setFormErr(p => ({ ...p, phone: undefined })); }}
                    placeholder={f.phonePh}
                    inputMode="tel"
                    dir="ltr"
                    className={`w-full bg-gray-800 border ${formErr.phone ? "border-red-500" : "border-gray-700"}
                                focus:border-[#25D366] rounded-xl px-3 py-2.5 text-sm text-gray-100
                                placeholder-gray-500 outline-none transition`}
                  />
                  {formErr.phone && <p className="text-red-400 text-xs mt-1">{formErr.phone}</p>}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-[#25D366] hover:bg-[#20bb5a] disabled:opacity-60
                             text-white font-semibold py-2.5 rounded-xl text-sm
                             transition-all duration-200 active:scale-[.98] flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />{f.sending}</>
                    : f.submitBtn}
                </button>
              </div>
            )}

            {/* ── Done CTAs ── */}
            {step === "done" && !isTyping && messages.some(m => m.text.includes("✅")) && (
              <div className="flex flex-col gap-2 wp-fade-in">
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white font-semibold
                             py-2.5 rounded-xl text-sm text-center transition-all duration-200 active:scale-[.98]">
                  {f.ctaWhatsapp}
                </a>
                <button
                  onClick={() => { setIsOpen(false); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-gray-100
                             py-2.5 rounded-xl text-sm transition-all duration-200 active:scale-[.98]">
                  {f.ctaPricing}
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-800 flex-shrink-0 flex items-center justify-center gap-1">
            <span className="text-[10px] text-gray-600">{f.powered}</span>
            <span className="w-1 h-1 rounded-full bg-gray-700" />
            <span className="text-[10px] text-gray-600">WhatsPro</span>
          </div>
        </div>
      )}

      {/* ── Floating bubble button ─────────────────────────────────────── */}
      <button
        onClick={handleOpen}
        aria-label={f.title}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full
                   bg-gradient-to-br from-[#25D366] to-[#128C7E]
                   flex items-center justify-center
                   hover:scale-110 active:scale-95 transition-transform duration-200
                   shadow-lg shadow-green-500/40 wp-glow-btn"
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6 text-white" />
        ) : (
          <Bot className="w-6 h-6 text-white" />
        )}
        {/* Notification dot لو فيه proactive */}
        {proactive && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full
                           border-2 border-white text-white text-[8px] flex items-center justify-center font-bold">
            1
          </span>
        )}
      </button>
    </>
  );
}