// src/components/dashboard/NotificationBell.tsx
"use client";
import { ChatListSkeleton } from "@/components/dashboard/DashboardSkeletons";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  X,
  Check,
  CheckCheck,
  MessageSquare,
  Send,
  AlertTriangle,
  XCircle,
  CheckCircle,
  ShoppingBag,
  Clock,
  Wifi,
  Sparkles,
  CheckCircle2,
  Smartphone,
  Bot,
  UserCheck,
  Laptop,
  SlidersHorizontal,
} from "lucide-react";
import { NotificationType } from "@/types/enums";
import { syncPushSubscriptionOnLogin, urlBase64ToUint8Array } from "@/lib/push-client";
import DeviceNotificationModal, {
  ALL_NOTIFICATION_TYPES_LIST,
} from "./DeviceNotificationModal";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  CAMPAIGN_SUCCESS: <CheckCircle className="w-4 h-4 text-green-500" />,
  CAMPAIGN_FAILED: <XCircle className="w-4 h-4 text-red-500" />,
  CAMPAIGN_PARTIAL: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  PLAN_LIMIT_REACHED: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  NEW_MESSAGE: <MessageSquare className="w-4 h-4 text-blue-500" />,
  STORE_AUTO_SENT: <ShoppingBag className="w-4 h-4 text-emerald-500" />,
  STORE_AUTO_FAILED: <ShoppingBag className="w-4 h-4 text-red-500" />,
  SUBSCRIPTION_EXPIRING: <Clock className="w-4 h-4 text-amber-500" />,
  PAYMENT_FAILED: <AlertTriangle className="w-4 h-4 text-red-600" />,
  WHATSAPP_TOKEN_EXPIRING: <Wifi className="w-4 h-4 text-orange-500" />,
  AI_TOKENS_LOW: <Sparkles className="w-4 h-4 text-yellow-500" />,
  SUBSCRIPTION_SUCCESS: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  ORDER_CONFIRMED: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  ORDER_CANCELLED: <XCircle className="w-4 h-4 text-red-500" />,
  AI_HANDOFF_NEEDED: <Bot className="w-4 h-4 text-purple-500" />,
  SMART_FOLLOWUP_ALERT: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  AUTOMATION_FAILED: <XCircle className="w-4 h-4 text-red-500" />,
  AUTOMATION_LOOP_STOPPED: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  TEAM_MEMBER_JOINED: <UserCheck className="w-4 h-4 text-emerald-600" />,
};

const TYPE_BG: Record<NotificationType, string> = {
  CAMPAIGN_SUCCESS: "bg-green-50 dark:bg-green-950/40",
  CAMPAIGN_FAILED: "bg-red-50 dark:bg-red-950/40",
  CAMPAIGN_PARTIAL: "bg-yellow-50 dark:bg-yellow-950/40",
  PLAN_LIMIT_REACHED: "bg-orange-50 dark:bg-orange-950/40",
  NEW_MESSAGE: "bg-blue-50 dark:bg-blue-950/40",
  STORE_AUTO_SENT: "bg-emerald-50 dark:bg-emerald-950/40",
  STORE_AUTO_FAILED: "bg-red-50 dark:bg-red-950/40",
  SUBSCRIPTION_EXPIRING: "bg-amber-50 dark:bg-amber-950/40",
  PAYMENT_FAILED: "bg-red-50 dark:bg-red-950/40",
  WHATSAPP_TOKEN_EXPIRING: "bg-orange-50 dark:bg-orange-950/40",
  AI_TOKENS_LOW: "bg-yellow-50 dark:bg-yellow-950/40",
  SUBSCRIPTION_SUCCESS: "bg-green-50 dark:bg-green-950/40",
  ORDER_CONFIRMED: "bg-green-50 dark:bg-green-950/40",
  ORDER_CANCELLED: "bg-red-50 dark:bg-red-950/40",
  AI_HANDOFF_NEEDED: "bg-purple-50 dark:bg-purple-950/40",
  SMART_FOLLOWUP_ALERT: "bg-orange-50 dark:bg-orange-950/40",
  AUTOMATION_FAILED: "bg-red-50 dark:bg-red-950/40",
  AUTOMATION_LOOP_STOPPED: "bg-yellow-50 dark:bg-yellow-950/40",
  TEAM_MEMBER_JOINED: "bg-emerald-50 dark:bg-emerald-950/40",
};

