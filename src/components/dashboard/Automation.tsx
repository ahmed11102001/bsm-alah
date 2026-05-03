"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
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
  Zap, Plus, MoreVertical, Trash2, Edit2, Loader2,
  MessageSquare, Users, Clock, Bot, Key, CheckCircle,
  ChevronRight, ChevronLeft, ToggleLeft, ToggleRight,
  AlertCircle, X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TriggerType = "KEYWORD" | "FIRST_MESSAGE" | "NO_REPLY" | "TIME_BASED";
type ReplyType   = "TEXT" | "TEMPLATE" | "AI";

interface AutomationRule {
  id:                string;
  name:              string;
  isEnabled:         boolean;
  triggerType:       TriggerType;
  triggerValue:      string | null;
  replyType:         ReplyType;
  replyContent:      string | null;
  templateId:        string | null;
  extraInstructions: string | null;
  humanKeywords:     string[];
  pauseOnReply:      boolean;
  createdAt:         string;
}

interface Template { id: string; name: string; status: string; }

// ─── Config maps ──────────────────────────────────────────────────────────────
const TRIGGER_CONFIG: Record<TriggerType, { label: string; icon: React.ReactNode; desc: string }> = {
  KEYWORD:       { label: "كلمة مفتاحية",     icon: <Key className="w-5 h-5" />,   desc: "يُشغَّل عندما تحتوي الرسالة الواردة على كلمة محددة" },
  FIRST_MESSAGE: { label: "أول رسالة",         icon: <Users className="w-5 h-5" />, desc: "يُشغَّل عندما يتواصل عميل جديد لأول مرة" },
  NO_REPLY:      { label: "بدون رد (متابعة)",  icon: <Clock className="w-5 h-5" />, desc: "يُشغَّل بعد X أيام من آخر رسالة بدون رد" },
  TIME_BASED:    { label: "وقت محدد",          icon: <Clock className="w-5 h-5" />, desc: "قريباً" },
};

const REPLY_CONFIG: Record<ReplyType, { label: string; icon: React.ReactNode; desc: string }> = {
  TEXT:     { label: "نص ثابت",     icon: <MessageSquare className="w-5 h-5" />, desc: "رد بنص تكتبه أنت بالكامل" },
  TEMPLATE: { label: "قالب واتساب", icon: <CheckCircle className="w-5 h-5" />,   desc: "رد باستخدام أحد قوالب واتساب المعتمدة" },
  AI:       { label: "رد ذكي AI",   icon: <Bot className="w-5 h-5" />,            desc: "يرد Gemini تلقائياً بناءً على بيانات براندك" },
};

// ─── Empty form ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name:              "",
  triggerType:       "" as TriggerType | "",
  triggerValue:      "",
  replyType:         "" as ReplyType | "",
  replyContent:      "",
  templateId:        "",
  extraInstructions: "",
  humanKeywords:     [] as string[],
  humanKwInput:      "",
  pauseOnReply:      true,
};

