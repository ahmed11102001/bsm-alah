"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Shield, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function DeveloperSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        }
      } catch {
        // Handle error quietly
      } finally {
        setLoading(false);
      }
    }
    loadInfo();
  }, []);

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
        toast.error(data.error || "حصل خطأ أثناء الحفظ");
      } else {
        toast.success(data.message);
        setForm((f) => ({ ...f, currentPassword: "", newPassword: "" })); // Clear passwords
        router.refresh(); // Refresh layout to update name
      }
    } catch {
      toast.error("مشكلة في الاتصال بالخادم");
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
          direction: rtl;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding-bottom: 64px; /* extra space at bottom */
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

        @media (max-width: 768px) {
          .settings-container { padding: 24px 16px; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="settings-scroll-wrapper">
        <div className="settings-container">
          <div className="settings-header">
          <h1 className="settings-title">إعدادات الحساب</h1>
          <p className="settings-desc">إدارة معلوماتك الشخصية وكلمة المرور</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* معلومات عامة */}
          <div className="settings-card">
            <div className="card-header">
              <div className="card-icon"><User size={16} /></div>
              <span className="card-title">المعلومات الشخصية</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">الاسم الأول</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">الاسم الأخير</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group full">
                <label className="form-label">البريد الإلكتروني (غير قابل للتعديل)</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  disabled
                  style={{ direction: 'ltr', textAlign: 'right' }}
                />
              </div>
            </div>
          </div>

          {/* كلمة المرور */}
          <div className="settings-card">
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <Shield size={16} />
              </div>
              <span className="card-title">الأمان وكلمة المرور</span>
            </div>
            <div className="form-grid">
              <div className="form-group full">
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                  اترك الحقول فارغة إذا كنت لا ترغب بتغيير كلمة المرور.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">كلمة المرور الحالية</label>
                <input
                  type="password"
                  className="form-input"
                  style={{ direction: 'ltr' }}
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  className="form-input"
                  style={{ direction: 'ltr' }}
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  placeholder="8 أحرف كحد أدنى"
                />
              </div>
            </div>
          </div>

          <div className="submit-wrap">
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Save size={16} />}
              حفظ التعديلات
            </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
