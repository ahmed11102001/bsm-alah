"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Send, Megaphone, RefreshCw, CheckCircle, Eye, MessageSquare, Loader2, BarChart3,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useSubscription } from "@/lib/dashboard-context";
import { useTemplateParser } from "@/hooks/useTemplateParser";

import { tr } from "./_components/i18n";
import { cleanNumber, isValidPhone } from "./_components/helpers";
import { StepBar } from "./_components/StepBar";
import { ProgressBar } from "./_components/ProgressBar";
import { CampaignCard } from "./_components/CampaignCard";
import { DetailsModal } from "./_components/DetailsModal";
import { CreateStep1 } from "./_components/CreateStep1";
import { CreateStep2 } from "./_components/CreateStep2";
import { CreateStep3 } from "./_components/CreateStep3";
import type { Lang, Template, Campaign, AudienceContact, AudienceOption } from "./_components/types";

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function Campaigns() {
  const { campaignAtMax: atLimit, hasMetaConnection: whatsappConnected } = useSubscription();
  const router = useRouter();
  const { locale } = useLanguage();
  const lang: Lang = locale === "en" ? "en" : "ar";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [numbers, setNumbers] = useState<string[]>([]);
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState("");
  const [importingAudience, setImportingAudience] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const [campaignName, setCampaignName] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  // ── Dynamic template variables ───────────────────────────────────────────
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [templateVarValues, setTemplateVarValues] = useState<Record<string, string>>({});
  const [audienceSource, setAudienceSource] = useState<"excel" | "contacts" | null>(null);

  const [detailsCampaign, setDetailsCampaign] = useState<Campaign | null>(null);
  const [metaPrompt, setMetaPrompt] = useState<string | null>(null);

  // ── Parse selected template components ──────────────────────────────────
  const parsedTemplate = useTemplateParser(
    selectedTemplate ? (selectedTemplate as any).components ?? null : null
  );

  const hasRunning = campaigns.some(c => c.status === "running");
  const campaignLimitActive = whatsappConnected && atLimit;

  const loadCampaigns = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingList(true);
      const params = new URLSearchParams({ limit: "50" });
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/campaigns?${params}`);
      const data = await res.json();
      const list: Campaign[] = Array.isArray(data) ? data : (data.campaigns ?? data.data ?? []);

      // ── Fetch read counts from messages API ──────────────────────────────
      // WhatsApp marks messages "read" in the chat; merge that count here
      try {
        const msgRes = await fetch("/api/messages?status=read&limit=1000");
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          const messages: any[] = Array.isArray(msgData) ? msgData : (msgData.messages ?? msgData.data ?? []);
          // Group by campaignId
          const readMap: Record<string, number> = {};
          for (const m of messages) {
            if (m.campaignId) readMap[m.campaignId] = (readMap[m.campaignId] ?? 0) + 1;
          }
          // Merge into campaign list — take max of API value vs message count
          for (const c of list) {
            if (readMap[c.id] && readMap[c.id] > c.readCount) {
              c.readCount = readMap[c.id];
            }
          }
        }
      } catch {/* silent — fallback to API value */ }

      setCampaigns(list);
      setTotal(data.total ?? list.length);
    } catch { if (!silent) toast.error(tr("errLoadCampaigns", lang)); }
    finally { if (!silent) setLoadingList(false); }
  }, [filterStatus]);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      const list: Template[] = Array.isArray(data) ? data : (data.data ?? []);
      const approved = list.filter(t => ["approved", "APPROVED"].includes(t.status ?? ""));
      setTemplates(approved);
      if (approved.length > 0) setSelectedTemplate(approved[0]);
    } catch { toast.error(tr("errLoadTemplates", lang)); }
  }, []);

  const loadAudiences = useCallback(async () => {
    try {
      const res = await fetch("/api/audiences");
      const data = await res.json();
      const list: AudienceOption[] = (Array.isArray(data) ? data : (data.audiences ?? []))
        .filter((a: any) => ["excel", "custom", "google_sheets", "vip", "engaged", "no-response"].includes(a.type))
        .map((a: any) => ({ id: a.id, name: a.name, type: a.type, contactCount: Number(a.contactCount ?? 0) }));
      setAudiences(list);
    } catch { toast.error(tr("errLoadAudiences", lang)); }
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => { loadTemplates(); loadAudiences(); }, [loadTemplates, loadAudiences]);
  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => loadCampaigns(true), 8_000);
    return () => clearInterval(id);
  }, [hasRunning, loadCampaigns]);

  // تحديث دوري صامت كل 20 ثانية حتى لو مفيش حملة شغالة دلوقتي
  // (عشان أرقام delivered/read تتحدث لوحدها من غير ريفريش يدوي)
  useEffect(() => {
    const id = setInterval(() => loadCampaigns(true), 20_000);
    return () => clearInterval(id);
  }, [loadCampaigns]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") loadCampaigns(true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadCampaigns]);

  const resetDialog = () => {
    setStep(1); setNumbers([]); setSelectedAudienceId("");
    setSelectedTemplate(templates[0] ?? null);
    setCampaignName(""); setSendMode("now"); setScheduledAt("");
    setParsedRows([]); setAvailableColumns([]); setTemplateVarValues({}); setAudienceSource(null);
  };

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];
      if (!ws) { toast.error(tr("errNoSheets", lang)); return; }

      // ── Extract headers from first row ──────────────────────────────────
      const headers: string[] = [];
      const firstRow = ws.getRow(1);
      (Array.isArray(firstRow.values) ? firstRow.values : []).forEach((cell, idx) => {
        if (idx === 0) return; // ExcelJS row.values is 1-indexed, index 0 is empty
        if (cell != null && String(cell).trim()) headers.push(String(cell).trim());
      });

      // ── Extract all rows as objects ──────────────────────────────────────
      const rows: Record<string, any>[] = [];
      const extracted: string[] = [];
      ws.eachRow((row, rowIdx) => {
        if (rowIdx === 1) return; // skip header row
        const vals = Array.isArray(row.values) ? row.values : [];
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => {
          obj[h] = vals[i + 1] ?? ""; // +1 because vals is 1-indexed
        });
        // also extract phone numbers from entire row for backward-compat
        vals.forEach(cell => {
          if (cell == null) return;
          const cleaned = cleanNumber(String(cell).trim());
          if (isValidPhone(cleaned)) extracted.push(cleaned);
        });
        rows.push(obj);
      });

      const unique = [...new Set([...numbers, ...extracted])];
      setNumbers(unique);
      setParsedRows(rows);
      setAvailableColumns(headers);
      setAudienceSource("excel");
      setTemplateVarValues({}); // reset mapping when new file loaded
      toast.success(`${lang === "ar" ? "تم استخراج" : "Extracted"} ${extracted.length} ${lang === "ar" ? "رقم صالح" : "valid numbers"}`);
    } catch { toast.error(tr("errReadFile", lang)); }
  };

  const importAudienceContacts = async () => {
    if (!selectedAudienceId) { toast.error(tr("errPickAudience", lang)); return; }
    setImportingAudience(true);
    try {
      const res = await fetch(`/api/audiences?audienceId=${encodeURIComponent(selectedAudienceId)}&includeContacts=all`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tr("errLoadAudience", lang));
      const contacts: AudienceContact[] = Array.isArray(data.contacts) ? data.contacts : [];
      const extracted = contacts.map(c => cleanNumber(String(c.phone ?? "").trim())).filter(isValidPhone);
      if (extracted.length === 0) { toast.error(tr("errNoValidNumbers", lang)); return; }
      setNumbers([...new Set([...numbers, ...extracted])]);

      // ── Extract field names from first contact for variable mapping ────
      if (contacts.length > 0) {
        const fields = Object.keys(contacts[0]).filter(k => k !== "phone" && k !== "id");
        // Store contacts as rows (with phone included) for mapping
        const rows = contacts.map(c => ({ ...c }));
        setParsedRows(rows);
        setAvailableColumns(["phone", ...fields]);
        setAudienceSource("contacts");
        setTemplateVarValues({});
      }

      toast.success(`${lang === "ar" ? "تم استيراد" : "Imported"} ${extracted.length} ${lang === "ar" ? "رقم" : "numbers"}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setImportingAudience(false); }
  };

  const handleSubmit = async () => {
    if (!whatsappConnected) {
      showMetaConnectToast();
      return;
    }
    if (!campaignName.trim()) { toast.error(tr("errEnterName", lang)); return; }
    if (!selectedTemplate) { toast.error(tr("errChooseTemplate", lang)); return; }
    if (sendMode === "scheduled" && !scheduledAt) { toast.error(tr("errPickSchedule", lang)); return; }
    setSubmitting(true);
    const tid = toast.loading(tr("creatingCampaign", lang));
    try {
      // ── Build templateVars: resolve per-row mapping OR use static values ──
      let resolvedTemplateVars: any = null;

      const hasMapping = availableColumns.length > 0 && parsedRows.length > 0;
      const hasAnyVar = Object.keys(templateVarValues).length > 0;

      if (hasAnyVar) {
        if (hasMapping) {
          // Build a recipients array: [{ phone, templateVars }]
          // Each row contributes its own variable values based on the column mapping
          const phoneColGuess = availableColumns.find(c =>
            ["phone", "mobile", "هاتف", "رقم", "tel"].includes(c.toLowerCase())
          ) ?? availableColumns[0];

          const recipientVars: Record<string, any>[] = parsedRows.map(row => {
            const phone = cleanNumber(String(row[phoneColGuess] ?? "").trim());
            const vars: any = { header: [], body: [], buttons: [] };

            // Resolve header vars
            for (let i = 1; i <= (parsedTemplate?.headerVariablesCount ?? 0); i++) {
              const mapping = templateVarValues[`header_${i}`] ?? "";
              vars.header.push(mapping.startsWith("STATIC:")
                ? mapping.replace("STATIC:", "")
                : String(row[mapping] ?? ""));
            }
            // Resolve body vars
            for (let i = 1; i <= (parsedTemplate?.bodyVariablesCount ?? 0); i++) {
              const mapping = templateVarValues[`body_${i}`] ?? "";
              vars.body.push(mapping.startsWith("STATIC:")
                ? mapping.replace("STATIC:", "")
                : String(row[mapping] ?? ""));
            }
            // Resolve button vars
            (parsedTemplate?.dynamicButtons ?? []).forEach(btn => {
              const mapping = templateVarValues[`button_${btn.index}`] ?? "";
              vars.buttons.push({
                index: btn.index,
                value: mapping.startsWith("STATIC:")
                  ? mapping.replace("STATIC:", "")
                  : String(row[mapping] ?? ""),
              });
            });
            // Media URL (static, same for all)
            if (templateVarValues.headerMediaUrl) {
              vars.headerMediaUrl = templateVarValues.headerMediaUrl;
            }
            return { phone, templateVars: vars };
          });

          // Filter to only include valid phones
          const validRecipients = recipientVars.filter(r => isValidPhone(r.phone));

          const res = await fetch("/api/campaigns", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: campaignName,
              templateName: selectedTemplate.name,
              numbers: validRecipients.map(r => r.phone),
              recipients: validRecipients,
              scheduledAt: sendMode === "scheduled" ? new Date(scheduledAt).toISOString() : null,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || tr("errCreateCampaign", lang));
          toast.dismiss(tid);
          toast.success(data.scheduled ? "تم جدولة الحملة ✅" : "تم إنشاء الحملة ✅");
          window.dispatchEvent(new Event("trigger-review-prompt"));
          setDialogOpen(false); resetDialog(); await loadCampaigns();
          return;
        } else {
          // No rows → static values only (same for everyone)
          const vars: any = { header: [], body: [], buttons: [] };
          for (let i = 1; i <= (parsedTemplate?.headerVariablesCount ?? 0); i++) {
            const v = templateVarValues[`header_${i}`] ?? "";
            vars.header.push(v.startsWith("STATIC:") ? v.replace("STATIC:", "") : v);
          }
          for (let i = 1; i <= (parsedTemplate?.bodyVariablesCount ?? 0); i++) {
            const v = templateVarValues[`body_${i}`] ?? "";
            vars.body.push(v.startsWith("STATIC:") ? v.replace("STATIC:", "") : v);
          }
          (parsedTemplate?.dynamicButtons ?? []).forEach(btn => {
            const v = templateVarValues[`button_${btn.index}`] ?? "";
            vars.buttons.push({ index: btn.index, value: v.startsWith("STATIC:") ? v.replace("STATIC:", "") : v });
          });
          if (templateVarValues.headerMediaUrl) vars.headerMediaUrl = templateVarValues.headerMediaUrl;
          resolvedTemplateVars = vars;
        }
      } else if (templateVarValues.headerMediaUrl) {
        // Only media, no text vars
        resolvedTemplateVars = { headerMediaUrl: templateVarValues.headerMediaUrl };
      }

      const res = await fetch("/api/campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          templateName: selectedTemplate.name,
          numbers,
          templateVars: resolvedTemplateVars,
          scheduledAt: sendMode === "scheduled" ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tr("errCreateCampaign", lang));
      toast.dismiss(tid);
      toast.success(data.scheduled ? "تم جدولة الحملة ✅" : "تم إنشاء الحملة ✅");
      window.dispatchEvent(new Event("trigger-review-prompt"));
      setDialogOpen(false); resetDialog(); await loadCampaigns();
    } catch (err: any) { toast.dismiss(tid); toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    const tid = toast.loading(tr("deleting", lang));
    try {
      const res = await fetch("/api/campaigns", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tr("errDelete", lang));
      toast.dismiss(tid); toast.success(tr("deletedOk", lang)); await loadCampaigns();
    } catch (err: any) { toast.dismiss(tid); toast.error(err.message); }
  };

  const handleRepeat = async (campaign: Campaign) => {
    const elapsed = Date.now() - new Date(campaign.createdAt).getTime();
    const min48 = 48 * 60 * 60 * 1000;
    if (elapsed < min48) {
      const h = Math.ceil((min48 - elapsed) / 3_600_000);
      toast.error(`${tr("repeatAfter48", lang)} — ${h} ${tr("hoursLeft", lang)}`);
      return;
    }
    const tid = toast.loading(tr("repeating", lang));
    try {
      const res = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ _action: "repeat", campaignId: campaign.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tr("errRepeat", lang));
      toast.dismiss(tid); toast.success(tr("repeatedOk", lang)); await loadCampaigns();
    } catch (err: any) { toast.dismiss(tid); toast.error(err.message); }
  };

  // Summary stats
  // deliveredCount في الـ DB = رسائل وصلت بدون ما تتقرأ
  // readCount = رسائل اتقرأت (وبالتأكيد وصلت)
  // معدل التوصيل الحقيقي = deliveredCount + readCount
  const totalSent = campaigns.reduce((a, c) => a + c.sentCount, 0);
  const totalDelivered = campaigns.reduce((a, c) => a + c.deliveredCount + c.readCount, 0);
  const totalRead = campaigns.reduce((a, c) => a + c.readCount, 0);

  const STATUS_FILTERS = [
    { value: "all", label: tr("filterAll", lang) },
    { value: "running", label: tr("filterRunning", lang) },
    { value: "scheduled", label: tr("filterScheduled", lang) },
    { value: "completed", label: tr("filterCompleted", lang) },
    { value: "failed", label: tr("filterFailed", lang) },
    { value: "draft", label: tr("filterDraft", lang) },
  ];

  function showLimitToast() {
    toast.custom(() => (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 flex flex-col gap-2 min-w-[260px]" dir="rtl">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          وصلت الحد الأقصى للحملات هذا الشهر
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          رقّي الباقة لإرسال حملات غير محدودة.
        </p>
        <button
          onClick={() => { toast.dismiss(); router.push("/checkout"); }}
          className="mt-1 text-xs font-semibold text-white bg-[#075E54] hover:bg-[#064944] px-4 py-2 rounded-lg transition-colors"
        >
          ترقية الباقة ←
        </button>
      </div>
    ), { duration: 6000 });
  }

  function showMetaConnectToast() {
    const message = lang === "ar"
      ? "اربط رقمك بميتا علشان تعمل حملة"
      : "Connect your Meta number to create a campaign.";
    window.alert(message);
    setMetaPrompt(message);
    window.setTimeout(() => setMetaPrompt(null), 3500);
  }

  function openCampaignDialog() {
    if (!whatsappConnected) {
      showMetaConnectToast();
      return;
    }
    if (atLimit) {
      showLimitToast();
      return;
    }
    resetDialog();
    setDialogOpen(true);
  }

  return (
    <div className="max-w-4xl mx-auto" dir={lang === "ar" ? "rtl" : "ltr"}>
      {metaPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4">
          <div className="max-w-md w-full rounded-2xl border border-white/20 bg-white dark:bg-gray-900 shadow-2xl p-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-5 h-5 text-[#25D366]" />
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {lang === "ar" ? "لازم تربط ميتا أولاً" : "Meta connection required"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {metaPrompt}
            </p>
            <button
              type="button"
              onClick={() => setMetaPrompt(null)}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#075E54] px-4 py-2 text-sm font-semibold text-white hover:bg-[#064944] transition-colors"
            >
              {lang === "ar" ? "حسنًا" : "OK"}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{tr("title", lang)}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{total} {tr("totalCampaignsSubtitle", lang)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadCampaigns}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-green-600 hover:border-green-300 transition">
            <RefreshCw className={`w-4 h-4 ${loadingList ? "animate-spin" : ""}`} />
          </button>
          <Button
            onClick={openCampaignDialog}
            className={campaignLimitActive
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-sm gap-2 flex-1 sm:flex-none justify-center"
              : "bg-green-500 hover:bg-green-600 text-white shadow-sm gap-2 flex-1 sm:flex-none justify-center"
            }
          >
            <Plus className="w-4 h-4" />
            {campaignLimitActive ? (lang === "ar" ? "وصلت الحد الأقصى" : "Limit reached") : tr("newCampaign", lang)}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-5">
          {[
            { label: tr("totalCampaigns", lang), value: total, icon: <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />, color: "text-gray-600 dark:text-gray-300", bg: "bg-gray-50 dark:bg-gray-800" },
            { label: tr("totalSent", lang), value: totalSent, icon: <Send className="w-4 h-4 sm:w-5 sm:h-5" />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: tr("totalDelivered", lang), value: totalDelivered, icon: <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
            { label: tr("totalRead", lang), value: totalRead, icon: <Eye className="w-4 h-4 sm:w-5 sm:h-5" />, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3`}>
              <span className={`${s.color} flex-shrink-0`}>{s.icon}</span>
              <div className="min-w-0">
                <p className={`text-lg sm:text-xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overall rates */}
      {totalSent > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 mb-5 space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-gray-400" /> {tr("overallPerf", lang)}
          </p>
          <ProgressBar label={tr("deliveryRate", lang)} value={totalDelivered} max={totalSent} color="bg-green-400" textColor="text-green-600 dark:text-green-400" />
          <ProgressBar label={tr("readRate", lang)} value={totalRead} max={totalSent} color="bg-purple-400" textColor="text-purple-600 dark:text-purple-400" />
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 flex-nowrap scrollbar-hide">
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition flex-shrink-0
              ${filterStatus === f.value ? "bg-green-500 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loadingList ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-green-400 animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
            <Megaphone className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {filterStatus !== "all" ? tr("noFilterMatch", lang) : tr("noCampaigns", lang)}
          </h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xs">{tr("noCampaignsDesc", lang)}</p>
          {filterStatus === "all" && (
            <Button onClick={openCampaignDialog} className="bg-green-500 hover:bg-green-600 text-white gap-2">
              <Plus className="w-4 h-4" /> {tr("startFirst", lang)}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const elapsed = Date.now() - new Date(c.createdAt).getTime();
            const min48 = 48 * 60 * 60 * 1000;
            const blocked = elapsed < min48;
            const hoursLeft = Math.ceil((min48 - elapsed) / 3_600_000);
            return (
              <CampaignCard key={c.id} campaign={c} lang={lang}
                onDelete={() => handleDelete(c.id)}
                onRepeat={() => handleRepeat(c)}
                onDetails={() => setDetailsCampaign(c)}
                repeatBlocked={blocked}
                repeatBlockedNote={blocked ? `${tr("repeatAfter48", lang)} — ${hoursLeft} ${tr("hoursLeft", lang)}` : ""}
              />
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); resetDialog(); } }}>
        <DialogContent className="max-w-2xl w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]" dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">{tr("createTitle", lang)}</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">{tr("createDesc", lang)}</DialogDescription>
          </DialogHeader>
          <StepBar step={step} lang={lang} />
          <div className="overflow-y-auto flex-1 pr-1 -mr-1">

            {step === 1 && (
              <CreateStep1
                numbers={numbers} setNumbers={setNumbers}
                audiences={audiences} selectedAudienceId={selectedAudienceId} setSelectedAudienceId={setSelectedAudienceId}
                importingAudience={importingAudience}
                onExcelChange={handleExcel}
                onImportAudience={importAudienceContacts}
                onNext={() => setStep(2)}
                lang={lang}
              />
            )}

            {step === 2 && (
              <CreateStep2
                templates={templates} selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate}
                setTemplateVarValues={setTemplateVarValues}
                parsedTemplate={parsedTemplate} availableColumns={availableColumns} templateVarValues={templateVarValues}
                audienceSource={audienceSource}
                onBack={() => setStep(1)} onNext={() => setStep(3)}
                lang={lang}
              />
            )}

            {step === 3 && (
              <CreateStep3
                campaignName={campaignName} setCampaignName={setCampaignName}
                sendMode={sendMode} setSendMode={setSendMode}
                scheduledAt={scheduledAt} setScheduledAt={setScheduledAt}
                numbers={numbers} selectedTemplate={selectedTemplate} submitting={submitting}
                onBack={() => setStep(2)} onSubmit={handleSubmit}
                lang={lang}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DetailsModal campaign={detailsCampaign} open={!!detailsCampaign} onClose={() => setDetailsCampaign(null)} lang={lang} />
    </div>
  );
}
