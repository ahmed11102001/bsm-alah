"use client";

import { useEffect, useState, useRef } from "react";
import { Star, PenLine, X, Loader2, CheckCircle, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { t, tr, type Lang } from "@/lib/translations";

interface Testimonial {
  id:        string;
  name:      string;
  brandName: string;
  rating:    number;
  content:   string;
  createdAt: string;
}

// ── Seed data تظهر لو مفيش real testimonials بعد ──────────────────────────────
const SEED: Testimonial[] = [
  {
    id: "s1", name: "أحمد محمود", brandName: "متجر تك هوم",
    rating: 5, createdAt: "",
    content: "بقيت أرسل لـ ٣٠٠٠ عميل في ٥ دقائق. الردود التلقائية وفّرت علي موظف كامل. أفضل استثمار عملته في المتجر.",
  },
  {
    id: "s2", name: "سارة خالد", brandName: "براند فاشون كيدز",
    rating: 5, createdAt: "",
    content: "الـ AI بيرد على الأسئلة الدارجة لوحده، وأنا بافضل أركز على التصميم. مبيعاتي زادت ٤٠٪ في أول شهر.",
  },
  {
    id: "s3", name: "محمد عبدالله", brandName: "ليلى للعطور",
    rating: 5, createdAt: "",
    content: "الربط مع Shopify شغال زي الساعة — كل أوردر جديد بيوصل تأكيد فوري للعميل بدون ما أحرك ساكن.",
  },
  {
    id: "s4", name: "نورا رمضان", brandName: "سكينكير بالعربي",
    rating: 5, createdAt: "",
    content: "جربت ٣ أدوات قبله وكلها بانت الحساب. واتس برو بيشتغل على API رسمي وده اللي خلاني أطمن فعلاً.",
  },
  {
    id: "s5", name: "كريم فوزي", brandName: "إكسبريس ديليفري",
    rating: 5, createdAt: "",
    content: "التقارير دقيقة جداً — بشوف بالظبط كام رسالة اتبعتت وكام أوردر طلعت منهم. بيساعدني أحسّن حملاتي.",
  },
  {
    id: "s6", name: "هند يوسف", brandName: "هاند ميد بي هند",
    rating: 5, createdAt: "",
    content: "كنت خايفة إن الإعداد هيبقى صعب — بس خلصت في ربع ساعة. الدعم الفني رد علي في نفس اليوم.",
  },
];

// ── Skeleton Card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3 animate-pulse">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(n => <div key={n} className="w-3 h-3 rounded-full bg-gray-100" />)}
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-full" />
        <div className="h-3 bg-gray-100 rounded-full w-5/6" />
        <div className="h-3 bg-gray-100 rounded-full w-4/6" />
      </div>
      <div className="pt-3 border-t border-gray-50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gray-100" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 bg-gray-100 rounded-full w-24" />
          <div className="h-2.5 bg-gray-100 rounded-full w-16" />
        </div>
      </div>
    </div>
  );
}

