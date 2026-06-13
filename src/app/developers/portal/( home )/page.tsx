"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "TRANSFERRED" | "ARCHIVED";
  createdAt: string;
  transferredAt: string | null;
}

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [createError, setCreateError] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchProjects();
  }, []);

  useEffect(() => {
    if (showCreate) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showCreate]);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/developers/projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) { setCreateError("اسم المشروع مطلوب"); return; }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/developers/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || "حصل خطأ"); setCreating(false); return; }
      setProjects((prev) => [data.project, ...prev]);
      setShowCreate(false);
      setNewName(""); setNewDesc("");
    } catch {
      setCreateError("حصل خطأ، حاول تاني");
    } finally {
      setCreating(false);
    }
  }

  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  const transferredProjects = projects.filter((p) => p.status === "TRANSFERRED");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

        .portal-root {
          min-height: 100vh;
          background: #060810;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: rtl;
          position: relative;
        }
        .portal-root::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(32,211,120,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(32,211,120,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        /* Main content */
        .portal-main {
          max-width: 1100px; margin: 0 auto;
          padding: 48px 32px;
          position: relative; z-index: 1;
          opacity: 0; transform: translateY(12px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .portal-main.visible { opacity: 1; transform: translateY(0); }

        /* Page header */
        .page-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: 40px;
        }
        .page-title { font-size: 28px; font-weight: 600; color: #fff; margin-bottom: 6px; }
        .page-subtitle { font-size: 14px; color: rgba(255,255,255,0.4); }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 20px;
          background: #20d378; color: #060810;
          font-size: 14px; font-weight: 600; font-family: inherit;
          border: none; border-radius: 12px; cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          text-decoration: none;
          white-space: nowrap;
        }
        .btn-primary:hover { background: #1bbf6b; }
        .btn-primary:active { transform: scale(0.97); }

        /* Stats row */
        .stats-row {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
          margin-bottom: 40px;
        }
        .stat-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 20px 24px;
        }
        .stat-label { font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-size: 32px; font-weight: 600; color: #fff; }
        .stat-value.green { color: #20d378; }
        .stat-sub { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 4px; }

        /* Section */
        .section-label {
          font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.3);
          text-transform: uppercase; letter-spacing: 1px;
          margin-bottom: 16px;
        }

        /* Projects grid */
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          margin-bottom: 40px;
        }

        .project-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 24px;
          text-decoration: none; color: inherit;
          display: block;
          transition: border-color 0.2s, background 0.2s, transform 0.2s;
          position: relative; overflow: hidden;
          cursor: pointer;
        }
        .project-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(32,211,120,0.3), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .project-card:hover {
          border-color: rgba(32,211,120,0.2);
          background: rgba(255,255,255,0.04);
          transform: translateY(-2px);
        }
        .project-card:hover::before { opacity: 1; }

        .project-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
        .project-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: rgba(32,211,120,0.1);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
        }
        .project-badge {
          font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;
        }
        .badge-active { background: rgba(32,211,120,0.12); color: #20d378; border: 1px solid rgba(32,211,120,0.2); }
        .badge-transferred { background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.2); }
        .badge-archived { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.1); }

        .project-name { font-size: 17px; font-weight: 600; color: #fff; margin-bottom: 6px; }
        .project-desc { font-size: 13px; color: rgba(255,255,255,0.4); line-height: 1.5; margin-bottom: 16px; min-height: 20px; }

        .project-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06);
        }
        .project-date { font-size: 12px; color: rgba(255,255,255,0.25); }
        .project-arrow { color: rgba(32,211,120,0.5); transition: transform 0.2s, color 0.2s; }
        .project-card:hover .project-arrow { transform: translateX(-4px); color: #20d378; }

        /* Create card */
        .project-card-create {
          background: transparent;
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 18px; padding: 24px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 12px; cursor: pointer; min-height: 180px;
          transition: border-color 0.2s, background 0.2s;
          text-align: center;
        }
        .project-card-create:hover {
          border-color: rgba(32,211,120,0.3);
          background: rgba(32,211,120,0.03);
        }
        .create-plus {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(32,211,120,0.1);
          display: flex; align-items: center; justify-content: center;
          color: #20d378; font-size: 22px; transition: background 0.2s;
        }
        .project-card-create:hover .create-plus { background: rgba(32,211,120,0.15); }
        .create-label { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.5); }

        /* Empty state */
        .empty-state {
          text-align: center; padding: 80px 32px;
        }
        .empty-icon { font-size: 56px; margin-bottom: 20px; opacity: 0.5; }
        .empty-title { font-size: 20px; font-weight: 600; color: #fff; margin-bottom: 8px; }
        .empty-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 28px; }

        /* Modal overlay */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          opacity: 0; transition: opacity 0.25s;
        }
        .modal-overlay.show { opacity: 1; }
        
        .modal {
          width: 100%; max-width: 460px;
          background: #0d1117;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px; padding: 36px;
          transform: scale(0.95); transition: transform 0.25s;
        }
        .modal-overlay.show .modal { transform: scale(1); }
        
        .modal-title { font-size: 20px; font-weight: 600; color: #fff; margin-bottom: 6px; }
        .modal-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 28px; }
        
        .modal-field { margin-bottom: 18px; }
        .modal-label { display: block; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
        .modal-input, .modal-textarea {
          width: 100%; padding: 12px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; color: #fff;
          font-size: 15px; font-family: inherit;
          outline: none; box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .modal-textarea { resize: none; height: 80px; line-height: 1.5; }
        .modal-input::placeholder, .modal-textarea::placeholder { color: rgba(255,255,255,0.2); }
        .modal-input:focus, .modal-textarea:focus {
          border-color: rgba(32,211,120,0.4);
          box-shadow: 0 0 0 3px rgba(32,211,120,0.08);
        }
        
        .char-count { font-size: 11px; color: rgba(255,255,255,0.25); text-align: left; margin-top: 4px; }
        
        .modal-error {
          font-size: 13px; color: #f87171;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px; padding: 10px 14px;
          margin-bottom: 16px;
        }
        
        .modal-actions { display: flex; gap: 10px; }
        .btn-cancel {
          flex: 1; padding: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; color: rgba(255,255,255,0.6);
          font-size: 14px; font-family: inherit; cursor: pointer;
          transition: background 0.2s;
        }
        .btn-cancel:hover { background: rgba(255,255,255,0.08); }
        .btn-create {
          flex: 2; padding: 12px;
          background: #20d378; color: #060810;
          border: none; border-radius: 12px;
          font-size: 14px; font-weight: 600; font-family: inherit;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.2s, transform 0.15s;
        }
        .btn-create:hover:not(:disabled) { background: #1bbf6b; }
        .btn-create:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(6,8,16,0.3); border-top-color: #060810;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Skeleton loader */
        .skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        @keyframes shimmer { to { background-position: -200% 0; } }
        
        .skeleton-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 24px; height: 180px;
        }

        @media (max-width: 640px) {
          .portal-main { padding: 24px 16px; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          .stats-row { grid-template-columns: 1fr; }
          .projects-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="portal-root">

        {/* Main */}
        <main className={`portal-main ${mounted ? "visible" : ""}`}>
          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">مشاريعك</h1>
              <p className="page-subtitle">
                كل مشروع له API Keys وقوالب منفصلة — تقدر تسلّمه للعميل بعد ما تخلص
              </p>
            </div>
            <button className="btn-primary" onClick={() => { setShowCreate(true); setCreateError(""); }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              مشروع جديد
            </button>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">المشاريع النشطة</div>
              <div className="stat-value green">{loading ? "–" : activeProjects.length}</div>
              <div className="stat-sub">من أصل 10 كحد أقصى</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">تم تسليمها</div>
              <div className="stat-value">{loading ? "–" : transferredProjects.length}</div>
              <div className="stat-sub">مشاريع منقولة للعملاء</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">الإجمالي</div>
              <div className="stat-value">{loading ? "–" : projects.length}</div>
              <div className="stat-sub">كل المشاريع</div>
            </div>
          </div>

          {/* Active Projects */}
          {loading ? (
            <>
              <div className="section-label">جاري التحميل...</div>
              <div className="projects-grid">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 16 }} />
                    <div className="skeleton" style={{ width: "60%", height: 18, marginBottom: 10 }} />
                    <div className="skeleton" style={{ width: "80%", height: 14 }} />
                  </div>
                ))}
              </div>
            </>
          ) : activeProjects.length === 0 && projects.length === 0 ? (
            /* Empty state */
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3 className="empty-title">لسه ماعندكش مشاريع</h3>
              <p className="empty-sub">ابدأ بإنشاء مشروعك الأول وابدأ تستخدم الـ OTP API</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                إنشاء أول مشروع
              </button>
            </div>
          ) : (
            <>
              {activeProjects.length > 0 && (
                <>
                  <div className="section-label">نشطة — {activeProjects.length}</div>
                  <div className="projects-grid">
                    {activeProjects.map((project) => (
                      <Link key={project.id} href={`/developers/portal/projects/${project.id}`} className="project-card">
                        <div className="project-card-header">
                          <div className="project-icon">⚡</div>
                          <span className="project-badge badge-active">نشط</span>
                        </div>
                        <div className="project-name">{project.name}</div>
                        <div className="project-desc">
                          {project.description || <span style={{ opacity: 0.4 }}>لا يوجد وصف</span>}
                        </div>
                        <div className="project-footer">
                          <span className="project-date">
                            {new Date(project.createdAt).toLocaleDateString("ar-EG", {
                              year: "numeric", month: "short", day: "numeric",
                            })}
                          </span>
                          <svg className="project-arrow" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                          </svg>
                        </div>
                      </Link>
                    ))}

                    {/* Create new card */}
                    {activeProjects.length < 10 && (
                      <button
                        className="project-card-create"
                        onClick={() => { setShowCreate(true); setCreateError(""); }}
                      >
                        <div className="create-plus">
                          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </div>
                        <span className="create-label">مشروع جديد</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {transferredProjects.length > 0 && (
                <>
                  <div className="section-label">تم تسليمها — {transferredProjects.length}</div>
                  <div className="projects-grid">
                    {transferredProjects.map((project) => (
                      <div key={project.id} className="project-card" style={{ opacity: 0.6, cursor: "default" }}>
                        <div className="project-card-header">
                          <div className="project-icon" style={{ opacity: 0.5 }}>📤</div>
                          <span className="project-badge badge-transferred">مسلّم</span>
                        </div>
                        <div className="project-name">{project.name}</div>
                        <div className="project-desc">{project.description || "—"}</div>
                        <div className="project-footer">
                          <span className="project-date">
                            سُلّم {project.transferredAt
                              ? new Date(project.transferredAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short" })
                              : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* Create Project Modal */}
      <div
        className={`modal-overlay ${showCreate ? "show" : ""}`}
        onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        style={{ display: showCreate ? "flex" : "none" }}
      >
        <div className="modal">
          <h3 className="modal-title">مشروع جديد</h3>
          <p className="modal-sub">
            كل مشروع له API Keys وقوالب مستقلة — تقدر تشتغل على أكتر من عميل في نفس الوقت
          </p>

          <form onSubmit={createProject} noValidate>
            <div className="modal-field">
              <label className="modal-label">اسم المشروع *</label>
              <input
                ref={inputRef}
                className="modal-input"
                type="text"
                placeholder="مثال: تطبيق التوصيل أو موقع المتجر"
                value={newName}
                onChange={(e) => { setNewName(e.target.value.slice(0, 60)); setCreateError(""); }}
                maxLength={60}
              />
              <div className="char-count">{newName.length}/60</div>
            </div>

            <div className="modal-field">
              <label className="modal-label">وصف مختصر (اختياري)</label>
              <textarea
                className="modal-textarea"
                placeholder="بشرح سريع للمشروع ده..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value.slice(0, 200))}
                maxLength={200}
              />
              <div className="char-count">{newDesc.length}/200</div>
            </div>

            {createError && <div className="modal-error">{createError}</div>}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => { setShowCreate(false); setNewName(""); setNewDesc(""); setCreateError(""); }}
              >
                إلغاء
              </button>
              <button type="submit" className="btn-create" disabled={creating}>
                {creating ? (
                  <><div className="spinner" />جاري الإنشاء...</>
                ) : (
                  <>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    إنشاء المشروع
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}