function timeAgo(dateStr: string, lang: "ar" | "en" = "ar"): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (lang === "en") {
    if (m < 1) return "Just now";
    if (m < 60) return `${m} mins ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hours ago`;
    return `${Math.floor(h / 24)} days ago`;
  }
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

interface Props {
  onNavigate?: (section: string) => void;
  lang?: "ar" | "en";
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// parse bilingual JSON stored as {"ar":"...","en":"..."} — falls back to raw string
function t(raw: string, lang: "ar" | "en"): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && (parsed.ar || parsed.en)) {
      return parsed[lang] ?? parsed.ar ?? raw;
    }
  } catch {
    /* plain string, use as-is */
  }
  return raw;
}

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export default function NotificationBell({
  onNavigate,
  lang = "ar",
  isOpen,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState<NotificationType[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("wani_push_pref_types");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return ALL_NOTIFICATION_TYPES_LIST;
  });

  const ref = useRef<HTMLDivElement>(null);
  const prevUnread = useRef<number>(-1); // -1 = أول تحميل، مش بنعزف فيه

  const playNotifSound = useCallback(() => {
    try {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      if (ctx.state === "suspended") void ctx.resume();

      const master = ctx.createGain();
      master.gain.value = 1;
      // فلتر lowpass بيلطّف الحواف الحادة للنغمة
      const warmth = ctx.createBiquadFilter();
      warmth.type = "lowpass";
      warmth.frequency.value = 2400;
      master.connect(warmth);
      warmth.connect(ctx.destination);

      // رنة هادية لكن مسموعة: E5 → A5 بموجة sine
      // هجوم تدريجي + اضمحلال طويل بدل الصفير السريع الحاد
      const notes = [
        { freq: 659.25, delay: 0 },
        { freq: 880, delay: 0.18 },
      ];
      notes.forEach(({ freq, delay }) => {
        const t0 = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0, t0);
        env.gain.linearRampToValueAtTime(0.15, t0 + 0.05); // هجوم ناعم
        env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6); // اضمحلال هادئ
        osc.connect(env);
        env.connect(master);
        osc.start(t0);
        osc.stop(t0 + 0.65);
      });

      // تنظيف حتى لا تتسرب نسخ AudioContext مع كل إشعار
      window.setTimeout(() => void ctx.close().catch(() => undefined), 1200);
    } catch {
      /* المتصفح منع AudioContext */
    }
  }, []);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/notifications");
      if (r.ok) {
        const d = await r.json();
        setNotifs(d.notifications);
        setUnread(d.unreadCount);
        // عزف الصوت لو جاء إشعار جديد (مش أول تحميل)
        if (prevUnread.current !== -1 && d.unreadCount > prevUnread.current) {
          playNotifSound();
        }
        prevUnread.current = d.unreadCount;
      }
    } finally {
      setLoading(false);
    }
  }, [playNotifSound]);

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
  }, [setOpen]);

  // Check Push Notification Status and sync on login
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPushSupported(false);
      setPushEnabled(false);
      return;
    }

    if (Notification.permission === "granted") {
      // إذن المتصفح ممنوح: مزامنة فورية والتأكد من وجود اشتراك حقيقي ومسجل لهذا المستخدم
      syncPushSubscriptionOnLogin().then((synced) => {
        setPushEnabled(synced);
      });
    } else {
      setPushEnabled(false);
    }
  }, []);

  const togglePush = async () => {
    if (!pushSupported || !VAPID_KEY) return;

    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      if (pushEnabled) {
        // Unsubscribe يدوياً من واجهة الجرس
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const json = sub.toJSON();
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: json.endpoint }),
          }).catch(() => undefined);
          await sub.unsubscribe().catch(() => undefined);
        }
        setPushEnabled(false);
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const success = await syncPushSubscriptionOnLogin();
          setPushEnabled(success);
        } else {
          setPushEnabled(false);
        }
      }
    } catch (err) {
      console.error("[PUSH] Toggle error:", err);
      setPushEnabled(false);
    } finally {
      setPushLoading(false);
    }
  };

  const handleSavePreferences = (types: NotificationType[]) => {
    setSelectedTypes(types);
    try {
      localStorage.setItem("wani_push_pref_types", JSON.stringify(types));
    } catch {}
  };

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const handleClick = (notif: Notification) => {
    if (!notif.isRead) markAsRead(notif.id);
    if (notif.link && onNavigate) {
      const section = new URL(notif.link, "http://x").searchParams.get(
        "section"
      );
      if (section) {
        onNavigate(section);
        setOpen(false);
      }
    }
  };

  return (
    <div className="relative" ref={ref} dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        title={lang === "ar" ? "الإشعارات" : "Notifications"}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel — Works on Desktop & Mobile */}
      {open && (
        <div
          className={`fixed inset-x-4 top-16 w-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 z-50 flex flex-col max-h-[calc(100vh-5rem)] md:absolute md:inset-x-auto md:top-[calc(100%+10px)] md:w-96 md:max-h-[32rem] overflow-hidden ${
            lang === "ar" ? "md:left-0 md:right-auto" : "md:right-0 md:left-auto"
          }`}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {lang === "ar" ? "الإشعارات" : "Notifications"}
              </span>
              {unread > 0 && (
                <span className="bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unread} {lang === "ar" ? "جديد" : "New"}
                </span>
              )}
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="whitespace-nowrap text-xs text-[#25D366] hover:underline flex items-center gap-1 font-medium"
                  title={lang === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {lang === "ar" ? "الكل مقروء" : "Mark all read"}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List Container */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/40">
            {loading && notifs.length === 0 ? (
              <ChatListSkeleton rows={3} />
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-400 dark:text-gray-500">
                <Bell className="w-9 h-9 mb-2 opacity-25" />
                <p className="text-sm">
                  {lang === "ar" ? "مفيش إشعارات" : "No notifications"}
                </p>
              </div>
            ) : (
              notifs.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition ${
                    !notif.isRead
                      ? "bg-blue-50/40 dark:bg-blue-950/20"
                      : "bg-white dark:bg-gray-900"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      TYPE_BG[notif.type]
                    }`}
                  >
                    {TYPE_ICON[notif.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`break-words text-sm leading-snug ${
                        !notif.isRead
                          ? "font-semibold text-gray-900 dark:text-white"
                          : "font-medium text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {t(notif.title, lang)}
                    </p>
                    <p className="break-words text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      {t(notif.body, lang)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {timeAgo(notif.createdAt, lang)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer (Device Push Settings & Preferences Button) — Always visible on Desktop and Phone */}
          {pushSupported && (
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/95 dark:bg-gray-800/90 flex items-center justify-between gap-3">
              {/* Clickable Device Notifications Button */}
              <button
                type="button"
                onClick={() => setIsPrefModalOpen(true)}
                className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-[#128C7E] dark:hover:text-[#25D366] transition-colors group cursor-pointer text-start"
                title={
                  lang === "ar"
                    ? "اضغط لتخصيص إشعارات الجهاز"
                    : "Click to customize device notifications"
                }
              >
                <div className="p-1.5 rounded-xl bg-gray-200/70 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-green-100 dark:group-hover:bg-green-950/60 group-hover:text-[#128C7E] dark:group-hover:text-[#25D366] transition-colors flex items-center justify-center">
                  <Laptop className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold underline decoration-dotted underline-offset-2">
                      {lang === "ar" ? "إشعارات الجهاز" : "Device Notifications"}
                    </span>
                    <SlidersHorizontal className="w-3 h-3 text-gray-400 group-hover:text-[#128C7E] dark:group-hover:text-[#25D366] transition-colors" />
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-400 font-normal">
                    {lang === "ar"
                      ? `مخصص (${selectedTypes.length}/${ALL_NOTIFICATION_TYPES_LIST.length})`
                      : `Selected (${selectedTypes.length}/${ALL_NOTIFICATION_TYPES_LIST.length})`}
                  </span>
                </div>
              </button>

              {/* Push On/Off Switch */}
              <button
                type="button"
                onClick={togglePush}
                disabled={pushLoading}
                title={
                  pushEnabled
                    ? lang === "ar"
                      ? "تعطيل إشعارات الجهاز"
                      : "Disable device notifications"
                    : lang === "ar"
                    ? "تفعيل إشعارات الجهاز"
                    : "Enable device notifications"
                }
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                  pushEnabled ? "bg-[#25D366]" : "bg-gray-300 dark:bg-gray-600"
                } ${
                  pushLoading
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${
                    pushEnabled
                      ? lang === "ar"
                        ? "left-0.5"
                        : "right-0.5"
                      : lang === "ar"
                      ? "right-0.5"
                      : "left-0.5"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Device Notifications Preferences Modal */}
      <DeviceNotificationModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
        lang={lang}
        selectedTypes={selectedTypes}
        onSave={handleSavePreferences}
        pushEnabled={pushEnabled}
        onTogglePush={togglePush}
        pushLoading={pushLoading}
      />
    </div>
  );
}
