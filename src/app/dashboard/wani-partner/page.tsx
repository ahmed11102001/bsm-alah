"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/language-context";
import {
  Handshake, ArrowLeft, ArrowRight, Sparkles, Plus, Pencil, Trash2,
  Check, X, Loader2, ImageIcon, ArrowUp, ArrowDown, Power, PowerOff,
  ExternalLink, LayoutTemplate,
} from "lucide-react";
import {
  PARTNER_TEMPLATES, PartnerCardTemplate, type PartnerCardContent,
} from "./_components/PartnerCardTemplates";

// ─── Shared input styles — نفس هوية صفحة /dashboard/admin ────────────────────
const inp = "w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366] bg-white";
const btn = "flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#20b557] transition disabled:opacity-50";

interface PartnerCard extends PartnerCardContent {
  id: string;
  template: number;
  active: boolean;
  order: number;
}

const EMPTY_FORM: PartnerCardContent & { template: number; active: boolean } = {
  template: 1, brandName: "", title: "", tagline: "", ctaText: "", ctaLink: "", image: "", active: true,
};

// ─── Coming Soon (لغير الأدمن) ─────────────────────────────────────────────────
function ComingSoon() {
  const { dir, locale } = useLanguage();
  const isAr = locale === "ar";
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative flex flex-col items-center max-w-lg w-full">
        <div className="absolute -top-20 -z-10 w-72 h-72 bg-[#25D366]/10 dark:bg-[#25D366]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#25D366]/20 to-emerald-500/10 border border-[#25D366]/30 flex items-center justify-center mb-6 shadow-xl shadow-[#25D366]/10 animate-pulse">
          <Handshake className="w-10 h-10 text-[#25D366]" />
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAr ? "برنامج الشركاء" : "Partner Program"}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">
          WANI Partner
        </h1>
        <div className="my-4 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-[#25D366]/10 to-teal-500/10 border border-[#25D366]/20">
          <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#25D366] to-emerald-400 bg-clip-text text-transparent">
            {isAr ? "قريباً (Soon)" : "Coming Soon"}
          </p>
        </div>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
          {isAr
            ? "نحن نعمل حالياً على تطوير برنامج شركاء وني لتوفير ميزات وفرص استثنائية."
            : "We are currently developing the WANI Partner program to provide exceptional features and opportunities."}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-white transition-all shadow-md hover:shadow-lg"
        >
          {dir === "rtl" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isAr ? "العودة للرئيسية" : "Back to Dashboard"}</span>
        </Link>
      </div>
    </div>
  );
}

