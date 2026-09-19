"use client";

import { useState } from "react";
import { Eye, EyeOff, Save, Server } from "lucide-react";
import { toast } from "sonner";
import TestConnectionButton from "./TestConnectionButton";
import { SMTP_PORT_PRESETS } from "../../constants";
import type { SmtpConfigDTO } from "../../types";

export default function SmtpConnectionForm({
  initialData,
  onSaveSuccess,
}: {
  initialData: SmtpConfigDTO;
  onSaveSuccess?: (updated: SmtpConfigDTO) => void;
}) {
  const [formData, setFormData] = useState<SmtpConfigDTO>(initialData);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof SmtpConfigDTO, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePresetPort = (port: number, secure: boolean) => {
    setFormData((prev) => ({ ...prev, port, secure }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.host.trim() || !formData.user.trim() || !formData.fromEmail.trim()) {
      toast.error("يرجى ملء جميع الحقول الإلزامية (الخادم، اسم المستخدم، وبريد الإرسال)");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/email/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل حفظ إعدادات خادم البريد");
        return;
      }

      const updated: SmtpConfigDTO = {
        ...formData,
        isConfigured: true,
        password: formData.password ? "••••••••" : "",
      };
      setFormData(updated);
      toast.success("تم حفظ إعدادات خادم البريد (SMTP) بنجاح! 🎉");
      if (onSaveSuccess) onSaveSuccess(updated);
    } catch {
      toast.error("حدث خطأ في الاتصال أثناء حفظ الإعدادات.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="pb-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Server className="h-5 w-5 text-red-600" />
          <span>إعدادات الاتصال بخادم SMTP</span>
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          أدخل بيانات اتصال خادم البريد الخاص بك لتمكين المنصة من إرسال حملاتك مباشرة باسم نطاقك.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Host */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            خادم البريد (SMTP Host) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="مثال: smtp.gmail.com أو mail.domain.com"
              value={formData.host}
              onChange={(e) => handleChange("host", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
            />
          </div>
        </div>

        {/* Port Presets & Custom Port */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            رقم المنفذ (Port) والتشفير
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5">
            {SMTP_PORT_PRESETS.map((p) => {
              const selected = formData.port === p.value && formData.secure === p.secure;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePresetPort(p.value, p.secure)}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-semibold text-right transition-all ${
                    selected
                      ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-mono text-xs">{p.value}</div>
                  <div className="text-[10px] text-slate-500">{p.secure ? "SSL مشفر" : "TLS"}</div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={formData.secure}
                onChange={(e) => handleChange("secure", e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4"
              />
              <span>تفعيل التشفير الإجباري (SSL / Direct Secure)</span>
            </label>
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            اسم المستخدم / بريد الدخول <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="user@domain.com"
            value={formData.user}
            onChange={(e) => handleChange("user", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            كلمة المرور / App Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={formData.isConfigured ? "•••••••• (محفوظة مسبقًا)" : "••••••••••••••••"}
              value={formData.password || ""}
              onChange={(e) => handleChange("password", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* From Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            بريد الإرسال (From Email) <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="noreply@domain.com"
            value={formData.fromEmail}
            onChange={(e) => handleChange("fromEmail", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
          />
        </div>

        {/* From Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            اسم المرسل الظاهر (From Name) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="فريق واني — WANI Marketing"
            value={formData.fromName}
            onChange={(e) => handleChange("fromName", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <TestConnectionButton getConfig={() => formData} />

          {formData.isConfigured && (
            <button
              type="button"
              onClick={async () => {
                const confirmed = window.confirm(
                  "هل أنت متأكد من رغبتك في حذف إعدادات خادم SMTP وإلغاء ربط البريد؟"
                );
                if (!confirmed) return;

                try {
                  const res = await fetch("/api/email/connection", { method: "DELETE" });
                  if (res.ok) {
                    const resetData: SmtpConfigDTO = {
                      host: "",
                      port: 587,
                      secure: false,
                      user: "",
                      password: "",
                      fromEmail: "",
                      fromName: "",
                      isConfigured: false,
                      lastTestedAt: null,
                      lastTestSuccess: null,
                    };
                    setFormData(resetData);
                    toast.success("تم إلغاء ربط خادم البريد بنجاح.");
                    if (onSaveSuccess) onSaveSuccess(resetData);
                  } else {
                    toast.error("فشل إلغاء الربط");
                  }
                } catch {
                  toast.error("حدث خطأ أثناء محاولة إلغاء الربط");
                }
              }}
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 active:scale-95 transition-all"
            >
              إلغاء الربط (Disconnect)
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}</span>
        </button>
      </div>
    </form>
  );
}
