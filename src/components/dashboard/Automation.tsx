"use client";

// ─── Automation.tsx ───────────────────────────────────────────────────────────
// Tabs:
//   1. "الأتمتة"  → inner sub-tabs:
//        - الكلمات  : keyword bot (KEYWORD + TEXT)           — free text ✅
//        - الترحيب  : first-message (FIRST_MESSAGE + TEXT)   — free text ✅ (reply to incoming)
//        - المتابعة : no-reply (NO_REPLY + TEMPLATE)         — template only ⚠️ (outbound)
//        - الزمنية  : time-based (TIME_BASED + TEMPLATE)     — template ⚠️ (outbound)
//        - A/B      : splits random contacts → two campaigns
//   2. "الذكاء الاصطناعي" → unchanged AI agent

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bot, Plus, MoreVertical, Trash2, Edit2, Loader2, MessageSquare, ImageIcon,
  Zap, ToggleLeft, ToggleRight, CheckCircle, Save, Sparkles, Key,
  X,
  Hand, Clock, CalendarClock, FlaskConical, AlertTriangle, Info, LayoutGrid,
} from "lucide-react";
import SmartFollowUpTab from "./SmartFollowUpTab";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AutomationRule {
  id: string; name: string; isEnabled: boolean;
  triggerType: string; triggerValue: string | null;
  replyType: string; replyContent: string | null; replyMediaUrl: string | null;
  templateId: string | null; createdAt: string;
}
interface Template { id: string; name: string; content: string; status: string; }
interface Audience {
  id: string; name: string;
  _count?: { contacts: number };
  contacts?: { id: string; phone: string; name: string | null }[];
}
interface AIAgent {
  isEnabled: boolean; provider: "gemini" | "openai";
  brandName: string; businessDesc: string; productsInfo: string;
  pricingInfo: string; workingHours: string; tone: string;
  systemPrompt: string; languageMode: string; websiteUrl: string; websiteButtonText: string; pauseMinutes: number;
  elevenLabsEnabled: boolean;
  elevenLabsApiKey: string;
  elevenLabsAgentId: string;
}
type Lang = "ar" | "en";
const tx = (lang: Lang, ar: string, en: string) => (lang === "ar" ? ar : en);
const EMPTY_AGENT: AIAgent = {
  isEnabled: false, provider: "gemini", brandName: "", businessDesc: "",
  productsInfo: "", pricingInfo: "", workingHours: "", tone: "friendly",
  systemPrompt: "", languageMode: "auto", websiteUrl: "", websiteButtonText: "", pauseMinutes: 10,
  elevenLabsEnabled: false, elevenLabsApiKey: "", elevenLabsAgentId: "",
};
type AutoSubTab = "keywords" | "welcome" | "smart_followup" | "timebased" | "ab";

const DAYS_AR = [
  { key: "sun", ar: "الأحد", en: "Sunday" }, { key: "mon", ar: "الاثنين", en: "Monday" },
  { key: "tue", ar: "الثلاثاء", en: "Tuesday" }, { key: "wed", ar: "الأربعاء", en: "Wednesday" },
  { key: "thu", ar: "الخميس", en: "Thursday" }, { key: "fri", ar: "الجمعة", en: "Friday" },
  { key: "sat", ar: "السبت", en: "Saturday" },
];

const subTabs: { id: AutoSubTab; ar: string; en: string; icon: any }[] = [
  { id: "keywords", ar: "الكلمات", en: "Keywords", icon: Key },
  { id: "welcome", ar: "الترحيب", en: "Welcome", icon: Hand },
  { id: "smart_followup", ar: "المتابعة الذكية", en: "Smart Follow-up", icon: Sparkles },
  { id: "timebased", ar: "الزمنية", en: "Scheduled", icon: CalendarClock },
  { id: "ab", ar: "A/B اختبار", en: "A/B Test", icon: FlaskConical },
];

// ─── Small reusable pieces ────────────────────────────────────────────────────
function EmptyState({ icon, title, desc, action }: {
  icon: React.ReactNode; title: string; desc: string; action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-5">{icon}</div>
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
      <p className="text-gray-400 text-sm mb-6 max-w-xs">{desc}</p>
      {action}
    </div>
  );
}

function OutboundWarning({ lang }: { lang: Lang }) {
  return (
    <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-300">
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
      <div>
        <p className="font-semibold mb-0.5">{tx(lang, "يستخدم قوالب رسمية فقط", "Uses approved templates only")}</p>
        <p className="text-xs leading-relaxed">{tx(lang, "هذا النوع يبادر بإرسال رسالة للعميل — واتساب يشترط قوالب معتمدة من Meta لتجنب الحظر.", "This flow starts outbound messages, so WhatsApp requires Meta-approved templates.")}</p>
      </div>
    </div>
  );
}

function WelcomeInfo({ lang }: { lang: Lang }) {
  return (
    <div className="flex items-start gap-2.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-3 text-sm text-green-700 dark:text-green-300">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
      <div>
        <p className="font-semibold mb-0.5">{tx(lang, "نص حر مسموح به هنا", "Free text is allowed here")}</p>
        <p className="text-xs leading-relaxed">{tx(lang, "رسالة الترحيب هي رد على رسالة وردت من العميل أولاً — أنت داخل نافذة 24 ساعة، لذا النص الحر آمن بدون قالب.", "Welcome replies are inside the 24-hour customer service window, so free text is safe without template.")}</p>
      </div>
    </div>
  );
}

