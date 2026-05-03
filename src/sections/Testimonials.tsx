"use client";

import { useEffect, useState } from "react";
import { Card, CardContent }   from "@/components/ui/card";
import { Star, Quote, PenLine, X, Loader2, CheckCircle } from "lucide-react";

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
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);

  const fetchTestimonials = async () => {
    setLoading(true);
    const r = await fetch("/api/testimonials");
    if (r.ok) setTestimonials(await r.json());
    setLoading(false);
  };

  useEffect(() => { fetchTestimonials(); }, []);

  return (
    <section id="testimonials" className="py-20 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-full px-4 py-2 mb-4">
            <Star className="w-4 h-4 text-yellow-600" />
            <span className="text-yellow-600 text-sm font-medium">آراء المستخدمين</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            آراء <span className="text-gradient">حقيقية</span> من المستخدمين
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            تجارب حقيقية من أصحاب مشاريع بيستخدموا واتس برو في شغلهم اليومي
          </p>

          {/* زرار إضافة رأي — لكل الزوار */}
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#20b557] transition">
            <PenLine className="w-4 h-4" />
            أضف رأيك
          </button>
        </div>

        {/* Testimonials Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد آراء حتى الآن — كن أول من يشارك تجربته!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.id} className="hover-lift border-0 shadow-lg bg-white">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <Quote className="w-8 h-8 text-[#25D366]/30" />
                  </div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 leading-relaxed">"{t.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-whatsapp-gradient flex items-center justify-center text-white font-bold text-lg">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{t.name}</h4>
                      <p className="text-sm text-gray-500">{t.brandName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "120+", label: "مستخدم نشط" },
            { value: "15K+", label: "رسالة مرسلة" },
            { value: "95%",  label: "نسبة نجاح الإرسال" },
            { value: "4.6/5", label: "تقييم المستخدمين" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-gradient mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* فورم الرأي */}
      {showForm && (
        <TestimonialForm
          onClose={() => setShowForm(false)}
          onSuccess={fetchTestimonials}
        />
      )}
    </section>
  );
}