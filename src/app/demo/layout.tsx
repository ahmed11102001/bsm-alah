"use client";

// ─────────────────────────────────────────────────────────────────────────
// نسخة الديمو من src/app/dashboard/layout.tsx
// نفس الشكل والسلوك البصري بالظبط. الفروق المتعمدة عن النسخة الحقيقية:
//   1. مفيش NextAuth session حقيقية — بيانات المستخدم جايه من DEMO_DASHBOARD_DATA.
//   2. SubscriptionProvider هنا بيرجع بيانات وهمية فورًا (مفيش fetch("/api/dashboard")).
//   3. اتشالت 4 ويدجتس كانت بتعمل نداءات حقيقية (تكلفة/سبام محتمل من زوار
//      الديمو): NotificationBell الحقيقي (بدّلناه بجرس ثابت البيانات)،
//      DashboardAssistant (مساعد Claude AI — هيكلف فلوس لو سابته شغال على
//      نطاق عام)، PushNotificationPrompt، ReviewPrompt.
//   4. زرار "تسجيل الخروج" بيرجع لـ "/" بدل ما يعمل signOut حقيقي.
//   5. الإعدادات: أي محاولة حفظ بترجع toast "متاح في النسخة الكاملة" بدل ما
//      تعمل fetch حقيقي على /api/me/settings.
// ─────────────────────────────────────────────────────────────────────────

import "@/app/globals.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { SubscriptionProvider, useSubscription, type DashboardData } from "./_lib/dashboard-context";
import {
  SIDEBAR_IDS, PLAN_COLORS, sidebarHref,
} from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users, Settings, LogOut, Phone, Mail,
  Lock, Wifi, Sun, Moon, Monitor, Languages, Bell,
  PanelLeftClose, PanelLeftOpen, CheckCircle, XCircle, AlertTriangle,
  ShoppingBag, Clock, Sparkles, CheckCircle2, Bot, MessageSquare, CheckCheck, X,
  Laptop, SlidersHorizontal,
} from "lucide-react";
import DemoModeBanner from "./_components/DemoModeBanner";
import { DEMO_NOTIFICATIONS, type DemoNotification } from "./_lib/demo-data";
import DeviceNotificationModal, { ALL_NOTIFICATION_TYPES_LIST } from "@/components/dashboard/DeviceNotificationModal";

// ─── Theme Toggle (نفس الأصلي بالظبط، مفيش فيه أي fetch) ─────────────────────
function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={compact ? "w-9 h-9" : "w-full h-10"} />;

  const cycle = () => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  const icon = theme === "dark" ? <Moon className="w-4 h-4" /> : theme === "light" ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />;
  const label = theme === "dark" ? t.theme.dark : theme === "light" ? t.theme.light : t.theme.system;

  if (compact) return (
    <button onClick={cycle} title={label}
      className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
      {icon}
    </button>
  );

  return (
    <button onClick={cycle}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-sm">
      {icon}<span>{label}</span>
    </button>
  );
}

// ─── Language Toggle (نفس الأصلي بالظبط) ──────────────────────────────────────
function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  const toggle = () => setLocale(locale === "ar" ? "en" : "ar");
  const label = locale === "ar" ? "EN" : "ع";

  if (compact) return (
    <button onClick={toggle} title={locale === "ar" ? "Switch to English" : "تبديل للعربية"}
      className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors flex items-center justify-center gap-1">
      <Languages className="w-4 h-4" />
      <span className="text-xs font-bold leading-none">{label}</span>
    </button>
  );

  return (
    <button onClick={toggle}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-sm">
      <Languages className="w-4 h-4" />
      <span>{locale === "ar" ? "English" : "العربية"}</span>
    </button>
  );
}

// ─── جرس إشعارات — نسخة كاملة من NotificationBell الحقيقي (نفس الأيقونة/اللون
// لكل نوع، نفس الـ badge والـ mark-as-read)، بس بيانات ثابتة من غير polling ──
const NOTIF_ICON: Record<DemoNotification["type"], React.ReactNode> = {
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
};

