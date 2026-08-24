"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Star, PenLine, X, Loader2, CheckCircle, ChevronLeft, ChevronRight,
  MessageCircle, ShoppingBag, Sparkles, TrendingUp, BarChart3, Headphones, Store,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { t, tr, type Lang } from "@/lib/translations";

interface Testimonial {
  id: string;
  name: string;
  brandName: string;
  rating: number;
  content: string;
  createdAt: string;
}

/* ── Seed data ─────────────────────────────────────────────────────────────── */
const SEED: Testimonial[] = [
  {
    id: "s1", name: "أحمد محمود", brandName: "صاحب متجر إلكتروني · Shopify",
    rating: 5, createdAt: "",
    content: "المساعد بقي فاهم براندنا وطريقة شغلنا فعلاً. المحادثات اترد عليها تلقائيًا، باحترافية، وبقت بتتدخل بس في الحالات اللي محتاجة لي.",
  },
  {
    id: "s2", name: "سارة خالد", brandName: "متجر منتجات تجميل",
    rating: 5, createdAt: "",
    content: "وني وفر علينا وقت ومجهود كبير، والعملاء بيحسوا إنهم بيتكلموا مع حد فاهم منتجاتنا فعلاً.",
  },
  {
    id: "s3", name: "كريم فوزي", brandName: "إكسسوارات ديجيتال",
    rating: 5, createdAt: "",
    content: "التقارير دقيقة جدًا، وبقيت فاهم العملاء محتاجين إيه فعلاً.",
  },
  {
    id: "s4", name: "نورا رمضان", brandName: "سكينكير بالعربي",
    rating: 5, createdAt: "",
    content: "جربت ٣ أدوات قبله وكلها بانت الحساب. وني بيشتغل على API رسمي وده اللي خلاني أطمن فعلاً.",
  },
  {
    id: "s5", name: "محمد عبدالله", brandName: "ليلى للعطور",
    rating: 5, createdAt: "",
    content: "الربط مع Shopify شغال زي الساعة — كل أوردر جديد بيوصل تأكيد فوري للعميل بدون ما أحرك ساكن.",
  },
  {
    id: "s6", name: "هند يوسف", brandName: "هاند ميد بي هند",
    rating: 5, createdAt: "",
    content: "كنت خايفة إن الإعداد هيبقى صعب — بس خلصت في ربع ساعة. الدعم الفني رد علي في نفس اليوم.",
  },
];

/* ── Tag labels for each card ──────────────────────────────────────────────── */
const CARD_TAGS: { label: string; labelEn: string; icon: typeof Sparkles }[][] = [
  [{ label: "التحليلات", labelEn: "Analytics", icon: BarChart3 }],
  [{ label: "AI Agent", labelEn: "AI Agent", icon: Sparkles }, { label: "خدمة العملاء", labelEn: "Customer Service", icon: Headphones }],
  [{ label: "زيادة المبيعات", labelEn: "Sales Growth", icon: TrendingUp }],
  [{ label: "خدمة العملاء", labelEn: "Customer Service", icon: Headphones }],
  [{ label: "AI Agent", labelEn: "AI Agent", icon: Sparkles }],
  [{ label: "التحليلات", labelEn: "Analytics", icon: BarChart3 }],
];

/* ── Floating badges data ──────────────────────────────────────────────────── */
const FLOATING_BADGES = [
  { label: "متاجر إلكترونية", labelEn: "E-commerce", icon: Store, pos: "top-20 left-8 md:left-16", delay: "0s" },
  { label: "Shopify", labelEn: "Shopify", icon: ShoppingBag, pos: "top-32 left-4 md:left-24", delay: "0.3s" },
  { label: "زيادة المبيعات", labelEn: "Sales Growth", icon: TrendingUp, pos: "top-20 md:top-24 left-8 md:left-8", delay: "0.6s" },
  { label: "AI Agent", labelEn: "AI Agent", icon: Sparkles, pos: "top-20 right-8 md:right-16", delay: "0.15s" },
  { label: "خدمة العملاء", labelEn: "Customer Service", icon: Headphones, pos: "top-32 right-4 md:right-24", delay: "0.45s" },
];

