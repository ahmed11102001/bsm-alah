"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Camera, ArrowRight, ArrowLeft, Building2,
  MapPin, Mail, Globe, User,
} from "lucide-react";
import { FormSkeleton } from "@/components/dashboard/DashboardSkeletons";

// ─── WhatsApp Profile Management Sub-view ─────────────────────────────────────
const VERTICAL_OPTIONS = [
  { value: "AUTOMOTIVE", ar: "سيارات", en: "Automotive" },
  { value: "BEAUTY", ar: "تجميل", en: "Beauty" },
  { value: "APPAREL", ar: "ملابس", en: "Apparel" },
  { value: "EDU", ar: "تعليم", en: "Education" },
  { value: "ENTERTAIN", ar: "ترفيه", en: "Entertainment" },
  { value: "EVENT_PLAN", ar: "تنظيم فعاليات", en: "Event Planning" },
  { value: "FINANCE", ar: "مالية", en: "Finance" },
  { value: "GROCERY", ar: "بقالة", en: "Grocery" },
  { value: "GOVT", ar: "حكومة", en: "Government" },
  { value: "HOTEL", ar: "فنادق", en: "Hotel" },
  { value: "HEALTH", ar: "صحة", en: "Health" },
  { value: "NONPROFIT", ar: "غير ربحي", en: "Non-Profit" },
  { value: "PROF_SERVICES", ar: "خدمات مهنية", en: "Professional Services" },
  { value: "RETAIL", ar: "تجزئة", en: "Retail" },
  { value: "TRAVEL", ar: "سفر", en: "Travel" },
  { value: "RESTAURANT", ar: "مطعم", en: "Restaurant" },
  { value: "NOT_A_BIZ", ar: "ليس نشاط تجاري", en: "Not a Business" },
  { value: "OTHER", ar: "أخرى", en: "Other" },
];

