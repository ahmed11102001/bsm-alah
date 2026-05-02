"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, Check, CheckCheck, MessageSquare, Send, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { NotificationType } from "@prisma/client";

interface Notification {
  id:        string;
  type:      NotificationType;
  title:     string;
  body:      string;
  isRead:    boolean;
  link:      string | null;
  createdAt: string;
}

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  CAMPAIGN_SUCCESS: <CheckCircle  className="w-4 h-4 text-green-500"  />,
  CAMPAIGN_FAILED:  <XCircle      className="w-4 h-4 text-red-500"    />,
  CAMPAIGN_PARTIAL: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  PLAN_LIMIT_REACHED: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  NEW_MESSAGE:      <MessageSquare className="w-4 h-4 text-blue-500"  />,
};

const TYPE_BG: Record<NotificationType, string> = {
  CAMPAIGN_SUCCESS:   "bg-green-50",
  CAMPAIGN_FAILED:    "bg-red-50",
  CAMPAIGN_PARTIAL:   "bg-yellow-50",
  PLAN_LIMIT_REACHED: "bg-orange-50",
  NEW_MESSAGE:        "bg-blue-50",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

interface Props {
  onNavigate?: (section: string) => void;
}

export default function NotificationBell({ onNavigate }: Props) {
  const [open,        setOpen]        = useState(false);
  const [notifs,      setNotifs]      = useState<Notification[]>([]);
  const [unread,      setUnread]      = useState(0);
  const [loading,     setLoading]     = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/notifications");
      if (r.ok) {
        const d = await r.json();
        setNotifs(d.notifications);
        setUnread(d.unreadCount);
      }
    } finally { setLoading(false); }
  }, []);

  // جلب أول مرة + كل 30 ثانية
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // إغلاق لو ضغط برا
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const handleClick = (notif: Notification) => {
    if (!notif.isRead) markAsRead(notif.id);
    if (notif.link && onNavigate) {
      const section = new URL(notif.link, "http://x").searchParams.get("section");
      if (section) { onNavigate(section); setOpen(false); }
    }
  };

  return (
    <div className="relative" ref={ref} dir="rtl">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-900">الإشعارات</span>
              {unread > 0 && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unread} جديد
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#25D366] hover:underline flex items-center gap-1"
                  title="تحديد الكل كمقروء"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  الكل مقروء
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 mr-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-96">
            {loading && notifs.length === 0 ? (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-[#25D366] rounded-full animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">مفيش إشعارات</p>
              </div>
            ) : (
              notifs.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition border-b border-gray-50 last:border-0 ${
                    !notif.isRead ? "bg-blue-50/40" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_BG[notif.type]}`}>
                    {TYPE_ICON[notif.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!notif.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{notif.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