// ─── لوحة التحكم (للأدمن بس) ────────────────────────────────────────────────────
function PartnerControlPanel() {
  const { locale, dir } = useLanguage();
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [cards, setCards] = useState<PartnerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/wani-partner")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCards(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function startCreate() {
    setEditId("new");
    setForm(EMPTY_FORM);
    setError(null);
  }
  function startEdit(c: PartnerCard) {
    setEditId(c.id);
    setForm({
      template: c.template, brandName: c.brandName, title: c.title, tagline: c.tagline,
      ctaText: c.ctaText, ctaLink: c.ctaLink, image: c.image, active: c.active,
    });
    setError(null);
  }
  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/wani-partner/upload", { method: "POST", body: fd });
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
    if (!form.brandName.trim() || !form.title.trim() || !form.tagline.trim() || !form.ctaText.trim() || !form.ctaLink.trim() || !form.image.trim()) {
      setError(t("لازم تملأ كل الحقول واختيار صورة الخلفية", "Fill in every field and choose a background image"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isNew = editId === "new";
      const res = await fetch("/api/admin/wani-partner", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? form : { id: editId, ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل الحفظ");
      cancelEdit();
      load();
    } catch (e: any) {
      setError(e.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("متأكد إنك عايز تمسح الكارت ده؟", "Delete this card?"))) return;
    await fetch("/api/admin/wani-partner", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function toggleActive(c: PartnerCard) {
    await fetch("/api/admin/wani-partner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    });
    load();
  }

  async function move(c: PartnerCard, direction: -1 | 1) {
    const sorted = [...cards].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((x) => x.id === c.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    await Promise.all([
      fetch("/api/admin/wani-partner", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, order: swapWith.order }) }),
      fetch("/api/admin/wani-partner", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: swapWith.id, order: c.order }) }),
    ]);
    load();
  }

  const sortedCards = [...cards].sort((a, b) => a.order - b.order);
  const previewContent: PartnerCardContent = {
    brandName: form.brandName || t("اسم البراند", "Brand name"),
    title: form.title || t("عنوان الكارت", "Card title"),
    tagline: form.tagline || t("الجملة التسويقية هنا", "Your tagline goes here"),
    ctaText: form.ctaText || t("اضغط هنا", "Click here"),
    ctaLink: form.ctaLink || "#",
    image: form.image || "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1200&auto=format&fit=crop",
  };

  return (
    <div dir={dir} className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* الهيدر */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/25 flex items-center justify-center">
            <Handshake className="w-5.5 h-5.5 text-[#25D366]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t("إدارة كارت WANI Partner", "Manage WANI Partner Card")}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("بيظهر في الصفحة الرئيسية لكل مستخدمي الداشبورد بالتدوير", "Rotates on every user's dashboard home")}</p>
          </div>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1.5">
          {dir === "rtl" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {t("الداشبورد", "Dashboard")}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── العمود الشمال: قائمة الكروت الحالية ── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("الكروت الحالية", "Current cards")} ({cards.length})</h2>
            <button onClick={startCreate} className={btn}>
              <Plus className="w-4 h-4" /> {t("كارت جديد", "New card")}
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : sortedCards.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              {t("مفيش كروت لسه — الداشبورد هيعرض مميزات وني الافتراضية.", "No cards yet — the dashboard will show the default WANI features.")}
            </div>
          ) : (
            sortedCards.map((c, i) => (
              <div key={c.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                <div className="h-28 relative">
                  <PartnerCardTemplate template={c.template} content={c} interactive={false} />
                  {!c.active && (
                    <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold px-2.5 py-1 rounded-full bg-black/40 border border-white/20">
                        {t("متوقف", "Paused")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{c.title}</p>
                    <p className="text-[10px] text-gray-400">{t("تيمبلت", "Template")} {c.template} · {PARTNER_TEMPLATES.find(m => m.id === c.template)?.name[locale]}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button title={t("لأعلى", "Up")} onClick={() => move(c, -1)} disabled={i === 0} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button title={t("لأسفل", "Down")} onClick={() => move(c, 1)} disabled={i === sortedCards.length - 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button title={c.active ? t("إيقاف", "Pause") : t("تفعيل", "Activate")} onClick={() => toggleActive(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      {c.active ? <Power className="w-3.5 h-3.5 text-[#25D366]" /> : <PowerOff className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                    <button title={t("تعديل", "Edit")} onClick={() => startEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button title={t("حذف", "Delete")} onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── العمود اليمين: الفورم + المعاينة الحية ── */}
        <div className="lg:col-span-3">
          {editId === null ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8">
              <LayoutTemplate className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">{t("اختار كارت للتعديل، أو اعمل كارت جديد", "Pick a card to edit, or create a new one")}</p>
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
                  <p className="text-[11px] text-gray-400 mt-1.5">{PARTNER_TEMPLATES.find(t2 => t2.id === form.template)?.desc[locale]}</p>
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
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t("اسم البراند", "Brand name")}</label>
                    <input value={form.brandName} onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                      placeholder={t("مثال: WANI", "e.g. WANI")} className={inp} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t("نص الزر (CTA)", "CTA text")}</label>
                    <input value={form.ctaText} onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))}
                      placeholder={t("مثال: جرّب دلوقتي", "e.g. Try now")} className={inp} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t("العنوان", "Title")}</label>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={t("مثال: وكيل واني الذكي", "e.g. WANI AI Agent")} className={inp} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t("الجملة التسويقية", "Tagline")}</label>
                  <textarea value={form.tagline} rows={2} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                    placeholder={t("جملة قصيرة تحت العنوان", "A short line under the title")} className={inp + " resize-none"} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> {t("رابط الزر (CTA)", "CTA link")}
                  </label>
                  <input value={form.ctaLink} dir="ltr" onChange={(e) => setForm((f) => ({ ...f, ctaLink: e.target.value }))}
                    placeholder="/dashboard/automation أو https://..." className={inp + " font-mono"} />
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2">{error}</p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                      className={`w-10 h-6 rounded-full transition-colors relative ${form.active ? "bg-[#25D366]" : "bg-gray-200 dark:bg-gray-600"}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.active ? "right-1" : "right-5"}`} />
                    </div>
                    <span className={`text-sm font-medium ${form.active ? "text-green-700 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                      {form.active ? t("مفعّل", "Active") : t("متوقف", "Paused")}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                      <X className="w-4 h-4" /> {t("إلغاء", "Cancel")}
                    </button>
                    <button onClick={handleSave} disabled={saving} className={btn}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {editId === "new" ? t("إضافة الكارت", "Add card") : t("حفظ التعديلات", "Save changes")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WaniPartnerPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;
  if (session?.user?.isSuper) return <PartnerControlPanel />;
  return <ComingSoon />;
}