function TemplatePicker({ templates, value, onChange, lang }: {
  templates: Template[]; value: string; onChange: (id: string) => void; lang: Lang;
}) {
  const approved = templates.filter(t => t.status?.toLowerCase() === "approved");
  if (approved.length === 0) return (
    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2.5 border border-amber-100 dark:border-amber-800">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      {tx(lang, "لا توجد قوالب معتمدة — اذهب لصفحة القوالب وأضف قالباً أولاً", "No approved templates — go to Templates page and add one first")}
    </div>
  );
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={tx(lang, "اختر قالباً معتمداً...", "Choose an approved template...")} /></SelectTrigger>
      <SelectContent>
        {approved.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function RuleCard({ rule, onToggle, onEdit, onDelete, showKeyword = true, lang }: {
  rule: AutomationRule; onToggle: () => void; onEdit: () => void;
  onDelete: () => void; showKeyword?: boolean; lang: Lang;
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 border rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-all
      ${rule.isEnabled ? "border-gray-200 dark:border-gray-700 hover:shadow-md" : "border-gray-100 dark:border-gray-700/50 opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
            ${rule.isEnabled ? "bg-green-50 text-green-600" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
            <Key className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{rule.name}</p>
            {showKeyword && rule.triggerValue && (
              <p className="text-xs text-gray-400 mt-0.5 font-mono">"{rule.triggerValue}"</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onToggle} className={`transition-colors ${rule.isEnabled ? "text-green-500" : "text-gray-300"}`}>
            {rule.isEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><MoreVertical className="w-4 h-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={onEdit}><Edit2 className="w-4 h-4" /> {tx(lang, "تعديل", "Edit")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-sm text-red-600 cursor-pointer focus:text-red-600" onClick={onDelete}><Trash2 className="w-4 h-4" /> {tx(lang, "حذف", "Delete")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {rule.replyMediaUrl && (
        <div className="relative w-full rounded-lg overflow-hidden max-h-24">
          <img src={rule.replyMediaUrl} alt="" className="w-full object-cover max-h-24" />
          {rule.replyContent && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
              <p className="text-[10px] text-white line-clamp-1">{rule.replyContent}</p>
            </div>
          )}
        </div>
      )}
      {!rule.replyMediaUrl && rule.replyContent && (
        <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 line-clamp-2 leading-relaxed">{rule.replyContent}</p>
      )}
      {rule.templateId && <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg w-fit">{tx(lang, "قالب واتساب معتمد", "Approved WhatsApp template")}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function Automation({ planTier = "free" }: { planTier?: string }) {
  const { locale, dir } = useLanguage();
  const lang: Lang = locale === "en" ? "en" : "ar";
  const [activeTab, setActiveTab] = useState<"automation" | "ai">("automation");
  const [activeSubTab, setActiveSubTab] = useState<AutoSubTab>("keywords");

  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [agent, setAgent] = useState<AIAgent>({ ...EMPTY_AGENT });
  const [loading, setLoading] = useState(true);

  const [savingAgent, setSavingAgent] = useState(false);
  const [agentDirty, setAgentDirty] = useState(false);
  const [agentSaved, setAgentSaved] = useState(false);

  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<AutoSubTab>("keywords");
  const [editTarget, setEditTarget] = useState<AutomationRule | null>(null);
  const [saving, setSaving] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    name: "", keyword: "", reply: "", replyMediaUrl: "", templateId: "",
    noReplyDays: "3", days: [] as string[], hour: "09", minute: "00",
    tbAudienceId: "", tbMaxContacts: "500",
  });
  const [mediaUploading, setMediaUploading] = useState(false);

  const [abForm, setAbForm] = useState({
    name: "", audienceId: "", sampleSize: "100", splitRatio: "50",
    varAName: "نسخة أ", varATemplate: "", varBName: "نسخة ب", varBTemplate: "",
  });
  const [launchingAb, setLaunchingAb] = useState(false);
  const isEnterprise = planTier === "enterprise";
  const isProOrAbove = planTier === "pro" || planTier === "enterprise";

  const aiLockMsg = tx(
    lang,
    "تبويب الذكاء الاصطناعي متاح فقط في باقة Enterprise. قم بترقية الباقة.",
    "AI tab is available only on Enterprise plan. Please upgrade."
  );
  const proLockMsg = tx(
    lang,
    "الميزة متاحة من باقة Professional فما فوق. قم بترقية الباقة.",
    "This feature is available on Professional plan and above. Please upgrade."
  );
  const showLockToast = (msg: string) => {
    toast.dismiss("plan-lock");
    toast.error(msg, { id: "plan-lock" });
  };

  // ─── Load all data ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, agentRes, templatesRes, audRes] = await Promise.all([
        fetch("/api/automation"), fetch("/api/ai-agent"),
        fetch("/api/templates"), fetch("/api/audiences"),
      ]);
      const rulesData = await rulesRes.json();
      const agentData = await agentRes.json();
      const templatesData = await templatesRes.json();
      const audData = await audRes.json();

      setRules(Array.isArray(rulesData) ? rulesData : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setAudiences(Array.isArray(audData.audiences) ? audData.audiences : []);
      setAgent({
        isEnabled: agentData.isEnabled ?? false,
        provider: agentData.provider ?? "gemini",
        brandName: agentData.brandName ?? "",
        businessDesc: agentData.businessDesc ?? "",
        productsInfo: agentData.productsInfo ?? "",
        pricingInfo: agentData.pricingInfo ?? "",
        workingHours: agentData.workingHours ?? "",
        tone: agentData.tone ?? "friendly",
        systemPrompt: agentData.systemPrompt ?? "",
        languageMode: agentData.languageMode ?? "auto",
        websiteUrl: agentData.websiteUrl ?? "",
        websiteButtonText: agentData.websiteButtonText ?? "",
        pauseMinutes: agentData.pauseMinutes ?? 10,
        elevenLabsEnabled: agentData.elevenLabsEnabled ?? false,
        elevenLabsApiKey: agentData.elevenLabsApiKey ?? "",
        elevenLabsAgentId: agentData.elevenLabsAgentId ?? "",
      });
    } catch { toast.error(tx(lang, "خطأ في تحميل البيانات", "Failed to load data")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kwRules = rules.filter(r => r.triggerType === "KEYWORD");
  const welcomeRules = rules.filter(r => r.triggerType === "FIRST_MESSAGE");
  const timeRules = rules.filter(r => r.triggerType === "TIME_BASED");

  // ─── Dialog open ──────────────────────────────────────────────────────────
  const handleMediaUpload = async (file: File) => {
    setMediaUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/automation/upload", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); toast.error(e.error ?? "فشل رفع الصورة"); return; }
      const { url } = await res.json();
      setRuleForm(f => ({ ...f, replyMediaUrl: url }));
      toast.success("تم رفع الصورة ✓");
    } catch { toast.error("حدث خطأ أثناء الرفع"); }
    finally { setMediaUploading(false); }
  };

  const openCreate = (mode: AutoSubTab) => {
    setDialogMode(mode); setEditTarget(null);
    setRuleForm({ name: "", keyword: "", reply: "", replyMediaUrl: "", templateId: "", noReplyDays: "3", days: [], hour: "09", minute: "00", tbAudienceId: "", tbMaxContacts: "500" });
    setShowDialog(true);
  };

  const openEdit = (rule: AutomationRule, mode: AutoSubTab) => {
    setDialogMode(mode); setEditTarget(rule);
    let days: string[] = []; let hour = "09"; let minute = "00";
    let tbAudienceId = ""; let tbMaxContacts = "500";
    if (rule.triggerType === "TIME_BASED" && rule.triggerValue) {
      try { const p = JSON.parse(rule.triggerValue); days = p.days ?? []; hour = p.hour ?? "09"; minute = p.minute ?? "00"; tbAudienceId = p.audienceId ?? ""; tbMaxContacts = String(p.maxContacts ?? 500); } catch { }
    }
    setRuleForm({
      name: rule.name, keyword: rule.triggerValue ?? "", reply: rule.replyContent ?? "", replyMediaUrl: rule.replyMediaUrl ?? "",
      templateId: rule.templateId ?? "", noReplyDays: rule.triggerType === "NO_REPLY" ? (rule.triggerValue ?? "3") : "3",
      days, hour, minute, tbAudienceId, tbMaxContacts,
    });
    setShowDialog(true);
  };

  // ─── Save rule ────────────────────────────────────────────────────────────
  const saveRule = async () => {
    const { name, keyword, reply, templateId, noReplyDays, days, hour, minute, tbAudienceId, tbMaxContacts } = ruleForm;
    if (!name.trim()) { toast.error(tx(lang, "اسم القاعدة مطلوب", "Rule name is required")); return; }

    let triggerType = "KEYWORD"; let triggerValue: string | null = null;
    let replyType = "TEXT"; let replyContent: string | null = null; let tplId: string | null = null;

    if (dialogMode === "keywords") {
      if (!keyword.trim()) { toast.error(tx(lang, "الكلمة المفتاحية مطلوبة", "Keyword is required")); return; }
      if (!reply.trim()) { toast.error(tx(lang, "نص الرد مطلوب", "Reply text is required")); return; }
      triggerType = "KEYWORD"; triggerValue = keyword.trim();
      replyType = "TEXT"; replyContent = reply.trim();
    } else if (dialogMode === "welcome") {
      if (!reply.trim()) { toast.error(tx(lang, "نص الرد مطلوب", "Reply text is required")); return; }
      triggerType = "FIRST_MESSAGE"; replyType = "TEXT"; replyContent = reply.trim();
    } else if (dialogMode === "timebased") {
      if (days.length === 0) { toast.error(tx(lang, "اختر يوماً واحداً على الأقل", "Choose at least one day")); return; }
      if (!tbAudienceId) { toast.error(tx(lang, "اختر الجمهور المستهدف", "Choose target audience")); return; }
      if (!templateId) { toast.error(tx(lang, "اختر قالباً معتمداً", "Choose an approved template")); return; }
      const maxN = Number(tbMaxContacts);
      if (!maxN || maxN < 1) { toast.error(tx(lang, "عدد جهات الاتصال يجب أن يكون أكبر من 0", "Contacts count must be greater than 0")); return; }
      triggerType = "TIME_BASED";
      triggerValue = JSON.stringify({ days, hour, minute, audienceId: tbAudienceId, maxContacts: maxN });
      replyType = "TEMPLATE"; tplId = templateId;
    }

    setSaving(true);
    try {
      const payload = { name: name.trim(), triggerType, triggerValue, replyType, replyContent, replyMediaUrl: ruleForm.replyMediaUrl?.trim() || null, templateId: tplId, humanKeywords: [], pauseOnReply: dialogMode !== "keywords" };
      const method = editTarget ? "PATCH" : "POST";
      const body = editTarget ? JSON.stringify({ id: editTarget.id, ...payload }) : JSON.stringify(payload);
      const r = await fetch("/api/automation", { method, headers: { "Content-Type": "application/json" }, body });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (editTarget) { toast.success(tx(lang, "تم التعديل", "Updated")); setRules(prev => prev.map(x => x.id === editTarget.id ? d : x)); }
      else { toast.success(tx(lang, "تم الإضافة", "Added")); setRules(prev => [...prev, d]); }
      window.dispatchEvent(new Event("trigger-review-prompt"));
      setShowDialog(false);
    } catch (e: any) { toast.error(e.message ?? tx(lang, "خطأ في الحفظ", "Save failed")); }
    finally { setSaving(false); }
  };

  const toggleRule = async (rule: AutomationRule) => {
    try {
      await fetch("/api/automation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rule.id, isEnabled: !rule.isEnabled }) });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r));
    } catch { toast.error(tx(lang, "خطأ في التحديث", "Update failed")); }
  };

  const deleteRule = async (id: string) => {
    try {
      const r = await fetch("/api/automation", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!r.ok) throw new Error();
      toast.success(tx(lang, "تم الحذف", "Deleted")); setRules(prev => prev.filter(x => x.id !== id));
    } catch { toast.error(tx(lang, "خطأ في الحذف", "Delete failed")); }
  };

  // ─── A/B launch ───────────────────────────────────────────────────────────
  const launchABTest = async () => {
    const { name, audienceId, sampleSize, splitRatio, varAName, varATemplate, varBName, varBTemplate } = abForm;
    if (!name.trim()) { toast.error(tx(lang, "اسم الاختبار مطلوب", "Test name is required")); return; }
    if (!audienceId) { toast.error(tx(lang, "اختر جمهوراً", "Choose audience")); return; }
    if (!varATemplate) { toast.error(tx(lang, "اختر قالب النسخة أ", "Choose variant A template")); return; }
    if (!varBTemplate) { toast.error(tx(lang, "اختر قالب النسخة ب", "Choose variant B template")); return; }
    if (varATemplate === varBTemplate) { toast.error(tx(lang, "يجب أن يكون لكل نسخة قالب مختلف", "Each variant must use a different template")); return; }

    setLaunchingAb(true);
    try {
      const audRes = await fetch(`/api/audiences?audienceId=${audienceId}&includeContacts=all`);
      const audData = await audRes.json();
      const contacts: { phone: string }[] = audData.audience?.contacts ?? [];
      if (contacts.length === 0) { toast.error(tx(lang, "الجمهور فارغ", "Audience is empty")); return; }

      const shuffled = [...contacts].sort(() => Math.random() - 0.5);
      const n = Math.min(Number(sampleSize), shuffled.length);
      const sample = shuffled.slice(0, n);
      const splitPct = Math.max(10, Math.min(90, Number(splitRatio)));
      const aCount = Math.round(sample.length * splitPct / 100);
      const groupA = sample.slice(0, aCount).map(c => c.phone);
      const groupB = sample.slice(aCount).map(c => c.phone);

      if (groupA.length === 0 || groupB.length === 0) { toast.error(tx(lang, "كل مجموعة تحتاج على الأقل جهة اتصال واحدة", "Each group needs at least one contact")); return; }

      const tplA = templates.find(t => t.id === varATemplate);
      const tplB = templates.find(t => t.id === varBTemplate);
      if (!tplA || !tplB) { toast.error(tx(lang, "لم يتم العثور على القوالب", "Templates not found")); return; }

      const [resA, resB] = await Promise.all([
        fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `${name} — ${varAName}`, templateName: tplA.id, numbers: groupA }) }),
        fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `${name} — ${varBName}`, templateName: tplB.id, numbers: groupB }) }),
      ]);

      if (!resA.ok || !resB.ok) {
        const errA = await resA.json().catch(() => ({}));
        const errB = await resB.json().catch(() => ({}));
        throw new Error(errA.error ?? errB.error ?? tx(lang, "خطأ في إنشاء الحملات", "Failed to create campaigns"));
      }

      toast.success(tx(lang, `✓ تم إطلاق اختبار A/B — ${groupA.length} للنسخة أ، ${groupB.length} للنسخة ب`, `✓ A/B test launched — ${groupA.length} for variant A, ${groupB.length} for variant B`));
      setAbForm({ name: "", audienceId: "", sampleSize: "100", splitRatio: "50", varAName: "نسخة أ", varATemplate: "", varBName: "نسخة ب", varBTemplate: "" });
    } catch (e: any) { toast.error(e.message ?? tx(lang, "خطأ في إطلاق الاختبار", "Failed to launch test")); }
    finally { setLaunchingAb(false); }
  };

  // ─── AI helpers ───────────────────────────────────────────────────────────
  const saveAgent = async () => {
    setSavingAgent(true);
    try {
      const r = await fetch("/api/ai-agent", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(agent) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(tx(lang, "تم حفظ إعدادات الوكيل الذكي", "AI agent settings saved"));
      setAgentDirty(false); setAgentSaved(true);
    } catch (e: any) { toast.error(e.message ?? tx(lang, "خطأ في الحفظ", "Save failed")); }
    finally { setSavingAgent(false); }
  };

  const updateAgent = (patch: Partial<AIAgent>) => { setAgent(a => ({ ...a, ...patch })); setAgentDirty(true); setAgentSaved(false); };
  const toggleDay = (day: string) => setRuleForm(f => ({ ...f, days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day] }));

  // ─── Badge count ──────────────────────────────────────────────────────────
  const badgeCount: Record<AutoSubTab, number> = {
    keywords: kwRules.filter(r => r.isEnabled).length,
    welcome: welcomeRules.filter(r => r.isEnabled).length,
    smart_followup: 0,
    timebased: timeRules.filter(r => r.isEnabled).length,
    ab: 0,
  };

  useEffect(() => {
    setAbForm(prev => ({
      ...prev,
      varAName: prev.varAName === "نسخة أ" || prev.varAName === "Variant A" ? tx(lang, "نسخة أ", "Variant A") : prev.varAName,
      varBName: prev.varBName === "نسخة ب" || prev.varBName === "Variant B" ? tx(lang, "نسخة ب", "Variant B") : prev.varBName,
    }));
  }, [lang]);

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <Loader2 className="w-10 h-10 animate-spin text-gray-300" />
    </div>
  );

  // ─── Sub-tab content ──────────────────────────────────────────────────────
  const renderSubTab = () => {
    if (activeSubTab === "keywords") return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{tx(lang, "بوت الكلمات المفتاحية", "Keyword bot")}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{kwRules.length > 0 ? tx(lang, `${kwRules.filter(r => r.isEnabled).length} مفعّلة من ${kwRules.length}`, `${kwRules.filter(r => r.isEnabled).length} active out of ${kwRules.length}`) : tx(lang, "ردود ثابتة فورية على كلمات بعينها", "Instant fixed replies for specific keywords")}</p>
          </div>
          <Button className="bg-green-500 hover:bg-green-600 text-white gap-1.5 h-9 text-sm" onClick={() => openCreate("keywords")}><Plus className="w-4 h-4" /> {tx(lang, "كلمة جديدة", "New keyword")}</Button>
        </div>
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 mb-4 text-sm text-blue-700 dark:text-blue-300">
          <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <span>{tx(lang, "لما العميل يكتب الكلمة، البوت يرد فوراً تلقائياً بغض النظر عن أي حاجة تانية.", "When a customer sends the keyword, the bot replies instantly regardless of anything else.")}</span>
        </div>
        {kwRules.length === 0 ? (
          <EmptyState icon={<MessageSquare className="w-10 h-10 text-green-300" />} title={tx(lang, "لا توجد كلمات بعد", "No keywords yet")} desc={tx(lang, "أضف كلمة مفتاحية وردّها الثابت", "Add a keyword and its fixed reply")}
            action={<Button className="bg-green-500 hover:bg-green-600 text-white gap-2" onClick={() => openCreate("keywords")}><Plus className="w-4 h-4" /> {tx(lang, "أضف أول كلمة", "Add your first keyword")}</Button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kwRules.map(rule => (
              <RuleCard key={rule.id} rule={rule} lang={lang} onToggle={() => toggleRule(rule)} onEdit={() => openEdit(rule, "keywords")} onDelete={() => deleteRule(rule.id)} />
            ))}
          </div>
        )}
      </div>
    );

    if (activeSubTab === "welcome") return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{tx(lang, "رسالة الترحيب التلقائية", "Automatic welcome message")}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{tx(lang, "ترد تلقائياً على أول رسالة من أي عميل جديد", "Replies automatically to the first message from any new customer")}</p>
          </div>
          {welcomeRules.length === 0 && <Button className="bg-green-500 hover:bg-green-600 text-white gap-1.5 h-9 text-sm" onClick={() => openCreate("welcome")}><Plus className="w-4 h-4" /> {tx(lang, "إضافة ترحيب", "Add welcome")}</Button>}
        </div>
        <WelcomeInfo lang={lang} />
        <div className="mt-4">
          {welcomeRules.length === 0 ? (
            <EmptyState icon={<Hand className="w-10 h-10 text-green-300" />} title={tx(lang, "لا يوجد ترحيب تلقائي", "No automatic welcome yet")} desc={tx(lang, "أضف رسالة ترحيب تُرسل فور تواصل أي عميل جديد", "Add a welcome message sent as soon as any new customer contacts you")}
              action={<Button className="bg-green-500 hover:bg-green-600 text-white gap-2" onClick={() => openCreate("welcome")}><Plus className="w-4 h-4" /> {tx(lang, "إضافة رسالة الترحيب", "Add welcome message")}</Button>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {welcomeRules.map(rule => (
                <RuleCard key={rule.id} rule={rule} lang={lang} showKeyword={false} onToggle={() => toggleRule(rule)} onEdit={() => openEdit(rule, "welcome")} onDelete={() => deleteRule(rule.id)} />
              ))}
              {welcomeRules.length < 3 && (
                <button onClick={() => openCreate("welcome")}
                  className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 flex flex-col items-center gap-2 text-gray-400 hover:border-green-300 hover:text-green-500 transition-all">
                  <Plus className="w-6 h-6" /><span className="text-sm">{tx(lang, "إضافة رسالة ترحيب أخرى", "Add another welcome message")}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );

    if (activeSubTab === "smart_followup") return (
      <SmartFollowUpTab lang={lang} />
    );

    if (activeSubTab === "timebased") return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{tx(lang, "الأتمتة الزمنية", "Scheduled automation")}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{tx(lang, "إرسال قوالب في أوقات وأيام محددة أسبوعياً", "Send templates at specific times and days each week")}</p>
          </div>
          <Button className="bg-green-500 hover:bg-green-600 text-white gap-1.5 h-9 text-sm" onClick={() => openCreate("timebased")}><Plus className="w-4 h-4" /> {tx(lang, "جدولة جديدة", "New schedule")}</Button>
        </div>
        <OutboundWarning lang={lang} />

        {timeRules.length === 0 ? (
          <EmptyState icon={<CalendarClock className="w-10 h-10 text-purple-300" />} title={tx(lang, "لا توجد جدولة بعد", "No schedules yet")} desc={tx(lang, "أضف قاعدة لإرسال رسائل في وقت وأيام محددة", "Add a rule to send messages at a specific time and days")}
            action={<Button className="bg-green-500 hover:bg-green-600 text-white gap-2" onClick={() => openCreate("timebased")}><Plus className="w-4 h-4" /> {tx(lang, "إضافة جدولة", "Add schedule")}</Button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {timeRules.map(rule => {
              let schedLabel = "";
              try {
                const p = JSON.parse(rule.triggerValue ?? "{}");
                const daysAr = (p.days ?? []).map((d: string) => {
                  const day = DAYS_AR.find(x => x.key === d);
                  return day ? (lang === "ar" ? day.ar : day.en) : d;
                }).join(lang === "ar" ? "، " : ", ");
                const aud = audiences.find(a => a.id === p.audienceId);
                schedLabel = `${daysAr} — ${p.hour}:${p.minute}`;
                if (aud) schedLabel += ` · ${aud.name}`;
                if (p.maxContacts) schedLabel += lang === "ar"
                  ? ` (${p.maxContacts.toLocaleString()} كحد أقصى)`
                  : ` (${p.maxContacts.toLocaleString()} max)`;
              } catch { }
              return (
                <div key={rule.id} className={`bg-white dark:bg-gray-800 border rounded-2xl p-4 shadow-sm ${rule.isEnabled ? "border-gray-200 dark:border-gray-700" : "border-gray-100 dark:border-gray-700/50 opacity-60"}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${rule.isEnabled ? "bg-purple-50 text-purple-600" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}><CalendarClock className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{rule.name}</p>
                        {schedLabel && <p className="text-xs text-gray-400 mt-0.5">{schedLabel}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleRule(rule)} className={`transition-colors ${rule.isEnabled ? "text-green-500" : "text-gray-300"}`}>{rule.isEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}</button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><MoreVertical className="w-4 h-4" /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-36">
                          <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={() => openEdit(rule, "timebased")}><Edit2 className="w-4 h-4" /> {tx(lang, "تعديل", "Edit")}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-sm text-red-600 cursor-pointer focus:text-red-600" onClick={() => deleteRule(rule.id)}><Trash2 className="w-4 h-4" /> {tx(lang, "حذف", "Delete")}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {rule.templateId && <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg">{tx(lang, "قالب معتمد", "Approved template")}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );

    if (activeSubTab === "ab") return (
      <div>
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{tx(lang, "اختبار A/B للرسائل", "A/B test for messages")}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{tx(lang, "اختبر قالبين مختلفين على عينة عشوائية من جهات اتصالك", "Test two different templates on a random sample of your contacts")}</p>
        </div>
        <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 mb-5 text-sm text-blue-700 dark:text-blue-300">
          <FlaskConical className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <div>
            <p className="font-semibold mb-0.5">{tx(lang, "كيف يعمل", "How it works")}</p>
            <p className="text-xs leading-relaxed">{tx(lang, "يختار عشوائياً عدداً من جهات اتصالك ويقسّمهم بين نسختين، ثم يطلق حملتين منفصلتين. تتبّع النتائج في صفحة التقارير.", "It randomly selects a number of your contacts, splits them into two versions, and launches two separate campaigns. Track the results in the reports page.")}</p>
          </div>
        </div>
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 text-sm">{tx(lang, "إعدادات الاختبار", "Test settings")}</h4>
            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-1.5 block">{tx(lang, "اسم الاختبار", "Test name")} *</Label>
                <Input value={abForm.name} onChange={e => setAbForm(f => ({ ...f, name: e.target.value }))} placeholder={tx(lang, "مثال: اختبار عرض رمضان", "Example: Ramadan offer test")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "الجمهور المستهدف", "Target audience")} *</Label>
                  <Select value={abForm.audienceId} onValueChange={v => setAbForm(f => ({ ...f, audienceId: v }))}>
                    <SelectTrigger><SelectValue placeholder={tx(lang, "اختر جمهوراً...", "Choose an audience...")} /></SelectTrigger>
                    <SelectContent>
                      {audiences.map(a => <SelectItem key={a.id} value={a.id}>{a.name} {a._count ? `(${a._count.contacts})` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "حجم العينة", "Sample size")}</Label>
                  <Input type="number" min={10} max={10000} dir="ltr" value={abForm.sampleSize} onChange={e => setAbForm(f => ({ ...f, sampleSize: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block flex items-center justify-between">
                  <span>{tx(lang, "نسبة التقسيم — أ / ب", "Split ratio — A / B")}</span>
                  <span className="font-mono text-gray-500">{abForm.splitRatio}% / {100 - Number(abForm.splitRatio)}%</span>
                </Label>
                <input type="range" min="10" max="90" step="5" dir="ltr" value={abForm.splitRatio}
                  onChange={e => setAbForm(f => ({ ...f, splitRatio: e.target.value }))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-l from-amber-400 to-blue-400" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>10/90</span><span>50/50</span><span>90/10</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">A</div>
                <Input value={abForm.varAName} onChange={e => setAbForm(f => ({ ...f, varAName: e.target.value }))} className="font-semibold border-0 p-0 h-7 focus-visible:ring-0 bg-transparent dark:bg-transparent" />
              </div>
              <p className="text-xs text-gray-400 mb-2">{tx(lang, "القالب", "Template")}</p>
              <TemplatePicker templates={templates} value={abForm.varATemplate} onChange={v => setAbForm(f => ({ ...f, varATemplate: v }))} lang={lang} />
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">≈ {Math.round(Number(abForm.sampleSize) * Number(abForm.splitRatio) / 100)} {tx(lang, "جهة اتصال", "contacts")}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border-2 border-amber-200 dark:border-amber-700 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">B</div>
                <Input value={abForm.varBName} onChange={e => setAbForm(f => ({ ...f, varBName: e.target.value }))} className="font-semibold border-0 p-0 h-7 focus-visible:ring-0 bg-transparent dark:bg-transparent" />
              </div>
              <p className="text-xs text-gray-400 mb-2">{tx(lang, "القالب", "Template")}</p>
              <TemplatePicker templates={templates} value={abForm.varBTemplate} onChange={v => setAbForm(f => ({ ...f, varBTemplate: v }))} lang={lang} />
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">≈ {Math.round(Number(abForm.sampleSize) * (100 - Number(abForm.splitRatio)) / 100)} {tx(lang, "جهة اتصال", "contacts")}</p>
            </div>
          </div>

          <Button onClick={launchABTest} disabled={launchingAb}
            className="w-full bg-green-500 hover:bg-green-600 text-white gap-2 py-6 text-base font-semibold shadow-lg">
            {launchingAb ? <Loader2 className="w-5 h-5 animate-spin" /> : <FlaskConical className="w-5 h-5" />}
            {launchingAb ? tx(lang, "جاري إطلاق الاختبار...", "Launching the test...") : tx(lang, "إطلاق اختبار A/B", "Launch A/B test")}
          </Button>
        </div>
      </div>
    );

    return null;
  };

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto" dir={dir}>

      {/* Main Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-8 w-fit">
        {(["automation", "ai"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              if (tab === "ai" && !isEnterprise) {
                showLockToast(aiLockMsg);
                return;
              }
              setActiveTab(tab);
            }}
            onPointerDown={() => {
              if (tab === "ai" && !isEnterprise) showLockToast(aiLockMsg);
            }}
            onMouseEnter={() => {
              if (tab === "ai" && !isEnterprise) showLockToast(aiLockMsg);
            }}
            title={tab === "ai" && !isEnterprise ? aiLockMsg : undefined}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${tab === "ai" && !isEnterprise
                ? "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-70"
                : activeTab === tab
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}>
            {tab === "automation" ? <LayoutGrid className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {tab === "automation" ? tx(lang, "الأتمتة", "Automation") : tx(lang, "الذكاء الاصطناعي", "AI")}
            {tab === "ai" && !isEnterprise && <span className="text-[10px]">🔒</span>}
            {tab === "ai" && agent.isEnabled && <span className="w-2 h-2 rounded-full bg-green-500" />}
          </button>
        ))}
      </div>

      {/* Automation Tab */}
      {activeTab === "automation" && (
        <>
          {/* Inner sub-tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-6">
            {subTabs.map(st => {
              // smart_followup و timebased و ab — pro فأعلى فقط
              const needsPro = st.id === "smart_followup" || st.id === "timebased" || st.id === "ab";
              const isLocked = needsPro && !isProOrAbove;
              return (
                <button key={st.id}
                  onClick={() => {
                    if (isLocked) {
                      showLockToast(proLockMsg);
                      return;
                    }
                    setActiveSubTab(st.id);
                  }}
                  onPointerDown={() => {
                    if (isLocked) showLockToast(proLockMsg);
                  }}
                  onMouseEnter={() => {
                    if (isLocked) showLockToast(proLockMsg);
                  }}
                  title={isLocked ? proLockMsg : undefined}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0
                    ${isLocked
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-60"
                      : activeSubTab === st.id
                        ? "bg-green-500 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}>
                  <st.icon className="w-3.5 h-3.5" />
                  {lang === "ar" ? st.ar : st.en}
                  {isLocked && <span className="text-[10px]">🔒</span>}
                  {!isLocked && badgeCount[st.id] > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeSubTab === st.id ? "bg-white/20 text-white" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"}`}>
                      {badgeCount[st.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {renderSubTab()}
        </>
      )}

      {/* AI Tab — unchanged */}
      {activeTab === "ai" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tx(lang, "وكيل الذكاء الاصطناعي", "AI Agent")}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{tx(lang, "يرد على أي رسالة مش عندها كلمة مفتاحية", "Replies to messages that don't match keyword rules")}</p>
            </div>
            <button onClick={() => updateAgent({ isEnabled: !agent.isEnabled })}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm transition-all
                ${agent.isEnabled ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"}`}>
              {agent.isEnabled ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
              {agent.isEnabled ? tx(lang, "مفعّل", "Enabled") : tx(lang, "معطّل", "Disabled")}
            </button>
          </div>
          <div className="space-y-5">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"><Bot className="w-4 h-4 text-purple-500" /> {tx(lang, "مزوّد الذكاء الاصطناعي", "AI provider")}</h3>
              <div className="grid grid-cols-2 gap-3">
                {(["gemini", "openai"] as const).map(p => (
                  <button key={p} onClick={() => updateAgent({ provider: p })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-right ${agent.provider === p ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${agent.provider === p ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>{p === "gemini" ? "G" : "AI"}</div>
                    <div>
                      <p className={`font-semibold text-sm ${agent.provider === p ? "text-purple-800 dark:text-purple-200" : "text-gray-700 dark:text-gray-300"}`}>{p === "gemini" ? "Google Gemini" : "ChatGPT (GPT-4o mini)"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p === "gemini" ? tx(lang, "سريع وسيرش قوي", "Fast and strong") : tx(lang, "دقيق وقوي", "Accurate and powerful")}</p>
                    </div>
                    {agent.provider === p && <CheckCircle className="w-4 h-4 text-purple-500 mr-auto" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" /> {tx(lang, "بيانات البراند", "Brand details")}
                <span className="text-xs font-normal text-gray-400">{tx(lang, "(بتتبعت للـ AI عشان يعرف يرد)", "(Used by the AI so it can reply properly)")}</span>
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm mb-1.5 block">{tx(lang, "اسم البراند", "Brand name")}</Label>
                    <Input value={agent.brandName} onChange={e => updateAgent({ brandName: e.target.value })} placeholder={tx(lang, "مثال: متجر الأناقة", "Example: Elegance Store")} />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">{tx(lang, "ساعات العمل", "Working hours")}</Label>
                    <Input value={agent.workingHours} onChange={e => updateAgent({ workingHours: e.target.value })} placeholder={tx(lang, "مثال: 9 ص – 10 م", "Example: 9 AM – 10 PM")} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "وصف النشاط", "Business description")} <span className="text-red-500">*</span></Label>
                  <Textarea value={agent.businessDesc} onChange={e => updateAgent({ businessDesc: e.target.value })} placeholder={tx(lang, "مثال: نحن متجر ملابس نسائية، نوفر شحن سريع لجميع محافظات مصر", "Example: We are a women's clothing store and offer fast shipping across all regions")} className="min-h-[80px] resize-none text-sm" dir="rtl" />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "المنتجات والخدمات", "Products and services")}</Label>
                  <Textarea value={agent.productsInfo} onChange={e => updateAgent({ productsInfo: e.target.value })} placeholder={tx(lang, "مثال: فساتين سهرة، عبايات، ملابس كاجوال", "Example: evening dresses, abayas, casual wear")} className="min-h-[60px] resize-none text-sm" dir="rtl" />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "الأسعار", "Pricing")}</Label>
                  <Textarea value={agent.pricingInfo} onChange={e => updateAgent({ pricingInfo: e.target.value })} placeholder={tx(lang, "مثال: الأسعار من 200 لـ 2000 جنيه، الشحن 60 جنيه", "Example: Prices start from 200 to 2000 EGP, shipping 60 EGP")} className="min-h-[60px] resize-none text-sm" dir="rtl" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{tx(lang, "إعدادات متقدمة", "Advanced settings")}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm mb-1.5 block">{tx(lang, "لهجة الرد", "Reply tone")}</Label>
                    <Select value={agent.tone} onValueChange={v => updateAgent({ tone: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">{tx(lang, "ودود وقريب", "Friendly and warm")}</SelectItem>
                        <SelectItem value="formal">{tx(lang, "رسمي ومهني", "Formal and professional")}</SelectItem>
                        <SelectItem value="egyptian">{tx(lang, "عامية مصرية", "Egyptian colloquial")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">{tx(lang, "وقف الرد بعد ردك (دقائق)", "Pause replies after your reply (minutes)")}</Label>
                    <Input type="number" min={1} max={1440} dir="ltr" value={agent.pauseMinutes} onChange={e => updateAgent({ pauseMinutes: Number(e.target.value) || 10 })} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "System Prompt إضافي (اختياري)", "Additional System Prompt (optional)")}</Label>
                  <Textarea value={agent.systemPrompt} onChange={e => updateAgent({ systemPrompt: e.target.value })} placeholder={tx(lang, "مثال: لا تذكر المنافسين. لو سألوا عن التوصيل الدولي قول مش متاح.", "Example: Do not mention competitors. If they ask about international delivery, say it is not available.")} className="min-h-[80px] resize-none text-sm" dir="rtl" />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-sm mb-1.5 block">{tx(lang, "وضع اللغة", "Language mode")}</Label>
                    <Select value={agent.languageMode} onValueChange={v => updateAgent({ languageMode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">{tx(lang, "تلقائي (حسب لغة العميل)", "Automatic (based on customer language)")}</SelectItem>
                        <SelectItem value="ar">{tx(lang, "دايمًا عربي", "Always Arabic")}</SelectItem>
                        <SelectItem value="en">{tx(lang, "English always", "English always")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">{tx(lang, "رابط الموقع (اختياري)", "Website link (optional)")}</Label>
                    <Input value={agent.websiteUrl} onChange={e => updateAgent({ websiteUrl: e.target.value })} placeholder="https://example.com" dir="ltr" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "نص الزرار (اختياري)", "Button text (optional)")}</Label>
                  <Input value={agent.websiteButtonText} onChange={e => updateAgent({ websiteButtonText: e.target.value })} placeholder={tx(lang, "تصفح المنتجات", "Browse products")} />
                </div>
              </div>
            </div>
            <Button
              className={`w-full text-white gap-2 py-6 text-base font-semibold transition-all duration-300
                ${agentSaved && !agentDirty ? "bg-green-500 hover:bg-green-600 shadow-[0_0_22px_rgba(34,197,94,0.6)]" : "bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_24px_rgba(16,185,129,0.65)]"}`}
              onClick={saveAgent} disabled={savingAgent || !agentDirty}>
              {savingAgent ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {savingAgent ? tx(lang, "جاري الحفظ...", "Saving...") : agentDirty ? tx(lang, "حفظ الإعدادات", "Save settings") : tx(lang, "تم الحفظ", "Saved")}
            </Button>

            {/* ElevenLabs Voice Agent */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">ElevenLabs Voice Agent</h3>
                    <p className="text-xs text-gray-400">{tx(lang, "كل يوزر بـ Agent بصوته هو — التحاسب عليهم برا", "Each user can use their own ElevenLabs voice agent")}</p>
                  </div>
                </div>
                <button onClick={() => updateAgent({ elevenLabsEnabled: !agent.elevenLabsEnabled })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all
                    ${agent.elevenLabsEnabled
                      ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                  {agent.elevenLabsEnabled ? <ToggleRight className="w-4 h-4 text-purple-500" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                  {agent.elevenLabsEnabled ? tx(lang, "مفعّل", "Enabled") : tx(lang, "معطّل", "Disabled")}
                </button>
              </div>

              {agent.elevenLabsEnabled && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl p-3 text-xs text-purple-700 dark:text-purple-300">
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {tx(lang, "اعمل Agent على ElevenLabs وحط الـ API Key والـ Agent ID هنا. لما تفعّل Voice Agent في محادثة معينة، هيرد بصوت الـ Agent على كل الرسائل.", "Create an Agent in ElevenLabs and place the API Key and Agent ID here. When you enable Voice Agent in a specific conversation, it will reply with the Agent's voice to all messages.")}
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">ElevenLabs API Key *</Label>
                    <Input
                      type="password"
                      value={agent.elevenLabsApiKey}
                      onChange={e => updateAgent({ elevenLabsApiKey: e.target.value })}
                      placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Agent ID *</Label>
                    <Input
                      value={agent.elevenLabsAgentId}
                      onChange={e => updateAgent({ elevenLabsAgentId: e.target.value })}
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {tx(lang, "من ElevenLabs Dashboard → Conversational AI → Agent → Copy ID", "From ElevenLabs Dashboard → Conversational AI → Agent → Copy ID")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Dialog — shared for keyword / welcome / noreply / timebased */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md" dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {dialogMode === "keywords" && <><Key className="w-5 h-5 text-green-500" /> {editTarget ? tx(lang, "تعديل الكلمة", "Edit keyword") : tx(lang, "كلمة مفتاحية جديدة", "New keyword")}</>}
              {dialogMode === "welcome" && <><Hand className="w-5 h-5 text-green-500" /> {editTarget ? tx(lang, "تعديل رسالة الترحيب", "Edit welcome message") : tx(lang, "رسالة ترحيب جديدة", "New welcome message")}</>}
              {dialogMode === "timebased" && <><CalendarClock className="w-5 h-5 text-purple-500" /> {editTarget ? tx(lang, "تعديل الجدولة", "Edit schedule") : tx(lang, "جدولة زمنية جديدة", "New schedule")}</>}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "keywords" && tx(lang, "لما العميل يكتب الكلمة دي، البوت يرد فوراً", "When the customer sends this keyword, the bot replies instantly")}
              {dialogMode === "welcome" && tx(lang, "ترسل تلقائياً على أول رسالة من عميل جديد", "Sent automatically on the first message from a new customer")}
              {dialogMode === "timebased" && tx(lang, "ترسل قالباً في وقت وأيام محددة أسبوعياً", "Sends a template at selected weekly time slots")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-1.5 block">{tx(lang, "اسم القاعدة", "Rule name")} *</Label>
              <Input value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} placeholder={tx(lang, "مثال: رد السعر", "e.g. Price reply")} />
            </div>

            {dialogMode === "keywords" && (
              <>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "الكلمة المفتاحية", "Keyword")} *</Label>
                  <Input value={ruleForm.keyword} onChange={e => setRuleForm(f => ({ ...f, keyword: e.target.value }))} placeholder={tx(lang, "مثال: سعر", "Example: price")} dir="rtl" />
                  <p className="text-xs text-gray-400 mt-1">{tx(lang, "يُفعَّل لو الرسالة فيها الكلمة في أي مكان", "It activates if the message contains the keyword anywhere")}</p>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "نص الرد", "Reply text")} *</Label>
                  <Textarea value={ruleForm.reply} onChange={e => setRuleForm(f => ({ ...f, reply: e.target.value }))} placeholder={tx(lang, "اكتب الرد اللي هيتبعت تلقائياً...", "Write the reply that will be sent automatically...")} className="min-h-[100px] resize-none text-sm" dir="rtl" />
                </div>

                <div>
                  <Label className="text-sm mb-1.5 block flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                    {tx(lang, "صورة مرفقة", "Attached image")} <span className="text-gray-400 font-normal text-xs">{tx(lang, "(اختياري)", "(optional)")}</span>
                  </Label>
                  {ruleForm.replyMediaUrl ? (
                    <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                      <img src={ruleForm.replyMediaUrl} alt="preview" className="w-full max-h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => setRuleForm(f => ({ ...f, replyMediaUrl: "" }))}
                        className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      ><X className="w-3 h-3" /></button>
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">{tx(lang, "صورة مرفقة", "Attached image")} ✓</div>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition
                      ${mediaUploading ? "border-blue-300 bg-blue-50 dark:bg-blue-900/10" : "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"}`}>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); e.target.value = ""; }} />
                      {mediaUploading
                        ? <><Loader2 className="w-5 h-5 text-blue-500 animate-spin mb-1" /><span className="text-xs text-blue-500">{tx(lang, "جاري الرفع...", "Uploading...")}</span></>
                        : <><ImageIcon className="w-5 h-5 text-gray-400 mb-1" /><span className="text-xs text-gray-400">{tx(lang, "اضغط لرفع صورة (JPG/PNG/WebP — max 5MB)", "Click to upload an image (JPG/PNG/WebP — max 5MB)")}</span></>}
                    </label>
                  )}
                  {ruleForm.replyMediaUrl && ruleForm.reply && (
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" /> {tx(lang, "النص هيظهر كـ caption تحت الصورة في واتساب", "The text will appear as a caption under the image in WhatsApp")}
                    </p>
                  )}
                </div>
              </>
            )}

            {dialogMode === "welcome" && (
              <>
                <WelcomeInfo lang={lang} />
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "نص رسالة الترحيب", "Welcome message text")} *</Label>
                  <Textarea value={ruleForm.reply} onChange={e => setRuleForm(f => ({ ...f, reply: e.target.value }))} placeholder={tx(lang, "مثال: أهلاً وسهلاً! 👋 نورت متجرنا. كيف يمكنني مساعدتك؟", "Example: Welcome! 👋 Thank you for reaching our store. How can I help you?")} className="min-h-[120px] resize-none text-sm" dir="rtl" />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                    {tx(lang, "صورة مرفقة", "Attached image")} <span className="text-gray-400 font-normal text-xs">{tx(lang, "(اختياري)", "(optional)")}</span>
                  </Label>
                  {ruleForm.replyMediaUrl ? (
                    <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                      <img src={ruleForm.replyMediaUrl} alt="preview" className="w-full max-h-40 object-cover" />
                      <button type="button" onClick={() => setRuleForm(f => ({ ...f, replyMediaUrl: "" }))}
                        className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition
                      ${mediaUploading ? "border-blue-300 bg-blue-50" : "border-gray-200 dark:border-gray-700 hover:border-blue-300"}`}>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); e.target.value = ""; }} />
                      {mediaUploading
                        ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        : <><ImageIcon className="w-5 h-5 text-gray-400 mb-1" /><span className="text-xs text-gray-400">{tx(lang, "رفع صورة (اختياري)", "Upload image (optional)")}</span></>}
                    </label>
                  )}
                </div>
              </>
            )}

            {dialogMode === "timebased" && (
              <>
                <OutboundWarning lang={lang} />
                <div>
                  <Label className="text-sm mb-2 block">{tx(lang, "أيام الإرسال", "Send days")} *</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_AR.map(d => (
                      <button key={d.key} onClick={() => toggleDay(d.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${ruleForm.days.includes(d.key) ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200"}`}>
                        {lang === "ar" ? d.ar : d.en}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "وقت الإرسال", "Send time")}</Label>
                  <div className="flex items-center gap-2">
                    <Select value={ruleForm.hour} onValueChange={v => setRuleForm(f => ({ ...f, hour: v }))}>
                      <SelectTrigger className="w-20 font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                    <span className="text-gray-400 font-bold">:</span>
                    <Select value={ruleForm.minute} onValueChange={v => setRuleForm(f => ({ ...f, minute: v }))}>
                      <SelectTrigger className="w-20 font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent>{["00", "15", "30", "45"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "الجمهور المستهدف", "Target audience")} *</Label>
                  <Select value={ruleForm.tbAudienceId} onValueChange={v => setRuleForm(f => ({ ...f, tbAudienceId: v }))}>
                    <SelectTrigger><SelectValue placeholder={tx(lang, "اختر جمهوراً...", "Choose an audience...")} /></SelectTrigger>
                    <SelectContent>
                      {audiences.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} {a._count ? `(${a._count.contacts} ${tx(lang, "جهة اتصال", "contacts")})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block flex items-center justify-between">
                    <span>{tx(lang, "الحد الأقصى لعدد المُرسَل إليهم", "Maximum recipients")} *</span>
                    {ruleForm.tbAudienceId && (() => {
                      const aud = audiences.find(a => a.id === ruleForm.tbAudienceId);
                      const total = aud?._count?.contacts ?? 0;
                      return total > 0 ? <span className="text-xs text-gray-400 font-normal">{tx(lang, "إجمالي الجمهور", "Total audience")}: {total.toLocaleString()}</span> : null;
                    })()}
                  </Label>
                  <Input type="number" min={1} max={100000} dir="ltr"
                    value={ruleForm.tbMaxContacts}
                    onChange={e => setRuleForm(f => ({ ...f, tbMaxContacts: e.target.value }))}
                    placeholder={tx(lang, "مثال: 500", "Example: 500")} />
                  <p className="text-xs text-gray-400 mt-1">
                    {tx(lang, "لو الجمهور أكبر من العدد ده، يتاختار منهم عشوائياً", "If the audience is larger than this number, contacts will be selected randomly")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "القالب المعتمد", "Approved template")} *</Label>
                  <TemplatePicker templates={templates} value={ruleForm.templateId} onChange={v => setRuleForm(f => ({ ...f, templateId: v }))} lang={lang} />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowDialog(false)}>{tx(lang, "إلغاء", "Cancel")}</Button>
            <div className="flex-1" />
            <Button className="bg-green-500 hover:bg-green-600 text-white gap-1.5" onClick={saveRule} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {editTarget ? tx(lang, "حفظ التعديلات", "Save changes") : tx(lang, "إضافة", "Add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}