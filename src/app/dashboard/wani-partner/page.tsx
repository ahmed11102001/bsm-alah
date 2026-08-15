"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import {
  Handshake, ArrowLeft, ArrowRight, Sparkles, Pencil, Trash2,
  Check, X, Loader2, ImageIcon, ExternalLink, Clock, CheckCircle2,
  XCircle, Power, PowerOff, Info, LockKeyhole,
} from "lucide-react";
import {
  PARTNER_TEMPLATES, PartnerCardTemplate, type PartnerCardContent,
} from "./_components/PartnerCardTemplates";

const inp = "w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366] bg-white";
const btn = "flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#20b557] transition disabled:opacity-50";

type Status = "pending" | "approved" | "rejected";
interface MyCard extends PartnerCardContent {
  id: string;
  template: number;
  status: Status;
  rejectionReason: string | null;
  active: boolean;
}

const EMPTY_FORM: PartnerCardContent & { template: number; id?: string } = {
  template: 1, brandName: "", title: "", tagline: "", ctaText: "", ctaLink: "", image: "",
};

const STATUS_META: Record<Status, { icon: any; color: string; bg: string; label: { ar: string; en: string } }> = {
  pending: { icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", label: { ar: "قيد المراجعة", en: "Under review" } },
  approved: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800", label: { ar: "معتمد", en: "Approved" } },
  rejected: { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", label: { ar: "مرفوض", en: "Rejected" } },
};

export default function WaniPartnerPage() {
  const { locale, dir } = useLanguage();
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [cards, setCards] = useState<MyCard[] | undefined>(undefined); // undefined = loading
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetch("/api/wani-partner/mine")
      .then(async (r) => {
        if (r.status === 403) {
          setAccessDenied(true);
          setCards([]);
          return [];
        }
        setAccessDenied(false);
        return r.ok ? r.json() : null;
      })
      .then((data) => { const next = Array.isArray(data) ? data : []; setCards(next); setSelectedCardId((id) => id && next.some((c) => c.id === id) ? id : next[0]?.id ?? null); })
      .catch(() => setCards([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit() {
    const card = cards?.find((c) => c.id === selectedCardId);
    if (card) {
      setForm({
        id: card.id, template: card.template, brandName: card.brandName, title: card.title,
        tagline: card.tagline, ctaText: card.ctaText, ctaLink: card.ctaLink, image: card.image,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setEditing(true);
    setError(null);
  }
  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/wani-partner/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل رفع الصورة");
      setForm((f) => ({ ...f, image: json.url }));
    } catch (e: any) {
      setError(e.message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.ctaText.trim() || !form.ctaLink.trim() || !form.image.trim()) {
      setError(t("لازم تكتب بيانات زر CTA وترفع صورة الخلفية", "CTA text, CTA link, and a background image are required"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/wani-partner/mine", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل الحفظ");
      setEditing(false);
      load();
    } catch (e: any) {
      setError(e.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t("متأكد إنك عايز تمسح الكارت؟ هيتشال من الداشبورد فورًا.", "Delete your card? It will be removed from the dashboard immediately."))) return;
    await fetch(`/api/wani-partner/mine?id=${encodeURIComponent(selectedCardId ?? "")}`, { method: "DELETE" });
    setCards((current) => current?.filter((c) => c.id !== selectedCardId));
    setSelectedCardId(null);
  }

  async function toggleActive() {
    const card = cards?.find((c) => c.id === selectedCardId);
    if (!card) return;
    const res = await fetch(`/api/wani-partner/mine?id=${encodeURIComponent(card.id)}`, {
      method: "PATCH",
      // The selected card id is sent below so each card is independent.
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !card.active }),
    });
    if (res.ok) load();
  }

  const previewContent: PartnerCardContent = {
    brandName: form.brandName || t("اسم البراند", "Brand name"),
    title: form.title || t("عنوان الكارت", "Card title"),
    tagline: form.tagline || t("الجملة التسويقية هنا", "Your tagline goes here"),
    ctaText: form.ctaText || t("اضغط هنا", "Click here"),
    ctaLink: form.ctaLink || "#",
    image: form.image || "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1200&auto=format&fit=crop",
  };
  const card = cards?.find((c) => c.id === selectedCardId) ?? null;

  return (
    <div dir={dir} className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* الهيدر */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/25 flex items-center justify-center">
            <Handshake className="w-5.5 h-5.5 text-[#25D366]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">WANI Partner</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("صمّم كارت إعلانك اللي بيظهر بالتدوير لكل مستخدمي الداشبورد", "Design your promo card that rotates on every user's dashboard")}
            </p>
          </div>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1.5 flex-shrink-0">
          {dir === "rtl" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {t("الداشبورد", "Dashboard")}
        </Link>
      </div>

      {/* تنويه بسيط عن الفكرة */}
      <div className="flex items-start gap-2.5 mb-6 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-3">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
        <p>
          {t(
            "كارتك بيتراجع من فريق واني قبل ما يظهر لباقي المستخدمين. أي تعديل بعد الموافقة بيرجّع الكارت لمراجعة تانية، إلا تشغيل/إيقاف الكارت مش محتاج مراجعة.",
            "Your card is reviewed by the WANI team before it goes live to other users. Any edit after approval sends it back for review — except pausing/resuming, which doesn't need re-review."
          )}
        </p>
      </div>

      {accessDenied ? (
        <div className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-gray-900 p-8 sm:p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            <LockKeyhole className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("ميزة WANI Partner متاحة لباقة Enterprise", "WANI Partner is available on Enterprise")}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">
            {t("صمّم كروت شراكة وني واعرضها داخل داشبورد العملاء بعد الترقية إلى باقة Enterprise.", "Create WANI Partner cards and showcase them across customer dashboards by upgrading to Enterprise.")}
          </p>
          <Link href="/checkout?plan=enterprise" className={btn + " mx-auto mt-6 w-fit"}>
            <Sparkles className="h-4 w-4" /> {t("الترقية إلى Enterprise", "Upgrade to Enterprise")}
          </Link>
        </div>
      ) : cards === undefined ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : !editing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t(`الكروت ${cards.length}/10`, `Cards ${cards.length}/10`)}</p>
            <button onClick={() => { setSelectedCardId(null); setForm(EMPTY_FORM); setEditing(true); setError(null); }} disabled={cards.length >= 10} className={btn}>
              <Sparkles className="w-4 h-4" /> {t("إضافة كارت", "Add card")}
            </button>
          </div>
          {cards.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {cards.map((item, index) => <button key={item.id} onClick={() => setSelectedCardId(item.id)} className={`text-start rounded-xl border p-2 text-xs transition ${item.id === selectedCardId ? "border-[#25D366] bg-[#25D366]/5" : "border-gray-200 dark:border-gray-700"}`}>
              <span className="font-semibold">{t("كارت", "Card")} {index + 1}</span><span className="block truncate text-gray-500">{item.title}</span>
            </button>)}
          </div>}
          {!card ? (
            <div className="text-center py-14 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t("لسه معملتش كارت — اعمل واحد وابعته للمراجعة", "You haven't created a card yet — make one and submit it for review")}
              </p>
              <button onClick={startEdit} className={btn + " mx-auto"}>
                <Sparkles className="w-4 h-4" /> {t("اعمل كارتك الأول", "Create your card")}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
              <div className="h-56 sm:h-64 relative">
                <PartnerCardTemplate template={card.template} content={card} interactive={false} />
                {!card.active && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold px-2.5 py-1 rounded-full bg-black/40 border border-white/20">
                      {t("متوقف", "Paused")}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* حالة المراجعة */}
                {(() => {
                  const meta = STATUS_META[card.status];
                  const Icon = meta.icon;
                  return (
                    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${meta.bg}`}>
                      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${meta.color}`}>{meta.label[locale]}</p>
                        {card.status === "pending" && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {t("هيظهر في تدوير الداشبورد بمجرد موافقة الفريق.", "It will join the dashboard rotation once approved.")}
                          </p>
                        )}
                        {card.status === "rejected" && card.rejectionReason && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.rejectionReason}</p>
                        )}
                        {card.status === "approved" && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {card.active
                              ? t("شغّال دلوقتي وبيظهر في التدوير.", "Live now and rotating on the dashboard.")
                              : t("متوقف مؤقتًا — مش هيظهر في التدوير.", "Currently paused — won't appear in the rotation.")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {card.status === "approved" && (
                      <button onClick={toggleActive} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        {card.active
                          ? <><PowerOff className="w-3.5 h-3.5" /> {t("إيقاف", "Pause")}</>
                          : <><Power className="w-3.5 h-3.5 text-[#25D366]" /> {t("تشغيل", "Activate")}</>}
                      </button>
                    )}
                    <button onClick={handleDelete} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition">
                      <Trash2 className="w-3.5 h-3.5" /> {t("حذف", "Delete")}
                    </button>
                  </div>
                  <button onClick={startEdit} className={btn}>
                    <Pencil className="w-4 h-4" /> {t("تعديل الكارت", "Edit card")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          {/* المعاينة الحية */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">{t("معاينة حية", "Live preview")}</p>
            <div className="h-56 sm:h-64 rounded-2xl overflow-hidden">
              <PartnerCardTemplate template={form.template} content={previewContent} interactive={false} animKey={JSON.stringify(form)} />
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* اختيار التيمبلت */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">{t("شكل الكارت (5 تيمبلت)", "Card style (5 templates)")}</label>
              <div className="grid grid-cols-5 gap-2">
                {PARTNER_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setForm((f) => ({ ...f, template: tpl.id }))}
                    title={tpl.name[locale]}
                    className={`aspect-square rounded-xl border-2 flex items-center justify-center text-[10px] font-bold transition-all ${form.template === tpl.id ? "scale-105" : "opacity-60 hover:opacity-100"}`}
                    style={{ borderColor: form.template === tpl.id ? tpl.accent : "transparent", background: `${tpl.accent}1a`, color: tpl.accent }}
                  >
                    {tpl.id}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">{PARTNER_TEMPLATES.find((t2) => t2.id === form.template)?.desc[locale]}</p>
            </div>

            {/* صورة الخلفية */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> {t("صورة الخلفية (بدون نصوص)", "Background image (no text on it)")}
              </label>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-[#25D366] transition disabled:opacity-50">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  {uploading ? t("جاري الرفع...", "Uploading...") : t("ارفع صورة", "Upload image")}
                </button>
                {form.image && <span className="text-[11px] text-gray-400 truncate max-w-[160px]" dir="ltr">{form.image}</span>}
              </div>
            </div>

            {/* الحقول النصية */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t("اسم البراند (اختياري)", "Brand name (optional)")}</label>
                <input value={form.brandName} onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                  placeholder={t("مثال: متجرك", "e.g. Your Store")} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t("نص الزر (CTA)", "CTA text")}</label>
                <input value={form.ctaText} onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))}
                  placeholder={t("مثال: تسوّق دلوقتي", "e.g. Shop now")} className={inp} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t("العنوان (اختياري)", "Title (optional)")}</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("مثال: تخفيضات لحد آخر الشهر", "e.g. Sale until end of month")} className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t("الجملة التسويقية (اختياري)", "Tagline (optional)")}</label>
              <textarea value={form.tagline} rows={2} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                placeholder={t("جملة قصيرة تحت العنوان", "A short line under the title")} className={inp + " resize-none"} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> {t("رابط الزر (CTA)", "CTA link")}
              </label>
              <input value={form.ctaLink} dir="ltr" onChange={(e) => setForm((f) => ({ ...f, ctaLink: e.target.value }))}
                placeholder="https://..." className={inp + " font-mono"} />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2">{error}</p>
            )}

            {card?.status === "approved" && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2">
                {t("كارتك معتمد حاليًا — لو حفظت تعديل، هيرجع لمراجعة الأدمن تاني قبل ما يفضل ظاهر.", "Your card is currently approved — saving a change will send it back for admin review before it stays visible.")}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <X className="w-4 h-4" /> {t("إلغاء", "Cancel")}
              </button>
              <button onClick={handleSave} disabled={saving} className={btn}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {card ? t("حفظ وإعادة الإرسال", "Save & resubmit") : t("إرسال للمراجعة", "Submit for review")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
