"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  Info,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  ExternalLink,
  X,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Notification {
  id: string;
  type: "META_UPDATE" | "BILLING" | "SECURITY" | "SYSTEM";
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

/* ── Config per type ───────────────────────────────────────────────────────── */
const TYPE_CONFIG: Record<
  Notification["type"],
  { icon: typeof Bell; color: string; bg: string; label: string }
> = {
  META_UPDATE: {
    icon: RefreshCw,
    color: "#22c55e",
    bg: "rgba(34,197,94,0.10)",
    label: "Meta",
  },
  BILLING: {
    icon: CreditCard,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    label: "فوترة",
  },
  SECURITY: {
    icon: ShieldCheck,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
    label: "أمان",
  },
  SYSTEM: {
    icon: Info,
    color: "#6366f1",
    bg: "rgba(99,102,241,0.10)",
    label: "نظام",
  },
};

/* ── Time ago helper ───────────────────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `منذ ${days} ي`;
  return new Date(dateStr).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
  });
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /* ── Fetch ────────────────────────────────────────────── */
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/developers/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  /* ── Close on outside click ──────────────────────────── */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  /* ── Mark one read ───────────────────────────────────── */
  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/developers/notifications/${id}/read`, { method: "PUT" });
  }

  /* ── Mark all read ───────────────────────────────────── */
  async function markAllRead() {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetch("/api/developers/notifications/read-all", { method: "PUT" });
    setMarkingAll(false);
  }

  return (
    <>
      <style>{`
        /* ── Bell button ──────────────────────────────────────── */
        .nbell-wrap { position: relative; }

        .nbell-btn {
          width: 34px; height: 34px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, transform 0.15s;
          position: relative;
        }
        .nbell-btn:hover {
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.6);
        }
        .nbell-btn.has-unread {
          animation: nbell-pulse 2s ease-in-out infinite;
        }
        @keyframes nbell-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        /* ── Badge ────────────────────────────────────────────── */
        .nbell-badge {
          position: absolute;
          top: -4px; right: -4px;
          min-width: 17px; height: 17px;
          border-radius: 9px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff;
          font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          padding: 0 4px;
          box-shadow: 0 0 0 2px rgba(6,8,16,0.95), 0 2px 8px rgba(239,68,68,0.4);
          animation: nbell-badge-in 0.35s cubic-bezier(.34,1.56,.64,1);
          line-height: 1;
        }
        @keyframes nbell-badge-in {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        /* ── Panel ────────────────────────────────────────────── */
        .nbell-panel {
          position: absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          width: 380px;
          max-height: 480px;
          background: #0d1117;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          z-index: 999;
          overflow: hidden;
          box-shadow: 0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04);
          animation: nbell-panel-in 0.22s ease-out;
          direction: rtl;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          display: flex;
          flex-direction: column;
        }
        @keyframes nbell-panel-in {
          0% { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* ── Header ───────────────────────────────────────────── */
        .nbell-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .nbell-header-title {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
        }
        .nbell-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nbell-mark-all {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: rgba(32,211,120,0.7);
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.15s, color 0.15s;
        }
        .nbell-mark-all:hover {
          background: rgba(32,211,120,0.08);
          color: #20d378;
        }
        .nbell-mark-all:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .nbell-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px; height: 26px;
          border-radius: 6px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .nbell-close-btn:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.6);
        }

        /* ── List ─────────────────────────────────────────────── */
        .nbell-list {
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .nbell-list::-webkit-scrollbar { width: 4px; }
        .nbell-list::-webkit-scrollbar-track { background: transparent; }
        .nbell-list::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }

        /* ── Item ─────────────────────────────────────────────── */
        .nbell-item {
          display: flex;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          position: relative;
        }
        .nbell-item:hover {
          background: rgba(255,255,255,0.03);
        }
        .nbell-item.unread {
          background: rgba(32,211,120,0.02);
        }
        .nbell-item.unread::before {
          content: '';
          position: absolute;
          right: 0; top: 50%;
          transform: translateY(-50%);
          width: 3px; height: 24px;
          border-radius: 0 3px 3px 0;
          background: #20d378;
        }

        /* ── Icon circle ──────────────────────────────────────── */
        .nbell-icon-circle {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ── Content ──────────────────────────────────────────── */
        .nbell-content {
          flex: 1;
          min-width: 0;
        }
        .nbell-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 3px;
        }
        .nbell-item-title {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nbell-item-time {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .nbell-item-msg {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .nbell-item-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 500;
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 6px;
        }
        .nbell-item-link {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          margin-right: 6px;
        }

        /* ── Empty ────────────────────────────────────────────── */
        .nbell-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
        }
        .nbell-empty-icon {
          width: 48px; height: 48px;
          border-radius: 14px;
          background: rgba(255,255,255,0.04);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
          color: rgba(255,255,255,0.15);
        }
        .nbell-empty-title {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          margin-bottom: 4px;
        }
        .nbell-empty-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.25);
        }

        /* ── Loading shimmer ──────────────────────────────────── */
        .nbell-loading {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .nbell-shimmer {
          height: 52px;
          border-radius: 10px;
          background: linear-gradient(90deg,
            rgba(255,255,255,0.03) 25%,
            rgba(255,255,255,0.06) 50%,
            rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: nbell-shimmer 1.5s ease-in-out infinite;
        }
        @keyframes nbell-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Responsive ───────────────────────────────────────── */
        @media (max-width: 480px) {
          .nbell-panel {
            width: calc(100vw - 24px);
            left: auto;
            right: -8px;
            transform: none;
          }
          @keyframes nbell-panel-in {
            0% { opacity: 0; transform: translateY(-6px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>

      <div className="nbell-wrap" ref={panelRef}>
        {/* ── Bell Button ──────────────────────────────────── */}
        <button
          className={`nbell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="الإشعارات"
          id="notification-bell"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="nbell-badge">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* ── Panel ────────────────────────────────────────── */}
        {open && (
          <div className="nbell-panel">
            {/* Header */}
            <div className="nbell-header">
              <span className="nbell-header-title">الإشعارات</span>
              <div className="nbell-header-actions">
                {unreadCount > 0 && (
                  <button
                    className="nbell-mark-all"
                    onClick={markAllRead}
                    disabled={markingAll}
                  >
                    <CheckCheck size={13} />
                    تعليم الكل مقروء
                  </button>
                )}
                <button
                  className="nbell-close-btn"
                  onClick={() => setOpen(false)}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="nbell-list">
              {loading && notifications.length === 0 ? (
                <div className="nbell-loading">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="nbell-shimmer" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="nbell-empty">
                  <div className="nbell-empty-icon">
                    <Bell size={22} />
                  </div>
                  <div className="nbell-empty-title">لا توجد إشعارات</div>
                  <div className="nbell-empty-desc">
                    ستظهر هنا تحديثات حسابك وإشعاراتك
                  </div>
                </div>
              ) : (
                notifications.map((n) => {
                  const cfg = TYPE_CONFIG[n.type];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      className={`nbell-item ${!n.isRead ? "unread" : ""}`}
                      onClick={() => {
                        if (!n.isRead) markRead(n.id);
                        if (n.link) window.open(n.link, "_blank");
                      }}
                    >
                      <div
                        className="nbell-icon-circle"
                        style={{ background: cfg.bg }}
                      >
                        <Icon size={17} style={{ color: cfg.color }} />
                      </div>
                      <div className="nbell-content">
                        <div className="nbell-item-header">
                          <span className="nbell-item-title">{n.title}</span>
                          <span className="nbell-item-time">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <div className="nbell-item-msg">{n.message}</div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span
                            className="nbell-item-tag"
                            style={{
                              color: cfg.color,
                              background: cfg.bg,
                            }}
                          >
                            {cfg.label}
                          </span>
                          {n.link && (
                            <span
                              className="nbell-item-link nbell-item-tag"
                              style={{
                                color: "rgba(255,255,255,0.3)",
                                background: "rgba(255,255,255,0.04)",
                              }}
                            >
                              <ExternalLink size={9} />
                              تفاصيل
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
