"use client";

import { useState, useEffect, useCallback } from "react";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { Button }      from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input }       from "@/components/ui/input";
import { Label }       from "@/components/ui/label";
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
  XCircle, Loader2, BarChart3, Hourglass, Languages,
} from "lucide-react";

// ─── i18n ─────────────────────────────────────────────────────────────────────
type Lang = "ar" | "en";
const t = {
  title:          { ar: "الحملات التسويقية",        en: "Marketing Campaigns"       },
  newCampaign:    { ar: "حملة جديدة",               en: "New Campaign"              },
  totalCampaigns: { ar: "إجمالي الحملات",           en: "Total Campaigns"           },
  totalSent:      { ar: "تم الإرسال",               en: "Sent"                      },
  totalDelivered: { ar: "تم التوصيل",               en: "Delivered"                 },
  totalRead:      { ar: "تم القراءة",               en: "Read"                      },
  overallPerf:    { ar: "معدلات الأداء الكلية",     en: "Overall Performance"       },
  deliveryRate:   { ar: "معدل التوصيل",             en: "Delivery Rate"             },
  readRate:       { ar: "معدل القراءة",             en: "Read Rate"                 },
  filterAll:      { ar: "الكل",                     en: "All"                       },
  filterRunning:  { ar: "قيد التنفيذ",              en: "Running"                   },
  filterScheduled:{ ar: "مجدولة",                   en: "Scheduled"                 },
  filterCompleted:{ ar: "مكتملة",                   en: "Completed"                 },
  filterDraft:    { ar: "مسودة",                    en: "Draft"                     },
  filterFailed:   { ar: "فشلت",                     en: "Failed"                    },
  noCampaigns:    { ar: "لا توجد حملات",            en: "No campaigns"              },
  noCampaignsDesc:{ ar: "ابدأ أول حملة تسويقية",   en: "Start your first campaign" },
  noFilterMatch:  { ar: "لا توجد حملات بهذا الفلتر",en: "No campaigns match filter" },
  startFirst:     { ar: "ابدأ أول حملة",            en: "Start First Campaign"      },
  sendProgress:   { ar: "تقدم الإرسال",             en: "Send Progress"             },
  sent:           { ar: "مرسل",                     en: "Sent"                      },
  delivered:      { ar: "وصل",                      en: "Delivered"                 },
  read:           { ar: "قرأ",                      en: "Read"                      },
  failed:         { ar: "فشل",                      en: "Failed"                    },
  waiting:        { ar: "في الانتظار",              en: "Waiting"                   },
  deliveryRateL:  { ar: "نسبة التوصيل",             en: "Delivery rate"             },
  readRateL:      { ar: "نسبة القراءة",             en: "Read rate"                 },
  failureRateL:   { ar: "نسبة الفشل",              en: "Failure rate"              },
  scheduled:      { ar: "مجدولة",                   en: "Scheduled"                 },
  details:        { ar: "تفاصيل",                   en: "Details"                   },
  repeat:         { ar: "تكرار",                    en: "Repeat"                    },
  delete:         { ar: "حذف",                      en: "Delete"                    },
  msgWaiting:     { ar: "رسالة في الانتظار",        en: "messages waiting"          },
  statusDraft:    { ar: "مسودة",                    en: "Draft"                     },
  statusScheduled:{ ar: "مجدولة",                   en: "Scheduled"                 },
  statusRunning:  { ar: "قيد التنفيذ",              en: "Running"                   },
  statusCompleted:{ ar: "مكتملة",                   en: "Completed"                 },
  statusFailed:   { ar: "فشلت",                     en: "Failed"                    },
  // dialog
  createTitle:    { ar: "إنشاء حملة جديدة",        en: "Create New Campaign"       },
  createDesc:     { ar: "أرسل رسائل واتساب لجمهورك في خطوات بسيطة", en: "Send WhatsApp messages to your audience in simple steps" },
  stepAudience:   { ar: "الجمهور",                  en: "Audience"                  },
  stepTemplate:   { ar: "القالب",                   en: "Template"                  },
  stepSettings:   { ar: "الإعدادات",                en: "Settings"                  },
  uploadExcel:    { ar: "رفع شيت إكسيل",           en: "Upload Excel Sheet"        },
  dragHere:       { ar: "اسحب الملف هنا أو انقر للاختيار", en: "Drag file here or click to choose" },
  orImport:       { ar: "أو استيراد جهة اتصال",    en: "Or import audience"        },
  importBtn:      { ar: "استيراد جهة الاتصال",      en: "Import Audience"           },
  chooseList:     { ar: "اختر قائمة...",            en: "Choose a list..."          },
  noLists:        { ar: "لا توجد قوائم",            en: "No lists available"        },
  clearAll:       { ar: "مسح الكل",                 en: "Clear All"                 },
  nextTemplate:   { ar: "التالي: اختر القالب",      en: "Next: Choose Template"     },
  chooseTemplate: { ar: "اختر القالب",              en: "Choose Template"           },
  templatePreview:{ ar: "معاينة القالب",            en: "Template Preview"          },
  noTemplates:    { ar: "لا توجد قوالب معتمدة",    en: "No approved templates"     },
  approved:       { ar: "معتمد",                    en: "Approved"                  },
  pending:        { ar: "قيد المراجعة",             en: "Pending"                   },
  prev:           { ar: "السابق",                   en: "Previous"                  },
  nextSettings:   { ar: "التالي: الإعدادات",        en: "Next: Settings"            },
  campaignName:   { ar: "اسم الحملة",               en: "Campaign Name"             },
  namePlaceholder:{ ar: "مثال: عروض رمضان 2025",   en: "e.g. Ramadan Offers 2025"  },
  sendTime:       { ar: "موعد الإرسال",             en: "Send Time"                 },
  sendNow:        { ar: "إرسال فوري",               en: "Send Now"                  },
  scheduleLater:  { ar: "جدولة لاحقاً",            en: "Schedule Later"            },
  summary:        { ar: "ملخص الحملة",              en: "Campaign Summary"          },
  sumName:        { ar: "الاسم",                    en: "Name"                      },
  sumRecipients:  { ar: "عدد المستلمين",            en: "Recipients"                },
  sumTemplate:    { ar: "القالب",                   en: "Template"                  },
  sumSend:        { ar: "الإرسال",                  en: "Send Time"                 },
  sumImmediate:   { ar: "فوري",                     en: "Immediate"                 },
  launching:      { ar: "جاري الإنشاء...",          en: "Creating..."               },
  sendCampaign:   { ar: "إرسال الحملة",             en: "Send Campaign"             },
  scheduleCampaign:{ ar: "جدولة الحملة",           en: "Schedule Campaign"         },
  // details modal
  createdAt:      { ar: "تاريخ الإنشاء",           en: "Created"                   },
  scheduledAt:    { ar: "موعد الجدولة",             en: "Scheduled for"             },
  completedAt:    { ar: "تاريخ الاكتمال",          en: "Completed"                 },
  template:       { ar: "قالب",                     en: "Template"                  },
  totalAudience:  { ar: "إجمالي الجمهور",           en: "Total Audience"            },
  sentPct:        { ar: "نسبة الإرسال (من الإجمالي)", en: "Send rate (of total)"   },
  performance:    { ar: "معدلات الأداء",            en: "Performance Rates"         },
  repeatAfter48:  { ar: "يمكن تكرار الحملة بعد 48 ساعة", en: "Can repeat after 48h" },
  hoursLeft:      { ar: "ساعة متبقية",              en: "hours left"                },
  numbers:        { ar: "رقم",                      en: "numbers"                   },
};
const tr = (key: keyof typeof t, lang: Lang) => t[key][lang];

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Template {
  id: string; name: string; content: string;
  status: string; language?: string; category?: string;
}
interface Campaign {
  id: string; name: string;
  status: "draft"|"scheduled"|"running"|"completed"|"failed";
  sentCount: number; deliveredCount: number; readCount: number;
  failedCount: number; totalQueued: number; queuedCount: number;
  scheduledAt: string|null; createdAt: string; completedAt: string|null;
  template: { name: string; content: string }|null;
}
interface AudienceContact { phone: string; }
interface AudienceOption  { id: string; name: string; type: string; contactCount: number; }

