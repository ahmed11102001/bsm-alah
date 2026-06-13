"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Activity, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, ChevronRight, ChevronLeft, RefreshCw } from "lucide-react";

type LogStatus = "PENDING" | "VERIFIED" | "EXPIRED" | "FAILED";

interface OtpLog {
  id: string;
  phone: string;
  status: LogStatus;
  error: string | null;
  sentAt: string | null;
  verifiedAt: string | null;
  expiredAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

interface Stats {
  PENDING: number;
  VERIFIED: number;
  EXPIRED: number;
  FAILED: number;
}

const STATUS_CONFIG: Record<LogStatus, { icon: any; color: string; bg: string; label: string }> = {
  PENDING:  { icon: Clock,         color: "#3b82f6", bg: "rgba(59,130,246,0.1)",   label: "تم الإرسال" },
  VERIFIED: { icon: CheckCircle,   color: "#20d378", bg: "rgba(32,211,120,0.1)",   label: "تم التحقق" },
  EXPIRED:  { icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.1)",   label: "انتهى" },
  FAILED:   { icon: XCircle,       color: "#ef4444", bg: "rgba(239,68,68,0.1)",    label: "فشل" },
};

const FILTERS = [
  { key: "all",      label: "الكل" },
  { key: "PENDING",  label: "تم الإرسال" },
  { key: "VERIFIED", label: "تم التحقق" },
  { key: "EXPIRED",  label: "انتهى" },
  { key: "FAILED",   label: "فشل" },
];

export default function ProjectActivityLogsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [logs, setLogs]     = useState<OtpLog[]>([]);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);
  const [pages, setPages]   = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async (p = page, f = filter, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params_str = new URLSearchParams({
        page: String(p),
        limit: "20",
        ...(f !== "all" ? { status: f } : {}),
      });
      const res = await fetch(`/api/developers/projects/${projectId}/logs?${params_str}`);
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      if (data.stats) setStats(data.stats);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, page, filter]);

  useEffect(() => {
    fetchLogs(page, filter);
  }, [projectId, page, filter]);

  function handleFilter(f: string) {
    setFilter(f);
    setPage(1);
  }

  function formatTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("ar-EG", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function getEventTime(log: OtpLog) {
    return log.verifiedAt || log.failedAt || log.expiredAt || log.sentAt || log.createdAt;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400&display=swap');
        .logs-root {
          max-width: 1000px; margin: 0 auto;
          padding: 32px 24px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: rtl; color: #fff;
        }
        .logs-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
        .logs-title { font-size: 22px; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .logs-sub { font-size: 13px; color: rgba(255,255,255,0.4); }

        .refresh-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5); font-size: 12px;
          cursor: pointer; transition: all 0.2s;
          font-family: inherit;
        }
        .refresh-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
        .refresh-btn.spinning svg { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Stats row */
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        @media (max-width: 640px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
        .stat-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; padding: 14px 16px;
          display: flex; align-items: center; gap: 12px;
        }
        .stat-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-val { font-size: 22px; font-weight: 600; color: #fff; }
        .stat-lbl { font-size: 11px; color: rgba(255,255,255,0.35); }

        /* Filters */
        .filters { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        .filter-btn {
          padding: 7px 14px; border-radius: 8px;
          font-size: 12px; font-weight: 500;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.45);
          cursor: pointer; transition: all 0.15s;
          font-family: inherit;
        }
        .filter-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.7); }
        .filter-btn.active { background: rgba(32,211,120,0.1); border-color: rgba(32,211,120,0.25); color: #20d378; }

        /* Table */
        .logs-table {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; overflow: hidden;
        }
        .table-header {
          display: grid;
          grid-template-columns: 130px 1fr 110px 110px;
          padding: 10px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 11px; font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .table-row {
          display: grid;
          grid-template-columns: 130px 1fr 110px 110px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          align-items: center;
          transition: background 0.1s;
        }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover { background: rgba(255,255,255,0.025); }

        .status-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 600;
        }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .phone-cell { font-family: 'Fira Code', monospace; font-size: 13px; color: rgba(255,255,255,0.7); direction: ltr; text-align: right; }
        .time-cell { font-size: 12px; color: rgba(255,255,255,0.35); }
        .error-cell { font-size: 11px; color: rgba(239,68,68,0.7); }

        .empty-state { text-align: center; padding: 60px 0; color: rgba(255,255,255,0.25); }
        .empty-icon { margin: 0 auto 16px; opacity: 0.3; }

        /* Pagination */
        .pagination { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; }
        .pagination-info { font-size: 12px; color: rgba(255,255,255,0.3); }
        .pagination-btns { display: flex; gap: 6px; }
        .page-btn {
          width: 32px; height: 32px; border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5); font-size: 12px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; font-family: inherit;
        }
        .page-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #fff; }
        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .page-num { font-size: 12px; color: rgba(255,255,255,0.4); padding: 0 8px; align-self: center; }
      `}</style>

      <div className="logs-root">
        {/* Header */}
        <div className="logs-header">
          <div>
            <h1 className="logs-title">السجلات</h1>
            <p className="logs-sub">سجل كل عمليات إرسال وتحقق OTP في المشروع ده</p>
          </div>
          <button
            className={`refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={() => fetchLogs(page, filter, true)}
          >
            <RefreshCw size={13} />
            تحديث
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="stats-row">
            {(Object.entries(STATUS_CONFIG) as [LogStatus, any][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div key={key} className="stat-card">
                  <div className="stat-icon" style={{ background: cfg.bg }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <div className="stat-val">{stats[key] ?? 0}</div>
                    <div className="stat-lbl">{cfg.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-btn ${filter === f.key ? "active" : ""}`}
              onClick={() => handleFilter(f.key)}
            >
              {f.label}
              {f.key !== "all" && stats && (
                <span style={{ marginRight: 4, opacity: 0.6 }}>
                  ({stats[f.key as LogStatus] ?? 0})
                </span>
              )}
              {f.key === "all" && total > 0 && (
                <span style={{ marginRight: 4, opacity: 0.6 }}>({total})</span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="logs-table">
          <div className="table-header">
            <span>الحالة</span>
            <span>الرقم</span>
            <span>الوقت</span>
            <span>ملاحظات</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.3)" }}>
              <Loader2 size={24} style={{ margin: "0 auto 8px", animation: "spin 0.8s linear infinite" }} />
              <p style={{ fontSize: 13 }}>جاري التحميل...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <Activity size={36} className="empty-icon" />
              <p style={{ fontSize: 14, marginBottom: 4 }}>مفيش سجلات لسه</p>
              <p style={{ fontSize: 12 }}>أول ما تبعت OTP هتظهر هنا</p>
            </div>
          ) : (
            logs.map((log) => {
              const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.FAILED;
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="table-row">
                  {/* Status */}
                  <div>
                    <span
                      className="status-badge"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      <span className="status-dot" style={{ background: cfg.color }} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Phone */}
                  <div className="phone-cell">{log.phone}</div>

                  {/* Time */}
                  <div className="time-cell">{formatTime(getEventTime(log))}</div>

                  {/* Notes */}
                  <div>
                    {log.error ? (
                      <span className="error-cell" title={log.error}>
                        {log.error.length > 30 ? log.error.slice(0, 30) + "..." : log.error}
                      </span>
                    ) : log.verifiedAt ? (
                      <span style={{ fontSize: 11, color: "rgba(32,211,120,0.6)" }}>
                        تحقق {formatTime(log.verifiedAt)}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>—</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="pagination">
            <span className="pagination-info">
              {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} من {total}
            </span>
            <div className="pagination-btns">
              <button
                className="page-btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                <ChevronRight size={14} />
              </button>
              <span className="page-num">{page} / {pages}</span>
              <button
                className="page-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pages}
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}