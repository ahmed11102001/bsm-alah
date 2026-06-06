"use client";

import { useState } from "react";
import { Settings, Plus, CheckCircle, AlertTriangle, Loader2, Globe, FileText } from "lucide-react";

interface Template {
  id: string;
  name: string;
  language: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISABLED";
  metaTemplateId?: string;
  createdAt: string;
}

export default function OtpTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", language: "ar" });
  const [error, setError] = useState("");

  async function createTemplate() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/developers/portal/otp-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "فشل الإنشاء");
        return;
      }

      setTemplates((prev) => [data.template, ...prev]);
      setShowForm(false);
      setNewTemplate({ name: "", language: "ar" });
    } catch {
      setLoading(false);
      setError("حصل خطأ في الاتصال");
    }
  }

  const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
    PENDING: { color: "#f59e0b", label: "قيد المراجعة", icon: Loader2 },
    APPROVED: { color: "#25D366", label: "مفعل", icon: CheckCircle },
    REJECTED: { color: "#ef4444", label: "مرفوض", icon: AlertTriangle },
    DISABLED: { color: "#6b7280", label: "معطل", icon: AlertTriangle },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">OTP Settings</h1>
        <p className="text-white/50">إدارة قوالب الـ OTP — كل قالب لازم يكون معتمد من Meta</p>
      </div>

      {/* Info Card */}
      <div className="p-5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20">
        <div className="flex items-start gap-3">
          <FileText size={20} className="text-[#25D366] mt-0.5" />
          <div>
            <h4 className="text-[#25D366] font-medium mb-1">قالب OTP الافتراضي</h4>
            <p className="text-white/60 text-sm">
              Wani بيستخدم قالب <code className="text-[#25D366] font-mono">otp_verification</code> افتراضياً.
              لو عايز قالب مخصص، اعمله في Meta Business Manager وادخل الـ ID هنا.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">القوالب ({templates.length})</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-black font-medium hover:bg-[#1ea855] transition-all"
        >
          <Plus size={16} />
          قالب جديد
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <h4 className="text-white font-medium">قالب جديد</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-1.5">اسم القالب</label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="مثلاً: otp_login"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5 flex items-center gap-2">
                <Globe size={14} />
                اللغة
              </label>
              <select
                value={newTemplate.language}
                onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#25D366]/50"
              >
                <option value="ar">العربية (ar)</option>
                <option value="en">English (en)</option>
                <option value="fr">Français (fr)</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={createTemplate}
              disabled={loading || !newTemplate.name}
              className="px-6 py-2.5 rounded-xl bg-[#25D366] text-black font-medium hover:bg-[#1ea855] disabled:opacity-50 transition-all"
            >
              {loading ? "جاري..." : "حفظ"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-3">
        {templates.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
            <Settings size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40">مفيش قوالب مخصصة لسه</p>
            <p className="text-white/30 text-sm mt-1">القالب الافتراضي شغال — اعمل قالب مخصص لو محتاج</p>
          </div>
        ) : (
          templates.map((t) => {
            const config = statusConfig[t.status];
            const Icon = config.icon;
            return (
              <div
                key={t.id}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: config.color + "15" }}
                  >
                    <Icon size={18} style={{ color: config.color }} />
                  </div>
                  <div>
                    <p className="text-white font-medium">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-white/40 text-xs font-mono">{t.language}</span>
                      {t.metaTemplateId && (
                        <span className="text-white/30 text-xs font-mono">Meta: {t.metaTemplateId}</span>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className="px-3 py-1 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: config.color + "15", color: config.color }}
                >
                  {config.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