const NOTIF_BG: Record<DemoNotification["type"], string> = {
  CAMPAIGN_SUCCESS: "bg-green-50 dark:bg-green-900/20",
  CAMPAIGN_FAILED: "bg-red-50 dark:bg-red-900/20",
  CAMPAIGN_PARTIAL: "bg-yellow-50 dark:bg-yellow-900/20",
  PLAN_LIMIT_REACHED: "bg-orange-50 dark:bg-orange-900/20",
  NEW_MESSAGE: "bg-blue-50 dark:bg-blue-900/20",
  STORE_AUTO_SENT: "bg-emerald-50 dark:bg-emerald-900/20",
  STORE_AUTO_FAILED: "bg-red-50 dark:bg-red-900/20",
  SUBSCRIPTION_EXPIRING: "bg-amber-50 dark:bg-amber-900/20",
  PAYMENT_FAILED: "bg-red-50 dark:bg-red-900/20",
  WHATSAPP_TOKEN_EXPIRING: "bg-orange-50 dark:bg-orange-900/20",
  AI_TOKENS_LOW: "bg-yellow-50 dark:bg-yellow-900/20",
  SUBSCRIPTION_SUCCESS: "bg-green-50 dark:bg-green-900/20",
  ORDER_CONFIRMED: "bg-green-50 dark:bg-green-900/20",
  ORDER_CANCELLED: "bg-red-50 dark:bg-red-900/20",
  AI_HANDOFF_NEEDED: "bg-purple-50 dark:bg-purple-900/20",
  SMART_FOLLOWUP_ALERT: "bg-orange-50 dark:bg-orange-900/20",
};

function timeAgoAr(dateStr: string, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (locale !== "ar") {
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

function DemoNotificationBell() {
  const { locale, dir } = useLanguage();
  const lang: "ar" | "en" = locale === "en" ? "en" : "ar";
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<DemoNotification[]>(DEMO_NOTIFICATIONS);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(ALL_NOTIFICATION_TYPES_LIST);
  const unread = notifs.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));

  const handleTogglePush = () => {
    setPushEnabled(p => !p);
    toast.success(
      lang === "ar"
        ? !pushEnabled ? "تم تفعيل إشعارات الجهاز بنجاح! ✅ (وضع الديمو)" : "تم تعطيل إشعارات الجهاز"
        : !pushEnabled ? "Device notifications enabled! ✅ (Demo Mode)" : "Device notifications disabled"
    );
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute ${dir === "rtl" ? "left-0" : "right-0"} top-11 z-50 w-[24rem] max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[32rem]`}>
            <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{lang === "ar" ? "الإشعارات" : "Notifications"}</span>
                {unread > 0 && (
                  <span className="bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    {unread} {lang === "ar" ? "جديد" : "New"}
                  </span>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                {unread > 0 && (
                  <button onClick={markAllRead} className="whitespace-nowrap text-xs text-[#25D366] hover:underline flex items-center gap-1 font-medium">
                    <CheckCheck className="w-3.5 h-3.5" />
                    {lang === "ar" ? "الكل مقروء" : "Mark all read"}
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/40">
              {notifs.map(notif => (
                <div key={notif.id} onClick={() => markAsRead(notif.id)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition ${!notif.isRead ? "bg-blue-50/40 dark:bg-blue-950/20" : "bg-white dark:bg-gray-900"}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${NOTIF_BG[notif.type]}`}>
                    {NOTIF_ICON[notif.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`break-words text-sm leading-snug ${!notif.isRead ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-300"}`}>
                      {notif.title[lang]}
                    </p>
                    <p className="break-words text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug whitespace-pre-line">{notif.body[lang]}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{timeAgoAr(notif.createdAt, locale)}</p>
                  </div>
                  {!notif.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                </div>
              ))}
            </div>

            {/* Footer — Device Notifications button & toggle */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/95 dark:bg-gray-800/90 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsPrefModalOpen(true)}
                className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-[#128C7E] dark:hover:text-[#25D366] transition-colors group cursor-pointer text-start"
                title={lang === "ar" ? "اضغط لتخصيص إشعارات الجهاز" : "Click to customize device notifications"}
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
                    {lang === "ar" ? `مخصص (${selectedTypes.length}/${ALL_NOTIFICATION_TYPES_LIST.length})` : `Selected (${selectedTypes.length}/${ALL_NOTIFICATION_TYPES_LIST.length})`}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleTogglePush}
                title={pushEnabled ? (lang === "ar" ? "تعطيل إشعارات الجهاز" : "Disable device notifications") : (lang === "ar" ? "تفعيل إشعارات الجهاز" : "Enable device notifications")}
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${pushEnabled ? 'bg-[#25D366]' : 'bg-gray-300 dark:bg-gray-600'} cursor-pointer`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${pushEnabled ? (lang === "ar" ? 'left-0.5' : 'right-0.5') : (lang === "ar" ? 'right-0.5' : 'left-0.5')}`}
                />
              </button>
            </div>
          </div>

          <DeviceNotificationModal
            isOpen={isPrefModalOpen}
            onClose={() => setIsPrefModalOpen(false)}
            lang={lang}
            selectedTypes={selectedTypes}
            onSave={(types) => setSelectedTypes(types)}
            pushEnabled={pushEnabled}
            onTogglePush={handleTogglePush}
          />
        </>
      )}
    </div>
  );
}

