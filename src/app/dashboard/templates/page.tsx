"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RefreshCw, Plus, Search, CheckCircle2, Clock, XCircle, Ban,
  ChevronLeft, Smartphone, LayoutGrid, FileText, Sparkles, Package, Megaphone, CheckCheck, Loader2,
} from "lucide-react";

import { T } from "./_components/i18n";
import { WANI_READY } from "./_components/wani-ready-templates";
import { StatusBadge } from "./_components/StatusBadge";
import { CategoryBadge } from "./_components/CategoryBadge";
import { WhatsAppPreview } from "./_components/WhatsAppPreview";
import { WaniEditModal } from "./_components/WaniEditModal";
import { WaniReadyCard } from "./_components/WaniReadyCard";
import { TemplateDetailModal } from "./_components/TemplateDetailModal";
import { Step1 } from "./_components/Step1";
import { Step2 } from "./_components/Step2";
import type { Template, TemplateStatus, TemplateCategory, View, Lang, FormState } from "./_components/types";

// ─── Main component ────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const { dir } = useLanguage();
  const lang: Lang = dir === "rtl" ? "ar" : "en";
  const t = T[lang];

  const [templates, setTemplates] = useState<Template[]>([]);
  const [view, setView] = useState<View>("list");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [detailTpl, setDetailTpl] = useState<Template | null>(null);
  const [waniEditTpl, setWaniEditTpl] = useState<Template | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterCat, setFilterCat] = useState<string>("ALL");
  const [filterLang, setFilterLang] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const defaultForm: FormState = { name: "", category: "", language: "ar", headerType: "none", headerText: "", body: "", footer: "", buttons: [], exampleVars: [] };
  const [form, setForm] = useState<FormState>(defaultForm);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      const mapped = data.map((t: any) => ({
        ...t,
        body: t.content,
      }));
      setTemplates(mapped);
    } catch (err: any) {
      toast.error(lang === "ar" ? "فشل تحميل القوالب" : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const stats = {
    total: templates.length,
    approved: templates.filter(t => t.status === "APPROVED").length,
    pending: templates.filter(t => t.status === "PENDING").length,
    rejected: templates.filter(t => t.status === "REJECTED").length,
    paused: templates.filter(t => t.status === "PAUSED").length,
  };

  const filtered = templates.filter(tp => {
    if (filterStatus !== "ALL" && tp.status !== filterStatus) return false;
    if (filterCat !== "ALL" && tp.category !== filterCat) return false;
    if (filterLang !== "ALL" && tp.language !== filterLang) return false;
    if (search && !tp.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/templates/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      toast.success(lang === "ar" ? `تمت المزامنة بنجاح (${data.count} قالب)` : `Sync successful (${data.count} templates)`);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || (lang === "ar" ? "فشل المزامنة" : "Sync failed"));
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (draft: boolean) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          draft
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template");

      if (!draft) {
        setSubmitSuccess(true);
      } else {
        toast.success(lang === "ar" ? "تم الحفظ كمسودة" : "Saved as draft");
        setView("list"); setStep(1); setForm(defaultForm);
      }
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || (lang === "ar" ? "فشل حفظ القالب" : "Failed to save template"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete template");
      toast.success(lang === "ar" ? "تم حذف القالب بنجاح" : "Template deleted successfully");
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || (lang === "ar" ? "فشل حذف القالب" : "Failed to delete template"));
    }
  };

  const handleSendWani = async (tpl: Template) => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tpl.name,
          category: tpl.category,
          language: tpl.language,
          headerType: tpl.headerType || "none",
          headerText: tpl.headerText || "",
          body: tpl.body || "",
          footer: tpl.footer || "",
          buttons: tpl.buttons || [],
          exampleVars: tpl.exampleVars || [],
          draft: false
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send template");
      toast.success(lang === "ar" ? "تم إرسال القالب للمراجعة" : "Template submitted for review");
      fetchTemplates();
      return true;
    } catch (err: any) {
      toast.error(err.message || (lang === "ar" ? "فشل إرسال القالب" : "Failed to send template"));
      return false;
    }
  };

  // ── List view ──────────────────────────────────────────────────────────────
  if (view === "list") return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6" dir={dir}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? t.syncing : t.syncBtn}
          </button>
          <button onClick={() => setView("library")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all">
            <Sparkles className="w-4 h-4" />
            {t.waniLibraryBtn}
          </button>
          <Button onClick={() => { setView("create"); setStep(1); setForm(defaultForm); setSubmitSuccess(false); }}
            className="bg-[#25D366] hover:bg-[#1fb956] text-white gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> {t.newTemplate}
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: t.stats.total, value: stats.total, cls: "text-gray-800 dark:text-white", icon: <LayoutGrid className="w-4 h-4 text-gray-400" /> },
          { label: t.stats.approved, value: stats.approved, cls: "text-emerald-700 dark:text-emerald-400", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
          { label: t.stats.pending, value: stats.pending, cls: "text-amber-700  dark:text-amber-400", icon: <Clock className="w-4 h-4 text-amber-500" /> },
          { label: t.stats.rejected, value: stats.rejected, cls: "text-red-700    dark:text-red-400", icon: <XCircle className="w-4 h-4 text-red-500" /> },
          { label: t.stats.paused, value: stats.paused, cls: "text-gray-500   dark:text-gray-400", icon: <Ban className="w-4 h-4 text-gray-400" /> },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            {s.icon}
            <div>
              <p className={`text-xl font-bold leading-none ${s.cls}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t.filters.search}
            className="pr-9 text-sm dark:bg-gray-800 dark:border-gray-700" />
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {["ALL", "APPROVED", "PENDING", "REJECTED"].map(s => (
            <button key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all
                ${filterStatus === s ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {s === "ALL" ? t.filters.all : t.status[s as TemplateStatus]}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {["ALL", "MARKETING", "UTILITY", "AUTHENTICATION"].map(c => (
            <button key={c}
              onClick={() => setFilterCat(c)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all
                ${filterCat === c ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {c === "ALL" ? t.filters.all : t.category[c as TemplateCategory]}
            </button>
          ))}
        </div>
      </div>

      {/* My Templates Table */}
      <div>
        <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">{t.myTemplates}</p>
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="w-8 h-8 text-[#25D366] animate-spin mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lang === "ar" ? "جاري تحميل القوالب..." : "Loading templates..."}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">{t.empty}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t.emptyHint}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    {[t.table.name, t.table.category, t.table.language, t.table.updated, t.table.status, ""].map((h, i) => (
                      <th key={i} className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {filtered.map(tpl => (
                    <tr key={tpl.id} onClick={() => setDetailTpl(tpl)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer group">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white group-hover:text-[#25D366] transition-colors">
                          {tpl.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5"><CategoryBadge category={tpl.category} lang={lang} /></td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {tpl.language === "ar" ? "🇸🇦" : "🇬🇧"} {tpl.language}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500">{tpl.updatedAt ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={tpl.status} label={t.status[tpl.status]} />
                      </td>
                      <td className="px-4 py-3.5">
                        <ChevronLeft className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>


      <TemplateDetailModal template={detailTpl} open={!!detailTpl} onClose={() => setDetailTpl(null)} onDelete={handleDelete} lang={lang} />
      <WaniEditModal
        template={waniEditTpl}
        open={!!waniEditTpl}
        onClose={() => setWaniEditTpl(null)}
        onSendCustomized={handleSendWani}
        lang={lang}
      />
    </div>
  );

  // ── Wani Template Library view (full page — room to grow) ────────────────────
  if (view === "library") return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6" dir={dir}>
      {/* Breadcrumb & Language Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <button onClick={() => setView("list")} className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            {t.title}
          </button>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-gray-900 dark:text-white font-medium">{t.waniLibraryBtn}</span>
        </div>

      </div>

      {/* Store templates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{t.storeGroupTitle}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t.storeGroupDesc}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {WANI_READY.filter(tpl => tpl.group === "store" && tpl.language === "ar").map(tpl => {
            const matched = templates.find(t => t.name === tpl.name) ?? null;
            return (
              <WaniReadyCard
                key={tpl.id}
                template={tpl}
                lang={lang}
                onView={() => setDetailTpl(matched ?? { ...tpl, status: "NOT_SENT", createdAt: undefined, updatedAt: undefined })}
                onSend={handleSendWani}
                onCustomize={tpl2 => setWaniEditTpl(tpl2)}
                matchedTemplate={matched}
              />
            );
          })}
        </div>
      </div>

      {/* Follow-up templates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{t.followupGroupTitle}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t.followupGroupDesc}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {WANI_READY.filter(tpl => tpl.group === "followup" && tpl.language === "ar").map(tpl => {
            const matched = templates.find(t => t.name === tpl.name) ?? null;
            return (
              <WaniReadyCard
                key={tpl.id}
                template={tpl}
                lang={lang}
                onView={() => setDetailTpl(matched ?? { ...tpl, status: "NOT_SENT", createdAt: undefined, updatedAt: undefined })}
                onSend={handleSendWani}
                onCustomize={tpl2 => setWaniEditTpl(tpl2)}
                matchedTemplate={matched}
              />
            );
          })}
        </div>
      </div>

      {/* Campaign Templates */}
      <div>
        <div className="flex items-center gap-2 mb-3 mt-8">
          <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{t.campaignGroupTitle}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t.campaignGroupDesc}</p>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t.marketingTitle}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {WANI_READY.filter(tpl => tpl.group === "campaign" && tpl.category === "MARKETING" && tpl.language === "ar").map(tpl => {
            const matched = templates.find(t => t.name === tpl.name) ?? null;
            return (
              <WaniReadyCard
                key={tpl.id}
                template={tpl}
                lang={lang}
                onView={() => setDetailTpl(matched ?? { ...tpl, status: "NOT_SENT", createdAt: undefined, updatedAt: undefined })}
                onSend={handleSendWani}
                onCustomize={tpl2 => setWaniEditTpl(tpl2)}
                matchedTemplate={matched}
              />
            );
          })}
        </div>

        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t.utilityTitle}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {WANI_READY.filter(tpl => tpl.group === "campaign" && tpl.category === "UTILITY" && tpl.language === "ar").map(tpl => {
            const matched = templates.find(t => t.name === tpl.name) ?? null;
            return (
              <WaniReadyCard
                key={tpl.id}
                template={tpl}
                lang={lang}
                onView={() => setDetailTpl(matched ?? { ...tpl, status: "NOT_SENT", createdAt: undefined, updatedAt: undefined })}
                onSend={handleSendWani}
                onCustomize={tpl2 => setWaniEditTpl(tpl2)}
                matchedTemplate={matched}
              />
            );
          })}
        </div>
      </div>
      <TemplateDetailModal template={detailTpl} open={!!detailTpl} onClose={() => setDetailTpl(null)} onDelete={handleDelete} lang={lang} />
      <WaniEditModal
        template={waniEditTpl}
        open={!!waniEditTpl}
        onClose={() => setWaniEditTpl(null)}
        onSendCustomized={handleSendWani}
        lang={lang}
      />
    </div>
  );

  // ── Create view ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto" dir={dir}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <button onClick={() => { setView("list"); setStep(1); }} className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          {t.title}
        </button>
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="text-gray-900 dark:text-white font-medium">{t.newTemplate}</span>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[{ n: 1, label: t.step1 }, { n: 2, label: t.step2 }].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
              ${step === s.n ? "bg-[#25D366] text-white" : step > s.n ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
              {step > s.n ? <CheckCheck className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span className={`text-sm font-medium ${step === s.n ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
              {s.label}
            </span>
            {i < 1 && <div className={`h-0.5 w-12 mx-1 ${step > 1 ? "bg-[#25D366]" : "bg-gray-200 dark:bg-gray-700"}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Form panel */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          {step === 1
            ? <Step1 form={form} setForm={setForm} lang={lang}
              onNext={() => setStep(2)}
              onCancel={() => { setView("list"); setStep(1); }} />
            : <Step2 form={form} setForm={setForm} lang={lang}
              onSubmit={handleSubmit} onBack={() => setStep(1)}
              submitting={submitting} success={submitSuccess} />
          }
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-1 sticky top-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5" /> {t.preview}
            </p>
            <WhatsAppPreview form={form} lang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
}