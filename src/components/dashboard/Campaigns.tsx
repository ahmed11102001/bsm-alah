"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Send,
  Calendar,
  FileSpreadsheet,
  X,
  Megaphone,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Users,
  MessageSquare,
  TrendingUp,
  XCircle,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Template {
  id: string;
  name: string;
  content: string;
  status: string;
  language?: string;
  category?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "running" | "completed" | "failed";
  totalQueued?: number;
  queuedCount?: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledAt: string | null;
  createdAt: string;
  completedAt: string | null;
  template: { name: string; content: string } | null;
}

interface AudienceContact {
  phone: string;
}

interface AudienceOption {
  id: string;
  name: string;
  type: string;
  contactCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanNumber = (raw: string): string => {
  let n = raw.replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "20" + n.slice(1);
  if (!n.startsWith("20") && n.length === 10) n = "20" + n;
  return n;
};

const isValidPhone = (n: string) => /^20\d{10}$/.test(n);

const statusConfig: Record<
  Campaign["status"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft:     { label: "مسودة",       color: "bg-gray-100 text-gray-600",    icon: <Clock className="w-3 h-3" /> },
  scheduled: { label: "مجدولة",      color: "bg-yellow-100 text-yellow-700", icon: <Calendar className="w-3 h-3" /> },
  running:   { label: "قيد التنفيذ", color: "bg-blue-100 text-blue-700",    icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  completed: { label: "مكتملة",      color: "bg-green-100 text-green-700",  icon: <CheckCircle className="w-3 h-3" /> },
  failed:    { label: "فشلت",        color: "bg-red-100 text-red-700",      icon: <XCircle className="w-3 h-3" /> },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Step indicator */
function StepBar({ step }: { step: number }) {
  const steps = ["الجمهور", "القالب", "الإعدادات"];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${done  ? "bg-green-500 text-white"
                  : active ? "bg-green-500 text-white ring-4 ring-green-100"
                  : "bg-gray-100 text-gray-400"}`}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : n}
              </div>
              <span className={`text-xs mt-1.5 ${active ? "text-green-600 font-medium" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div
                className={`h-0.5 w-16 mx-1 mb-4 transition-colors ${step > n ? "bg-green-400" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Mini stat chip */
function StatChip({ icon, value, label, color }: {
  icon: React.ReactNode; value: number; label: string; color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`${color}`}>{icon}</span>
      <span className="font-semibold text-gray-800 text-sm">{value.toLocaleString("ar-EG")}</span>
      <span className="text-gray-400 text-xs">{label}</span>
    </div>
  );
}

/** Campaign card */
function CampaignCard({
  campaign,
  onDelete,
  onRepeat,
  onDetails,
  repeatBlocked,
  repeatBlockedNote,
}: {
  campaign: Campaign;
  onDelete: () => void;
  onRepeat: () => void;
  onDetails: () => void;
  repeatBlocked: boolean;
  repeatBlockedNote: string;
}) {
  const cfg = statusConfig[campaign.status] ?? statusConfig.draft;
  const totalRecipients =
    campaign.totalQueued && campaign.totalQueued > 0
      ? campaign.totalQueued
      : Math.max(campaign.sentCount + campaign.failedCount, campaign.sentCount, 1);
  const total = campaign.sentCount || 1;
  const deliveryRate = Math.round((campaign.deliveredCount / total) * 100);
  const readRate     = Math.round((campaign.readCount / total) * 100);

  return (
    <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-0">
        {/* Top row */}
        <div className="flex items-start justify-between p-4 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Megaphone className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{campaign.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
                {campaign.template?.name && (
                  <span className="text-xs text-gray-400 truncate">
                    قالب: {campaign.template.name}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {campaign.sentCount.toLocaleString("ar-EG")} / {totalRecipients.toLocaleString("ar-EG")} مرسل
                </span>
                {campaign.scheduledAt && campaign.status === "scheduled" && (
                  <span className="text-xs text-yellow-600">
                    {new Date(campaign.scheduledAt).toLocaleString("ar-EG", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  توقيت الإرسال: {(campaign.scheduledAt ? new Date(campaign.scheduledAt) : new Date(campaign.createdAt)).toLocaleString("ar-EG")}
                </span>
              </div>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0 mr-2">
            <Button
              size="sm" variant="ghost"
              className="h-8 px-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
              onClick={onDetails}
              title="عرض التفاصيل"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-8 px-2 text-gray-500 hover:text-green-600 hover:bg-green-50 disabled:text-gray-300 disabled:hover:bg-transparent"
              onClick={onRepeat}
              title={repeatBlocked ? repeatBlockedNote : "تكرار الحملة"}
              disabled={repeatBlocked}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-8 px-2 text-gray-500 hover:text-red-600 hover:bg-red-50"
              onClick={onDelete}
              title="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats row — only if sent at least 1 */}
        {campaign.sentCount > 0 && (
          <div className="border-t border-gray-50 px-4 py-3 flex items-center gap-5 flex-wrap">
            <StatChip icon={<Send className="w-3.5 h-3.5" />}      value={campaign.sentCount}      label="مرسل"   color="text-blue-500" />
            <StatChip icon={<CheckCircle className="w-3.5 h-3.5" />} value={campaign.deliveredCount} label="وصل"    color="text-green-500" />
            <StatChip icon={<Eye className="w-3.5 h-3.5" />}        value={campaign.readCount}      label="قرأ"    color="text-purple-500" />
            {campaign.failedCount > 0 && (
              <StatChip icon={<XCircle className="w-3.5 h-3.5" />}  value={campaign.failedCount}    label="فشل"    color="text-red-400" />
            )}
            {/* mini progress */}
            <div className="mr-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">وصول</span>
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full"
                  style={{ width: `${deliveryRate}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600">{deliveryRate}%</span>
            </div>
          </div>
        )}

        {/* Scheduled countdown */}
        {campaign.status === "scheduled" && campaign.scheduledAt && (
          <div className="border-t border-yellow-50 bg-yellow-50/50 px-4 py-2 text-xs text-yellow-700 flex items-center gap-1.5 rounded-b-lg">
            <Clock className="w-3.5 h-3.5" />
            مجدولة للإرسال: {new Date(campaign.scheduledAt).toLocaleString("ar-EG")}
          </div>
        )}

        {repeatBlocked && (
          <div className="border-t border-amber-100 bg-amber-50/70 px-4 py-2 text-xs text-amber-700 rounded-b-lg">
            {repeatBlockedNote}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Details modal */
function DetailsModal({
  campaign,
  open,
  onClose,
}: {
  campaign: Campaign | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!campaign) return null;
  const total = campaign.sentCount || 1;
  const totalRecipients =
    campaign.totalQueued && campaign.totalQueued > 0
      ? campaign.totalQueued
      : Math.max(campaign.sentCount + campaign.failedCount, campaign.sentCount, 1);
  const cfg = statusConfig[campaign.status] ?? statusConfig.draft;

  const stats = [
    { label: "إجمالي المرسل",   value: campaign.sentCount,      icon: <Send className="w-5 h-5" />,         color: "bg-blue-50 text-blue-600" },
    { label: "تم التوصيل",      value: campaign.deliveredCount, icon: <CheckCircle className="w-5 h-5" />,   color: "bg-green-50 text-green-600" },
    { label: "تم القراءة",      value: campaign.readCount,      icon: <Eye className="w-5 h-5" />,           color: "bg-purple-50 text-purple-600" },
    { label: "فشل الإرسال",     value: campaign.failedCount,    icon: <XCircle className="w-5 h-5" />,       color: "bg-red-50 text-red-500" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{campaign.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
            {campaign.template?.name && (
              <span className="text-xs text-gray-500">قالب: {campaign.template.name}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 my-2">
          {stats.map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-4 flex items-center gap-3`}>
              {s.icon}
              <div>
                <p className="text-2xl font-bold">{s.value.toLocaleString("ar-EG")}</p>
                <p className="text-xs opacity-75">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rates */}
        {campaign.sentCount > 0 && (
          <div className="space-y-2 bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">نسبة التوصيل</span>
              <span className="font-semibold text-green-600">
                {Math.round((campaign.deliveredCount / campaign.sentCount) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full"
                style={{ width: `${Math.round((campaign.deliveredCount / campaign.sentCount) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-600">نسبة القراءة</span>
              <span className="font-semibold text-purple-600">
                {Math.round((campaign.readCount / campaign.sentCount) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full"
                style={{ width: `${Math.round((campaign.readCount / campaign.sentCount) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="text-xs text-gray-400 space-y-1 pt-1 border-t border-gray-100">
          <p>المرسل: {campaign.sentCount.toLocaleString("ar-EG")} / {totalRecipients.toLocaleString("ar-EG")}</p>
          <p>توقيت الإرسال: {(campaign.scheduledAt ? new Date(campaign.scheduledAt) : new Date(campaign.createdAt)).toLocaleString("ar-EG")}</p>
          <p>تاريخ الإنشاء: {new Date(campaign.createdAt).toLocaleString("ar-EG")}</p>
          {campaign.completedAt && (
            <p>تاريخ الاكتمال: {new Date(campaign.completedAt).toLocaleString("ar-EG")}</p>
          )}
          {campaign.scheduledAt && (
            <p>موعد الجدولة: {new Date(campaign.scheduledAt).toLocaleString("ar-EG")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Campaigns() {
  // ── List state ──────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // ── Dialog state ────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1: numbers ─────────────────────────────────────────────
  const [numbers, setNumbers] = useState<string[]>([]);
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState("");
  const [importingAudience, setImportingAudience] = useState(false);

  // ── Step 2: template ────────────────────────────────────────────
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // ── Step 3: settings ────────────────────────────────────────────
  const [campaignName, setCampaignName] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  // ── Details / repeat ────────────────────────────────────────────
  const [detailsCampaign, setDetailsCampaign] = useState<Campaign | null>(null);

  // ── Load ──────────────────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : data.campaigns ?? data.data ?? []);
    } catch {
      toast.error("فشل في تحميل الحملات");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      const list: Template[] = Array.isArray(data) ? data : data.data ?? [];
      const approved = list.filter(
        (t) => ["approved", "pending", "APPROVED", "PENDING"].includes(t.status ?? "")
      );
      setTemplates(approved);
      if (approved.length > 0) setSelectedTemplate(approved[0]);
    } catch {
      toast.error("فشل في تحميل القوالب");
    }
  }, []);

  const loadAudiences = useCallback(async () => {
    try {
      const res = await fetch("/api/audiences");
      const data = await res.json();
      const list: AudienceOption[] = (Array.isArray(data) ? data : [])
        .filter((a) => ["excel", "custom"].includes(a.type))
        .map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          contactCount: Number(a.contactCount ?? 0),
        }));
      setAudiences(list);
    } catch {
      toast.error("فشل في تحميل جهات الاتصال");
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
    loadTemplates();
    loadAudiences();
  }, [loadCampaigns, loadTemplates, loadAudiences]);

  // ── Helpers ──────────────────────────────────────────────────────
  const resetDialog = () => {
    setStep(1);
    setNumbers([]);
    setSelectedAudienceId("");
    setSelectedTemplate(templates[0] ?? null);
    setCampaignName("");
    setSendMode("now");
    setScheduledAt("");
  };

  const openNew = () => {
    resetDialog();
    setDialogOpen(true);
  };

  // ── Step 1: Excel ────────────────────────────────────────────────
  const handleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
      const extracted = rows
        .flat()
        .map((v) => cleanNumber(String(v).trim()))
        .filter(isValidPhone);
      const unique = [...new Set([...numbers, ...extracted])];
      setNumbers(unique);
      toast.success(`تم استخراج ${extracted.length} رقم صالح`);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const importAudienceContacts = async () => {
    if (!selectedAudienceId) {
      toast.error("اختر جهة اتصال أولاً");
      return;
    }

    setImportingAudience(true);
    try {
      const res = await fetch(
        `/api/audiences?audienceId=${encodeURIComponent(selectedAudienceId)}&includeContacts=all`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل في تحميل جهة الاتصال");

      const contacts: AudienceContact[] = Array.isArray(data.contacts) ? data.contacts : [];
      const extracted = contacts
        .map((c) => cleanNumber(String(c.phone ?? "").trim()))
        .filter(isValidPhone);

      if (extracted.length === 0) {
        toast.error("جهة الاتصال لا تحتوي على أرقام صالحة");
        return;
      }

      const unique = [...new Set([...numbers, ...extracted])];
      setNumbers(unique);
      toast.success(`تم استيراد ${extracted.length} رقم`);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setImportingAudience(false);
    }
  };

  const goStep2 = () => {
    if (numbers.length === 0) {
      toast.error("أضف أرقام جهات الاتصال أولاً");
      return;
    }
    setStep(2);
  };

  // ── Step 3: submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!campaignName.trim()) { toast.error("أدخل اسم الحملة"); return; }
    if (!selectedTemplate)    { toast.error("اختر قالباً"); return; }
    if (sendMode === "scheduled" && !scheduledAt) {
      toast.error("حدد موعد الجدولة"); return;
    }

    setSubmitting(true);
    const toastId = toast.loading("جاري إنشاء الحملة...");

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          templateName: selectedTemplate.name,
          numbers,
          scheduledAt: sendMode === "scheduled" ? scheduledAt : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الحملة");

      toast.dismiss(toastId);
      if (data.scheduledAt) {
        toast.success("تم جدولة الحملة بنجاح ✅");
      } else {
        toast.success(
          `تم إرسال الحملة ✅ — ${data.sentCount} مرسلة${data.failedCount ? ` · ${data.failedCount} فشلت` : ""}`
        );
      }
      setDialogOpen(false);
      resetDialog();
      await loadCampaigns();
    } catch (err: unknown) {
      toast.dismiss(toastId);
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const toastId = toast.loading("جاري الحذف...");
    try {
      const res = await fetch("/api/campaigns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      toast.dismiss(toastId);
      toast.success("تم حذف الحملة");
      await loadCampaigns();
    } catch (err: unknown) {
      toast.dismiss(toastId);
      toast.error((err as Error).message);
    }
  };

  // ── Repeat ────────────────────────────────────────────────────────
  const handleRepeat = async (campaign: Campaign) => {
    const createdAt = new Date(campaign.createdAt).getTime();
    const elapsedMs = Date.now() - createdAt;
    const min48Hours = 48 * 60 * 60 * 1000;
    if (elapsedMs < min48Hours) {
      const hoursLeft = Math.ceil((min48Hours - elapsedMs) / (60 * 60 * 1000));
      toast.error(`تكرار الحملة متاح بعد 48 ساعة من إنشائها. متبقي حوالي ${hoursLeft} ساعة.`);
      return;
    }

    const toastId = toast.loading("جاري تكرار الحملة...");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _action: "repeat",
          campaignId: campaign.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التكرار");
      toast.dismiss(toastId);
      toast.success(
        `تم تكرار الحملة ✅ — ${data.sentCount} مرسلة${data.failedCount ? ` · ${data.failedCount} فشلت` : ""}`
      );
      await loadCampaigns();
    } catch (err: unknown) {
      toast.dismiss(toastId);
      toast.error((err as Error).message);
    }
  };

  // ── Stats summary ──────────────────────────────────────────────────
  const totalSent      = campaigns.reduce((a, c) => a + c.sentCount, 0);
  const totalDelivered = campaigns.reduce((a, c) => a + c.deliveredCount, 0);
  const totalRead      = campaigns.reduce((a, c) => a + c.readCount, 0);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto" dir="rtl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الحملات التسويقية</h1>
          <p className="text-gray-500 text-sm mt-0.5">إنشاء وإدارة حملات واتساب</p>
        </div>
        <Button
          onClick={openNew}
          className="bg-green-500 hover:bg-green-600 text-white shadow-sm gap-2"
        >
          <Plus className="w-4 h-4" /> حملة جديدة
        </Button>
      </div>

      {/* ── Summary stats (only when there's data) ── */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "إجمالي المرسل", value: totalSent,      color: "text-blue-600",   bg: "bg-blue-50",   icon: <Send className="w-5 h-5 text-blue-400" /> },
            { label: "تم التوصيل",    value: totalDelivered, color: "text-green-600",  bg: "bg-green-50",  icon: <CheckCircle className="w-5 h-5 text-green-400" /> },
            { label: "تم القراءة",    value: totalRead,      color: "text-purple-600", bg: "bg-purple-50", icon: <Eye className="w-5 h-5 text-purple-400" /> },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex items-center gap-3`}>
              {s.icon}
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString("ar-EG")}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Campaign list ── */}
      {loadingList ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-green-400 animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-5">
            <Megaphone className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">لا توجد حملات بعد</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xs">
            ابدأ أول حملة تسويقية وراقب نتائجها مباشرة
          </p>
          <Button onClick={openNew} className="bg-green-500 hover:bg-green-600 text-white gap-2">
            <Plus className="w-4 h-4" /> ابدأ أول حملة
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const createdAt = new Date(c.createdAt).getTime();
            const elapsedMs = Date.now() - createdAt;
            const min48Hours = 48 * 60 * 60 * 1000;
            const repeatBlocked = elapsedMs < min48Hours;
            const hoursLeft = Math.ceil((min48Hours - elapsedMs) / (60 * 60 * 1000));
            const repeatBlockedNote = repeatBlocked
              ? `يمكن تكرار الحملة بعد مرور 48 ساعة من إنشائها (المتبقي تقريبًا ${hoursLeft} ساعة).`
              : "";

            return (
            <CampaignCard
              key={c.id}
              campaign={c}
              onDelete={() => handleDelete(c.id)}
              onRepeat={() => handleRepeat(c)}
              onDetails={() => setDetailsCampaign(c)}
              repeatBlocked={repeatBlocked}
              repeatBlockedNote={repeatBlockedNote}
            />
            );
          })}
        </div>
      )}

      {/* ─────────────────────── Create Dialog ─────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => { if (!v) { setDialogOpen(false); resetDialog(); } }}
      >
        <DialogContent className="max-w-2xl w-full" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">إنشاء حملة جديدة</DialogTitle>
            <DialogDescription>أرسل رسائل واتساب لجمهورك في خطوات بسيطة</DialogDescription>
          </DialogHeader>

          <StepBar step={step} />

          {/* ── Step 1: Audience ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Excel upload */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  رفع شيت إكسيل من جهات الاتصال
                </Label>
                <label
                  htmlFor="excel-input"
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all"
                >
                  <FileSpreadsheet className="w-10 h-10 text-green-500" />
                  <span className="font-medium text-gray-700">اسحب الملف هنا أو انقر للاختيار</span>
                  <span className="text-xs text-gray-400">.xlsx أو .xls</span>
                  <input
                    id="excel-input"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleExcel}
                  />
                </label>
              </div>

              {/* Import audience */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  أو استيراد جهة اتصال
                </Label>
                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر قائمة من جهات الاتصال..." />
                    </SelectTrigger>
                    <SelectContent>
                      {audiences.length === 0 ? (
                        <SelectItem value="no-audiences" disabled>
                          لا توجد قوائم متاحة
                        </SelectItem>
                      ) : (
                        audiences.map((audience) => (
                          <SelectItem key={audience.id} value={audience.id}>
                            {audience.name} ({audience.contactCount.toLocaleString("ar-EG")})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={importAudienceContacts}
                    disabled={!selectedAudienceId || importingAudience}
                  >
                    {importingAudience ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                    استيراد جهة الاتصال
                  </Button>
                </div>
              </div>

              {/* Numbers preview */}
              {numbers.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> {numbers.length} رقم محمل
                    </span>
                    <Button
                      size="sm" variant="ghost"
                      className="text-red-500 h-7 px-2 hover:bg-red-50"
                      onClick={() => setNumbers([])}
                    >
                      <X className="w-3.5 h-3.5 ml-1" /> مسح الكل
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {numbers.slice(0, 15).map((n, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-white text-xs px-2 py-1 rounded-lg border border-green-200 text-gray-700"
                      >
                        {n}
                        <button
                          onClick={() => setNumbers(numbers.filter((_, j) => j !== i))}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {numbers.length > 15 && (
                      <span className="text-xs text-gray-400 self-center">
                        +{numbers.length - 15} أخرى
                      </span>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={goStep2}
                className="w-full bg-green-500 hover:bg-green-600 text-white gap-2"
                disabled={numbers.length === 0}
              >
                التالي: اختر القالب <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* ── Step 2: Template ─────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              {templates.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">لا توجد قوالب معتمدة</p>
                  <p className="text-xs mt-1">أضف قوالبك من صفحة القوالب وانتظر اعتمادها</p>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">اختر القالب</Label>
                    <Select
                      value={selectedTemplate?.name ?? ""}
                      onValueChange={(v) => {
                        const t = templates.find((t) => t.name === v);
                        if (t) setSelectedTemplate(t);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختر قالباً..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.name}>
                            <div className="flex items-center gap-2">
                              <span>{t.name}</span>
                              <span className="text-xs text-gray-400 capitalize">{t.language}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preview */}
                  {selectedTemplate && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-2 font-medium">معاينة القالب</p>
                      {/* WhatsApp bubble style */}
                      <div className="bg-white rounded-xl rounded-tl-sm shadow-sm border border-gray-100 p-3 max-w-xs text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {selectedTemplate.content || "لا يوجد محتوى للمعاينة"}
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          ["approved","APPROVED"].includes(selectedTemplate.status)
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {["approved","APPROVED"].includes(selectedTemplate.status) ? "معتمد" : "قيد المراجعة"}
                        </span>
                        {selectedTemplate.category && (
                          <span className="text-xs text-gray-400">{selectedTemplate.category}</span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}>
                  <ChevronRight className="w-4 h-4" /> السابق
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2"
                  onClick={() => setStep(3)}
                  disabled={!selectedTemplate}
                >
                  التالي: الإعدادات <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Settings ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Campaign name */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">اسم الحملة</Label>
                <Input
                  placeholder="مثال: عروض رمضان 2025"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              {/* Send mode */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">موعد الإرسال</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["now", "scheduled"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSendMode(mode)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        sendMode === mode
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {mode === "now"
                        ? <><Send className="w-4 h-4" /> إرسال فوري</>
                        : <><Calendar className="w-4 h-4" /> جدولة لاحقاً</>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Datetime picker */}
              {sendMode === "scheduled" && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">موعد الإرسال</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-3">ملخص الحملة</p>
                {[
                  { label: "الاسم",         value: campaignName || "—" },
                  { label: "عدد المستلمين", value: `${numbers.length} رقم` },
                  { label: "القالب",        value: selectedTemplate?.name || "—" },
                  { label: "الإرسال",       value: sendMode === "now" ? "فوري" : scheduledAt ? new Date(scheduledAt).toLocaleString("ar-EG") : "—" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-medium text-gray-800">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(2)}>
                  <ChevronRight className="w-4 h-4" /> السابق
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2"
                  onClick={handleSubmit}
                  disabled={submitting || !campaignName.trim() || !selectedTemplate}
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
                    : sendMode === "now"
                      ? <><Send className="w-4 h-4" /> إرسال الحملة</>
                      : <><Calendar className="w-4 h-4" /> جدولة الحملة</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Details modal */}
      <DetailsModal
        campaign={detailsCampaign}
        open={!!detailsCampaign}
        onClose={() => setDetailsCampaign(null)}
      />
    </div>
  );
}
