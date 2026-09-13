"use client";
import { ListRowsSkeleton } from "@/components/dashboard/DashboardSkeletons";

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
  Plus, Send, Megaphone, RefreshCw, CheckCircle, Eye, MessageSquare, Loader2, BarChart3, Clock,
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

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Campaigns() {
  const { campaignAtMax: atLimit, hasMetaConnection: whatsappConnected } = useSubscription();
  const router = useRouter();
  const { locale } = useLanguage();
  const lang: Lang = locale === "en" ? "en" : "ar";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  // Ø¶ØºØ· Ø³Ø¹Ø© Ø§Ù„ØªÙ†ÙÙŠØ° Ù…Ù† Ø§Ù„Ø¨Ø§Ùƒ Ø¥Ù†Ø¯ â€” Ù„Ø´Ø±ÙŠØ· Ø§Ù„Ø´ÙØ§ÙÙŠØ© Ø¹Ù†Ø¯ ÙˆØ¬ÙˆØ¯ Ù…Ù†ØªØ¸Ø±ÙŠÙ†
  const [queueInfo, setQueueInfo] = useState<{
    globalActive: number; globalLimit: number; queuedWaiting: number;
  } | null>(null);

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

  // â”€â”€ Dynamic template variables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [templateVarValues, setTemplateVarValues] = useState<Record<string, string>>({});
  const [audienceSource, setAudienceSource] = useState<"excel" | "contacts" | null>(null);

  const [detailsCampaign, setDetailsCampaign] = useState<Campaign | null>(null);
  const [metaPrompt, setMetaPrompt] = useState<string | null>(null);

  // â”€â”€ Parse selected template components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      // â”€â”€ Fetch read counts from messages API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          // Merge into campaign list â€” take max of API value vs message count
          for (const c of list) {
            if (readMap[c.id] && readMap[c.id] > c.readCount) {
              c.readCount = readMap[c.id];
            }
          }
        }
      } catch {/* silent â€” fallback to API value */ }

      setCampaigns(list);
      setTotal(data.total ?? list.length);
      setQueueInfo(data.queue
        ? {
            globalActive: Number(data.queue.globalActive ?? 0),
            globalLimit: Number(data.queue.globalLimit ?? 5),
            queuedWaiting: Number(data.queue.queuedWaiting ?? 0),
          }
        : null);
    } catch { if (!silent) toast.error(tr("errLoadCampaigns", lang)); }
    finally { if (!silent) setLoadingList(false); }
  }, [filterStatus]);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      const list: Template[] = Array.isArray(data) ? data : (data.data ?? []);
      // Ù‚ÙˆØ§Ù„Ø¨ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…ØªØµÙ„ Ø­Ø§Ù„ÙŠÙ‹Ø§ ÙÙ‚Ø· â€” Ø§Ù„Ù…Ø«Ø¨ÙˆØª Ù„Ø­Ø³Ø§Ø¨ Ø¢Ø®Ø± Ù…Ø®ÙÙŠ Ù‡Ù†Ø§ ÙˆÙ…Ø±ÙÙˆØ¶
      // ÙÙŠ Ø§Ù„Ø¨Ø§Ùƒ Ø¥Ù†Ø¯ Ø­ØªÙ‰ Ù„Ùˆ Ø£ÙØ±Ø³Ù„ id ÙŠØ¯ÙˆÙŠÙ‹Ø§ (isCurrentAccount Ù…Ù† GET).
      const scoped = list.filter((t: any) => t.isCurrentAccount !== false);
      const approved = scoped.filter(t => ["approved", "APPROVED"].includes(t.status ?? ""));
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

  // ØªØ­Ø¯ÙŠØ« Ø¯ÙˆØ±ÙŠ ØµØ§Ù…Øª ÙƒÙ„ 20 Ø«Ø§Ù†ÙŠØ© Ø­ØªÙ‰ Ù„Ùˆ Ù…ÙÙŠØ´ Ø­Ù…Ù„Ø© Ø´ØºØ§Ù„Ø© Ø¯Ù„ÙˆÙ‚ØªÙŠ
  // (Ø¹Ø´Ø§Ù† Ø£Ø±Ù‚Ø§Ù… delivered/read ØªØªØ­Ø¯Ø« Ù„ÙˆØ­Ø¯Ù‡Ø§ Ù…Ù† ØºÙŠØ± Ø±ÙŠÙØ±ÙŠØ´ ÙŠØ¯ÙˆÙŠ)
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

      // â”€â”€ Extract headers from first row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const headers: string[] = [];
      const firstRow = ws.getRow(1);
      (Array.isArray(firstRow.values) ? firstRow.values : []).forEach((cell, idx) => {
        if (idx === 0) return; // ExcelJS row.values is 1-indexed, index 0 is empty
        if (cell != null && String(cell).trim()) headers.push(String(cell).trim());
      });

      // â”€â”€ Extract all rows as objects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      toast.success(`${lang === "ar" ? "ØªÙ… Ø§Ø³ØªØ®Ø±Ø§Ø¬" : "Extracted"} ${extracted.length} ${lang === "ar" ? "Ø±Ù‚Ù… ØµØ§Ù„Ø­" : "valid numbers"}`);
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

      // â”€â”€ Extract field names from first contact for variable mapping â”€â”€â”€â”€
      if (contacts.length > 0) {
        const fields = Object.keys(contacts[0]).filter(k => k !== "phone" && k !== "id");
        // Store contacts as rows (with phone included) for mapping
        const rows = contacts.map(c => ({ ...c }));
        setParsedRows(rows);
        setAvailableColumns(["phone", ...fields]);
        setAudienceSource("contacts");
        setTemplateVarValues({});
      }

      toast.success(`${lang === "ar" ? "ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯" : "Imported"} ${extracted.length} ${lang === "ar" ? "Ø±Ù‚Ù…" : "numbers"}`);
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
      // â”€â”€ Build templateVars: resolve per-row mapping OR use static values â”€â”€
      let resolvedTemplateVars: any = null;

      const hasMapping = availableColumns.length > 0 && parsedRows.length > 0;
      const hasAnyVar = Object.keys(templateVarValues).length > 0;

      if (hasAnyVar) {
        if (hasMapping) {
          // Build a recipients array: [{ phone, templateVars }]
          // Each row contributes its own variable values based on the column mapping
          const phoneColGuess = availableColumns.find(c =>
            ["phone", "mobile", "Ù‡Ø§ØªÙ", "Ø±Ù‚Ù…", "tel"].includes(c.toLowerCase())
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
          // Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ø¨Ø§Ùƒ Ø¥Ù†Ø¯ Ù†ÙØ³Ù‡Ø§ ØªÙˆØ¶Ø­ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø± ("ØªÙ… ÙˆØ¶Ø¹ Ø§Ù„Ø­Ù…Ù„Ø© ÙÙŠ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±") â€”
          // Ù„Ø§ Ù†Ø³ØªØ¨Ø¯Ù„Ù‡Ø§ Ø¨Ø±Ø³Ø§Ù„Ø© Ø¹Ø§Ù…Ø© Ø­ØªÙ‰ ÙŠØ¹Ø±Ù Ø§Ù„ÙŠÙˆØ²Ø± Ø£Ù† Ø­Ù…Ù„ØªÙ‡ Ù„Ù… ØªÙÙ†Ø³ÙŽ.
          toast.success(data.message ?? (data.scheduled ? "ØªÙ… Ø¬Ø¯ÙˆÙ„Ø© Ø§Ù„Ø­Ù…Ù„Ø© âœ…" : "ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø­Ù…Ù„Ø© âœ…"));
          window.dispatchEvent(new Event("trigger-review-prompt"));
          setDialogOpen(false); resetDialog(); await loadCampaigns();
          return;
        } else {
          // No rows â†’ static values only (same for everyone)
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
      // Ù†ÙØ³ Ù…Ø¨Ø¯Ø£ Ø§Ù„ÙØ±Ø¹ Ø£Ø¹Ù„Ø§Ù‡: Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ø¨Ø§Ùƒ Ø¥Ù†Ø¯ ØªÙˆØ¶Ø­ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø± â€” Ù„Ø§ Ù†Ø³ØªØ¨Ø¯Ù„Ù‡Ø§.
      toast.success(data.message ?? (data.scheduled ? "ØªÙ… Ø¬Ø¯ÙˆÙ„Ø© Ø§Ù„Ø­Ù…Ù„Ø© âœ…" : "ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø­Ù…Ù„Ø© âœ…"));
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
      toast.error(`${tr("repeatAfter48", lang)} â€” ${h} ${tr("hoursLeft", lang)}`);
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
  // deliveredCount ÙÙŠ Ø§Ù„Ù€ DB = Ø±Ø³Ø§Ø¦Ù„ ÙˆØµÙ„Øª Ø¨Ø¯ÙˆÙ† Ù…Ø§ ØªØªÙ‚Ø±Ø£
  // readCount = Ø±Ø³Ø§Ø¦Ù„ Ø§ØªÙ‚Ø±Ø£Øª (ÙˆØ¨Ø§Ù„ØªØ£ÙƒÙŠØ¯ ÙˆØµÙ„Øª)
  // Ù…Ø¹Ø¯Ù„ Ø§Ù„ØªÙˆØµÙŠÙ„ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ = deliveredCount + readCount
  const totalSent = campaigns.reduce((a, c) => a + c.sentCount, 0);
  const totalDelivered = campaigns.reduce((a, c) => a + c.deliveredCount + c.readCount, 0);
  const totalRead = campaigns.reduce((a, c) => a + c.readCount, 0);

  // Design pilot: Ø£Ø³Ù‚Ø·Ù†Ø§ draft ÙÙ‚Ø· (Ø­Ø§Ù„Ø© Ø¹Ø§Ø¨Ø±Ø© â€” Ø§Ù„Ù€enqueue ÙŠØªÙ… ÙÙŠ Ù†ÙØ³ Ø§Ù„Ø·Ù„Ø¨).
  // Ø£ÙØ¹ÙŠØ¯Øª queued Ø¹Ù…Ø¯Ù‹Ø§: Ù‡ÙŠ Ø­Ø§Ù„Ø© "Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø³Ø¹Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„" (Inngest: 5 Ø¹Ø§Ù…Ø© / 2 Ù„ÙƒÙ„
  // ÙŠÙˆØ²Ø±) â€” Ø§Ù„ÙŠÙˆØ²Ø± ÙŠØ­ØªØ§Ø¬ ÙŠØ±Ø§Ù‡Ø§ ÙˆÙŠÙÙ„ØªØ± Ø¹Ù„ÙŠÙ‡Ø§ Ù„ÙŠØ¹Ø±Ù Ø£Ù† Ø­Ù…Ù„ØªÙ‡ Ù„Ù… ØªÙÙ†Ø³ÙŽ.
  const STATUS_FILTERS = [
    { value: "all", label: tr("filterAll", lang) },
    { value: "running", label: tr("filterRunning", lang) },
    { value: "queued", label: tr("filterQueued", lang) },
    { value: "scheduled", label: tr("filterScheduled", lang) },
    { value: "completed", label: tr("filterCompleted", lang) },
    { value: "failed", label: tr("filterFailed", lang) },
  ];

  function showLimitToast() {
    toast.custom(() => (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 flex flex-col gap-2 min-w-[260px]" dir="rtl">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          ÙˆØµÙ„Øª Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ Ù„Ù„Ø­Ù…Ù„Ø§Øª Ù‡Ø°Ø§ Ø§Ù„Ø´Ù‡Ø±
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Ø±Ù‚Ù‘ÙŠ Ø§Ù„Ø¨Ø§Ù‚Ø© Ù„Ø¥Ø±Ø³Ø§Ù„ Ø­Ù…Ù„Ø§Øª ØºÙŠØ± Ù…Ø­Ø¯ÙˆØ¯Ø©.
        </p>
        <button
          onClick={() => { toast.dismiss(); router.push("/checkout"); }}
          className="mt-1 text-xs font-semibold text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors"
        >
          ØªØ±Ù‚ÙŠØ© Ø§Ù„Ø¨Ø§Ù‚Ø© â†
        </button>
      </div>
    ), { duration: 6000 });
  }

  function showMetaConnectToast() {
    // Design pilot: Ø§Ù„Ù…ÙˆØ¯Ø§Ù„ ÙŠÙƒÙÙŠ â€” window.alert Ø§Ù„Ø£ØµÙ„ÙŠ Ù…Ø­Ø°ÙˆÙ (ØªØ¬Ø±Ø¨Ø© Ù…Ø²Ø¹Ø¬Ø©)
    const message = lang === "ar"
      ? "Ø§Ø±Ø¨Ø· Ø±Ù‚Ù…Ùƒ Ø¨Ù…ÙŠØªØ§ Ø¹Ù„Ø´Ø§Ù† ØªØ¹Ù…Ù„ Ø­Ù…Ù„Ø©"
      : "Connect your Meta number to create a campaign.";
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
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {lang === "ar" ? "Ù„Ø§Ø²Ù… ØªØ±Ø¨Ø· Ù…ÙŠØªØ§ Ø£ÙˆÙ„Ø§Ù‹" : "Meta connection required"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {metaPrompt}
            </p>
            <button
              type="button"
              onClick={() => setMetaPrompt(null)}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {lang === "ar" ? "Ø­Ø³Ù†Ù‹Ø§" : "OK"}
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
          <button onClick={() => loadCampaigns()}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-primary hover:border-primary/40 transition">
            <RefreshCw className={`w-4 h-4 ${loadingList ? "animate-spin" : ""}`} />
          </button>
          <Button
            onClick={openCampaignDialog}
            className={campaignLimitActive
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-sm gap-2 flex-1 sm:flex-none justify-center"
              : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-2 flex-1 sm:flex-none justify-center"
            }
          >
            <Plus className="w-4 h-4" />
            {campaignLimitActive ? (lang === "ar" ? "ÙˆØµÙ„Øª Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰" : "Limit reached") : tr("newCampaign", lang)}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-5">
          {[
            { label: tr("totalCampaigns", lang), value: total, icon: <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />, color: "text-gray-600 dark:text-gray-300", bg: "bg-gray-50 dark:bg-gray-800" },
            { label: tr("totalSent", lang), value: totalSent, icon: <Send className="w-4 h-4 sm:w-5 sm:h-5" />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: tr("totalDelivered", lang), value: totalDelivered, icon: <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />, color: "text-primary", bg: "bg-primary/10 dark:bg-primary/15" },
            { label: tr("totalRead", lang), value: totalRead, icon: <Eye className="w-4 h-4 sm:w-5 sm:h-5" />, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3`}>
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
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 mb-5 space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-gray-400" /> {tr("overallPerf", lang)}
          </p>
          <ProgressBar label={tr("deliveryRate", lang)} value={totalDelivered} max={totalSent} color="bg-success" textColor="text-success" />
          <ProgressBar label={tr("readRate", lang)} value={totalRead} max={totalSent} color="bg-info" textColor="text-info" />
        </div>
      )}

      {/* â”€â”€ Ø´Ø±ÙŠØ· Ø´ÙØ§ÙÙŠØ© Ø§Ù„Ø³Ø¹Ø© â€” ÙŠØ¸Ù‡Ø± ÙÙ‚Ø· Ø¹Ù†Ø¯ ÙˆØ¬ÙˆØ¯ Ø­Ù…Ù„Ø§Øª Ù…Ù†ØªØ¸Ø±Ø© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Ø§Ù„Ø£Ø±Ù‚Ø§Ù… Ù…Ù† Ø§Ù„Ø¨Ø§Ùƒ Ø¥Ù†Ø¯ (Ù†ÙØ³ Ø­Ø¯ÙˆØ¯ Inngest) Ù„Ø§ Ù…Ù† Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø­Ù„ÙŠØ© */}
      {queueInfo && queueInfo.queuedWaiting > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl px-3.5 py-2.5 mb-4">
          <Clock className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
          <span>
            {lang === "ar"
              ? `${queueInfo.queuedWaiting} ÙÙŠ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø± â€” Ø³Ø¹Ø© Ø§Ù„ØªÙ†ÙÙŠØ° Ù…Ø´ØºÙˆÙ„Ø© (${queueInfo.globalActive}/${queueInfo.globalLimit}) ÙˆØ³ØªØ¨Ø¯Ø£ ØªÙ„Ù‚Ø§Ø¦ÙŠÙ‹Ø§`
              : `${queueInfo.queuedWaiting} waiting â€” execution capacity busy (${queueInfo.globalActive}/${queueInfo.globalLimit}), auto-starting`}
          </span>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 flex-nowrap scrollbar-hide">        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition flex-shrink-0
              ${filterStatus === f.value ? "bg-primary/10 text-primary border border-primary/20" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loadingList ? (
        <ListRowsSkeleton rows={4} />
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
            <Megaphone className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {filterStatus !== "all" ? tr("noFilterMatch", lang) : tr("noCampaigns", lang)}
          </h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xs">{tr("noCampaignsDesc", lang)}</p>
          {filterStatus === "all" && (
            <Button onClick={openCampaignDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
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
                repeatBlockedNote={blocked ? `${tr("repeatAfter48", lang)} â€” ${hoursLeft} ${tr("hoursLeft", lang)}` : ""}
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
