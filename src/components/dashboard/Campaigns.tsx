"use client";

import { useState, useEffect, useCallback } from "react";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Send, Calendar, FileSpreadsheet, X, Megaphone,
  Trash2, RefreshCw, ChevronRight, ChevronLeft,
  CheckCircle, Clock, Eye, Users, MessageSquare,
  XCircle, Loader2, BarChart3, Hourglass,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Template {
  id: string; name: string; content: string;
  status: string; language?: string; category?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "running" | "completed" | "failed";
  // ✅ كل الحقول دي بتيجي من الـ DB فعلاً
  sentCount:      number;
  deliveredCount: number;
  readCount:      number;
  failedCount:    number;
  totalQueued:    number;   // إجمالي الـ queue (من messageQueue._count)
  queuedCount:    number;   // الـ pending فعلاً (اللي لسه ماتبعتش)
  scheduledAt:    string | null;
  createdAt:      string;
  completedAt:    string | null;
  template:       { name: string; content: string } | null;
}

interface AudienceContact { phone: string; }
interface AudienceOption {
  id: string; name: string; type: string; contactCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanNumber = (raw: string): string => {
  let n = raw.replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "20" + n.slice(1);
  if (!n.startsWith("20") && n.length === 10) n = "20" + n;
  return n;
};
const isValidPhone = (n: string) => /^20\d{10}$/.test(n);

const safeRate = (num: number, den: number) =>
  den > 0 ? Math.round((num / den) * 100) : 0;

const statusConfig: Record<Campaign["status"], { label: string; color: string; dot: string }> = {
  draft:     { label: "مسودة",       color: "bg-gray-100 text-gray-600",    dot: "bg-gray-400"   },
  scheduled: { label: "مجدولة",      color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400" },
  running:   { label: "قيد التنفيذ", color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"   },
  completed: { label: "مكتملة",      color: "bg-green-100 text-green-700",  dot: "bg-green-500"  },
  failed:    { label: "فشلت",        color: "bg-red-100 text-red-700",      dot: "bg-red-500"    },
};

// ─── StepBar ──────────────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = ["الجمهور", "القالب", "الإعدادات"];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done   = step > n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                ${done ? "bg-green-500 text-white" : active ? "bg-green-500 text-white ring-4 ring-green-100" : "bg-gray-100 text-gray-400"}`}>
                {done ? <CheckCircle className="w-4 h-4" /> : n}
              </div>
              <span className={`text-xs mt-1.5 ${active ? "text-green-600 font-medium" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div className={`h-0.5 w-16 mx-1 mb-4 transition-colors ${step > n ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
function ProgressBar({
  label, value, max, color, textColor,
}: {
  label: string; value: number; max: number; color: string; textColor: string;
}) {
  const pct = safeRate(value, max);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500">{label}</span>
        <span className={`font-semibold ${textColor}`}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400">{value.toLocaleString("ar-EG")} / {max.toLocaleString("ar-EG")}</p>
    </div>
  );
}

// ─── SendProgress ─────────────────────────────────────────────────────────────
// شريط تقدم الإرسال (sent / totalQueued)
function SendProgress({ campaign }: { campaign: Campaign }) {
  const total = campaign.totalQueued || 0;
  if (total === 0) return null;

  const sent   = campaign.sentCount;
  const pct    = safeRate(sent, total);
  const isLive = campaign.status === "running";

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500 flex items-center gap-1">
          {isLive && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse inline-block" />}
          تقدم الإرسال
        </span>
        <span className="font-semibold text-blue-600">{pct}%</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isLive ? "bg-blue-400 animate-pulse" : "bg-blue-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{sent.toLocaleString("ar-EG")} مرسل</span>
        <span>{total.toLocaleString("ar-EG")} إجمالي</span>
      </div>
    </div>
  );
}

// ─── CampaignCard ─────────────────────────────────────────────────────────────
function CampaignCard({
  campaign, onDelete, onRepeat, onDetails, repeatBlocked, repeatBlockedNote,
}: {
  campaign: Campaign;
  onDelete: () => void;
  onRepeat: () => void;
  onDetails: () => void;
  repeatBlocked: boolean;
  repeatBlockedNote: string;
}) {
  const cfg = statusConfig[campaign.status] ?? statusConfig.draft;

  return (
    <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <CardContent className="p-0">
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-4 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Megaphone className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{campaign.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${campaign.status === "running" ? "animate-pulse" : ""}`} />
                  {cfg.label}
                </span>
                {campaign.template?.name && (
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    {campaign.template.name}
                  </span>
                )}
                {campaign.scheduledAt && campaign.status === "scheduled" && (
                  <span className="text-xs text-yellow-600">
                    {new Date(campaign.scheduledAt).toLocaleString("ar-EG", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
              onClick={onDetails} title="تفاصيل"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              className={`p-1.5 rounded-lg transition ${repeatBlocked ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}
              onClick={onRepeat} disabled={repeatBlocked} title={repeatBlocked ? repeatBlockedNote : "تكرار"}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
              onClick={onDelete} title="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Stats + Progress ── */}
        {(campaign.totalQueued > 0 || campaign.sentCount > 0) && (
          <div className="border-t border-gray-50 px-4 py-3 space-y-3">

            {/* شريط تقدم الإرسال */}
            <SendProgress campaign={campaign} />

            {/* Stats row */}
            {campaign.sentCount > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { icon: <Send className="w-3 h-3" />,         val: campaign.sentCount,      label: "مرسل",   color: "text-blue-600",   bg: "bg-blue-50"   },
                  { icon: <CheckCircle className="w-3 h-3" />,  val: campaign.deliveredCount, label: "وصل",    color: "text-green-600",  bg: "bg-green-50"  },
                  { icon: <Eye className="w-3 h-3" />,          val: campaign.readCount,      label: "قرأ",    color: "text-purple-600", bg: "bg-purple-50" },
                  { icon: <XCircle className="w-3 h-3" />,      val: campaign.failedCount,    label: "فشل",    color: "text-red-500",    bg: "bg-red-50"    },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-lg p-2 text-center`}>
                    <div className={`flex justify-center mb-0.5 ${s.color}`}>{s.icon}</div>
                    <p className={`text-sm font-bold ${s.color}`}>{s.val.toLocaleString("ar-EG")}</p>
                    <p className="text-[9px] text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* شريط الوصول + القراءة */}
            {campaign.sentCount > 0 && (
              <div className="space-y-2 pt-1">
                <ProgressBar
                  label="نسبة التوصيل"
                  value={campaign.deliveredCount}
                  max={campaign.sentCount}
                  color="bg-green-400"
                  textColor="text-green-600"
                />
                <ProgressBar
                  label="نسبة القراءة"
                  value={campaign.readCount}
                  max={campaign.sentCount}
                  color="bg-purple-400"
                  textColor="text-purple-600"
                />
              </div>
            )}

            {/* pending count */}
            {campaign.queuedCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                <Hourglass className="w-3.5 h-3.5" />
                {campaign.queuedCount.toLocaleString("ar-EG")} رسالة في الانتظار
              </div>
            )}
          </div>
        )}

        {/* Scheduled banner */}
        {campaign.status === "scheduled" && campaign.scheduledAt && (
          <div className="border-t border-yellow-100 bg-yellow-50/60 px-4 py-2 text-xs text-yellow-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            مجدولة: {new Date(campaign.scheduledAt).toLocaleString("ar-EG")}
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

// ─── DetailsModal ─────────────────────────────────────────────────────────────
function DetailsModal({ campaign, open, onClose }: {
  campaign: Campaign | null; open: boolean; onClose: () => void;
}) {
  if (!campaign) return null;
  const cfg   = statusConfig[campaign.status] ?? statusConfig.draft;
  const total = campaign.totalQueued || campaign.sentCount;

  const stats = [
    { label: "إجمالي الجمهور",  value: total,                   icon: <Users className="w-5 h-5" />,       color: "bg-gray-50 text-gray-600"     },
    { label: "تم الإرسال",      value: campaign.sentCount,      icon: <Send className="w-5 h-5" />,        color: "bg-blue-50 text-blue-600"     },
    { label: "تم التوصيل",      value: campaign.deliveredCount, icon: <CheckCircle className="w-5 h-5" />, color: "bg-green-50 text-green-600"   },
    { label: "تم القراءة",      value: campaign.readCount,      icon: <Eye className="w-5 h-5" />,         color: "bg-purple-50 text-purple-600" },
    { label: "فشل الإرسال",     value: campaign.failedCount,    icon: <XCircle className="w-5 h-5" />,     color: "bg-red-50 text-red-500"       },
    { label: "في الانتظار",     value: campaign.queuedCount,    icon: <Hourglass className="w-5 h-5" />,   color: "bg-amber-50 text-amber-600"   },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{campaign.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            {campaign.template?.name && (
              <span className="text-xs text-gray-500">قالب: {campaign.template.name}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 my-2">
          {stats.map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-3 flex flex-col items-center text-center gap-1`}>
              {s.icon}
              <p className="text-xl font-bold">{s.value.toLocaleString("ar-EG")}</p>
              <p className="text-[10px] opacity-75 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* شرائط الأداء */}
        {campaign.sentCount > 0 && (
          <div className="space-y-3 bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> معدلات الأداء
            </p>
            <ProgressBar label="نسبة الإرسال (من الإجمالي)" value={campaign.sentCount}      max={total}                  color="bg-blue-400"   textColor="text-blue-600"   />
            <ProgressBar label="نسبة التوصيل"                value={campaign.deliveredCount} max={campaign.sentCount}     color="bg-green-400"  textColor="text-green-600"  />
            <ProgressBar label="نسبة القراءة"                value={campaign.readCount}      max={campaign.sentCount}     color="bg-purple-400" textColor="text-purple-600" />
            {campaign.failedCount > 0 && (
              <ProgressBar label="نسبة الفشل"                value={campaign.failedCount}    max={campaign.sentCount}     color="bg-red-400"    textColor="text-red-500"    />
            )}
          </div>
        )}

        {/* Meta */}
        <div className="text-xs text-gray-400 space-y-1 pt-1 border-t border-gray-100">
          <p>تاريخ الإنشاء: {new Date(campaign.createdAt).toLocaleString("ar-EG")}</p>
          {campaign.scheduledAt && (
            <p>موعد الجدولة: {new Date(campaign.scheduledAt).toLocaleString("ar-EG")}</p>
          )}
          {campaign.completedAt && (
            <p>تاريخ الاكتمال: {new Date(campaign.completedAt).toLocaleString("ar-EG")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Campaigns() {
  const [campaigns,   setCampaigns]   = useState<Campaign[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step,       setStep]       = useState(1);
  const [submitting, setSubmitting]  = useState(false);

  const [numbers,           setNumbers]           = useState<string[]>([]);
  const [audiences,         setAudiences]         = useState<AudienceOption[]>([]);
  const [selectedAudienceId,setSelectedAudienceId]= useState("");
  const [importingAudience, setImportingAudience] = useState(false);

  const [templates,        setTemplates]        = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const [campaignName, setCampaignName] = useState("");
  const [sendMode,     setSendMode]     = useState<"now"|"scheduled">("now");
  const [scheduledAt,  setScheduledAt]  = useState("");

  const [detailsCampaign, setDetailsCampaign] = useState<Campaign | null>(null);

  // ── Auto-refresh بينما في حملة running ───────────────────────────────────
  const hasRunning = campaigns.some(c => c.status === "running");

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    try {
      setLoadingList(true);
      const params = new URLSearchParams({ limit: "50" });
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res  = await fetch(`/api/campaigns?${params}`);
      const data = await res.json();
      const list: Campaign[] = Array.isArray(data)
        ? data
        : (data.campaigns ?? data.data ?? []);
      setCampaigns(list);
      setTotal(data.total ?? list.length);
    } catch {
      toast.error("فشل في تحميل الحملات");
    } finally {
      setLoadingList(false);
    }
  }, [filterStatus]);

  const loadTemplates = useCallback(async () => {
    try {
      const res  = await fetch("/api/templates");
      const data = await res.json();
      const list: Template[] = Array.isArray(data) ? data : data.data ?? [];
      const approved = list.filter(t => ["approved","pending","APPROVED","PENDING"].includes(t.status ?? ""));
      setTemplates(approved);
      if (approved.length > 0) setSelectedTemplate(approved[0]);
    } catch { toast.error("فشل في تحميل القوالب"); }
  }, []);

  const loadAudiences = useCallback(async () => {
    try {
      const res  = await fetch("/api/audiences");
      const data = await res.json();
      const list: AudienceOption[] = (Array.isArray(data) ? data : [])
        .filter((a: any) => ["excel","custom"].includes(a.type))
        .map((a: any) => ({ id: a.id, name: a.name, type: a.type, contactCount: Number(a.contactCount ?? 0) }));
      setAudiences(list);
    } catch { toast.error("فشل في تحميل جهات الاتصال"); }
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => { loadTemplates(); loadAudiences(); }, [loadTemplates, loadAudiences]);

  // auto-refresh كل 8 ثواني لو في حملة شغّالة
  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => loadCampaigns(), 8_000);
    return () => clearInterval(id);
  }, [hasRunning, loadCampaigns]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resetDialog = () => {
    setStep(1); setNumbers([]); setSelectedAudienceId("");
    setSelectedTemplate(templates[0] ?? null);
    setCampaignName(""); setSendMode("now"); setScheduledAt("");
  };
  const openNew = () => { resetDialog(); setDialogOpen(true); };

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const buffer = await file.arrayBuffer();
      const wb     = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];
      if (!ws) { toast.error("الملف لا يحتوي على أوراق"); return; }
      const extracted: string[] = [];
      ws.eachRow(row => {
        (Array.isArray(row.values) ? row.values : []).forEach(cell => {
          if (cell == null) return;
          const cleaned = cleanNumber(String(cell).trim());
          if (isValidPhone(cleaned)) extracted.push(cleaned);
        });
      });
      const unique = [...new Set([...numbers, ...extracted])];
      setNumbers(unique);
      toast.success(`تم استخراج ${extracted.length} رقم صالح`);
    } catch {
      toast.error("فشل في قراءة الملف — تأكد أنه xlsx صحيح");
    }
  };

  const importAudienceContacts = async () => {
    if (!selectedAudienceId) { toast.error("اختر جهة اتصال أولاً"); return; }
    setImportingAudience(true);
    try {
      const res  = await fetch(`/api/audiences?audienceId=${encodeURIComponent(selectedAudienceId)}&includeContacts=all`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل في تحميل جهة الاتصال");
      const contacts: AudienceContact[] = Array.isArray(data.contacts) ? data.contacts : [];
      const extracted = contacts.map(c => cleanNumber(String(c.phone ?? "").trim())).filter(isValidPhone);
      if (extracted.length === 0) { toast.error("جهة الاتصال لا تحتوي على أرقام صالحة"); return; }
      setNumbers([...new Set([...numbers, ...extracted])]);
      toast.success(`تم استيراد ${extracted.length} رقم`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImportingAudience(false);
    }
  };

  const handleSubmit = async () => {
    if (!campaignName.trim()) { toast.error("أدخل اسم الحملة"); return; }
    if (!selectedTemplate)    { toast.error("اختر قالباً"); return; }
    if (sendMode === "scheduled" && !scheduledAt) { toast.error("حدد موعد الجدولة"); return; }

    setSubmitting(true);
    const toastId = toast.loading("جاري إنشاء الحملة...");
    try {
      const res  = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName, templateName: selectedTemplate.name, numbers,
          scheduledAt: sendMode === "scheduled" ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الحملة");
      toast.dismiss(toastId);
      toast.success(data.scheduled ? "تم جدولة الحملة بنجاح ✅" : "تم إنشاء الحملة ✅ — جاري الإرسال");
      setDialogOpen(false); resetDialog();
      await loadCampaigns();
    } catch (err: any) {
      toast.dismiss(toastId); toast.error(err.message);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    const toastId = toast.loading("جاري الحذف...");
    try {
      const res  = await fetch("/api/campaigns", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      toast.dismiss(toastId); toast.success("تم حذف الحملة");
      await loadCampaigns();
    } catch (err: any) { toast.dismiss(toastId); toast.error(err.message); }
  };

  const handleRepeat = async (campaign: Campaign) => {
    const elapsed = Date.now() - new Date(campaign.createdAt).getTime();
    const min48   = 48 * 60 * 60 * 1000;
    if (elapsed < min48) {
      const h = Math.ceil((min48 - elapsed) / 3_600_000);
      toast.error(`تكرار الحملة متاح بعد 48 ساعة. متبقي ${h} ساعة.`);
      return;
    }
    const toastId = toast.loading("جاري تكرار الحملة...");
    try {
      const res  = await fetch("/api/campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _action: "repeat", campaignId: campaign.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التكرار");
      toast.dismiss(toastId); toast.success("تم تكرار الحملة ✅ — جاري الإرسال");
      await loadCampaigns();
    } catch (err: any) { toast.dismiss(toastId); toast.error(err.message); }
  };

  // ── Summary stats (كلها من الـ DB) ───────────────────────────────────────
  const totalSent      = campaigns.reduce((a, c) => a + c.sentCount,      0);
  const totalDelivered = campaigns.reduce((a, c) => a + c.deliveredCount,  0);
  const totalRead      = campaigns.reduce((a, c) => a + c.readCount,       0);
  const totalQueued    = campaigns.reduce((a, c) => a + c.totalQueued,     0);
  const overallDelivery= safeRate(totalDelivered, totalSent);
  const overallRead    = safeRate(totalRead, totalSent);

  const STATUS_FILTERS = [
    { value: "all",       label: "الكل"          },
    { value: "running",   label: "قيد التنفيذ"   },
    { value: "scheduled", label: "مجدولة"        },
    { value: "completed", label: "مكتملة"        },
    { value: "draft",     label: "مسودة"         },
    { value: "failed",    label: "فشلت"          },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto" dir="rtl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الحملات التسويقية</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} حملة إجمالاً</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCampaigns}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300 transition"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? "animate-spin" : ""}`} />
          </button>
          <Button onClick={openNew} className="bg-green-500 hover:bg-green-600 text-white shadow-sm gap-2">
            <Plus className="w-4 h-4" /> حملة جديدة
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "إجمالي الجمهور", value: totalQueued,    icon: <Users className="w-5 h-5" />,       color: "text-gray-600",   bg: "bg-gray-50"   },
            { label: "تم الإرسال",     value: totalSent,      icon: <Send className="w-5 h-5" />,        color: "text-blue-600",   bg: "bg-blue-50"   },
            { label: "تم التوصيل",     value: totalDelivered, icon: <CheckCircle className="w-5 h-5" />, color: "text-green-600",  bg: "bg-green-50"  },
            { label: "تم القراءة",     value: totalRead,      icon: <Eye className="w-5 h-5" />,         color: "text-purple-600", bg: "bg-purple-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex items-center gap-3`}>
              <span className={s.color}>{s.icon}</span>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString("ar-EG")}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Overall rates ── */}
      {totalSent > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-gray-400" /> معدلات الأداء الكلية
          </p>
          <ProgressBar label="معدل التوصيل" value={totalDelivered} max={totalSent} color="bg-green-400"  textColor="text-green-600"  />
          <ProgressBar label="معدل القراءة"  value={totalRead}      max={totalSent} color="bg-purple-400" textColor="text-purple-600" />
        </div>
      )}

      {/* ── Status Filter ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 flex-nowrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition flex-shrink-0 ${
              filterStatus === f.value
                ? "bg-green-500 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Campaign List ── */}
      {loadingList ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-green-400 animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-5">
            <Megaphone className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">لا توجد حملات</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xs">
            {filterStatus !== "all" ? "لا توجد حملات بهذا الفلتر" : "ابدأ أول حملة تسويقية وراقب نتائجها مباشرة"}
          </p>
          {filterStatus === "all" && (
            <Button onClick={openNew} className="bg-green-500 hover:bg-green-600 text-white gap-2">
              <Plus className="w-4 h-4" /> ابدأ أول حملة
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const elapsed  = Date.now() - new Date(c.createdAt).getTime();
            const min48    = 48 * 60 * 60 * 1000;
            const blocked  = elapsed < min48;
            const hoursLeft= Math.ceil((min48 - elapsed) / 3_600_000);
            return (
              <CampaignCard
                key={c.id} campaign={c}
                onDelete={() => handleDelete(c.id)}
                onRepeat={() => handleRepeat(c)}
                onDetails={() => setDetailsCampaign(c)}
                repeatBlocked={blocked}
                repeatBlockedNote={blocked ? `يمكن تكرار الحملة بعد 48 ساعة (المتبقي ${hoursLeft} ساعة)` : ""}
              />
            );
          })}
        </div>
      )}

      {/* ── Create Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); resetDialog(); } }}>
        <DialogContent className="max-w-2xl w-full" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">إنشاء حملة جديدة</DialogTitle>
            <DialogDescription>أرسل رسائل واتساب لجمهورك في خطوات بسيطة</DialogDescription>
          </DialogHeader>
          <StepBar step={step} />

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">رفع شيت إكسيل</Label>
                <label htmlFor="excel-input" className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all">
                  <FileSpreadsheet className="w-10 h-10 text-green-500" />
                  <span className="font-medium text-gray-700">اسحب الملف هنا أو انقر للاختيار</span>
                  <span className="text-xs text-gray-400">.xlsx أو .xls</span>
                  <input id="excel-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcel} />
                </label>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">أو استيراد جهة اتصال</Label>
                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر قائمة..." />
                    </SelectTrigger>
                    <SelectContent>
                      {audiences.length === 0
                        ? <SelectItem value="no-audiences" disabled>لا توجد قوائم</SelectItem>
                        : audiences.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.contactCount.toLocaleString("ar-EG")})</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="w-full gap-2" onClick={importAudienceContacts} disabled={!selectedAudienceId || importingAudience}>
                    {importingAudience ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                    استيراد جهة الاتصال
                  </Button>
                </div>
              </div>
              {numbers.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> {numbers.length.toLocaleString("ar-EG")} رقم
                    </span>
                    <button onClick={() => setNumbers([])} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                      <X className="w-3 h-3" /> مسح الكل
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {numbers.slice(0, 15).map((n, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-white text-xs px-2 py-1 rounded-lg border border-green-200 text-gray-700">
                        {n}
                        <button onClick={() => setNumbers(numbers.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {numbers.length > 15 && <span className="text-xs text-gray-400 self-center">+{numbers.length - 15} أخرى</span>}
                  </div>
                </div>
              )}
              <Button onClick={() => { if (!numbers.length) { toast.error("أضف أرقام أولاً"); return; } setStep(2); }}
                className="w-full bg-green-500 hover:bg-green-600 text-white gap-2" disabled={numbers.length === 0}>
                التالي: اختر القالب <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              {templates.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">لا توجد قوالب معتمدة</p>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">اختر القالب</Label>
                    <Select value={selectedTemplate?.name ?? ""} onValueChange={v => { const t = templates.find(t => t.name === v); if (t) setSelectedTemplate(t); }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="اختر قالباً..." /></SelectTrigger>
                      <SelectContent>
                        {templates.map(t => <SelectItem key={t.id} value={t.name}>{t.name} <span className="text-gray-400 text-xs mr-1">{t.language}</span></SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedTemplate && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-2 font-medium">معاينة القالب</p>
                      <div className="bg-white rounded-xl rounded-tl-sm shadow-sm border border-gray-100 p-3 max-w-xs text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {selectedTemplate.content || "لا يوجد محتوى"}
                      </div>
                      <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full ${["approved","APPROVED"].includes(selectedTemplate.status) ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {["approved","APPROVED"].includes(selectedTemplate.status) ? "معتمد" : "قيد المراجعة"}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}><ChevronRight className="w-4 h-4" /> السابق</Button>
                <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2" onClick={() => setStep(3)} disabled={!selectedTemplate}>
                  التالي: الإعدادات <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">اسم الحملة</Label>
                <Input placeholder="مثال: عروض رمضان 2025" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">موعد الإرسال</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["now","scheduled"] as const).map(mode => (
                    <button key={mode} onClick={() => setSendMode(mode)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${sendMode === mode ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      {mode === "now" ? <><Send className="w-4 h-4" /> إرسال فوري</> : <><Calendar className="w-4 h-4" /> جدولة لاحقاً</>}
                    </button>
                  ))}
                </div>
              </div>
              {sendMode === "scheduled" && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">موعد الإرسال</Label>
                  <Input type="datetime-local" value={scheduledAt}
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0,16)}
                    onChange={e => setScheduledAt(e.target.value)} />
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-3">ملخص الحملة</p>
                {[
                  { label: "الاسم",         value: campaignName || "—" },
                  { label: "عدد المستلمين", value: `${numbers.length.toLocaleString("ar-EG")} رقم` },
                  { label: "القالب",        value: selectedTemplate?.name || "—" },
                  { label: "الإرسال",       value: sendMode === "now" ? "فوري" : scheduledAt ? new Date(scheduledAt).toLocaleString("ar-EG") : "—" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-medium text-gray-800">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(2)}><ChevronRight className="w-4 h-4" /> السابق</Button>
                <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2" onClick={handleSubmit}
                  disabled={submitting || !campaignName.trim() || !selectedTemplate}>
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإنشاء...</>
                    : sendMode === "now"
                      ? <><Send className="w-4 h-4" /> إرسال الحملة</>
                      : <><Calendar className="w-4 h-4" /> جدولة الحملة</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DetailsModal campaign={detailsCampaign} open={!!detailsCampaign} onClose={() => setDetailsCampaign(null)} />
    </div>
  );
}