// ─── Helpers ────────────────────────────────────────────────────────────────────
const cleanNumber = (raw: string): string => {
  let n = raw.replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "20" + n.slice(1);
  if (!n.startsWith("20") && n.length === 10) n = "20" + n;
  return n;
};
const isValidPhone = (n: string) => /^20\d{10}$/.test(n);
const safeRate = (num: number, den: number) => den > 0 ? Math.round((num / den) * 100) : 0;

const statusConfig = (lang: Lang): Record<Campaign["status"], { label: string; color: string; dot: string }> => ({
  draft:     { label: tr("statusDraft",    lang), color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",       dot: "bg-gray-400"   },
  scheduled: { label: tr("statusScheduled",lang), color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-400" },
  running:   { label: tr("statusRunning",  lang), color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",    dot: "bg-blue-500"   },
  completed: { label: tr("statusCompleted",lang), color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300", dot: "bg-green-500"  },
  failed:    { label: tr("statusFailed",   lang), color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",        dot: "bg-red-500"    },
});

// ─── StepBar ───────────────────────────────────────────────────────────────────
function StepBar({ step, lang }: { step: number; lang: Lang }) {
  const steps = [tr("stepAudience",lang), tr("stepTemplate",lang), tr("stepSettings",lang)];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = i + 1; const active = step === n; const done = step > n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                ${done ? "bg-green-500 text-white" : active ? "bg-green-500 text-white ring-4 ring-green-100 dark:ring-green-900/40" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
                {done ? <CheckCircle className="w-4 h-4" /> : n}
              </div>
              <span className={`text-xs mt-1.5 ${active ? "text-green-600 dark:text-green-400 font-medium" : "text-gray-400"}`}>{label}</span>
            </div>
            {i < 2 && <div className={`h-0.5 w-16 mx-1 mb-4 transition-colors ${step > n ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── ProgressBar ───────────────────────────────────────────────────────────────
function ProgressBar({ label, value, max, color, textColor }: {
  label: string; value: number; max: number; color: string; textColor: string;
}) {
  const pct = safeRate(value, max);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`font-semibold ${textColor}`}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-400">{value.toLocaleString()} / {max.toLocaleString()}</p>
    </div>
  );
}

// ─── SendProgress ──────────────────────────────────────────────────────────────
function SendProgress({ campaign, lang }: { campaign: Campaign; lang: Lang }) {
  const total = campaign.totalQueued || 0;
  if (total === 0) return null;
  const pct = safeRate(campaign.sentCount, total);
  const isLive = campaign.status === "running";
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
          {isLive && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse inline-block" />}
          {tr("sendProgress", lang)}
        </span>
        <span className="font-semibold text-blue-600 dark:text-blue-400">{pct}%</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${isLive ? "bg-blue-400 animate-pulse" : "bg-blue-400"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{campaign.sentCount.toLocaleString()} {tr("sent", lang)}</span>
        <span>{total.toLocaleString()} {tr("totalAudience", lang)}</span>
      </div>
    </div>
  );
}

// ─── CampaignCard ──────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onDelete, onRepeat, onDetails, repeatBlocked, repeatBlockedNote, lang }: {
  campaign: Campaign; onDelete: () => void; onRepeat: () => void; onDetails: () => void;
  repeatBlocked: boolean; repeatBlockedNote: string; lang: Lang;
}) {
  const cfg = statusConfig(lang)[campaign.status] ?? statusConfig(lang).draft;
  return (
    <Card className="border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start justify-between p-4 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Megaphone className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{campaign.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${campaign.status === "running" ? "animate-pulse" : ""}`} />
                  {cfg.label}
                </span>
                {campaign.template?.name && (
                  <span className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-full">{campaign.template.name}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition" onClick={onDetails} title={tr("details",lang)}>
              <Eye className="w-4 h-4" />
            </button>
            <button className={`p-1.5 rounded-lg transition ${repeatBlocked ? "text-gray-200 dark:text-gray-600 cursor-not-allowed" : "text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"}`} onClick={onRepeat} disabled={repeatBlocked}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {(campaign.totalQueued > 0 || campaign.sentCount > 0) && (
          <div className="border-t border-gray-50 dark:border-gray-700 px-4 py-3 space-y-3">
            <SendProgress campaign={campaign} lang={lang} />
            {campaign.sentCount > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { icon: <Send className="w-3 h-3"/>,        val: campaign.sentCount,      label: tr("sent",lang),      color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20"   },
                  { icon: <CheckCircle className="w-3 h-3"/>, val: campaign.deliveredCount, label: tr("delivered",lang), color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-900/20"  },
                  { icon: <Eye className="w-3 h-3"/>,         val: campaign.readCount,      label: tr("read",lang),      color: "text-purple-600 dark:text-purple-400",bg: "bg-purple-50 dark:bg-purple-900/20"},
                  { icon: <XCircle className="w-3 h-3"/>,     val: campaign.failedCount,    label: tr("failed",lang),    color: "text-red-500 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-900/20"      },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-lg p-2 text-center`}>
                    <div className={`flex justify-center mb-0.5 ${s.color}`}>{s.icon}</div>
                    <p className={`text-sm font-bold ${s.color}`}>{s.val.toLocaleString()}</p>
                    <p className="text-[9px] text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            {campaign.sentCount > 0 && (
              <div className="space-y-2 pt-1">
                <ProgressBar label={tr("deliveryRateL",lang)} value={campaign.deliveredCount} max={campaign.sentCount} color="bg-green-400"  textColor="text-green-600 dark:text-green-400" />
                <ProgressBar label={tr("readRateL",lang)}     value={campaign.readCount}      max={campaign.sentCount} color="bg-purple-400" textColor="text-purple-600 dark:text-purple-400" />
              </div>
            )}
            {campaign.queuedCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg">
                <Hourglass className="w-3.5 h-3.5" />
                {campaign.queuedCount.toLocaleString()} {tr("msgWaiting",lang)}
              </div>
            )}
          </div>
        )}

        {campaign.status === "scheduled" && campaign.scheduledAt && (
          <div className="border-t border-yellow-100 dark:border-yellow-900/30 bg-yellow-50/60 dark:bg-yellow-900/10 px-4 py-2 text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {tr("scheduled",lang)}: {new Date(campaign.scheduledAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── DetailsModal ──────────────────────────────────────────────────────────────
function DetailsModal({ campaign, open, onClose, lang }: {
  campaign: Campaign|null; open: boolean; onClose: () => void; lang: Lang;
}) {
  if (!campaign) return null;
  const cfg   = statusConfig(lang)[campaign.status] ?? statusConfig(lang).draft;
  const total = campaign.totalQueued || campaign.sentCount;

  const stats = [
    { label: tr("totalAudience",lang), value: total,                   icon: <Users className="w-5 h-5"/>,       color: "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"      },
    { label: tr("totalSent",lang),     value: campaign.sentCount,      icon: <Send className="w-5 h-5"/>,        color: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"   },
    { label: tr("totalDelivered",lang),value: campaign.deliveredCount, icon: <CheckCircle className="w-5 h-5"/>, color: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
    { label: tr("totalRead",lang),     value: campaign.readCount,      icon: <Eye className="w-5 h-5"/>,         color: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" },
    { label: tr("failed",lang),        value: campaign.failedCount,    icon: <XCircle className="w-5 h-5"/>,     color: "bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400"       },
    { label: tr("waiting",lang),       value: campaign.queuedCount,    icon: <Hourglass className="w-5 h-5"/>,   color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" dir={lang === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">{campaign.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
            </span>
            {campaign.template?.name && <span className="text-xs text-gray-500 dark:text-gray-400">{tr("template",lang)}: {campaign.template.name}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 my-2">
          {stats.map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-3 flex flex-col items-center text-center gap-1`}>
              {s.icon}
              <p className="text-xl font-bold">{s.value.toLocaleString()}</p>
              <p className="text-[10px] opacity-75 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {campaign.sentCount > 0 && (
          <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> {tr("performance",lang)}
            </p>
            <ProgressBar label={tr("sentPct",lang)}      value={campaign.sentCount}      max={total}              color="bg-blue-400"   textColor="text-blue-600 dark:text-blue-400"   />
            <ProgressBar label={tr("deliveryRateL",lang)} value={campaign.deliveredCount} max={campaign.sentCount} color="bg-green-400"  textColor="text-green-600 dark:text-green-400" />
            <ProgressBar label={tr("readRateL",lang)}     value={campaign.readCount}      max={campaign.sentCount} color="bg-purple-400" textColor="text-purple-600 dark:text-purple-400" />
            {campaign.failedCount > 0 && (
              <ProgressBar label={tr("failureRateL",lang)} value={campaign.failedCount}   max={campaign.sentCount} color="bg-red-400"    textColor="text-red-500 dark:text-red-400"     />
            )}
          </div>
        )}

        <div className="text-xs text-gray-400 space-y-1 pt-1 border-t border-gray-100 dark:border-gray-700">
          <p>{tr("createdAt",lang)}: {new Date(campaign.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}</p>
          {campaign.scheduledAt && <p>{tr("scheduledAt",lang)}: {new Date(campaign.scheduledAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}</p>}
          {campaign.completedAt && <p>{tr("completedAt",lang)}: {new Date(campaign.completedAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function Campaigns() {
  const [lang, setLang] = useState<Lang>("ar");
  useEffect(() => {
    const saved = localStorage.getItem("dashboard_lang") as Lang | null;
    if (saved === "en" || saved === "ar") setLang(saved);
  }, []);
  const toggleLang = () => {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    localStorage.setItem("dashboard_lang", next);
  };

  const [campaigns,     setCampaigns]     = useState<Campaign[]>([]);
  const [total,         setTotal]         = useState(0);
  const [loadingList,   setLoadingList]   = useState(true);
  const [filterStatus,  setFilterStatus]  = useState<string>("all");

  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [step,        setStep]        = useState(1);
  const [submitting,  setSubmitting]  = useState(false);

  const [numbers,            setNumbers]            = useState<string[]>([]);
  const [audiences,          setAudiences]          = useState<AudienceOption[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState("");
  const [importingAudience,  setImportingAudience]  = useState(false);

  const [templates,        setTemplates]        = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const [campaignName, setCampaignName] = useState("");
  const [sendMode,     setSendMode]     = useState<"now"|"scheduled">("now");
  const [scheduledAt,  setScheduledAt]  = useState("");

  const [detailsCampaign, setDetailsCampaign] = useState<Campaign | null>(null);

  const hasRunning = campaigns.some(c => c.status === "running");

  const loadCampaigns = useCallback(async () => {
    try {
      setLoadingList(true);
      const params = new URLSearchParams({ limit: "50" });
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res  = await fetch(`/api/campaigns?${params}`);
      const data = await res.json();
      const list: Campaign[] = Array.isArray(data) ? data : (data.campaigns ?? data.data ?? []);
      setCampaigns(list);
      setTotal(data.total ?? list.length);
    } catch { toast.error("فشل في تحميل الحملات"); }
    finally  { setLoadingList(false); }
  }, [filterStatus]);

  const loadTemplates = useCallback(async () => {
    try {
      const res  = await fetch("/api/templates");
      const data = await res.json();
      const list: Template[] = Array.isArray(data) ? data : (data.data ?? []);
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

  useEffect(() => { loadCampaigns(); },                          [loadCampaigns]);
  useEffect(() => { loadTemplates(); loadAudiences(); },         [loadTemplates, loadAudiences]);
  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => loadCampaigns(), 8_000);
    return () => clearInterval(id);
  }, [hasRunning, loadCampaigns]);

  const resetDialog = () => {
    setStep(1); setNumbers([]); setSelectedAudienceId("");
    setSelectedTemplate(templates[0] ?? null);
    setCampaignName(""); setSendMode("now"); setScheduledAt("");
  };

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
      toast.success(`${lang === "ar" ? "تم استخراج" : "Extracted"} ${extracted.length} ${lang === "ar" ? "رقم صالح" : "valid numbers"}`);
    } catch { toast.error("فشل في قراءة الملف"); }
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
      if (extracted.length === 0) { toast.error("لا توجد أرقام صالحة"); return; }
      setNumbers([...new Set([...numbers, ...extracted])]);
      toast.success(`${lang === "ar" ? "تم استيراد" : "Imported"} ${extracted.length} ${lang === "ar" ? "رقم" : "numbers"}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setImportingAudience(false); }
  };

  const handleSubmit = async () => {
    if (!campaignName.trim()) { toast.error("أدخل اسم الحملة"); return; }
    if (!selectedTemplate)    { toast.error("اختر قالباً"); return; }
    if (sendMode === "scheduled" && !scheduledAt) { toast.error("حدد موعد الجدولة"); return; }
    setSubmitting(true);
    const tid = toast.loading("جاري إنشاء الحملة...");
    try {
      const res  = await fetch("/api/campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: campaignName, templateName: selectedTemplate.name, numbers, scheduledAt: sendMode === "scheduled" ? new Date(scheduledAt).toISOString() : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الحملة");
      toast.dismiss(tid);
      toast.success(data.scheduled ? "تم جدولة الحملة ✅" : "تم إنشاء الحملة ✅");
      setDialogOpen(false); resetDialog(); await loadCampaigns();
    } catch (err: any) { toast.dismiss(tid); toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    const tid = toast.loading("جاري الحذف...");
    try {
      const res  = await fetch("/api/campaigns", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      toast.dismiss(tid); toast.success("تم الحذف"); await loadCampaigns();
    } catch (err: any) { toast.dismiss(tid); toast.error(err.message); }
  };

  const handleRepeat = async (campaign: Campaign) => {
    const elapsed = Date.now() - new Date(campaign.createdAt).getTime();
    const min48   = 48 * 60 * 60 * 1000;
    if (elapsed < min48) {
      const h = Math.ceil((min48 - elapsed) / 3_600_000);
      toast.error(`${tr("repeatAfter48",lang)} — ${h} ${tr("hoursLeft",lang)}`);
      return;
    }
    const tid = toast.loading("جاري تكرار الحملة...");
    try {
      const res  = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ _action: "repeat", campaignId: campaign.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التكرار");
      toast.dismiss(tid); toast.success("تم تكرار الحملة ✅"); await loadCampaigns();
    } catch (err: any) { toast.dismiss(tid); toast.error(err.message); }
  };

  // Summary stats
  const totalSent      = campaigns.reduce((a, c) => a + c.sentCount,      0);
  const totalDelivered = campaigns.reduce((a, c) => a + c.deliveredCount,  0);
  const totalRead      = campaigns.reduce((a, c) => a + c.readCount,       0);

  const STATUS_FILTERS = [
    { value: "all",       label: tr("filterAll",lang)       },
    { value: "running",   label: tr("filterRunning",lang)   },
    { value: "scheduled", label: tr("filterScheduled",lang) },
    { value: "completed", label: tr("filterCompleted",lang) },
    { value: "failed",    label: tr("filterFailed",lang)    },
    { value: "draft",     label: tr("filterDraft",lang)     },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto" dir={lang === "ar" ? "rtl" : "ltr"}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tr("title",lang)}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{total} {lang === "ar" ? "حملة إجمالاً" : "total campaigns"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleLang} title="Toggle language"
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-green-600 hover:border-green-300 transition flex items-center gap-1.5 text-xs font-medium">
            <Languages className="w-4 h-4" />
            {lang === "ar" ? "EN" : "AR"}
          </button>
          <button onClick={loadCampaigns}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-green-600 hover:border-green-300 transition">
            <RefreshCw className={`w-4 h-4 ${loadingList ? "animate-spin" : ""}`} />
          </button>
          <Button onClick={() => { resetDialog(); setDialogOpen(true); }} className="bg-green-500 hover:bg-green-600 text-white shadow-sm gap-2">
            <Plus className="w-4 h-4" /> {tr("newCampaign",lang)}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: tr("totalCampaigns",lang), value: total,         icon: <Megaphone className="w-5 h-5"/>,    color: "text-gray-600 dark:text-gray-300",   bg: "bg-gray-50 dark:bg-gray-800"   },
            { label: tr("totalSent",lang),      value: totalSent,     icon: <Send className="w-5 h-5"/>,         color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20"   },
            { label: tr("totalDelivered",lang), value: totalDelivered,icon: <CheckCircle className="w-5 h-5"/>, color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-900/20"  },
            { label: tr("totalRead",lang),      value: totalRead,     icon: <Eye className="w-5 h-5"/>,          color: "text-purple-600 dark:text-purple-400",bg: "bg-purple-50 dark:bg-purple-900/20" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex items-center gap-3`}>
              <span className={s.color}>{s.icon}</span>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overall rates */}
      {totalSent > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 mb-6 space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-gray-400" /> {tr("overallPerf",lang)}
          </p>
          <ProgressBar label={tr("deliveryRate",lang)} value={totalDelivered} max={totalSent} color="bg-green-400"  textColor="text-green-600 dark:text-green-400"  />
          <ProgressBar label={tr("readRate",lang)}     value={totalRead}      max={totalSent} color="bg-purple-400" textColor="text-purple-600 dark:text-purple-400" />
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 flex-nowrap">
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
            {filterStatus !== "all" ? tr("noFilterMatch",lang) : tr("noCampaigns",lang)}
          </h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xs">{tr("noCampaignsDesc",lang)}</p>
          {filterStatus === "all" && (
            <Button onClick={() => { resetDialog(); setDialogOpen(true); }} className="bg-green-500 hover:bg-green-600 text-white gap-2">
              <Plus className="w-4 h-4" /> {tr("startFirst",lang)}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const elapsed   = Date.now() - new Date(c.createdAt).getTime();
            const min48     = 48 * 60 * 60 * 1000;
            const blocked   = elapsed < min48;
            const hoursLeft = Math.ceil((min48 - elapsed) / 3_600_000);
            return (
              <CampaignCard key={c.id} campaign={c} lang={lang}
                onDelete={() => handleDelete(c.id)}
                onRepeat={() => handleRepeat(c)}
                onDetails={() => setDetailsCampaign(c)}
                repeatBlocked={blocked}
                repeatBlockedNote={blocked ? `${tr("repeatAfter48",lang)} — ${hoursLeft} ${tr("hoursLeft",lang)}` : ""}
              />
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); resetDialog(); } }}>
        <DialogContent className="max-w-2xl w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">{tr("createTitle",lang)}</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">{tr("createDesc",lang)}</DialogDescription>
          </DialogHeader>
          <StepBar step={step} lang={lang} />

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{tr("uploadExcel",lang)}</Label>
                <label htmlFor="excel-input" className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-8 cursor-pointer hover:border-green-400 hover:bg-green-50/30 dark:hover:bg-green-900/10 transition-all">
                  <FileSpreadsheet className="w-10 h-10 text-green-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">{tr("dragHere",lang)}</span>
                  <span className="text-xs text-gray-400">.xlsx / .xls</span>
                  <input id="excel-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcel} />
                </label>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{tr("orImport",lang)}</Label>
                <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 space-y-3">
                  <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
                    <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600">
                      <SelectValue placeholder={tr("chooseList",lang)} />
                    </SelectTrigger>
                    <SelectContent>
                      {audiences.length === 0
                        ? <SelectItem value="no-audiences" disabled>{tr("noLists",lang)}</SelectItem>
                        : audiences.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.contactCount.toLocaleString()})</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="w-full gap-2 dark:border-gray-600 dark:text-gray-300" onClick={importAudienceContacts} disabled={!selectedAudienceId || importingAudience}>
                    {importingAudience ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                    {tr("importBtn",lang)}
                  </Button>
                </div>
              </div>
              {numbers.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> {numbers.length.toLocaleString()} {tr("numbers",lang)}
                    </span>
                    <button onClick={() => setNumbers([])} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                      <X className="w-3 h-3" /> {tr("clearAll",lang)}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {numbers.slice(0,15).map((n,i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-white dark:bg-gray-700 text-xs px-2 py-1 rounded-lg border border-green-200 dark:border-green-800 text-gray-700 dark:text-gray-300">
                        {n}
                        <button onClick={() => setNumbers(numbers.filter((_,j) => j !== i))} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    {numbers.length > 15 && <span className="text-xs text-gray-400 self-center">+{numbers.length - 15}</span>}
                  </div>
                </div>
              )}
              <Button onClick={() => { if (!numbers.length) { toast.error("أضف أرقام أولاً"); return; } setStep(2); }}
                className="w-full bg-green-500 hover:bg-green-600 text-white gap-2" disabled={numbers.length === 0}>
                {tr("nextTemplate",lang)} {lang === "ar" ? <ChevronLeft className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {templates.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{tr("noTemplates",lang)}</p>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{tr("chooseTemplate",lang)}</Label>
                    <Select value={selectedTemplate?.name ?? ""} onValueChange={v => { const t = templates.find(t => t.name === v); if (t) setSelectedTemplate(t); }}>
                      <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {templates.map(t => <SelectItem key={t.id} value={t.name}>{t.name} <span className="text-gray-400 text-xs mr-1">{t.language}</span></SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedTemplate && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">{tr("templatePreview",lang)}</p>
                      <div className="bg-white dark:bg-gray-800 rounded-xl rounded-tl-sm shadow-sm border border-gray-100 dark:border-gray-700 p-3 max-w-xs text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {selectedTemplate.content || "—"}
                      </div>
                      <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full ${["approved","APPROVED"].includes(selectedTemplate.status) ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"}`}>
                        {["approved","APPROVED"].includes(selectedTemplate.status) ? tr("approved",lang) : tr("pending",lang)}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2 dark:border-gray-600 dark:text-gray-300" onClick={() => setStep(1)}>
                  {lang === "ar" ? <ChevronRight className="w-4 h-4"/> : <ChevronLeft className="w-4 h-4"/>} {tr("prev",lang)}
                </Button>
                <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2" onClick={() => setStep(3)} disabled={!selectedTemplate}>
                  {tr("nextSettings",lang)} {lang === "ar" ? <ChevronLeft className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{tr("campaignName",lang)}</Label>
                <Input placeholder={tr("namePlaceholder",lang)} value={campaignName} onChange={e => setCampaignName(e.target.value)} className="dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{tr("sendTime",lang)}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["now","scheduled"] as const).map(mode => (
                    <button key={mode} onClick={() => setSendMode(mode)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${sendMode === mode ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300"}`}>
                      {mode === "now" ? <><Send className="w-4 h-4"/> {tr("sendNow",lang)}</> : <><Calendar className="w-4 h-4"/> {tr("scheduleLater",lang)}</>}
                    </button>
                  ))}
                </div>
              </div>
              {sendMode === "scheduled" && (
                <Input type="datetime-local" value={scheduledAt}
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0,16)}
                  onChange={e => setScheduledAt(e.target.value)} className="dark:bg-gray-700 dark:border-gray-600" />
              )}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{tr("summary",lang)}</p>
                {[
                  { label: tr("sumName",lang),       value: campaignName || "—" },
                  { label: tr("sumRecipients",lang),  value: `${numbers.length.toLocaleString()} ${tr("numbers",lang)}` },
                  { label: tr("sumTemplate",lang),    value: selectedTemplate?.name || "—" },
                  { label: tr("sumSend",lang),        value: sendMode === "now" ? tr("sumImmediate",lang) : scheduledAt ? new Date(scheduledAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB") : "—" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2 dark:border-gray-600 dark:text-gray-300" onClick={() => setStep(2)}>
                  {lang === "ar" ? <ChevronRight className="w-4 h-4"/> : <ChevronLeft className="w-4 h-4"/>} {tr("prev",lang)}
                </Button>
                <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2" onClick={handleSubmit}
                  disabled={submitting || !campaignName.trim() || !selectedTemplate}>
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin"/> {tr("launching",lang)}</>
                    : sendMode === "now" ? <><Send className="w-4 h-4"/> {tr("sendCampaign",lang)}</>
                    : <><Calendar className="w-4 h-4"/> {tr("scheduleCampaign",lang)}</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DetailsModal campaign={detailsCampaign} open={!!detailsCampaign} onClose={() => setDetailsCampaign(null)} lang={lang} />
    </div>
  );
}