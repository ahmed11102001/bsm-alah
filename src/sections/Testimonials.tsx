"use client";

import { useEffect, useState } from "react";
import { Star, PenLine, X, Loader2, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";

interface Testimonial {
  id:        string;
  name:      string;
  brandName: string;
  rating:    number;
  content:   string;
  createdAt: string;
}

// فورم إضافة رأي
function TestimonialForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm]     = useState({ name: "", brandName: "", phone: "", rating: 5, content: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [done, setDone]     = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    const r = await fetch("/api/testimonials", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) { setDone(true); setTimeout(() => { onSuccess(); onClose(); }, 2000); }
    else setError(d.error ?? "حدث خطأ");
  };

  if (done) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <CheckCircle className="w-12 h-12 text-green-500" />
      <p className="font-semibold text-gray-800">شكراً! رأيك في انتظار المراجعة</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">أضف رأيك</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-3">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="اسمك" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366]" />
          <input value={form.brandName} onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))}
            placeholder="اسم المشروع / البراند" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366]" />
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="رقم الهاتف" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366]" dir="ltr" />

          {/* التقييم */}
          <div>
            <p className="text-xs text-gray-500 mb-1">التقييم</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setForm(f => ({ ...f, rating: n }))}>
                  <Star className={`w-6 h-6 ${n <= form.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                </button>
              ))}
            </div>
          </div>

          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="شاركنا تجربتك (20 حرف على الأقل)..." rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366] resize-none" />

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button onClick={handleSubmit} disabled={saving}
            className="w-full bg-[#25D366] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#20b557] transition disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            إرسال للمراجعة
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const { data: session } = useSession();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [isPaidUser,   setIsPaidUser]   = useState(false);

  const fetchTestimonials = async () => {
    setLoading(true);
    const r = await fetch("/api/testimonials");
    if (r.ok) setTestimonials(await r.json());
    setLoading(false);
  };

  // التحقق من الباقة — الزرار يظهر بس لو مشترك في باقة مدفوعة
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/dashboard")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const plan = d?.plan?.tier ?? d?.subscription?.plan;
        setIsPaidUser(plan && plan !== "free");
      })
      .catch(() => {});
  }, [session]);

  useEffect(() => { fetchTestimonials(); }, []);

  return (
    <section id="testimonials" className="py-20 lg:py-32 bg-white" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-full px-4 py-1.5 mb-5">
            <span className="text-[11px] font-semibold tracking-wider text-[#15803d] uppercase">العملاء يتكلموا</span>
          </div>

          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            مش كلامنا،
            <span className="relative mx-2">
              <span className="relative z-10 text-[#25D366]">كلامهم</span>
              <svg className="absolute -bottom-1 right-0 w-full" viewBox="0 0 100 8" preserveAspectRatio="none">
                <path d="M0 6 Q50 0 100 6" stroke="#25D366" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              </svg>
            </span>
          </h2>
          <p className="text-gray-400 text-base max-w-md mx-auto">
            تجارب حقيقية من أصحاب مشاريع بيستخدموا واتس برو يومياً
          </p>

          {/* Button now visible to everyone - removed isPaidUser condition */}
          <button onClick={() => setShowForm(true)}
            className="mt-6 inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#20b557] transition shadow-lg shadow-[#25D366]/20">
            <PenLine className="w-4 h-4" />
            أضف رأيك
          </button>
        </div>

        {/* Testimonials */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-gray-200" />
            </div>
            <p className="text-gray-400 text-sm">لا توجد آراء حتى الآن</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={t.id}
                className="group relative bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#25D366]/30 hover:shadow-xl hover:shadow-[#25D366]/5 transition-all duration-300">
                {/* نجوم التقييم */}
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={`w-3.5 h-3.5 ${n <= t.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                  ))}
                </div>

                {/* النص */}
                <p className="text-gray-700 text-[15px] leading-relaxed mb-6 line-clamp-4">
                  "{t.content}"
                </p>

                {/* المستخدم */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#075E54] to-[#25D366] flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-[#25D366]">{t.brandName}</p>
                  </div>
                  {/* علامة الصح */}
                  <div className="mr-auto w-6 h-6 rounded-full bg-[#f0fdf4] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#25D366]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100 rounded-2xl overflow-hidden">
          {[
            { value: "120+", label: "مستخدم نشط",        icon: "👥" },
            { value: "15K+", label: "رسالة مرسلة",       icon: "📨" },
            { value: "95%",  label: "نسبة نجاح الإرسال", icon: "✅" },
            { value: "4.6",  label: "تقييم المستخدمين",  icon: "⭐" },
          ].map((stat, i) => (
            <div key={i} className="bg-white py-8 px-4 text-center">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <TestimonialForm onClose={() => setShowForm(false)} onSuccess={fetchTestimonials} />
      )}
    </section>
  );
}