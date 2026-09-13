"use client";
import { CardsGridSkeleton } from "@/components/dashboard/DashboardSkeletons";

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

const inp = "w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white";
const btn = "flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50";

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
  pending: { icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", label: { ar: "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©", en: "Under review" } },
  approved: { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10 dark:bg-primary/15 border-primary/20 dark:border-primary/30", label: { ar: "Ù…Ø¹ØªÙ…Ø¯", en: "Approved" } },
  rejected: { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", label: { ar: "Ù…Ø±ÙÙˆØ¶", en: "Rejected" } },
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
      if (!res.ok) throw new Error(json.error || "ÙØ´Ù„ Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø©");
      setForm((f) => ({ ...f, image: json.url }));
    } catch (e: any) {
      setError(e.message || "ÙØ´Ù„ Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø©");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.ctaText.trim() || !form.ctaLink.trim() || !form.image.trim()) {
      setError(t("Ù„Ø§Ø²Ù… ØªÙƒØªØ¨ Ø¨ÙŠØ§Ù†Ø§Øª Ø²Ø± CTA ÙˆØªØ±ÙØ¹ ØµÙˆØ±Ø© Ø§Ù„Ø®Ù„ÙÙŠØ©", "CTA text, CTA link, and a background image are required"));
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
      if (!res.ok) throw new Error(json.error || "ÙØ´Ù„ Ø§Ù„Ø­ÙØ¸");
      setEditing(false);
      load();
    } catch (e: any) {
      setError(e.message || "ÙØ´Ù„ Ø§Ù„Ø­ÙØ¸");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t("Ù…ØªØ£ÙƒØ¯ Ø¥Ù†Ùƒ Ø¹Ø§ÙŠØ² ØªÙ…Ø³Ø­ Ø§Ù„ÙƒØ§Ø±ØªØŸ Ù‡ÙŠØªØ´Ø§Ù„ Ù…Ù† Ø§Ù„Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ ÙÙˆØ±Ù‹Ø§.", "Delete your card? It will be removed from the dashboard immediately."))) return;
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
    brandName: form.brandName || t("Ø§Ø³Ù… Ø§Ù„Ø¨Ø±Ø§Ù†Ø¯", "Brand name"),
    title: form.title || t("Ø¹Ù†ÙˆØ§Ù† Ø§Ù„ÙƒØ§Ø±Øª", "Card title"),
    tagline: form.tagline || t("Ø§Ù„Ø¬Ù…Ù„Ø© Ø§Ù„ØªØ³ÙˆÙŠÙ‚ÙŠØ© Ù‡Ù†Ø§", "Your tagline goes here"),
    ctaText: form.ctaText || t("Ø§Ø¶ØºØ· Ù‡Ù†Ø§", "Click here"),
    ctaLink: form.ctaLink || "#",
    image: form.image || "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1200&auto=format&fit=crop",
  };
  const card = cards?.find((c) => c.id === selectedCardId) ?? null;

  return (
    <div dir={dir} className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Ø§Ù„Ù‡ÙŠØ¯Ø± */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center">
            <Handshake className="w-5.5 h-5.5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">WANI Partner</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("ØµÙ…Ù‘Ù… ÙƒØ§Ø±Øª Ø¥Ø¹Ù„Ø§Ù†Ùƒ Ø§Ù„Ù„ÙŠ Ø¨ÙŠØ¸Ù‡Ø± Ø¨Ø§Ù„ØªØ¯ÙˆÙŠØ± Ù„ÙƒÙ„ Ù…Ø³ØªØ®Ø¯Ù…ÙŠ Ø§Ù„Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯", "Design your promo card that rotates on every user's dashboard")}
            </p>
          </div>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1.5 flex-shrink-0">
          {dir === "rtl" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {t("Ø§Ù„Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯", "Dashboard")}
        </Link>
      </div>

      {/* ØªÙ†ÙˆÙŠÙ‡ Ø¨Ø³ÙŠØ· Ø¹Ù† Ø§Ù„ÙÙƒØ±Ø© */}
      <div className="flex items-start gap-2.5 mb-6 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-3">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
        <p>
          {t(
            "ÙƒØ§Ø±ØªÙƒ Ø¨ÙŠØªØ±Ø§Ø¬Ø¹ Ù…Ù† ÙØ±ÙŠÙ‚ ÙˆØ§Ù†ÙŠ Ù‚Ø¨Ù„ Ù…Ø§ ÙŠØ¸Ù‡Ø± Ù„Ø¨Ø§Ù‚ÙŠ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†. Ø£ÙŠ ØªØ¹Ø¯ÙŠÙ„ Ø¨Ø¹Ø¯ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø¨ÙŠØ±Ø¬Ù‘Ø¹ Ø§Ù„ÙƒØ§Ø±Øª Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ØªØ§Ù†ÙŠØ©ØŒ Ø¥Ù„Ø§ ØªØ´ØºÙŠÙ„/Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„ÙƒØ§Ø±Øª Ù…Ø´ Ù…Ø­ØªØ§Ø¬ Ù…Ø±Ø§Ø¬Ø¹Ø©.",
            "Your card is reviewed by the WANI team before it goes live to other users. Any edit after approval sends it back for review â€” except pausing/resuming, which doesn't need re-review."
          )}
        </p>
      </div>

      {accessDenied ? (
        <div className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-gray-900 p-8 sm:p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            <LockKeyhole className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("Ù…ÙŠØ²Ø© WANI Partner Ù…ØªØ§Ø­Ø© Ù„Ø¨Ø§Ù‚Ø© Max", "WANI Partner is available on Max")}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">
            {t("ØµÙ…Ù‘Ù… ÙƒØ±ÙˆØª Ø´Ø±Ø§ÙƒØ© ÙˆÙ†ÙŠ ÙˆØ§Ø¹Ø±Ø¶Ù‡Ø§ Ø¯Ø§Ø®Ù„ Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø¨Ø¹Ø¯ Ø§Ù„ØªØ±Ù‚ÙŠØ© Ø¥Ù„Ù‰ Ø¨Ø§Ù‚Ø© Max.", "Create WANI Partner cards and showcase them across customer dashboards by upgrading to Max.")}
          </p>
          <Link href="/checkout?plan=max" className={btn + " mx-auto mt-6 w-fit"}>
            <Sparkles className="h-4 w-4" /> {t("Ø§Ù„ØªØ±Ù‚ÙŠØ© Ø¥Ù„Ù‰ Max", "Upgrade to Max")}
          </Link>
        </div>
      ) : cards === undefined ? (
        <CardsGridSkeleton count={3} />
      ) : !editing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t(`Ø§Ù„ÙƒØ±ÙˆØª ${cards.length}/10`, `Cards ${cards.length}/10`)}</p>
            <button onClick={() => { setSelectedCardId(null); setForm(EMPTY_FORM); setEditing(true); setError(null); }} disabled={cards.length >= 10} className={btn}>
              <Sparkles className="w-4 h-4" /> {t("Ø¥Ø¶Ø§ÙØ© ÙƒØ§Ø±Øª", "Add card")}
            </button>
          </div>
          {cards.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {cards.map((item, index) => <button key={item.id} onClick={() => setSelectedCardId(item.id)} className={`text-start rounded-xl border p-2 text-xs transition ${item.id === selectedCardId ? "border-primary bg-primary/5" : "border-gray-200 dark:border-gray-700"}`}>
              <span className="font-semibold">{t("ÙƒØ§Ø±Øª", "Card")} {index + 1}</span><span className="block truncate text-gray-500">{item.title}</span>
            </button>)}
          </div>}
          {!card ? (
            <div className="text-center py-14 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t("Ù„Ø³Ù‡ Ù…Ø¹Ù…Ù„ØªØ´ ÙƒØ§Ø±Øª â€” Ø§Ø¹Ù…Ù„ ÙˆØ§Ø­Ø¯ ÙˆØ§Ø¨Ø¹ØªÙ‡ Ù„Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©", "You haven't created a card yet â€” make one and submit it for review")}
              </p>
              <button onClick={startEdit} className={btn + " mx-auto"}>
                <Sparkles className="w-4 h-4" /> {t("Ø§Ø¹Ù…Ù„ ÙƒØ§Ø±ØªÙƒ Ø§Ù„Ø£ÙˆÙ„", "Create your card")}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
              <div className="h-56 sm:h-64 relative">
                <PartnerCardTemplate template={card.template} content={card} interactive={false} />
                {!card.active && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold px-2.5 py-1 rounded-full bg-black/40 border border-white/20">
                      {t("Ù…ØªÙˆÙ‚Ù", "Paused")}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© */}
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
                            {t("Ù‡ÙŠØ¸Ù‡Ø± ÙÙŠ ØªØ¯ÙˆÙŠØ± Ø§Ù„Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ Ø¨Ù…Ø¬Ø±Ø¯ Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„ÙØ±ÙŠÙ‚.", "It will join the dashboard rotation once approved.")}
                          </p>
                        )}
                        {card.status === "rejected" && card.rejectionReason && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.rejectionReason}</p>
                        )}
                        {card.status === "approved" && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {card.active
                              ? t("Ø´ØºÙ‘Ø§Ù„ Ø¯Ù„ÙˆÙ‚ØªÙŠ ÙˆØ¨ÙŠØ¸Ù‡Ø± ÙÙŠ Ø§Ù„ØªØ¯ÙˆÙŠØ±.", "Live now and rotating on the dashboard.")
                              : t("Ù…ØªÙˆÙ‚Ù Ù…Ø¤Ù‚ØªÙ‹Ø§ â€” Ù…Ø´ Ù‡ÙŠØ¸Ù‡Ø± ÙÙŠ Ø§Ù„ØªØ¯ÙˆÙŠØ±.", "Currently paused â€” won't appear in the rotation.")}
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
                          ? <><PowerOff className="w-3.5 h-3.5" /> {t("Ø¥ÙŠÙ‚Ø§Ù", "Pause")}</>
                          : <><Power className="w-3.5 h-3.5 text-primary" /> {t("ØªØ´ØºÙŠÙ„", "Activate")}</>}
                      </button>
                    )}
                    <button onClick={handleDelete} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition">
                      <Trash2 className="w-3.5 h-3.5" /> {t("Ø­Ø°Ù", "Delete")}
                    </button>
                  </div>
                  <button onClick={startEdit} className={btn}>
                    <Pencil className="w-4 h-4" /> {t("ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ÙƒØ§Ø±Øª", "Edit card")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          {/* Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ø­ÙŠØ© */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">{t("Ù…Ø¹Ø§ÙŠÙ†Ø© Ø­ÙŠØ©", "Live preview")}</p>
            <div className="h-56 sm:h-64 rounded-2xl overflow-hidden">
              <PartnerCardTemplate template={form.template} content={previewContent} interactive={false} animKey={JSON.stringify(form)} />
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ØªÙŠÙ…Ø¨Ù„Øª */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">{t("Ø´ÙƒÙ„ Ø§Ù„ÙƒØ§Ø±Øª (5 ØªÙŠÙ…Ø¨Ù„Øª)", "Card style (5 templates)")}</label>
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

            {/* ØµÙˆØ±Ø© Ø§Ù„Ø®Ù„ÙÙŠØ© */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> {t("ØµÙˆØ±Ø© Ø§Ù„Ø®Ù„ÙÙŠØ© (Ø¨Ø¯ÙˆÙ† Ù†ØµÙˆØµ)", "Background image (no text on it)")}
              </label>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-primary transition disabled:opacity-50">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  {uploading ? t("Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø±ÙØ¹...", "Uploading...") : t("Ø§Ø±ÙØ¹ ØµÙˆØ±Ø©", "Upload image")}
                </button>
                {form.image && <span className="text-[11px] text-gray-400 truncate max-w-[160px]" dir="ltr">{form.image}</span>}
              </div>
            </div>

            {/* Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ù†ØµÙŠØ© */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t("Ø§Ø³Ù… Ø§Ù„Ø¨Ø±Ø§Ù†Ø¯ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)", "Brand name (optional)")}</label>
                <input value={form.brandName} onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                  placeholder={t("Ù…Ø«Ø§Ù„: Ù…ØªØ¬Ø±Ùƒ", "e.g. Your Store")} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t("Ù†Øµ Ø§Ù„Ø²Ø± (CTA)", "CTA text")}</label>
                <input value={form.ctaText} onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))}
                  placeholder={t("Ù…Ø«Ø§Ù„: ØªØ³ÙˆÙ‘Ù‚ Ø¯Ù„ÙˆÙ‚ØªÙŠ", "e.g. Shop now")} className={inp} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t("Ø§Ù„Ø¹Ù†ÙˆØ§Ù† (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)", "Title (optional)")}</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("Ù…Ø«Ø§Ù„: ØªØ®ÙÙŠØ¶Ø§Øª Ù„Ø­Ø¯ Ø¢Ø®Ø± Ø§Ù„Ø´Ù‡Ø±", "e.g. Sale until end of month")} className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t("Ø§Ù„Ø¬Ù…Ù„Ø© Ø§Ù„ØªØ³ÙˆÙŠÙ‚ÙŠØ© (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)", "Tagline (optional)")}</label>
              <textarea value={form.tagline} rows={2} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                placeholder={t("Ø¬Ù…Ù„Ø© Ù‚ØµÙŠØ±Ø© ØªØ­Øª Ø§Ù„Ø¹Ù†ÙˆØ§Ù†", "A short line under the title")} className={inp + " resize-none"} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> {t("Ø±Ø§Ø¨Ø· Ø§Ù„Ø²Ø± (CTA)", "CTA link")}
              </label>
              <input value={form.ctaLink} dir="ltr" onChange={(e) => setForm((f) => ({ ...f, ctaLink: e.target.value }))}
                placeholder="https://..." className={inp + " font-mono"} />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2">{error}</p>
            )}

            {card?.status === "approved" && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2">
                {t("ÙƒØ§Ø±ØªÙƒ Ù…Ø¹ØªÙ…Ø¯ Ø­Ø§Ù„ÙŠÙ‹Ø§ â€” Ù„Ùˆ Ø­ÙØ¸Øª ØªØ¹Ø¯ÙŠÙ„ØŒ Ù‡ÙŠØ±Ø¬Ø¹ Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø£Ø¯Ù…Ù† ØªØ§Ù†ÙŠ Ù‚Ø¨Ù„ Ù…Ø§ ÙŠÙØ¶Ù„ Ø¸Ø§Ù‡Ø±.", "Your card is currently approved â€” saving a change will send it back for admin review before it stays visible.")}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <X className="w-4 h-4" /> {t("Ø¥Ù„ØºØ§Ø¡", "Cancel")}
              </button>
              <button onClick={handleSave} disabled={saving} className={btn}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {card ? t("Ø­ÙØ¸ ÙˆØ¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„", "Save & resubmit") : t("Ø¥Ø±Ø³Ø§Ù„ Ù„Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©", "Submit for review")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