// ─── Rule Card ────────────────────────────────────────────────────────────────
function RuleCard({ rule, onToggle, onEdit, onDelete }: {
  rule: AutomationRule;
  onToggle: () => void;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const trigger = TRIGGER_CONFIG[rule.triggerType];
  const reply   = REPLY_CONFIG[rule.replyType];

  return (
    <div className={`bg-white border rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-all
      ${rule.isEnabled ? "border-gray-200 hover:shadow-md" : "border-gray-100 opacity-60"}`}>

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
            ${rule.isEnabled ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{rule.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(rule.createdAt).toLocaleDateString("ar-EG")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggle}
            className={`transition-colors ${rule.isEnabled ? "text-green-500" : "text-gray-300"}`}
          >
            {rule.isEnabled
              ? <ToggleRight className="w-8 h-8" />
              : <ToggleLeft className="w-8 h-8" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={onEdit}>
                <Edit2 className="w-4 h-4" /> تعديل
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-sm text-red-600 cursor-pointer focus:text-red-600"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" /> حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg font-medium">
          {trigger.icon}
          {trigger.label}
          {rule.triggerValue && ` "${rule.triggerValue}"`}
        </span>
        <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
        <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-lg font-medium">
          {reply.icon}
          {reply.label}
        </span>
      </div>

      {rule.humanKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[10px] text-gray-400">تحويل بشري:</span>
          {rule.humanKeywords.map(kw => (
            <span key={kw} className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md font-mono">
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
            ${i + 1 < current  ? "bg-green-500 text-white"
            : i + 1 === current ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-400"}`}>
            {i + 1 < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-8 transition-colors ${i + 1 < current ? "bg-green-400" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Automation() {
  const [rules,      setRules]      = useState<AutomationRule[]>([]);
  const [templates,  setTemplates]  = useState<Template[]>([]);
  const [hasBrand,   setHasBrand]   = useState<boolean | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editTarget, setEditTarget] = useState<AutomationRule | null>(null);
  const [step,       setStep]       = useState(1);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });

  // ── load ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, settingsRes, templatesRes] = await Promise.all([
        fetch("/api/automation"),
        fetch("/api/me/settings"),
        fetch("/api/templates"),
      ]);
      const rulesData    = await rulesRes.json();
      const settingsData = await settingsRes.json();
      const tplData      = await templatesRes.json();

      setRules(Array.isArray(rulesData) ? rulesData : []);
      setHasBrand(!!settingsData?.user?.businessDesc?.trim());
      setTemplates(
        (Array.isArray(tplData) ? tplData : tplData?.templates ?? [])
          .filter((t: Template) => t.status === "APPROVED")
      );
    } catch { toast.error("خطأ في تحميل البيانات"); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── open wizard ─────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setStep(1);
    setShowWizard(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setEditTarget(rule);
    setForm({
      name:              rule.name,
      triggerType:       rule.triggerType,
      triggerValue:      rule.triggerValue ?? "",
      replyType:         rule.replyType,
      replyContent:      rule.replyContent ?? "",
      templateId:        rule.templateId ?? "",
      extraInstructions: rule.extraInstructions ?? "",
      humanKeywords:     rule.humanKeywords,
      humanKwInput:      "",
      pauseOnReply:      rule.pauseOnReply,
    });
    setStep(1);
    setShowWizard(true);
  };

  // ── toggle ──────────────────────────────────────────────────────
  const toggleRule = async (rule: AutomationRule) => {
    try {
      await fetch("/api/automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, isEnabled: !rule.isEnabled }),
      });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r));
    } catch { toast.error("خطأ في التحديث"); }
  };

  // ── delete ──────────────────────────────────────────────────────
  const deleteRule = async (id: string) => {
    try {
      const r = await fetch("/api/automation", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error();
      toast.success("تم الحذف");
      setRules(prev => prev.filter(r => r.id !== id));
    } catch { toast.error("خطأ في الحذف"); }
  };

  // ── save ────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name:              form.name.trim(),
        triggerType:       form.triggerType,
        triggerValue:      form.triggerValue.trim() || null,
        replyType:         form.replyType,
        replyContent:      form.replyContent.trim() || null,
        templateId:        form.templateId || null,
        extraInstructions: form.extraInstructions.trim() || null,
        humanKeywords:     form.humanKeywords,
        pauseOnReply:      form.pauseOnReply,
      };

      const url    = "/api/automation";
      const method = editTarget ? "PATCH" : "POST";
      const body   = editTarget ? JSON.stringify({ id: editTarget.id, ...payload }) : JSON.stringify(payload);

      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);

      if (editTarget) {
        toast.success("تم التعديل");
        setRules(prev => prev.map(r => r.id === editTarget.id ? d : r));
      } else {
        toast.success("تم إنشاء القاعدة");
        setRules(prev => [...prev, d]);
      }
      setShowWizard(false);
    } catch (e: any) {
      toast.error(e.message ?? "خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  // ── step validation ─────────────────────────────────────────────
  const canGoNext = () => {
    if (step === 1) return !!form.name.trim() && !!form.triggerType;
    if (step === 2) {
      if (form.triggerType === "KEYWORD" && !form.triggerValue.trim()) return false;
      if (form.triggerType === "NO_REPLY" && (!form.triggerValue || isNaN(Number(form.triggerValue)))) return false;
      return true;
    }
    if (step === 3) {
      if (!form.replyType) return false;
      if (form.replyType === "TEXT" && !form.replyContent.trim()) return false;
      if (form.replyType === "TEMPLATE" && !form.templateId) return false;
      return true;
    }
    return true;
  };

  // ── render ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <Loader2 className="w-10 h-10 animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto" dir="rtl">

      {/* Brand warning */}
      {hasBrand === false && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">بيانات البراند غير مكتملة</p>
            <p className="text-xs text-amber-600 mt-0.5">
              لاستخدام الرد الذكي بالـ AI يجب إدخال وصف نشاطك في{" "}
              <a href="/dashboard?tab=settings" className="underline font-medium">إعدادات البراند</a>.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">الأتمتة الذكية</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {rules.length > 0
              ? `${rules.filter(r => r.isEnabled).length} قاعدة مفعّلة من ${rules.length}`
              : "لا توجد قواعد بعد"}
          </p>
        </div>
        <Button
          className="bg-green-500 hover:bg-green-600 text-white gap-1.5 text-sm"
          onClick={openCreate}
        >
          <Plus className="w-4 h-4" /> قاعدة جديدة
        </Button>
      </div>

      {/* Empty state */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center mb-5">
            <Zap className="w-10 h-10 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">لا توجد قواعد أتمتة بعد</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xs">
            أنشئ أول قاعدة لترد تلقائياً على عملائك دون تدخل يدوي
          </p>
          <Button className="bg-green-500 hover:bg-green-600 text-white gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> إنشاء أول قاعدة
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => toggleRule(rule)}
              onEdit={() => openEdit(rule)}
              onDelete={() => deleteRule(rule.id)}
            />
          ))}
        </div>
      )}

      {/* ══ WIZARD ══════════════════════════════════════════════════ */}
      <Dialog open={showWizard} onOpenChange={v => { if (!v) setShowWizard(false); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editTarget ? "تعديل القاعدة" : "قاعدة أتمتة جديدة"}
            </DialogTitle>
            <DialogDescription>
              {["اسم ونوع المُشغِّل", "تفاصيل المُشغِّل", "نوع الرد", "إعدادات متقدمة"][step - 1]}
            </DialogDescription>
          </DialogHeader>

          <Steps current={step} total={4} />

          {/* Step 1 — Name + Trigger type */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm mb-1.5 block">اسم القاعدة *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: ترحيب بالعملاء الجدد"
                />
              </div>
              <div>
                <Label className="text-sm mb-2 block">متى تُشغَّل هذه القاعدة؟ *</Label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.entries(TRIGGER_CONFIG) as [TriggerType, (typeof TRIGGER_CONFIG)[TriggerType]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      disabled={key === "TIME_BASED"}
                      onClick={() => setForm(f => ({ ...f, triggerType: key, triggerValue: "" }))}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-right transition-all
                        ${form.triggerType === key ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-gray-300 bg-white"}
                        ${key === "TIME_BASED" ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                        ${form.triggerType === key ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 text-right">
                        <p className={`text-sm font-semibold ${form.triggerType === key ? "text-green-800" : "text-gray-700"}`}>
                          {cfg.label}
                          {key === "TIME_BASED" && <span className="text-xs font-normal text-gray-400 mr-1">(قريباً)</span>}
                        </p>
                        <p className="text-xs text-gray-400">{cfg.desc}</p>
                      </div>
                      {form.triggerType === key && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Trigger details */}
          {step === 2 && (
            <div className="space-y-4">
              {form.triggerType === "KEYWORD" && (
                <div>
                  <Label className="text-sm mb-1.5 block">الكلمة المفتاحية *</Label>
                  <Input
                    dir="rtl"
                    value={form.triggerValue}
                    onChange={e => setForm(f => ({ ...f, triggerValue: e.target.value }))}
                    placeholder="مثال: سعر"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    سيُفعَّل هذا الرد عندما تحتوي أي رسالة واردة على هذه الكلمة
                  </p>
                </div>
              )}
              {form.triggerType === "FIRST_MESSAGE" && (
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <Users className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">ترحيب تلقائي بالعملاء الجدد</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      سيُرسَل الرد تلقائياً عندما تصلك أول رسالة من عميل لم يتواصل معك من قبل.
                      لا يحتاج هذا المُشغِّل إلى إعداد إضافي.
                    </p>
                  </div>
                </div>
              )}
              {form.triggerType === "NO_REPLY" && (
                <div>
                  <Label className="text-sm mb-1.5 block">عدد الأيام بدون رد *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      dir="ltr"
                      type="number"
                      min={1} max={365}
                      value={form.triggerValue}
                      onChange={e => setForm(f => ({ ...f, triggerValue: e.target.value }))}
                      placeholder="3"
                      className="w-28 text-center font-mono"
                    />
                    <span className="text-sm text-gray-500">أيام</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    سيُرسَل رسالة متابعة بعد هذه المدة من آخر رسالة بدون رد من العميل
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Reply type + content */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">نوع الرد *</Label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.entries(REPLY_CONFIG) as [ReplyType, (typeof REPLY_CONFIG)[ReplyType]][]).map(([key, cfg]) => {
                    const disabled = key === "AI" && !hasBrand;
                    return (
                      <button
                        key={key}
                        disabled={disabled}
                        onClick={() => setForm(f => ({ ...f, replyType: key }))}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-right transition-all
                          ${form.replyType === key ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-gray-300 bg-white"}
                          ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                          ${form.replyType === key ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 text-right">
                          <p className={`text-sm font-semibold ${form.replyType === key ? "text-green-800" : "text-gray-700"}`}>
                            {cfg.label}
                            {disabled && <span className="text-xs font-normal text-amber-600 mr-1">(يتطلب بيانات البراند)</span>}
                          </p>
                          <p className="text-xs text-gray-400">{cfg.desc}</p>
                        </div>
                        {form.replyType === key && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.replyType === "TEXT" && (
                <div>
                  <Label className="text-sm mb-1.5 block">نص الرد *</Label>
                  <Textarea
                    value={form.replyContent}
                    onChange={e => setForm(f => ({ ...f, replyContent: e.target.value }))}
                    placeholder="اكتب الرد الذي سيُرسَل تلقائياً..."
                    className="min-h-[100px] resize-none text-sm"
                    dir="rtl"
                  />
                </div>
              )}

              {form.replyType === "TEMPLATE" && (
                <div>
                  <Label className="text-sm mb-1.5 block">اختر القالب *</Label>
                  {templates.length === 0 ? (
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 text-sm text-gray-500">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      لا توجد قوالب معتمدة. أضف قوالب من تاب القوالب أولاً.
                    </div>
                  ) : (
                    <Select value={form.templateId} onValueChange={v => setForm(f => ({ ...f, templateId: v }))}>
                      <SelectTrigger><SelectValue placeholder="اختر قالباً..." /></SelectTrigger>
                      <SelectContent>
                        {templates.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {form.replyType === "AI" && (
                <div>
                  <Label className="text-sm mb-1.5 block">تعليمات إضافية للـ AI (اختياري)</Label>
                  <Textarea
                    value={form.extraInstructions}
                    onChange={e => setForm(f => ({ ...f, extraInstructions: e.target.value }))}
                    placeholder="مثال: ركّز فقط على عروض رمضان في هذه القاعدة..."
                    className="min-h-[80px] resize-none text-sm"
                    dir="rtl"
                  />
                  <p className="text-xs text-gray-400 mt-1">بيانات براندك من الإعدادات ستُضاف تلقائياً</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Advanced */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Human keywords */}
              <div>
                <Label className="text-sm mb-1.5 block">كلمات التحويل للبشري</Label>
                <p className="text-xs text-gray-400 mb-2">
                  لو العميل كتب أي كلمة من دول، الأتمتة بتوقف فوراً وبيوصلك إشعار
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={form.humanKwInput}
                    onChange={e => setForm(f => ({ ...f, humanKwInput: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === "Enter" && form.humanKwInput.trim()) {
                        setForm(f => ({ ...f, humanKeywords: [...f.humanKeywords, f.humanKwInput.trim()], humanKwInput: "" }));
                      }
                    }}
                    placeholder="مثال: شكوى"
                    className="flex-1 text-sm"
                  />
                  <Button size="sm" variant="outline"
                    onClick={() => {
                      if (!form.humanKwInput.trim()) return;
                      setForm(f => ({ ...f, humanKeywords: [...f.humanKeywords, f.humanKwInput.trim()], humanKwInput: "" }));
                    }}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {form.humanKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.humanKeywords.map((kw, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-lg">
                        {kw}
                        <button onClick={() => setForm(f => ({ ...f, humanKeywords: f.humanKeywords.filter((_, j) => j !== i) }))}>
                          <X className="w-3 h-3 hover:text-red-800" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Pause on reply */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">وقف الأتمتة عند الرد اليدوي</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    لو أنت ردّيت يدوياً، الأتمتة بتوقف لمدة 24 ساعة
                  </p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, pauseOnReply: !f.pauseOnReply }))}
                  className={`transition-colors ${form.pauseOnReply ? "text-green-500" : "text-gray-300"}`}
                >
                  {form.pauseOnReply ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs text-gray-600 border border-gray-100">
                <p className="font-semibold text-gray-700 text-sm mb-2">ملخص القاعدة</p>
                <p>الاسم: <span className="font-medium text-gray-900">{form.name}</span></p>
                <p>المُشغِّل: <span className="font-medium text-gray-900">
                  {TRIGGER_CONFIG[form.triggerType as TriggerType]?.label}
                  {form.triggerValue ? ` — "${form.triggerValue}"` : ""}
                </span></p>
                <p>الرد: <span className="font-medium text-gray-900">
                  {REPLY_CONFIG[form.replyType as ReplyType]?.label}
                </span></p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
            {step > 1 && (
              <Button variant="outline" className="gap-1.5" onClick={() => setStep(s => s - 1)}>
                <ChevronRight className="w-4 h-4" /> السابق
              </Button>
            )}
            <div className="flex-1" />
            {step < 4 ? (
              <Button
                className="bg-gray-900 hover:bg-gray-800 text-white gap-1.5"
                disabled={!canGoNext()}
                onClick={() => setStep(s => s + 1)}
              >
                التالي <ChevronLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                className="bg-green-500 hover:bg-green-600 text-white gap-1.5"
                onClick={save}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editTarget ? "حفظ التعديلات" : "إنشاء القاعدة"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}