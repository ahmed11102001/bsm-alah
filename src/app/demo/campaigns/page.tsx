"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Megaphone, MessageSquare, RefreshCw, Eye, Trash2, Send, Calendar, Plus, ChevronLeft, ChevronRight, Users, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useSubscription } from "@/lib/dashboard-context";
import { useTemplateParser } from "@/hooks/useTemplateParser";
import { tr } from "@/app/dashboard/campaigns/_components/i18n";
import { cleanNumber, isValidPhone } from "@/app/dashboard/campaigns/_components/helpers";
import { StepBar } from "@/app/dashboard/campaigns/_components/StepBar";
import { CampaignCard } from "@/app/dashboard/campaigns/_components/CampaignCard";
import { DetailsModal } from "@/app/dashboard/campaigns/_components/DetailsModal";
import { CreateStep1 } from "@/app/dashboard/campaigns/_components/CreateStep1";
import { CreateStep2 } from "@/app/dashboard/campaigns/_components/CreateStep2";
import { CreateStep3 } from "@/app/dashboard/campaigns/_components/CreateStep3";
import type { Lang, Campaign, Template, AudienceOption } from "@/app/dashboard/campaigns/_components/types";
import { DEMO_CAMPAIGNS, DEMO_CAMPAIGN_TEMPLATES, DEMO_CAMPAIGN_AUDIENCES } from "../_lib/demo-data";

const simulateAudienceContacts = (audienceId: string) => {
  const base = audienceId === "demo-aud-vip" ? 1000 : audienceId === "demo-aud-engaged" ? 2000 : audienceId === "demo-aud-no-response" ? 3000 : 4000;
  return Array.from({ length: 12 }, (_, i) => ({ phone: `2010${base + i}`.padEnd(12, "0"), name: `Customer ${i + 1}` }));
};

