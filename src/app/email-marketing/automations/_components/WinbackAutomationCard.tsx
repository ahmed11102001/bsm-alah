"use client";

import { useEffect, useState } from "react";
import { Timer, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { EmailTemplateDTO } from "../../types";

interface AutomationState {
  type: string;
  enabled: boolean;
  templateId: string | null;
  settings: any;
}

export default function WinbackAutomationCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [daysInactive, setDaysInactive] = useState<number>(60);
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
          const b = (autoData.automations ?? []).find((a: AutomationState) => a.type === "WIN_BACK");
          if (b) {
            setEnabled(!!b.enabled);
            setTemplateId(b.templateId ?? "");
            if (b.settings?.daysInactive) {
              setDaysInactive(b.settings.daysInactive);
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

  const save = async () => {
    if (enabled && !templateId) {
      setError("لازم تختار قالب قبل التفعيل");
      return;
    }
    if (![30, 60, 90].includes(daysInactive)) {
      setError("لازم تختار فترة الخمول من الخيارات المتاحة");
      return;
    }
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const r = await fetch("/api/email/automations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "WIN_BACK", enabled, templateId: templateId || null, settings: { daysInactive } }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "فشل الحفظ");
      setSavedMsg(enabled ? "الأتمتة مفعّلة — هنحاول نرجع العملاء الغايبين ✅" : "الأتمتة متوقفة");
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
            <Timer className="h-5 w-5 text-red-600" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">استرجاع العملاء (Win-back) 🧲</h2>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
              إرسال إيميل للعملاء اللي بقالهم فترة محددة مشتروش منك عشان تفكرهم بيك وتديهم حافز يرجعوا.
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
        <div className="mt-4 space-y-4">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              قالب الإيميل
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-red-500 focus:outline-none"
              >
                <option value="" className="bg-white">اختار قالب…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white">
                    {t.name} — {t.subject}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">أرسل بعد عدم الشراء لمدة</span>
              <div className="flex items-center gap-2">
                {[30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDaysInactive(days)}
                    className={`flex-1 rounded-xl py-2 text-sm font-bold border transition-colors ${
                      daysInactive === days
                        ? "bg-red-50 border-red-300 text-red-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {days} يوم
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 cursor-pointer">
            <span className="text-sm font-semibold text-slate-800">تفعيل استرجاع العملاء</span>
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
