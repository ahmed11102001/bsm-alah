"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Activity, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, ChevronRight, ChevronLeft, RefreshCw } from "lucide-react";
import { useLanguage } from "@/app/developers/_components/LanguageProvider";

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

// ─── i18n ─────────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<LogStatus, { en: string; ar: string }> = {
  PENDING: { en: "Sent", ar: "تم الإرسال" },
  VERIFIED: { en: "Verified", ar: "تم التحقق" },
  EXPIRED: { en: "Expired", ar: "انتهى" },
  FAILED: { en: "Failed", ar: "فشل" },
};

const STATUS_COLORS: Record<LogStatus, { color: string; bg: string; icon: any }> = {
  PENDING: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: Clock },
  VERIFIED: { color: "#20d378", bg: "rgba(32,211,120,0.1)", icon: CheckCircle },
  EXPIRED: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: AlertTriangle },
  FAILED: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: XCircle },
};

const FILTER_KEYS = ["all", "PENDING", "VERIFIED", "EXPIRED", "FAILED"] as const;
type FilterKey = typeof FILTER_KEYS[number];

const FILTER_LABELS: Record<FilterKey, { en: string; ar: string }> = {
  all: { en: "All", ar: "الكل" },
  PENDING: { en: "Sent", ar: "تم الإرسال" },
  VERIFIED: { en: "Verified", ar: "تم التحقق" },
  EXPIRED: { en: "Expired", ar: "انتهى" },
  FAILED: { en: "Failed", ar: "فشل" },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProjectActivityLogsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { language, t } = useLanguage();
  const isAr = language === "ar";

  const [logs, setLogs] = useState<OtpLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async (p = page, f = filter, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const qs = new URLSearchParams({
        page: String(p),
        limit: "20",
        ...(f !== "all" ? { status: f } : {}),
      });
      const res = await fetch(`/api/developers/projects/${projectId}/logs?${qs}`);
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

  useEffect(() => { fetchLogs(page, filter); }, [projectId, page, filter]);

  function handleFilter(f: FilterKey) { setFilter(f); setPage(1); }

  function formatTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(isAr ? "ar-EG" : "en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function getEventTime(log: OtpLog) {
    return log.verifiedAt || log.failedAt || log.expiredAt || log.sentAt || log.createdAt;
  }

  const dir = isAr ? "rtl" : "ltr";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400&display=swap');

        .logs-root {
          max-width: 1000px; margin: 0 auto;
          padding: 32px 24px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          color: #fff;
        }
        .logs-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
        .logs-title  { font-size: 22px; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .logs-sub    { font-size: 13px; color: rgba(255,255,255,0.4); }

        .refresh-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5); font-size: 12px;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
          flex-shrink: 0;
        }
        .refresh-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
        .refresh-btn.spinning svg { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        @media (max-width: 640px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
        .stat-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; padding: 14px 16px;
          display: flex; align-items: center; gap: 12px;
        }
        .stat-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-val  { font-size: 22px; font-weight: 600; color: #fff; }
        .stat-lbl  { font-size: 11px; color: rgba(255,255,255,0.35); }

        .filters { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        .filter-btn {
          padding: 7px 14px; border-radius: 8px;
          font-size: 12px; font-weight: 500;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.45);
          cursor: pointer; transition: all 0.15s; font-family: inherit;
        }
        .filter-btn:hover  { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.7); }
        .filter-btn.active { background: rgba(32,211,120,0.1); border-color: rgba(32,211,120,0.25); color: #20d378; }

        .logs-table-wrapper { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; overflow: hidden; }
        .logs-table-scroll  { overflow-x: auto; }
        .logs-table         { min-width: 600px; }

        .table-header {
          display: grid; grid-template-columns: 130px 1fr 130px 130px;
          padding: 10px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 11px; font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .table-row {
          display: grid; grid-template-columns: 130px 1fr 130px 130px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          align-items: center; transition: background 0.1s;
        }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover      { background: rgba(255,255,255,0.025); }

        .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .status-dot   { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .phone-cell { font-family: 'Fira Code', monospace; font-size: 13px; color: rgba(255,255,255,0.7); direction: ltr; }
        .time-cell  { font-size: 12px; color: rgba(255,255,255,0.35); }
        .error-cell { font-size: 11px; color: rgba(239,68,68,0.7); }

        .empty-state { text-align: center; padding: 60px 0; color: rgba(255,255,255,0.25); }
        .empty-icon  { margin: 0 auto 16px; opacity: 0.3; }

        .pagination      { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; }
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

      <div className="logs-root" dir={dir}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="logs-header">
          <div>
            <h1 className="logs-title">{t("Activity Logs", "السجلات")}</h1>
            <p className="logs-sub">
              {t(
                "A record of all OTP send and verify operations in this project",
                "سجل كل عمليات إرسال وتحقق OTP في المشروع ده"
              )}
            </p>
          </div>
          <button
            className={`refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={() => fetchLogs(page, filter, true)}
          >
            <RefreshCw size={13} />
            {t("Refresh", "تحديث")}
          </button>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        {stats && (
          <div className="stats-row">
            {(Object.entries(STATUS_COLORS) as [LogStatus, any][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div key={key} className="stat-card">
                  <div className="stat-icon" style={{ background: cfg.bg }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <div className="stat-val">{stats[key] ?? 0}</div>
                    <div className="stat-lbl">
                      {isAr ? STATUS_LABELS[key].ar : STATUS_LABELS[key].en}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <div className="filters">
          {FILTER_KEYS.map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => handleFilter(f)}
            >
              {isAr ? FILTER_LABELS[f].ar : FILTER_LABELS[f].en}
              {f !== "all" && stats && (
                <span style={{ marginInlineStart: 4, opacity: 0.6 }}>
                  ({stats[f as LogStatus] ?? 0})
                </span>
              )}
              {f === "all" && total > 0 && (
                <span style={{ marginInlineStart: 4, opacity: 0.6 }}>({total})</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="logs-table-wrapper">
          <div className="logs-table-scroll">
            <div className="logs-table">

              {/* Table header */}
              <div className="table-header">
                <span>{t("Status", "الحالة")}</span>
                <span>{t("Phone", "الرقم")}</span>
                <span>{t("Time", "الوقت")}</span>
                <span>{t("Notes", "ملاحظات")}</span>
              </div>

              {/* Rows */}
              {loading ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.3)" }}>
                  <Loader2 size={24} style={{ margin: "0 auto 8px", animation: "spin 0.8s linear infinite" }} />
                  <p style={{ fontSize: 13 }}>{t("Loading...", "جاري التحميل...")}</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="empty-state">
                  <Activity size={36} className="empty-icon" />
                  <p style={{ fontSize: 14, marginBottom: 4 }}>
                    {t("No logs yet", "مفيش سجلات لسه")}
                  </p>
                  <p style={{ fontSize: 12 }}>
                    {t("Logs will appear here once you send an OTP", "أول ما تبعت OTP هتظهر هنا")}
                  </p>
                </div>
              ) : (
                logs.map((log) => {
                  const cfg = STATUS_COLORS[log.status] || STATUS_COLORS.FAILED;
                  const Icon = cfg.icon;
                  const lbl = STATUS_LABELS[log.status] ?? STATUS_LABELS.FAILED;
                  return (
                    <div key={log.id} className="table-row">
                      {/* Status */}
                      <div>
                        <span className="status-badge" style={{ background: cfg.bg, color: cfg.color }}>
                          <span className="status-dot" style={{ background: cfg.color }} />
                          {isAr ? lbl.ar : lbl.en}
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
                            {t("Verified", "تحقق")} {formatTime(log.verifiedAt)}
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
          </div>
        </div>

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {pages > 1 && (
          <div className="pagination">
            <span className="pagination-info">
              {((page - 1) * 20) + 1}–{Math.min(page * 20, total)}{" "}
              {t("of", "من")} {total}
            </span>
            <div className="pagination-btns">
              <button
                className="page-btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
              <span className="page-num">{page} / {pages}</span>
              <button
                className="page-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pages}
              >
                {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}