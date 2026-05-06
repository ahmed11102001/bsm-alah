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
  Bot, Plus, MoreVertical, Trash2, Edit2, Loader2,
  MessageSquare, Zap, ToggleLeft, ToggleRight,
  CheckCircle, Save, Sparkles, Key,
} from "lucide-react";

interface KeywordRule {
  id: string; name: string; isEnabled: boolean;
  triggerValue: string | null; replyContent: string | null; createdAt: string;
}
interface AIAgent {
  isEnabled: boolean; provider: "gemini" | "openai";
  brandName: string; businessDesc: string; productsInfo: string;
  pricingInfo: string; workingHours: string; tone: string;
  systemPrompt: string; pauseMinutes: number;
}
const EMPTY_AGENT: AIAgent = {
  isEnabled: false, provider: "gemini", brandName: "", businessDesc: "",
  productsInfo: "", pricingInfo: "", workingHours: "", tone: "friendly",
  systemPrompt: "", pauseMinutes: 10,
};

function RuleCard({ rule, onToggle, onEdit, onDelete }: {
  rule: KeywordRule; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className={`bg-white border rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-all
      ${rule.isEnabled ? "border-gray-200 hover:shadow-md" : "border-gray-100 opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
            ${rule.isEnabled ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
            <Key className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{rule.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              {rule.triggerValue ? `"${rule.triggerValue}"` : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onToggle} className={`transition-colors ${rule.isEnabled ? "text-green-500" : "text-gray-300"}`}>
            {rule.isEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
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
              <DropdownMenuItem className="gap-2 text-sm text-red-600 cursor-pointer focus:text-red-600" onClick={onDelete}>
                <Trash2 className="w-4 h-4" /> حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {rule.replyContent && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 line-clamp-2 leading-relaxed">
          {rule.replyContent}
        </p>
      )}
    </div>
  );
}

export default function Automation() {
  const [activeTab,   setActiveTab]   = useState<"bot" | "ai">("bot");
  const [rules,       setRules]       = useState<KeywordRule[]>([]);
  const [agent,       setAgent]       = useState<AIAgent>({ ...EMPTY_AGENT });
  const [loading,     setLoading]     = useState(true);
  const [savingAgent, setSavingAgent] = useState(false);
  const [agentDirty,  setAgentDirty]  = useState(false);
  const [agentSaved,  setAgentSaved]  = useState(false);
  const [showDialog,  setShowDialog]  = useState(false);
  const [editTarget,  setEditTarget]  = useState<KeywordRule | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [ruleForm,    setRuleForm]    = useState({ name: "", keyword: "", reply: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, agentRes] = await Promise.all([fetch("/api/automation"), fetch("/api/ai-agent")]);
      const rulesData = await rulesRes.json();
      const agentData = await agentRes.json();
      const kwRules = (Array.isArray(rulesData) ? rulesData : []).filter(
        (r: any) => r.triggerType === "KEYWORD" && r.replyType === "TEXT"
      );
      setRules(kwRules);
      setAgent({
        isEnabled: agentData.isEnabled ?? false, provider: agentData.provider ?? "gemini",
        brandName: agentData.brandName ?? "", businessDesc: agentData.businessDesc ?? "",
        productsInfo: agentData.productsInfo ?? "", pricingInfo: agentData.pricingInfo ?? "",
        workingHours: agentData.workingHours ?? "", tone: agentData.tone ?? "friendly",
        systemPrompt: agentData.systemPrompt ?? "", pauseMinutes: agentData.pauseMinutes ?? 10,
      });
    } catch { toast.error("خطأ في تحميل البيانات"); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setRuleForm({ name: "", keyword: "", reply: "" }); setShowDialog(true); };
  const openEdit = (rule: KeywordRule) => {
    setEditTarget(rule);
    setRuleForm({ name: rule.name, keyword: rule.triggerValue ?? "", reply: rule.replyContent ?? "" });
    setShowDialog(true);
  };

  const saveRule = async () => {
    if (!ruleForm.name.trim() || !ruleForm.keyword.trim() || !ruleForm.reply.trim()) { toast.error("اكتب الاسم والكلمة والرد"); return; }
    setSaving(true);
    try {
      const payload = { name: ruleForm.name.trim(), triggerType: "KEYWORD", replyType: "TEXT",
        triggerValue: ruleForm.keyword.trim(), replyContent: ruleForm.reply.trim(), humanKeywords: [], pauseOnReply: false };
      const method = editTarget ? "PATCH" : "POST";
      const body = editTarget ? JSON.stringify({ id: editTarget.id, ...payload }) : JSON.stringify(payload);
      const r = await fetch("/api/automation", { method, headers: { "Content-Type": "application/json" }, body });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (editTarget) { toast.success("تم التعديل"); setRules(prev => prev.map(r => r.id === editTarget.id ? d : r)); }
      else { toast.success("تم الإضافة"); setRules(prev => [...prev, d]); }
      setShowDialog(false);
    } catch (e: any) { toast.error(e.message ?? "خطأ في الحفظ"); }
    finally { setSaving(false); }
  };

  const toggleRule = async (rule: KeywordRule) => {
    try {
      await fetch("/api/automation", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, isEnabled: !rule.isEnabled }) });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r));
    } catch { toast.error("خطأ في التحديث"); }
  };

  const deleteRule = async (id: string) => {
    try {
      const r = await fetch("/api/automation", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!r.ok) throw new Error();
      toast.success("تم الحذف"); setRules(prev => prev.filter(r => r.id !== id));
    } catch { toast.error("خطأ في الحذف"); }
  };

  const saveAgent = async () => {
    setSavingAgent(true);
    try {
      const r = await fetch("/api/ai-agent", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(agent) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("تم حفظ إعدادات الوكيل الذكي");
      setAgentDirty(false);
      setAgentSaved(true);
    } catch (e: any) { toast.error(e.message ?? "خطأ في الحفظ"); }
    finally { setSavingAgent(false); }
  };

  const updateAgent = (patch: Partial<AIAgent>) => {
    setAgent(a => ({ ...a, ...patch }));
    setAgentDirty(true);
    setAgentSaved(false);
  };

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <Loader2 className="w-10 h-10 animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto" dir="rtl">

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-8 w-fit">
        {(["bot", "ai"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {tab === "bot" ? <Key className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {tab === "bot" ? "بوت الكلمات" : "الذكاء الاصطناعي"}
            {tab === "ai" && agent.isEnabled && <span className="w-2 h-2 rounded-full bg-green-500" />}
          </button>
        ))}
      </div>

      {/* ══ Bot Tab ══ */}
      {activeTab === "bot" && (
        <>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">بوت الكلمات المفتاحية</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {rules.length > 0 ? `${rules.filter(r => r.isEnabled).length} مفعّلة من ${rules.length}` : "ردود ثابتة فورية"}
              </p>
            </div>
            <Button className="bg-green-500 hover:bg-green-600 text-white gap-1.5" onClick={openCreate}>
              <Plus className="w-4 h-4" /> كلمة جديدة
            </Button>
          </div>

          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 text-sm text-blue-700">
            <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>لما عميل يكتب الكلمة — البوت يرد <strong>فوراً</strong> بغض النظر عن أي حاجة ثانية.</span>
          </div>

          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center mb-5">
                <MessageSquare className="w-10 h-10 text-green-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">لا توجد كلمات بعد</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-xs">أضف كلمة مفتاحية وردّها الثابت</p>
              <Button className="bg-green-500 hover:bg-green-600 text-white gap-2" onClick={openCreate}>
                <Plus className="w-4 h-4" /> أضف أول كلمة
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map(rule => (
                <RuleCard key={rule.id} rule={rule}
                  onToggle={() => toggleRule(rule)} onEdit={() => openEdit(rule)} onDelete={() => deleteRule(rule.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ AI Tab ══ */}
      {activeTab === "ai" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">وكيل الذكاء الاصطناعي</h2>
              <p className="text-sm text-gray-400 mt-0.5">يرد على أي رسالة مش عندها كلمة مفتاحية</p>
            </div>
            <button onClick={() => updateAgent({ isEnabled: !agent.isEnabled })}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm transition-all
                ${agent.isEnabled ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
              {agent.isEnabled ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
              {agent.isEnabled ? "مفعّل" : "معطّل"}
            </button>
          </div>

          <div className="space-y-5">

            {/* Provider */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-500" /> مزوّد الذكاء الاصطناعي
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(["gemini", "openai"] as const).map(p => (
                  <button key={p} onClick={() => updateAgent({ provider: p })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-right
                      ${agent.provider === p ? "border-purple-400 bg-purple-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
                      ${agent.provider === p ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {p === "gemini" ? "G" : "AI"}
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${agent.provider === p ? "text-purple-800" : "text-gray-700"}`}>
                        {p === "gemini" ? "Google Gemini" : "ChatGPT (GPT-4o mini)"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p === "gemini" ? "سريع ومجاني نسبياً" : "دقيق وقوي"}
                      </p>
                    </div>
                    {agent.provider === p && <CheckCircle className="w-4 h-4 text-purple-500 mr-auto" />}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                <Key className="w-3.5 h-3.5 flex-shrink-0" />
                {agent.provider === "gemini" ? "تأكد إن GEMINI_API_KEY موجود في Vercel" : "تأكد إن OPENAI_API_KEY موجود في Vercel"}
              </div>
            </div>

            {/* Brand Context */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" /> بيانات البراند
                <span className="text-xs font-normal text-gray-400">(بتتبعت للـ AI عشان يعرف يرد)</span>
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm mb-1.5 block">اسم البراند</Label>
                    <Input value={agent.brandName} onChange={e => updateAgent({ brandName: e.target.value })} placeholder="مثال: متجر الأناقة" />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">ساعات العمل</Label>
                    <Input value={agent.workingHours} onChange={e => updateAgent({ workingHours: e.target.value })} placeholder="مثال: 9 ص – 10 م" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">وصف النشاط <span className="text-red-500">*</span></Label>
                  <Textarea value={agent.businessDesc} onChange={e => updateAgent({ businessDesc: e.target.value })}
                    placeholder="مثال: نحن متجر ملابس نسائية، نوفر شحن سريع لجميع محافظات مصر"
                    className="min-h-[80px] resize-none text-sm" dir="rtl" />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">المنتجات والخدمات</Label>
                  <Textarea value={agent.productsInfo} onChange={e => updateAgent({ productsInfo: e.target.value })}
                    placeholder="مثال: فساتين سهرة، عبايات، ملابس كاجوال"
                    className="min-h-[60px] resize-none text-sm" dir="rtl" />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">الأسعار</Label>
                  <Textarea value={agent.pricingInfo} onChange={e => updateAgent({ pricingInfo: e.target.value })}
                    placeholder="مثال: الأسعار من 200 لـ 2000 جنيه، الشحن 60 جنيه"
                    className="min-h-[60px] resize-none text-sm" dir="rtl" />
                </div>
              </div>
            </div>

            {/* Advanced */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">إعدادات متقدمة</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm mb-1.5 block">لهجة الرد</Label>
                    <Select value={agent.tone} onValueChange={v => updateAgent({ tone: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">ودود وقريب</SelectItem>
                        <SelectItem value="formal">رسمي ومهني</SelectItem>
                        <SelectItem value="egyptian">عامية مصرية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">وقف الرد بعد ردك (دقائق)</Label>
                    <Input type="number" min={1} max={1440} dir="ltr"
                      value={agent.pauseMinutes} onChange={e => updateAgent({ pauseMinutes: Number(e.target.value) || 10 })} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">System Prompt إضافي (اختياري)</Label>
                  <Textarea value={agent.systemPrompt} onChange={e => updateAgent({ systemPrompt: e.target.value })}
                    placeholder="مثال: لا تذكر المنافسين. لو سألوا عن التوصيل الدولي قول مش متاح."
                    className="min-h-[80px] resize-none text-sm" dir="rtl" />
                </div>
              </div>
            </div>

            <Button className={`w-full text-white gap-2 py-6 text-base font-semibold transition-all duration-300
              ${agentSaved && !agentDirty
                ? "bg-green-500 hover:bg-green-600 shadow-[0_0_22px_rgba(34,197,94,0.6)]"
                : "bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_24px_rgba(16,185,129,0.65)]"}`}
              onClick={saveAgent} disabled={savingAgent || !agentDirty}>
              {savingAgent ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {savingAgent ? "جاري الحفظ..." : agentDirty ? "حفظ الإعدادات" : "تم الحفظ"}
            </Button>
          </div>
        </>
      )}

      {/* Keyword Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Key className="w-5 h-5 text-green-500" />
              {editTarget ? "تعديل الكلمة" : "كلمة مفتاحية جديدة"}
            </DialogTitle>
            <DialogDescription>لما العميل يكتب الكلمة دي، البوت يرد فوراً</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-1.5 block">اسم القاعدة *</Label>
              <Input value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: رد السعر" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">الكلمة المفتاحية *</Label>
              <Input value={ruleForm.keyword} onChange={e => setRuleForm(f => ({ ...f, keyword: e.target.value }))} placeholder="مثال: سعر" dir="rtl" />
              <p className="text-xs text-gray-400 mt-1">بيتفعّل لو الرسالة فيها الكلمة دي في أي مكان</p>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">نص الرد *</Label>
              <Textarea value={ruleForm.reply} onChange={e => setRuleForm(f => ({ ...f, reply: e.target.value }))}
                placeholder="اكتب الرد اللي هيتبعت تلقائياً..." className="min-h-[100px] resize-none text-sm" dir="rtl" />
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <div className="flex-1" />
            <Button className="bg-green-500 hover:bg-green-600 text-white gap-1.5" onClick={saveRule}
              disabled={saving || !ruleForm.name.trim() || !ruleForm.keyword.trim() || !ruleForm.reply.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {editTarget ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