export default function WhatsAppProfileView({ onBack, locale, dir }: {
  onBack: () => void;
  locale: string;
  dir: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [about, setAbout] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [vertical, setVertical] = useState("OTHER");
  const [website, setWebsite] = useState("");
  const [verifiedName, setVerifiedName] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [qualityRating, setQualityRating] = useState("");
  const [newPhotoBase64, setNewPhotoBase64] = useState("");
  const [newPhotoMime, setNewPhotoMime] = useState("");
  const [newPhotoPreview, setNewPhotoPreview] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const r = await fetch("/api/settings/whatsapp/profile");
        const d = await r.json();
        if (r.ok && d.data) {
          setAbout(d.data.about || "");
          setDescription(d.data.description || "");
          setAddress(d.data.address || "");
          setEmail(d.data.email || "");
          setVertical(d.data.vertical || "OTHER");
          setWebsite(d.data.websites?.[0] || "");
          setProfilePicUrl(d.data.profile_picture_url || "");
          setVerifiedName(d.data.verified_name || "");
          setDisplayPhone(d.data.display_phone_number || "");
          setQualityRating(d.data.quality_rating || "");
        }
      } catch (e) {
        console.error("Failed to fetch WhatsApp profile:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(locale === "ar" ? "حجم الصورة يجب أن يكون أقل من 5 ميجا" : "Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setNewPhotoBase64(result);
      setNewPhotoMime(file.type);
      setNewPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        about,
        description,
        address,
        email,
        vertical,
        websites: website.trim() ? [website.trim()] : [],
      };
      if (newPhotoBase64) {
        payload.photoBase64 = newPhotoBase64;
        payload.photoMimeType = newPhotoMime;
      }
      const r = await fetch("/api/settings/whatsapp/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success(locale === "ar" ? "تم تحديث بروفايل واتساب بنجاح" : "WhatsApp profile updated successfully");
      // Refresh pic if uploaded
      if (newPhotoBase64) {
        setProfilePicUrl(newPhotoPreview);
        setNewPhotoBase64("");
        setNewPhotoMime("");
        setNewPhotoPreview("");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const currentPic = newPhotoPreview || profilePicUrl;
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  if (loading) {
    return <FormSkeleton rows={5} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#25D366] transition-colors group">
        <BackArrow className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {locale === "ar" ? "رجوع" : "Back"}
      </button>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ── Edit Form ── */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Photo */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <div className="relative group">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 ring-2 ring-[#25D366]/30">
                {currentPic ? (
                  <img src={currentPic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Camera className="w-6 h-6" />
                  </div>
                )}
              </div>
              <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
                <input type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {locale === "ar" ? "صورة الملف الشخصي" : "Profile Picture"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {locale === "ar" ? "JPG أو PNG • أقصى حجم 5 ميجا" : "JPG or PNG • Max 5MB"}
              </p>
              <label className="text-xs text-[#25D366] hover:underline cursor-pointer mt-1 inline-block font-medium">
                {locale === "ar" ? "تغيير الصورة" : "Change Photo"}
                <input type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>
          </div>

          {/* Verified Name (read-only) */}
          {verifiedName && (
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                {locale === "ar" ? "اسم النشاط (معتمد من ميتا)" : "Business Name (verified by Meta)"}
              </Label>
              <Input value={verifiedName} disabled className="text-sm rounded-xl bg-gray-50 dark:bg-gray-800 cursor-not-allowed" />
            </div>
          )}

          {/* About */}
          <div className="space-y-1.5">
            <Label className="text-sm">{locale === "ar" ? "الوصف / About" : "About"}</Label>
            <div className="relative">
              <Input value={about} onChange={e => setAbout(e.target.value)} maxLength={139}
                placeholder={locale === "ar" ? "وصف مختصر لنشاطك" : "Brief description"}
                className="text-sm rounded-xl" />
              <span className="absolute left-2 top-2.5 text-[10px] text-gray-300">{about.length}/139</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm">{locale === "ar" ? "وصف تفصيلي" : "Description"}</Label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={512}
              placeholder={locale === "ar" ? "وصف تفصيلي لنشاطك التجاري" : "Detailed business description"}
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 min-h-[70px] resize-none focus:outline-none focus:ring-2 focus:ring-[#25D366]/40" />
          </div>

          {/* Vertical / Category */}
          <div className="space-y-1.5">
            <Label className="text-sm">{locale === "ar" ? "التصنيف" : "Category"}</Label>
            <select value={vertical} onChange={e => setVertical(e.target.value)}
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40">
              {VERTICAL_OPTIONS.map(v => (
                <option key={v.value} value={v.value}>{locale === "ar" ? v.ar : v.en}</option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {locale === "ar" ? "العنوان" : "Address"}
            </Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} maxLength={256}
              placeholder={locale === "ar" ? "عنوان النشاط التجاري" : "Business address"}
              className="text-sm rounded-xl" />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              {locale === "ar" ? "البريد الإلكتروني" : "Email"}
            </Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr"
              placeholder="business@example.com"
              className="text-sm rounded-xl" />
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              {locale === "ar" ? "الموقع الإلكتروني" : "Website"}
            </Label>
            <Input type="url" value={website} onChange={e => setWebsite(e.target.value)} dir="ltr"
              placeholder="https://example.com"
              className="text-sm rounded-xl" />
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={saving}
            className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl">
            {saving && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
            {locale === "ar" ? "حفظ التغييرات" : "Save Changes"}
          </Button>
        </div>

        {/* ── Live Preview (visible on lg+) ── */}
        <div className="hidden lg:block w-[220px] flex-shrink-0">
          <div className="sticky top-0 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
              {locale === "ar" ? "معاينة البروفايل" : "Profile Preview"}
            </p>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
              {/* Header bg */}
              <div className="h-16 bg-gradient-to-br from-[#25D366] to-[#128C7E]" />
              {/* Photo */}
              <div className="flex justify-center -mt-8">
                <div className="w-16 h-16 rounded-full border-3 border-white dark:border-gray-900 overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-md">
                  {currentPic ? (
                    <img src={currentPic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                </div>
              </div>
              {/* Info */}
              <div className="px-3 pt-2 pb-4 text-center space-y-1.5">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{verifiedName || "—"}</p>
                {displayPhone && <p className="text-[11px] text-gray-400" dir="ltr">{displayPhone}</p>}
                {about && <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">{about}</p>}
                <div className="pt-2 space-y-1 text-[10px] text-gray-400">
                  {email && (
                    <div className="flex items-center justify-center gap-1 truncate">
                      <Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{email}</span>
                    </div>
                  )}
                  {website && (
                    <div className="flex items-center justify-center gap-1 truncate">
                      <Globe className="w-3 h-3 flex-shrink-0" /><span className="truncate">{website}</span>
                    </div>
                  )}
                  {address && (
                    <div className="flex items-center justify-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{address}</span>
                    </div>
                  )}
                </div>
                {qualityRating && (
                  <div className="pt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      qualityRating === "GREEN" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      qualityRating === "YELLOW" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {qualityRating === "GREEN" ? "✓ " : qualityRating === "YELLOW" ? "⚠ " : "✗ "}
                      {locale === "ar" ? "جودة الرقم" : "Quality"}: {qualityRating}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
