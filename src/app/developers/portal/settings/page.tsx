"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Shield, Save, ArrowRight, TerminalSquare, MonitorSmartphone, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "../../_components/LanguageProvider";
import { useDevPath } from "@/lib/dev-links";

interface CliDevice {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

export default function DeveloperSettingsPage() {
  const router = useRouter();
  const devPath = useDevPath();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { language, t } = useLanguage();
  const [devices, setDevices] = useState<CliDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  // الـ CLI للمطورين فقط — مخفي عن حسابات الأونر
  const [isOwnerOnly, setIsOwnerOnly] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "", // Read only
    currentPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    // Fetch current info via a simple endpoint or just the /me
    async function loadInfo() {
      try {
        const res = await fetch("/api/developers/auth/me");
        if (res.ok) {
          const data = await res.json();
          setForm((f) => ({
            ...f,
            firstName: data.developer.firstName,
            lastName: data.developer.lastName,
            email: data.developer.email,
          }));
          if (data.isOwnerOnly) {
            setIsOwnerOnly(true);
            setDevicesLoading(false);
            return;
          }
        }
      } catch {
        // Handle error quietly
      } finally {
        setLoading(false);
      }
    }
    async function loadDevices() {
      try {
        const res = await fetch("/api/developers/cli/sessions");
        if (res.ok) {
          const data = await res.json();
          setDevices(Array.isArray(data.sessions) ? data.sessions : []);
        }
      } catch {
        // Handle error quietly
      } finally {
        setDevicesLoading(false);
      }
    }
    loadInfo();
    loadDevices();
  }, []);

  async function handleRevokeDevice(id: string) {
    try {
      const res = await fetch("/api/developers/cli/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || t("Failed to revoke device", "فشل إلغاء الجهاز"));
      } else {
        toast.success(t("Device revoked", "تم إلغاء الجهاز"));
        setDevices((d) => d.filter((x) => x.id !== id));
      }
    } catch {
      toast.error(t("Connection error with the server", "مشكلة في الاتصال بالخادم"));
    }
  }

  async function handleRevokeAllDevices() {
    try {
      const res = await fetch("/api/developers/cli/sessions/revoke-all", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || t("Failed to revoke devices", "فشل إلغاء الأجهزة"));
      } else {
        toast.success(t("All CLI devices revoked", "تم إلغاء جميع أجهزة CLI"));
        setDevices([]);
      }
    } catch {
      toast.error(t("Connection error with the server", "مشكلة في الاتصال بالخادم"));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/developers/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("An error occurred while saving", "حصل خطأ أثناء الحفظ"));
      } else {
        toast.success(data.message);
        setForm((f) => ({ ...f, currentPassword: "", newPassword: "" })); // Clear passwords
        router.refresh(); // Refresh layout to update name
      }
    } catch {
      toast.error(t("Connection error with the server", "مشكلة في الاتصال بالخادم"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .settings-scroll-wrapper {
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
        }
        
        .settings-scroll-wrapper::-webkit-scrollbar {
          width: 8px;
        }
        .settings-scroll-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }
        .settings-scroll-wrapper::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .settings-scroll-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .settings-container {
          padding: 32px 48px;
          direction: ${language === 'ar' ? 'rtl' : 'ltr'};
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding-bottom: 64px; /* extra space at bottom */
        }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
          margin-bottom: 24px;
        }
        .back-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
        .settings-header {
          margin-bottom: 32px;
        }
        .settings-title {
          font-size: 24px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 8px;
        }
        .settings-desc {
          font-size: 14px;
          color: rgba(255,255,255,0.5);
        }

        .settings-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
        }
        .card-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(32,211,120,0.1);
          color: #20d378;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-group.full {
          grid-column: 1 / -1;
        }
        .form-label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.7);
        }
        .form-input {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 12px 16px;
          color: #fff;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        .form-input:focus {
          outline: none;
          border-color: rgba(32,211,120,0.5);
        }
        .form-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .submit-wrap {
          display: flex;
          justify-content: flex-end;
          margin-top: 32px;
        }
        .btn-save {
          background: #20d378;
          color: #060810;
          border: none;
          border-radius: 10px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .btn-save:hover { opacity: 0.9; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

        .settings-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .spinner {
          width: 24px; height: 24px;
          border: 2px solid rgba(32,211,120,0.3);
          border-top-color: #20d378;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .btn-connect-cli {
          background: #20d378; color: #060810; border: none; border-radius: 10px;
          padding: 11px 20px; font-size: 13.5px; font-weight: 600; font-family: inherit;
          display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
          transition: opacity 0.2s; margin-bottom: 24px;
        }
        .btn-connect-cli:hover { opacity: 0.9; }
        .devices-title {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7);
          margin-bottom: 12px; padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .btn-revoke-all {
          background: none; border: none; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-family: inherit; color: rgba(239,68,68,0.7);
        }
        .btn-revoke-all:hover { color: #ef4444; }
        .devices-loading { display: flex; justify-content: center; padding: 16px 0; }
        .devices-empty { font-size: 13px; color: rgba(255,255,255,0.3); margin: 0; }
        .device-row {
          display: flex; align-items: center; gap: 12px;
          background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 12px 14px; margin-bottom: 8px;
        }
        .device-icon {
          width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
          background: rgba(32,211,120,0.1); color: #20d378;
          display: flex; align-items: center; justify-content: center;
        }
        .device-info { flex: 1; min-width: 0; }
        .device-name { font-size: 13.5px; font-weight: 500; color: #fff; }
        .device-meta { font-size: 11.5px; color: rgba(255,255,255,0.35); margin-top: 2px; }
        .btn-revoke {
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          color: rgba(239,68,68,0.8); border-radius: 8px; padding: 7px 14px;
          font-size: 12px; font-family: inherit; cursor: pointer; flex-shrink: 0;
        }
        .btn-revoke:hover { background: rgba(239,68,68,0.15); }

        @media (max-width: 768px) {
          .settings-container { padding: 16px; }
          .form-grid { grid-template-columns: 1fr; gap: 16px; }
          .settings-title { font-size: 20px; }
          .settings-desc { font-size: 13px; }
        }
      `}</style>

      <div className="settings-scroll-wrapper">
        <div className="settings-container">
          <button className="back-btn" onClick={() => router.back()}>
            <ArrowRight size={16} style={{ transform: language === 'ar' ? 'rotate(180deg)' : 'none' }} />
            {t("Back", "رجوع")}
          </button>
          
          <div className="settings-header">
          <h1 className="settings-title">{t("Account Settings", "إعدادات الحساب")}</h1>
          <p className="settings-desc">{t("Manage your personal information and password", "إدارة معلوماتك الشخصية وكلمة المرور")}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Personal Info */}
          <div className="settings-card">
            <div className="card-header">
              <div className="card-icon"><User size={16} /></div>
              <span className="card-title">{t("Personal Information", "المعلومات الشخصية")}</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">{t("First Name", "الاسم الأول")}</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("Last Name", "الاسم الأخير")}</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group full">
                <label className="form-label">{t("Email (read-only)", "البريد الإلكتروني (غير قابل للتعديل)")}</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  disabled
                  style={{ direction: 'ltr', textAlign: language === 'ar' ? 'right' : 'left' }}
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="settings-card">
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <Shield size={16} />
              </div>
              <span className="card-title">{t("Security & Password", "الأمان وكلمة المرور")}</span>
            </div>
            <div className="form-grid">
              <div className="form-group full">
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                  {t("Leave fields empty if you don't want to change the password.", "اترك الحقول فارغة إذا كنت لا ترغب بتغيير كلمة المرور.")}
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">{t("Current Password", "كلمة المرور الحالية")}</label>
                <input
                  type="password"
                  className="form-input"
                  style={{ direction: 'ltr' }}
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("New Password", "كلمة المرور الجديدة")}</label>
                <input
                  type="password"
                  className="form-input"
                  style={{ direction: 'ltr' }}
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  placeholder={t("8 characters minimum", "8 أحرف كحد أدنى")}
                />
              </div>
            </div>
          </div>

          {/* CLI & Integrations — للمطورين فقط */}
          {!isOwnerOnly && (
          <div className="settings-card">
            <div className="card-header">
              <div className="card-icon"><TerminalSquare size={16} /></div>
              <span className="card-title">{t("CLI & Integrations", "CLI والتكاملات")}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: '16px' }}>
              {t(
                "Connect your terminal to Wani. The Wani CLI lets you manage your projects and test the OTP API without leaving the terminal — login happens in the browser, never with passwords in the terminal.",
                "اربط الطرفية بـ Wani. يتيح لك Wani CLI إدارة مشاريعك واختبار OTP API دون مغادرة الطرفية — تسجيل الدخول يتم عبر المتصفح، وليس بكلمات مرور في الطرفية."
              )}
            </p>
            <button
              type="button"
              className="btn-connect-cli"
              onClick={() => router.push(devPath("/cli/authorize"))}
            >
              <TerminalSquare size={15} />
              {t("Connect CLI", "ربط CLI")}
            </button>

            <div className="devices-title">
              {t("Connected CLI devices", "أجهزة CLI المتصلة")}
              {devices.length > 0 && (
                <button type="button" className="btn-revoke-all" onClick={handleRevokeAllDevices}>
                  <LogOut size={12} />
                  {t("Revoke all", "إلغاء الكل")}
                </button>
              )}
            </div>
            {devicesLoading ? (
              <div className="devices-loading"><div className="spinner" style={{ width: 18, height: 18 }} /></div>
            ) : devices.length === 0 ? (
              <p className="devices-empty">
                {t("No CLI devices connected yet.", "لا توجد أجهزة CLI متصلة بعد.")}
              </p>
            ) : (
              devices.map((d) => (
                <div key={d.id} className="device-row">
                  <div className="device-icon"><MonitorSmartphone size={15} /></div>
                  <div className="device-info">
                    <div className="device-name">{d.deviceName || "Wani CLI"}</div>
                    <div className="device-meta">
                      {t("Last active:", "آخر نشاط:")} {new Date(d.lastUsedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                    </div>
                  </div>
                  <button type="button" className="btn-revoke" onClick={() => handleRevokeDevice(d.id)}>
                    {t("Revoke", "إلغاء")}
                  </button>
                </div>
              ))
            )}
          </div>
          )}

          <div className="submit-wrap">
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Save size={16} />}
              {t("Save Changes", "حفظ التعديلات")}
            </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