/* ── Avatar colors ─────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "from-emerald-500 to-teal-600",
  "from-rose-400 to-pink-500",
  "from-blue-500 to-indigo-600",
  "from-amber-400 to-orange-500",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-sky-600",
];

/* ── Review Form ───────────────────────────────────────────────────────────── */
function TestimonialForm({ onClose, onSuccess, lang }: { onClose: () => void; onSuccess: () => void; lang: Lang }) {
  const [form, setForm] = useState({ name: "", brandName: "", phone: "", rating: 5, content: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fm = t.testimonials.form;

  const handleSubmit = async () => {
    setSaving(true); setError("");
    const r = await fetch("/api/testimonials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) { setDone(true); setTimeout(() => { onSuccess(); onClose(); }, 2000); }
    else setError(d.error ?? tr(fm.error, lang));
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 shadow-xl">
        <CheckCircle className="w-12 h-12 text-[#25D366]" />
        <p className="font-semibold text-gray-800">{tr(fm.successMsg, lang)}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" style={{ animation: "fade-in-scale 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">{tr(fm.title, lang)}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="space-y-3">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={tr(fm.name, lang)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/10 transition-all" />
          <input value={form.brandName} onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))} placeholder={tr(fm.brand, lang)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/10 transition-all" />
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder={tr(fm.phone, lang)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/10 transition-all" dir="ltr" />
          <div>
            <p className="text-xs text-gray-500 mb-2">{tr(fm.ratingLabel, lang)}</p>
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setForm(f => ({ ...f, rating: n }))} className="transition-transform hover:scale-110 active:scale-95">
                  <Star className={`w-7 h-7 transition-colors ${n <= form.rating ? "fill-amber-400 text-amber-400" : "text-gray-200 hover:text-amber-200"}`} />
                </button>
              ))}
            </div>
          </div>
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder={tr(fm.content, lang)} rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/10 transition-all resize-none" />
          {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button onClick={handleSubmit} disabled={saving}
            className="w-full bg-[#25D366] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#20b557] active:scale-[.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {tr(fm.submit, lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────────────────── */
export default function Testimonials({ lang, onLoginClick }: { lang: Lang; onLoginClick?: () => void }) {
  const { data: session } = useSession();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [visible, setVisible] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAr = lang === "ar";

  const fetchTestimonials = async () => {
    setLoading(true);
    const r = await fetch("/api/testimonials");
    if (r.ok) {
      const data: Testimonial[] = await r.json();
      setItems(data.length > 0 ? data : SEED);
    } else {
      setItems(SEED);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTestimonials(); }, []);

  // Scroll reveal
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-play carousel
  const next = useCallback(() => {
    setActiveIdx(prev => (prev + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    autoplayRef.current = setInterval(next, 5000);
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [next, items.length]);

  const goTo = (idx: number) => {
    setActiveIdx(idx);
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(next, 5000);
  };

  const goPrev = () => goTo((activeIdx - 1 + items.length) % items.length);
  const goNext = () => goTo((activeIdx + 1) % items.length);

  // Get 3 visible cards: [left, center, right]
  const getVisibleCards = () => {
    if (items.length === 0) return [];
    const left = (activeIdx - 1 + items.length) % items.length;
    const center = activeIdx;
    const right = (activeIdx + 1) % items.length;
    return [
      { item: items[left], idx: left, pos: "left" as const },
      { item: items[center], idx: center, pos: "center" as const },
      { item: items[right], idx: right, pos: "right" as const },
    ];
  };

  const visibleCards = getVisibleCards();

  return (
    <>
      <style jsx global>{`
        @keyframes float-badge {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(37, 211, 102, 0.15); }
          50% { box-shadow: 0 0 40px rgba(37, 211, 102, 0.3); }
        }
      `}</style>

      <section
        ref={sectionRef}
        id="testimonials"
        className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 via-white to-gray-50 overflow-hidden relative"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #000 1px, transparent 0)", backgroundSize: "40px 40px" }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

          {/* ── Badge ── */}
          <div
            className="text-center mb-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(30px)",
              transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-5 py-2 shadow-sm">
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span className="text-sm font-semibold text-gray-700">
                {isAr ? "آراء العملاء" : "Customer Reviews"}
              </span>
            </div>
          </div>

          {/* ── Heading ── */}
          <div
            className="text-center mb-4"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(30px)",
              transition: "all 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s",
            }}
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 leading-tight">
              {isAr ? "مش كلامنا، " : "Not our words, "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[#25D366]">{isAr ? "كلامهم" : "theirs"}</span>
                <svg className="absolute -bottom-1.5 left-0 w-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 8 Q25 0 50 5 Q75 0 100 8" stroke="#25D366" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.4" />
                </svg>
              </span>
            </h2>
          </div>

          {/* ── Subtitle ── */}
          <p
            className="text-center text-gray-400 text-base max-w-lg mx-auto mb-16"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s",
            }}
          >
            {isAr
              ? "تجارب حقيقية من أصحاب مشاريع بيستخدموا وني يوميًا"
              : "Real experiences from business owners using Wani daily"}
          </p>

          {/* ── Floating Badges (desktop only) ── */}
          <div className="hidden lg:block">
            {FLOATING_BADGES.map((badge, i) => (
              <div
                key={i}
                className={`absolute ${badge.pos} z-10`}
                style={{
                  opacity: visible ? 1 : 0,
                  transition: `opacity 0.6s ease ${parseFloat(badge.delay) + 0.5}s`,
                  animation: visible ? `float-badge 4s ease-in-out ${badge.delay} infinite` : "none",
                }}
              >
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200/80 rounded-full px-3 py-1.5 shadow-sm text-xs font-medium text-gray-600">
                  <badge.icon className="w-3.5 h-3.5 text-[#25D366]" />
                  {isAr ? badge.label : badge.labelEn}
                </div>
              </div>
            ))}
          </div>

          {/* ── Central Wani Logo ── */}
          <div
            className="flex justify-center mb-12"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.8)",
              transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s",
            }}
          >
            <div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center shadow-2xl ring-4 ring-white"
              style={{ animation: visible ? "pulse-glow 3s ease-in-out infinite" : "none" }}
            >
              <img src="/faviconlink.svg" alt="Wani" className="w-14 h-14 rounded-full object-cover" />
            </div>
          </div>

          {/* ── Cards Carousel ── */}
          {loading ? (
            <div className="flex justify-center gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 w-80 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 bg-gray-100 rounded-full w-24" />
                      <div className="h-2.5 bg-gray-100 rounded-full w-16" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded-full w-full" />
                    <div className="h-3 bg-gray-100 rounded-full w-5/6" />
                    <div className="h-3 bg-gray-100 rounded-full w-4/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              {/* Navigation arrows */}
              <button
                onClick={goPrev}
                className="absolute top-1/2 -translate-y-1/2 -left-4 md:-left-10 z-20 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center hover:bg-gray-50 hover:scale-110 transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={goNext}
                className="absolute top-1/2 -translate-y-1/2 -right-4 md:-right-10 z-20 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center hover:bg-gray-50 hover:scale-110 transition-all"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>

              {/* Cards container */}
              <div className="flex items-center justify-center gap-4 md:gap-6 min-h-[380px] perspective-[1200px]">
                {visibleCards.map(({ item, idx, pos }) => {
                  const isCenter = pos === "center";
                  const tags = CARD_TAGS[idx % CARD_TAGS.length];

                  return (
                    <div
                      key={`${item.id}-${pos}`}
                      className={`transition-all duration-500 ease-out ${
                        isCenter
                          ? "w-[360px] md:w-[420px] z-10"
                          : "w-[260px] md:w-[300px] z-0 hidden sm:block"
                      }`}
                      style={{
                        opacity: isCenter ? 1 : 0.6,
                        transform: isCenter
                          ? "scale(1) translateY(0)"
                          : pos === "left"
                            ? `scale(0.9) translateX(${isAr ? '10%' : '-10%'}) translateY(10px)`
                            : `scale(0.9) translateX(${isAr ? '-10%' : '10%'}) translateY(10px)`,
                        filter: isCenter ? "none" : "blur(1px)",
                      }}
                    >
                      <div className={`rounded-2xl border ${isCenter ? "bg-gray-900 border-gray-800 shadow-2xl shadow-[#25D366]/20" : "bg-white border-gray-200/80 shadow-md"} p-6 transition-all duration-500`}>
                        {/* Avatar + Name header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ring-2 ring-[rgba(255,255,255,0.2)] shadow-md`}>
                            {item.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`font-bold text-sm ${isCenter ? "text-white" : "text-gray-900"}`}>{item.name}</p>
                              {isCenter && (
                                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="#25D366">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <p className={`text-xs truncate ${isCenter ? "text-gray-400" : "text-gray-400"}`}>{item.brandName}</p>
                          </div>
                        </div>

                        {/* Content */}
                        <p className={`leading-relaxed mb-5 ${isCenter ? "text-sm text-gray-200" : "text-xs text-gray-600 line-clamp-3"}`}>
                          {item.content}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {tags.map((tag, ti) => (
                            <span key={ti} className={`flex items-center gap-1 border rounded-full px-2.5 py-1 text-[11px] font-medium ${isCenter ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-gray-50 border-gray-100 text-gray-500"}`}>
                              <tag.icon className="w-3 h-3 text-[#25D366]" />
                              {isAr ? tag.label : tag.labelEn}
                            </span>
                          ))}
                        </div>

                        {/* Stars */}
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star
                              key={n}
                              className={`w-4 h-4 ${n <= item.rating ? "fill-amber-400 text-amber-400" : isCenter ? "text-gray-700" : "text-gray-200"}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination dots */}
              <div className="flex justify-center gap-2 mt-8">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === activeIdx
                        ? "w-6 h-2.5 bg-[#25D366]"
                        : "w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── CTA Section ── */}
          <div
            className="mt-20 text-center"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.7s cubic-bezier(0.16,1,0.3,1) 0.6s",
            }}
          >
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">
              {isAr ? "جاهز تخلي وني يتعامل مع عملائك؟" : "Ready to let Wani handle your customers?"}
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                {isAr ? "سيب رأيك" : "Leave a review"}
              </button>
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 bg-[#25D366] text-white px-7 py-3 rounded-full text-sm font-bold hover:bg-[#20b557] active:scale-[.98] transition-all shadow-lg shadow-[#25D366]/25 cursor-pointer"
              >
                {isAr ? "جرّب Wani الآن" : "Try Wani Now"}
                <ChevronLeft className={`w-4 h-4 ${isAr ? "" : "rotate-180"}`} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {isAr ? "بدون بطاقة ائتمان" : "No credit card required"}
            </p>
          </div>

        </div>

        {showForm && (
          <TestimonialForm lang={lang} onClose={() => setShowForm(false)} onSuccess={fetchTestimonials} />
        )}
      </section>
    </>
  );
}