// ── Single testimonial card ────────────────────────────────────────────────────
function TestimonialCard({ item, index, visible }: { item: Testimonial; index: number; visible: boolean }) {
  // colors تتناوب على الكروت
  const palettes = [
    { bg: "from-[#064e45] to-[#075E54]", light: "bg-green-50",  accent: "#25D366" },
    { bg: "from-violet-600 to-purple-700", light: "bg-violet-50", accent: "#7C3AED" },
    { bg: "from-blue-600 to-blue-700",   light: "bg-blue-50",   accent: "#3B82F6" },
    { bg: "from-orange-500 to-amber-600", light: "bg-orange-50", accent: "#F97316" },
    { bg: "from-teal-600 to-teal-700",   light: "bg-teal-50",   accent: "#14B8A6" },
    { bg: "from-rose-500 to-pink-600",   light: "bg-rose-50",   accent: "#F43F5E" },
  ];
  const p = palettes[index % palettes.length];

  return (
    <div
      className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col"
      style={{
        opacity:   visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${index * 80}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${index * 80}ms`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      {/* hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: `inset 0 0 0 1.5px ${p.accent}40` }}
      />

      {/* accent bar أعلى الكارت */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${p.accent}, ${p.accent}44)` }}
      />

      <div className="p-5 flex flex-col flex-1">
        {/* Stars */}
        <div className="flex gap-0.5 mb-3">
          {[1,2,3,4,5].map(n => (
            <Star
              key={n}
              className={`w-3.5 h-3.5 ${n <= item.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
            />
          ))}
        </div>

        {/* Quote icon */}
        <Quote
          className="w-6 h-6 mb-2 opacity-10"
          style={{ color: p.accent }}
        />

        {/* Content — بدون line-clamp علشان الكروت تاخد حجمها الطبيعي */}
        <p className="text-gray-700 text-sm leading-relaxed flex-1">
          {item.content}
        </p>

        {/* Footer */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50">
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.bg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
          >
            {item.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
            <p className="text-xs truncate" style={{ color: p.accent }}>{item.brandName}</p>
          </div>
          {/* verified badge */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${p.accent}18` }}
          >
            <svg className="w-3.5 h-3.5" fill={p.accent} viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Review Form ────────────────────────────────────────────────────────────────
function TestimonialForm({ onClose, onSuccess, lang }: { onClose: () => void; onSuccess: () => void; lang: Lang }) {
  const [form, setForm]     = useState({ name: "", brandName: "", phone: "", rating: 5, content: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [done, setDone]     = useState(false);
  const fm = t.testimonials.form;

  const handleSubmit = async () => {
    setSaving(true); setError("");
    const r = await fetch("/api/testimonials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify(form),
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
          <input value={form.name}      onChange={e => setForm(f => ({ ...f, name:      e.target.value }))} placeholder={tr(fm.name,  lang)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/10 transition-all" />
          <input value={form.brandName} onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))} placeholder={tr(fm.brand, lang)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/10 transition-all" />
          <input value={form.phone}     onChange={e => setForm(f => ({ ...f, phone:     e.target.value }))} placeholder={tr(fm.phone, lang)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/10 transition-all" dir="ltr" />
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Testimonials({ lang }: { lang: Lang }) {
  const { data: session } = useSession();
  const [items,    setItems]    = useState<Testimonial[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [visible,  setVisible]  = useState(false);
  const [page,     setPage]     = useState(0); // للـ mobile carousel
  const sectionRef = useRef<HTMLElement>(null);

  const CARDS_PER_ROW = 3;

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

  // scroll reveal
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

  const stats = t.testimonials.stats;
  const isAr  = lang === "ar";

  // تقسيم الكروت لـ rows من 3 للديسكتوب
  const rows: Testimonial[][] = [];
  for (let i = 0; i < items.length; i += CARDS_PER_ROW) {
    rows.push(items.slice(i, i + CARDS_PER_ROW));
  }

  // الـ row الثانية تبدأ بـ offset بـ half card — masonry effect
  return (
    <section
      ref={sectionRef}
      id="testimonials"
      className="py-20 lg:py-32 bg-gray-50 overflow-hidden"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div
          className="text-center mb-14"
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="inline-flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-full px-4 py-1.5 mb-5">
            <span className="text-[11px] font-semibold tracking-wider text-[#15803d] uppercase">
              {tr(t.testimonials.badge, lang)}
            </span>
          </div>

          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            {tr(t.testimonials.h2a, lang)}{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#25D366]">{tr(t.testimonials.h2b, lang)}</span>
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 100 8" preserveAspectRatio="none">
                <path d="M0 6 Q50 0 100 6" stroke="#25D366" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              </svg>
            </span>
          </h2>

          <p className="text-gray-400 text-base max-w-md mx-auto mb-6">
            {tr(t.testimonials.subtitle, lang)}
          </p>

          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#20b557] active:scale-[.98] transition-all shadow-lg shadow-[#25D366]/20"
          >
            <PenLine className="w-4 h-4" />
            {tr(t.testimonials.addBtn, lang)}
          </button>
        </div>

        {/* ── Cards ── */}
        {loading ? (
          // Skeleton
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          // Masonry layout بـ CSS columns
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
            {items.map((item, i) => (
              <div key={item.id} className="break-inside-avoid mb-5">
                <TestimonialCard item={item} index={i} visible={visible} />
              </div>
            ))}
          </div>
        )}

        {/* ── Stats ── */}
        <div
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 rounded-2xl overflow-hidden"
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s cubic-bezier(0.16,1,0.3,1) 400ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) 400ms",
          }}
        >
          {stats.map((stat, i) => (
            <div key={i} className="bg-white py-7 px-4 text-center group hover:bg-gray-50 transition-colors">
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform inline-block">
                {stat.icon}
              </div>
              <div className="text-2xl font-black text-gray-900 mb-1">{stat.value}</div>
              <div className="text-xs text-gray-400 font-medium">{tr(stat.label, lang)}</div>
            </div>
          ))}
        </div>

      </div>

      {showForm && (
        <TestimonialForm lang={lang} onClose={() => setShowForm(false)} onSuccess={fetchTestimonials} />
      )}
    </section>
  );
}