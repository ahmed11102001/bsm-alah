"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Loader2, AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import type { EmailTemplateDTO } from "../../types";

interface AutomationState {
  type: string;
  enabled: boolean;
  settings: any;
}

interface Step {
  delayHours: number;
  templateId: string;
}

export default function CartAbandonAutomationCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [steps, setSteps] = useState<Step[]>([{ delayHours: 1, templateId: "" }]);
  const [templates, setTemplates] = useState<EmailTemplateDTO[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [autoRes, tplRes, connRes] = await Promise.all([
          fetch("/api/email/automations"),
          fetch("/api/email/templates"),
          fetch("/api/email/connection"),
        ]);
        const autoData = await autoRes.json().catch(() => ({}));
        const tplData = await tplRes.json().catch(() => []);
        const connData = await connRes.json().catch(() => ({}));

        if (autoRes.ok) {
          const b = (autoData.automations ?? []).find((a: AutomationState) => a.type === "CART_ABANDONED");
          if (b) {
            setEnabled(!!b.enabled);
            if (b.settings?.steps && Array.isArray(b.settings.steps) && b.settings.steps.length > 0) {
              setSteps(b.settings.steps);
            }
          }
        }
        if (tplRes.ok && Array.isArray(tplData)) setTemplates(tplData);
        setConnected(!!connRes.ok && !!connData?.isConfigured && connData?.lastTestSuccess === true);
      } catch {
        setError("تعذر تحميل الإعدادات");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addStep = () => {
    if (steps.length >= 3) return;
    const lastDelay = steps[steps.length - 1]?.delayHours || 0;
    setSteps([...steps, { delayHours: lastDelay + 24, templateId: "" }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof Step, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const validateSteps = () => {
    if (steps.length === 0 || steps.length > 3) return "عدد الخطوات لازم يكون من 1 لـ 3.";
    let lastDelay = -1;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step.templateId) return `الخطوة ${i + 1} ملهاش قالب محدد.`;
      if (step.delayHours <= 0) return `وقت الانتظار للخطوة ${i + 1} لازم يكون أكبر من صفر.`;
      if (step.delayHours <= lastDelay) return `وقت الانتظار لازم يكون تصاعدي (الخطوة ${i + 1} لازم تكون بعد الخطوة السابقة).`;
      lastDelay = step.delayHours;
    }
    return null;
  };

  const save = async () => {
    if (enabled) {
      const validationError = validateSteps();
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const r = await fetch("/api/email/automations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "CART_ABANDONED", enabled, settings: { steps } }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "فشل الحفظ");
      setSavedMsg(enabled ? "الأتمتة مفعّلة — العميل هيستلم رسايل السلة المتروكة ✅" : "الأتمتة متوقفة");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 border border-red-200 flex-shrink-0">
            <ShoppingCart className="h-5 w-5 text-red-600" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">السلة المتروكة 🛒</h2>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
              إرسال سلسلة من الإيميلات (حتى 3 خطوات) للعملاء اللي سابوا منتجات في السلة بدون إتمام الشراء. 
              لو العميل اشترى في أي وقت السلسلة هتقف تلقائي.
            </p>
          </div>
        </div>
        <span
          className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
            enabled
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-slate-100 border-slate-200 text-slate-500"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-600" : "bg-slate-400"}`} />
          {enabled ? "مفعّلة" : "متوقفة"}
        </span>
      </div>

      {!connected ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            لازم تربط بريدك الأول من{" "}
            <a href="/dashboard/email/settings" className="font-bold underline hover:text-amber-900">
              الإعدادات
            </a>{" "}
            ويكون Test Connection ناجح، وبعدين تقدر تفعّل الأتمتة.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 cursor-pointer mb-2">
            <span className="text-sm font-semibold text-slate-800">تفعيل أتمتة السلة المتروكة</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
                enabled ? "bg-red-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  enabled ? "right-0.5" : "left-0.5"
                }`}
              />
            </button>
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">خطوات الإرسال</h3>
              {steps.length < 3 && (
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة خطوة
                </button>
              )}
            </div>

            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 w-full sm:w-auto flex-shrink-0">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700 font-bold">{idx + 1}</span>
                  بعد
                </div>
                
                <input
                  type="number"
                  min="1"
                  value={step.delayHours}
                  onChange={(e) => updateStep(idx, "delayHours", Number(e.target.value))}
                  className="w-full sm:w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-center text-slate-900 focus:border-red-500 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">ساعة</span>

                <select
                  value={step.templateId}
                  onChange={(e) => updateStep(idx, "templateId", e.target.value)}
                  className="flex-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-red-500 focus:outline-none"
                >
                  <option value="" className="bg-white">اختار قالب…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id} className="bg-white">
                      {t.name} — {t.subject}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => removeStep(idx)}
                  disabled={steps.length === 1}
                  className="p-1.5 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-30 flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}
          {savedMsg && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {savedMsg}
            </p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/25 hover:from-red-700 hover:to-rose-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
          </button>
        </div>
      )}
    </div>
  );
}
