"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";

export default function ReviewPrompt({ open, onClose, defaultName, defaultPhone }: { open: boolean; onClose: () => void; defaultName: string; defaultPhone: string; }) {
  const { locale, dir } = useLanguage();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState(defaultName || "");
  const [brandName, setBrandName] = useState("");
  const [phone, setPhone] = useState(defaultPhone || "");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const t = {
    title: locale === "ar" ? "رأيك يهمنا 🌟" : "Your feedback matters 🌟",
    desc: locale === "ar" ? "ساعدنا نطور المنصة للأفضل بمشاركتك تجربتك معنا!" : "Help us improve by sharing your experience!",
    name: locale === "ar" ? "الاسم" : "Name",
    brand: locale === "ar" ? "اسم البراند / النشاط" : "Brand / Business Name",
    phone: locale === "ar" ? "رقم الهاتف" : "Phone Number",
    review: locale === "ar" ? "رأيك (أكثر من 20 حرف)" : "Your Review (min 20 chars)",
    submit: locale === "ar" ? "إرسال التقييم" : "Submit Review",
    cancel: locale === "ar" ? "ليس الآن" : "Not now",
    errorRating: locale === "ar" ? "الرجاء اختيار التقييم" : "Please select a rating",
    errorLength: locale === "ar" ? "الرأي يجب أن يكون 20 حرفاً على الأقل" : "Review must be at least 20 characters",
  };

  const handleSubmit = async () => {
    if (rating === 0) return toast.error(t.errorRating);
    if (content.trim().length < 20) return toast.error(t.errorLength);

    setLoading(true);
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, brandName, phone, rating, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message);
      // Let the parent know we succeeded
      window.dispatchEvent(new Event("review-submitted"));
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir={dir} className="max-w-md sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
        <div className="bg-gradient-to-br from-[#25D366] to-emerald-700 p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">{t.title}</h2>
          <p className="text-green-50 text-sm opacity-90">{t.desc}</p>
          <div className="flex justify-center gap-2 mt-6" dir="ltr">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-transform hover:scale-110 focus:outline-none"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "fill-white/20 text-transparent"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-6 space-y-4 bg-white dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">{t.name}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">{t.phone}</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">{t.brand}</Label>
            <Input value={brandName} onChange={e => setBrandName(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">{t.review}</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={3} className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl resize-none" />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
              {t.cancel}
            </Button>
            <Button onClick={handleSubmit} disabled={loading || rating === 0 || content.trim().length < 20} className="flex-1 rounded-xl bg-[#25D366] hover:bg-[#20bb5a] text-white shadow-lg shadow-green-600/20">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.submit}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
