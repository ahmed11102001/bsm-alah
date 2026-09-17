"use client";

import { useState } from "react";
import { Eye, EyeOff, Save, KeyRound, Server, Mail, User, Shield, Check } from "lucide-react";
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
    // محاكاة حفظ الإعدادات في مرحلة الـ UI Mock
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);

    const updated = { ...formData, isConfigured: true };
    setFormData(updated);
    toast.success("تم حفظ إعدادات خادم البريد (SMTP) بنجاح! 🎉");
    if (onSaveSuccess) onSaveSuccess(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
      <div className="pb-4 border-b border-white/5">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Server className="h-5 w-5 text-blue-400" />
          <span>إعدادات الاتصال بخادم SMTP</span>
        </h3>
        <p className="mt-1 text-xs text-white/50">
          أدخل بيانات اتصال خادم البريد الخاص بك لتمكين المنصة من إرسال حملاتك مباشرة باسم نطاقك.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Host */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-white/80 mb-1.5">
            خادم البريد (SMTP Host) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="مثال: smtp.gmail.com أو mail.domain.com"
              value={formData.host}
              onChange={(e) => handleChange("host", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-white placeholder-white/25 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Port Presets & Custom Port */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-white/80 mb-1.5">
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
                      ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
                      : "border-white/5 bg-white/[0.02] text-white/60 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="font-mono text-xs">{p.value}</div>
                  <div className="text-[10px] text-white/40">{p.secure ? "SSL مشفر" : "TLS"}</div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70">
              <input
                type="checkbox"
                checked={formData.secure}
                onChange={(e) => handleChange("secure", e.target.checked)}
                className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-400 h-4 w-4"
              />
              <span>تفعيل التشفير الإجباري (SSL / Direct Secure)</span>
            </label>
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1.5">
            اسم المستخدم / بريد الدخول <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="user@domain.com"
            value={formData.user}
            onChange={(e) => handleChange("user", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-white placeholder-white/25 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1.5">
            كلمة المرور / App Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••••••••••"
              value={formData.password || ""}
              onChange={(e) => handleChange("password", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/25 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-2.5 text-white/40 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* From Email */}
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1.5">
            بريد الإرسال (From Email) <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="noreply@domain.com"
            value={formData.fromEmail}
            onChange={(e) => handleChange("fromEmail", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-white placeholder-white/25 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          />
        </div>

        {/* From Name */}
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1.5">
            اسم المرسل الظاهر (From Name) <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="فريق واني — WANI Marketing"
            value={formData.fromName}
            onChange={(e) => handleChange("fromName", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-white placeholder-white/25 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-8 pt-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <TestConnectionButton />

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}</span>
        </button>
      </div>
    </form>
  );
}