// ─── Settings Modal (نفس الأصلي بصريًا، الحفظ بيعمل toast بدل fetch حقيقي) ────
function SettingsModal({ open, onClose, data }: {
  open: boolean; onClose: () => void;
  data: DashboardData | null;
}) {
  const { t, dir, locale } = useLanguage();
  const s = t.settings;
  const [name, setName] = useState(data?.user.name ?? "");
  const [phone, setPhone] = useState(data?.user.phone ?? "");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [wAccessToken, setWAccessToken] = useState("");
  const [wPhoneNumberId, setWPhoneNumberId] = useState(data?.whatsapp?.phoneNumberId ?? "");
  const [wWabaId, setWWabaId] = useState(data?.whatsapp?.wabaId ?? "");

  const demoLocked = () => {
    toast.message(locale === "ar" ? "🔒 متاح في النسخة الكاملة" : "🔒 Available in the full version", {
      description: locale === "ar" ? "سجّل مجانًا عشان تقدر تعدّل بيانات حسابك فعليًا." : "Sign up for free to actually edit your account data.",
    });
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="settings-dialog max-w-lg p-4 sm:p-6" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#25D366]" /> {s.title}
          </DialogTitle>
          <DialogDescription>{s.description}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" dir={dir} className="settings-tabs min-w-0">
          <TabsList className="w-full mb-4 h-auto min-h-10 gap-1 overflow-x-auto justify-start">
            <TabsTrigger value="profile" className="flex-1 min-w-[7rem] text-xs">{s.tabs.profile}</TabsTrigger>
            <TabsTrigger value="password" className="flex-1 min-w-[7rem] text-xs">{s.tabs.password}</TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex-1 min-w-[7rem] text-xs">{s.tabs.whatsapp}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-2">
              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold flex-shrink-0">
                {(data.user.name ?? data.user.email).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{data.user.name ?? "—"}</p>
                <p className="text-xs text-gray-400">{data.user.email}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{s.profile.fullName}</Label>
              <div className="relative">
                <Users className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input value={name} onChange={e => setName(e.target.value)} className="pr-9 text-sm rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{s.profile.phone}</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input dir="ltr" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="201234567890" className="pr-9 text-sm rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{s.profile.email}</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input value={data.user.email} disabled
                  className="pr-9 text-sm rounded-xl bg-gray-50 dark:bg-gray-800 cursor-not-allowed" />
              </div>
            </div>
            <Button onClick={demoLocked}
              className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl">
              {s.profile.saveBtn}
            </Button>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{s.password.current}</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} className="pr-9 text-sm rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{s.password.new}</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="pr-9 text-sm rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{s.password.confirm}</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input type="password" value={confPw} onChange={e => setConfPw(e.target.value)} className="pr-9 text-sm rounded-xl" />
              </div>
            </div>
            <Button onClick={demoLocked} className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl">
              {s.password.changeBtn}
            </Button>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
              <Wifi className="w-4 h-4 inline ml-1" />
              {s.whatsapp.hint}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{s.whatsapp.accessToken}</Label>
              <Input dir="ltr" type="password" value={wAccessToken} onChange={e => setWAccessToken(e.target.value)}
                placeholder="EAAxxxxxx..." className="text-sm rounded-xl font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{s.whatsapp.phoneNumberId}</Label>
              <Input dir="ltr" value={wPhoneNumberId} onChange={e => setWPhoneNumberId(e.target.value)}
                className="text-sm rounded-xl font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{s.whatsapp.wabaId}</Label>
              <Input dir="ltr" value={wWabaId} onChange={e => setWWabaId(e.target.value)}
                className="text-sm rounded-xl font-mono" />
            </div>
            <Button onClick={demoLocked} className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl">
              {s.whatsapp.saveBtn}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Claude Header Badge (نفس الأصلي بالظبط — عرض ثابت مفيهوش أي fetch) ───────
function ClaudeHeaderBadge({ locale, dir, onNavigate, isOpen = false, onOpenChange }: {
  locale: string;
  dir: string;
  onNavigate: (section: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const showMenu = onOpenChange ? isOpen : internalOpen;
  const setShowMenu = onOpenChange
    ? (open: boolean) => onOpenChange(open)
    : setInternalOpen;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        title="Claude AI"
        className="relative p-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors group"
      >
        <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow overflow-hidden">
          <img src="/partners/claude.svg.svg" alt="Claude" className="w-5 h-5 object-contain" />
        </div>
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900">
          <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
        </span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className={`absolute ${dir === "rtl" ? "left-0" : "right-0"} top-11 z-50 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden`}>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <img src="/partners/claude.svg.svg" alt="" className="w-5 h-5 object-contain" onError={e => (e.target as HTMLImageElement).style.display = "none"} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Claude AI</p>
                <p className="text-[11px] text-orange-100">{locale === "ar" ? "مربوط ويعمل ✓" : "Connected & active ✓"}</p>
              </div>
            </div>

            <div className="p-3 space-y-1.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
                {locale === "ar" ? "قول لـ Claude في Desktop App:" : "Tell Claude in Desktop App:"}
              </p>
              {(locale === "ar" ? [
                { icon: "📊", text: "\"اعملي تقرير عن آخر حملة\"" },
                { icon: "🚀", text: "\"أنشئ حملة على قائمة VIP\"" },
                { icon: "💬", text: "\"فيه كام رسالة واردة؟\"" },
                { icon: "👥", text: "\"اعرضلي قوائم الجمهور\"" },
              ] : [
                { icon: "📊", text: "\"Give me a report on the last campaign\"" },
                { icon: "🚀", text: "\"Create a campaign for VIP list\"" },
                { icon: "💬", text: "\"How many unread messages?\"" },
                { icon: "👥", text: "\"Show me my contact lists\"" },
              ]).map((cmd, i) => (
                <div key={i} className="flex items-start gap-2 px-2 py-2 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm flex-shrink-0">{cmd.icon}</span>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 font-mono leading-snug">{cmd.text}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2.5 flex items-center justify-between">
              <button
                onClick={() => { setShowMenu(false); onNavigate("api"); }}
                className="text-xs text-orange-500 hover:text-orange-600 font-medium"
              >
                {locale === "ar" ? "إدارة الربط" : "Manage connection"}
              </button>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                {locale === "ar" ? "نشط" : "Active"}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UserMenuBadge({ initials, displayName, planName, dir, onOpenSettings, locale }: { initials: string, displayName: string, planName: string, dir: string, onOpenSettings: () => void, locale: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 focus:outline-none rounded-full">
        <div className={`${dir === "rtl" ? "text-right" : "text-left"} hidden sm:block`}>
          <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-white">{displayName}</p>
          <p className="text-[10px] text-gray-400">{planName}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#25D366] hover:bg-[#20bb5a] transition-colors flex items-center justify-center text-white text-sm font-bold shadow-sm ring-2 ring-transparent hover:ring-[#25D366]/20">
          {initials}
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute ${dir === "rtl" ? "left-0" : "right-0"} top-11 z-50 w-56 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden`}>
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 sm:hidden">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{displayName}</p>
              <p className="text-xs text-gray-500">{planName}</p>
            </div>

            <div className="p-2 space-y-0.5">
              <button onClick={() => { setIsOpen(false); onOpenSettings(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-sm">
                <Settings className="w-4 h-4" />
                <span>{locale === "ar" ? "الإعدادات" : "Settings"}</span>
              </button>

              <div onClick={() => setIsOpen(false)} className="w-full">
                <LanguageToggle />
              </div>
              <div onClick={() => setIsOpen(false)} className="w-full">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Dashboard Shell (Sidebar + Topbar + Mobile Menu) ────────────────────────
function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const [activeTopPanel, setActiveTopPanel] = useState<"claude" | "notifications" | null>(null);
  const { t, dir, locale } = useLanguage();
  const { dashData } = useSubscription();
  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // "/demo" → "home", "/demo/campaigns" → "campaigns" ... إلخ
  const activeSection = pathname === "/demo" ? "home" : (pathname.split("/")[2] ?? "home");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("wani_demo_sidebar_collapsed");
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("wani_demo_sidebar_collapsed", String(next));
      return next;
    });
  };

  const openSettings = () => {
    setActiveTopPanel(null);
    setShowSettings(true);
  };

  const openNotifications = (open: boolean) => {
    setActiveTopPanel(open ? "notifications" : null);
  };

  const openClaudePanel = (open: boolean) => {
    setActiveTopPanel(open ? "claude" : null);
  };

  const navigateTo = (section: string) => router.push(sidebarHref(section));

  const sidebarItems = SIDEBAR_IDS.map(item => ({
    ...item,
    label: t.sidebar[item.id as keyof typeof t.sidebar],
  }));

  const displayName = dashData?.user.name ?? (locale === "ar" ? "المستخدم" : "User");
  const initials = displayName.slice(0, 2).toUpperCase();
  const planName = dashData?.plan.planName ?? "—";
  const planColor = PLAN_COLORS[dashData?.plan.plan ?? "free"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200" dir={dir}>
      <DemoModeBanner />
      <div className="flex flex-1 min-h-0">

        {/* ── Desktop Sidebar ── */}
        <aside className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 fixed top-9 bottom-0 z-40 hidden lg:flex flex-col transition-all duration-300 ${sidebarCollapsed ? "w-20" : "w-64"
          } ${dir === "rtl" ? "border-l right-0" : "border-r left-0"}`}>
          <div className={`h-16 flex items-center border-b border-gray-100 dark:border-gray-700 flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? "justify-center px-2" : "px-6"
            }`}>
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src="/faviconlink.svg" alt="WANI" className="w-full h-full object-cover" />
              </div>
              {!sidebarCollapsed && (
                <span className="text-lg font-bold truncate">
                  {locale === "ar" ? "وني" : "WANI"}
                </span>
              )}
            </div>
          </div>

          <nav className="p-3 space-y-1 flex-1 overflow-y-auto overflow-x-hidden">
            {sidebarItems.map((item) => (
              <Link key={item.id} href={sidebarHref(item.id)}
                data-sidebar-id={item.id}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${sidebarCollapsed ? "justify-center px-0" : ""
                  } ${activeSection === item.id
                    ? "bg-[#25D366]/10 text-[#25D366] font-semibold"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}>
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-100 dark:border-gray-700 p-3 flex-shrink-0 space-y-1">
            <ThemeToggle compact={sidebarCollapsed} />
            <LanguageToggle compact={sidebarCollapsed} />

            {!sidebarCollapsed ? (
              <div className="flex items-center gap-2.5 py-2">
                <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{displayName}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${planColor}`}>{planName}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-2" title={`${displayName} (${planName})`}>
                <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {initials}
                </div>
              </div>
            )}

            <button onClick={() => router.push("/")}
              title={sidebarCollapsed ? t.signOut : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm ${sidebarCollapsed ? "justify-center px-0" : ""
                }`}>
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>{locale === "ar" ? "الخروج من الديمو" : "Exit demo"}</span>}
            </button>
          </div>
        </aside>

        {/* ── Mobile Full-Screen Menu ── */}
        {mobileMenuOpen && (
          <div
            dir={dir}
            className="lg:hidden fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#25D366] flex items-center justify-center overflow-hidden">
                  <img src="/faviconlink.svg" alt="WANI" className="w-full h-full object-cover" />
                </div>
                <span className="text-base font-bold">
                  {locale === "ar" ? "وني" : "WANI"}
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3 mx-4 mt-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{displayName}</p>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${planColor}`}>{planName}</span>
              </div>
            </div>

            <nav className="px-4 mt-4 space-y-1.5">
              {sidebarItems.map((item) => (
                <Link
                  key={item.id}
                  href={sidebarHref(item.id)}
                  data-sidebar-id={item.id}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[15px] font-medium transition-all ${activeSection === item.id
                    ? "bg-[#25D366] text-white shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                    }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="px-4 mt-4 mb-6 space-y-1.5">
              <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                  <ThemeToggle />
                </div>
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                  <LanguageToggle />
                </div>
                <button
                  onClick={() => { openSettings(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-[15px] text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700"
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  <span>{locale === "ar" ? "الإعدادات" : "Settings"}</span>
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-[15px] text-red-500"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span>{locale === "ar" ? "الخروج من الديمو" : "Exit demo"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Main ── */}
        <main className={`flex-1 min-w-0 transition-all duration-300 ${dir === "rtl"
            ? (sidebarCollapsed ? "lg:mr-20" : "lg:mr-64")
            : (sidebarCollapsed ? "lg:ml-20" : "lg:ml-64")
          }`}>
          {/* Header */}
          <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6 sticky top-9 z-30 transition-colors duration-200">

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              aria-label="Open menu"
            >
              <div className="flex flex-col gap-[5px]">
                <span className="block w-[18px] h-0.5 bg-current rounded-full" />
                <span className="block w-[18px] h-0.5 bg-current rounded-full" />
                <span className="block w-[18px] h-0.5 bg-current rounded-full" />
              </div>
            </button>

            <button
              onClick={toggleSidebar}
              className="hidden lg:flex items-center p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={sidebarCollapsed ? (locale === "ar" ? "توسيع القائمة" : "Expand sidebar") : (locale === "ar" ? "طي القائمة" : "Collapse sidebar")}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>

            <div className="flex-1 hidden lg:block" />

            <div className="flex items-center gap-2">
              <DemoNotificationBell />

              <ClaudeHeaderBadge
                locale={locale}
                dir={dir}
                onNavigate={navigateTo}
                isOpen={activeTopPanel === "claude"}
                onOpenChange={openClaudePanel}
              />

              <UserMenuBadge
                initials={initials}
                displayName={displayName}
                planName={planName}
                dir={dir}
                onOpenSettings={openSettings}
                locale={locale}
              />
            </div>
          </header>

          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>

        <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} data={dashData} />
      </div>
    </div>
  );
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SubscriptionProvider>
        <DashboardShellInner>{children}</DashboardShellInner>
      </SubscriptionProvider>
    </LanguageProvider>
  );
}