export default function DemoCampaignsPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const lang: Lang = locale === "en" ? "en" : "ar";
  const { campaignAtMax: atLimit, hasMetaConnection: whatsappConnected } = useSubscription();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedAudienceId, setSelectedAudienceId] = useState("");
  const [numbers, setNumbers] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [templateVarValues, setTemplateVarValues] = useState<Record<string, string>>({});
  const [audienceSource, setAudienceSource] = useState<"excel" | "contacts" | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [importingAudience, setImportingAudience] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [detailsCampaign, setDetailsCampaign] = useState<Campaign | null>(null);
  const [metaPrompt, setMetaPrompt] = useState<string | null>(null);

  const parsedTemplate = useTemplateParser(selectedTemplate ? (selectedTemplate as any).components ?? null : null);

  useEffect(() => {
    setCampaigns(DEMO_CAMPAIGNS);
    setTemplates(DEMO_CAMPAIGN_TEMPLATES);
    setAudiences(DEMO_CAMPAIGN_AUDIENCES);
    setSelectedTemplate(DEMO_CAMPAIGN_TEMPLATES[0] ?? null);
  }, []);

  const filteredCampaigns = useMemo(() => {
    if (filterStatus === "all") return campaigns;
    return campaigns.filter(c => c.status === filterStatus);
  }, [campaigns, filterStatus]);

  const total = campaigns.length;
  const totalSent = campaigns.reduce((acc, c) => acc + c.sentCount, 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + c.deliveredCount + c.readCount, 0);
  const totalRead = campaigns.reduce((acc, c) => acc + c.readCount, 0);

  const resetDialog = () => {
    setStep(1);
    setNumbers([]);
    setParsedRows([]);
    setAvailableColumns([]);
    setTemplateVarValues({});
    setAudienceSource(null);
    setSelectedAudienceId("");
    setCampaignName("");
    setSendMode("now");
    setScheduledAt("");
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        toast.error(tr("errNoSheets", lang));
        return;
      }

      const extracted: string[] = [];
      const rows: Record<string, any>[] = [];
      worksheet.eachRow((row, index) => {
        if (index === 1) return;
        const rowValues: any[] = Array.isArray(row.values) ? row.values : [];
        const record: any = {};
        rowValues.forEach((cell, idx) => {
          if (idx === 0) return;
          record[`col_${idx}`] = String(cell ?? "");
          const cleaned = cleanNumber(String(cell ?? "").trim());
          if (isValidPhone(cleaned)) extracted.push(cleaned);
        });
        rows.push(record);
      });

      setNumbers([...new Set([...numbers, ...extracted])]);
      setParsedRows(rows);
      setAvailableColumns(rows.length > 0 ? Object.keys(rows[0]) : []);
      setAudienceSource("excel");
      toast.success(`${lang === "ar" ? "تم استخراج" : "Extracted"} ${extracted.length} ${lang === "ar" ? "أرقام" : "numbers"}`);
    } catch {
      toast.error(tr("errReadFile", lang));
    }
  };

  const handleImportAudience = useCallback(() => {
    if (!selectedAudienceId) {
      toast.error(tr("errPickAudience", lang));
      return;
    }
    setImportingAudience(true);
    window.setTimeout(() => {
      const selected = audiences.find(a => a.id === selectedAudienceId);
      const contacts = selected ? simulateAudienceContacts(selectedAudienceId) : [];
      setNumbers([...new Set([...numbers, ...contacts.map(c => c.phone)])]);
      setParsedRows(contacts.map(c => ({ phone: c.phone, name: c.name })));
      setAvailableColumns(["phone", "name"]);
      setAudienceSource("contacts");
      setImportingAudience(false);
      toast.success(`${lang === "ar" ? "تم استيراد" : "Imported"} ${contacts.length} ${lang === "ar" ? "أرقام" : "numbers"}`);
    }, 500);
  }, [audiences, lang, numbers, selectedAudienceId]);

  const openCampaignDialog = () => {
    if (!whatsappConnected) {
      const message = lang === "ar" ? "اربط رقمك بميتا علشان تعمل حملة" : "Connect your Meta number to create a campaign.";
      setMetaPrompt(message);
      window.setTimeout(() => setMetaPrompt(null), 3500);
      return;
    }
    if (atLimit) {
      toast.custom(() => (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 flex flex-col gap-2 min-w-[260px]" dir="rtl">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lang === "ar" ? "وصلت الحد الأقصى للحملات هذا الشهر" : "You reached your campaign limit"}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{lang === "ar" ? "رقّي الباقة لإرسال حملات غير محدودة." : "Upgrade your plan for unlimited campaigns."}</p>
          <button onClick={() => { toast.dismiss(); router.push("/"); }} className="mt-1 text-xs font-semibold text-white bg-[#075E54] hover:bg-[#064944] px-4 py-2 rounded-lg transition-colors">
            {lang === "ar" ? "ترقية الباقة ←" : "Upgrade plan ←"}
          </button>
        </div>
      ), { duration: 6000 });
      return;
    }
    resetDialog();
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!campaignName.trim()) { toast.error(tr("errEnterName", lang)); return; }
    if (!selectedTemplate) { toast.error(tr("errChooseTemplate", lang)); return; }
    if (sendMode === "scheduled" && !scheduledAt) { toast.error(tr("errPickSchedule", lang)); return; }
    if (numbers.length === 0) { toast.error(tr("errAddNumbersFirst", lang)); return; }

    setSubmitting(true);
    window.setTimeout(() => {
      const now = new Date();
      const isScheduled = sendMode === "scheduled";
      const campaign: Campaign = {
        id: `demo-cmp-${Date.now()}`,
        name: campaignName.trim(),
        status: isScheduled ? "scheduled" : "completed",
        sentCount: isScheduled ? 0 : numbers.length,
        deliveredCount: isScheduled ? 0 : Math.max(0, Math.round(numbers.length * 0.94)),
        readCount: isScheduled ? 0 : Math.max(0, Math.round(numbers.length * 0.83)),
        failedCount: isScheduled ? 0 : Math.max(0, Math.round(numbers.length * 0.02)),
        totalQueued: numbers.length,
        queuedCount: isScheduled ? numbers.length : 0,
        scheduledAt: isScheduled ? new Date(scheduledAt).toISOString() : null,
        createdAt: now.toISOString(),
        completedAt: isScheduled ? null : now.toISOString(),
        template: { name: selectedTemplate.name, content: selectedTemplate.content, category: selectedTemplate.category },
      };
      setCampaigns(prev => [campaign, ...prev]);
      setDialogOpen(false);
      resetDialog();
      toast.success(lang === "ar" ? "تم إنشاء الحملة بنجاح" : "Campaign created successfully");
      setSubmitting(false);
    }, 500);
  };

  const handleDelete = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    if (detailsCampaign?.id === id) setDetailsCampaign(null);
    toast.success(lang === "ar" ? "تم حذف الحملة" : "Campaign deleted");
  };

  const handleRepeat = (campaign: Campaign) => {
    const elapsed = Date.now() - new Date(campaign.createdAt).getTime();
    const min48 = 48 * 60 * 60 * 1000;
    if (elapsed < min48) {
      const hours = Math.ceil((min48 - elapsed) / 3600000);
      toast.error(`${lang === "ar" ? "يمكن تكرار الحملة بعد 48 ساعة" : "Can repeat after 48h"} — ${hours} ${lang === "ar" ? "ساعة" : "hours"}`);
      return;
    }
    const repeated: Campaign = {
      ...campaign,
      id: `demo-cmp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "running",
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      failedCount: 0,
      totalQueued: campaign.totalQueued,
      queuedCount: campaign.totalQueued,
      completedAt: null,
      scheduledAt: null,
    };
    setCampaigns(prev => [repeated, ...prev]);
    toast.success(lang === "ar" ? "تم تكرار الحملة" : "Campaign repeated");
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8" dir={lang === "ar" ? "rtl" : "ltr"}>
      {metaPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="max-w-md w-full rounded-2xl border border-white/20 bg-white dark:bg-gray-900 shadow-2xl p-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-5 h-5 text-[#25D366]" />
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white mb-1">{metaPrompt}</p>
            <button type="button" onClick={() => setMetaPrompt(null)} className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#075E54] px-4 py-2 text-sm font-semibold text-white hover:bg-[#064944] transition-colors">
              {lang === "ar" ? "حسنًا" : "OK"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{tr("title", lang)}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{total} {tr("totalCampaignsSubtitle", lang)}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={() => {}} className="inline-flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:border-green-400 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button onClick={openCampaignDialog} className={atLimit ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed gap-2" : "bg-[#25D366] hover:bg-[#20bb5a] text-white gap-2"}>
            <Plus className="w-4 h-4" /> {atLimit ? (lang === "ar" ? "وصلت الحد الأقصى" : "Limit reached") : tr("newCampaign", lang)}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: tr("totalCampaigns", lang), value: total, icon: <Megaphone className="w-4 h-4 text-green-600" /> },
          { label: tr("totalSent", lang), value: totalSent, icon: <Send className="w-4 h-4 text-blue-600" /> },
          { label: tr("totalDelivered", lang), value: totalDelivered, icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
          { label: tr("totalRead", lang), value: totalRead, icon: <Eye className="w-4 h-4 text-purple-600" /> },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl p-4 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">{item.icon}</div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{item.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {[
          { value: "all", label: tr("filterAll", lang) },
          { value: "running", label: tr("filterRunning", lang) },
          { value: "scheduled", label: tr("filterScheduled", lang) },
          { value: "completed", label: tr("filterCompleted", lang) },
          { value: "failed", label: tr("filterFailed", lang) },
          { value: "draft", label: tr("filterDraft", lang) },
        ].map((filter) => (
          <button key={filter.value} onClick={() => setFilterStatus(filter.value)} className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${filterStatus === filter.value ? "bg-[#25D366] text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}>
            {filter.label}
          </button>
        ))}
      </div>

      {filteredCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
            <Megaphone className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{filterStatus === "all" ? tr("noCampaigns", lang) : tr("noFilterMatch", lang)}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{filterStatus === "all" ? tr("noCampaignsDesc", lang) : tr("noCampaignsDesc", lang)}</p>
          <Button onClick={openCampaignDialog} className="bg-[#25D366] hover:bg-[#20bb5a] text-white gap-2">
            <Plus className="w-4 h-4" /> {tr("startFirst", lang)}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => {
            const elapsed = Date.now() - new Date(campaign.createdAt).getTime();
            const min48 = 48 * 60 * 60 * 1000;
            const blocked = elapsed < min48;
            const hoursLeft = Math.ceil((min48 - elapsed) / 3600000);
            return (
              <CampaignCard key={campaign.id} campaign={campaign} lang={lang}
                repeatBlocked={blocked}
                repeatBlockedNote={blocked ? `${tr("repeatAfter48", lang)} — ${hoursLeft} ${tr("hoursLeft", lang)}` : ""}
                onDelete={() => handleDelete(campaign.id)}
                onRepeat={() => handleRepeat(campaign)}
                onDetails={() => setDetailsCampaign(campaign)}
              />
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetDialog(); } }}>
        <DialogContent className="max-w-2xl w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden" dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">{tr("createTitle", lang)}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">{tr("createDesc", lang)}</DialogDescription>
          </DialogHeader>
          <StepBar step={step} lang={lang} />
          <div className="overflow-y-auto max-h-[70vh] p-4">
            {step === 1 && (
              <CreateStep1
                numbers={numbers}
                setNumbers={setNumbers}
                audiences={audiences}
                selectedAudienceId={selectedAudienceId}
                setSelectedAudienceId={setSelectedAudienceId}
                importingAudience={importingAudience}
                onExcelChange={handleUploadExcel}
                onImportAudience={handleImportAudience}
                onNext={() => setStep(2)}
                lang={lang}
              />
            )}
            {step === 2 && (
              <CreateStep2
                templates={templates}
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={(template) => { setSelectedTemplate(template); setTemplateVarValues({}); }}
                setTemplateVarValues={setTemplateVarValues}
                parsedTemplate={parsedTemplate}
                availableColumns={availableColumns}
                templateVarValues={templateVarValues}
                audienceSource={audienceSource}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
                lang={lang}
              />
            )}
            {step === 3 && (
              <CreateStep3
                campaignName={campaignName}
                setCampaignName={setCampaignName}
                sendMode={sendMode}
                setSendMode={setSendMode}
                scheduledAt={scheduledAt}
                setScheduledAt={setScheduledAt}
                numbers={numbers}
                selectedTemplate={selectedTemplate}
                submitting={submitting}
                onBack={() => setStep(2)}
                onSubmit={handleSubmit}
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
