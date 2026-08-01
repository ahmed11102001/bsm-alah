"use client";

import "@/app/globals.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { SubscriptionProvider, useSubscription, type DashboardData } from "@/lib/dashboard-context";
import {
  SIDEBAR_IDS, adminItem, PLAN_COLORS, sidebarHref,
} from "@/app/dashboard/_shared";
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
  Users, Settings, LogOut, Loader2, Shield, Phone, Mail,
  Lock, Wifi, Sun, Moon, Monitor, Languages,
} from "lucide-react";
import NotificationBell from "@/components/dashboard/NotificationBell";
import DashboardAssistant from "@/components/dashboard/assistant";
import ReviewPrompt from "@/components/dashboard/ReviewPrompt";
import PushNotificationPrompt from "@/components/dashboard/PushNotificationPrompt";

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
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

// ─── Language Toggle ──────────────────────────────────────────────────────────
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

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ open, onClose, data, onSaved }: {
  open: boolean; onClose: () => void;
  data: DashboardData | null; onSaved: () => void;
}) {
  const { t, dir, locale } = useLanguage();
  const router = useRouter();
  const s = t.settings;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  // local state لـ hasPassword عشان الـ UI يتحدث فوراً بعد إنشاء كلمة المرور
  const [hasPassword, setHasPassword] = useState(data?.user.hasPassword ?? false);

  // لما data يتغير (مثلاً بعد fetchDash) — sync الـ state
  useEffect(() => {
    setHasPassword(data?.user.hasPassword ?? false);
  }, [data?.user.hasPassword]);
  const [wAccessToken, setWAccessToken] = useState("");
  const [wPhoneNumberId, setWPhoneNumberId] = useState("");
  const [wWabaId, setWWabaId] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.user.name ?? "");
      setPhone(data.user.phone ?? "");
      setWPhoneNumberId(data.whatsapp?.phoneNumberId ?? "");
      setWWabaId(data.whatsapp?.wabaId ?? "");
    }
  }, [data]);

  const save = async (type: string, payload: object) => {
    setSaving(true);
    try {
      const r = await fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...payload }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(s.profile.saved);
      onSaved();
      if (type === "password") { setCurPw(""); setNewPw(""); setConfPw(""); }
      if (type === "create_password") {
        // حدّث الـ UI فوراً بدون ما نستنى fetchDash
        setHasPassword(true);
        setNewPw(""); setConfPw("");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const r = await fetch("/api/me/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePw }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(locale === "ar" ? "تم حذف الحساب" : "Account deleted");
      onClose();
      await signOut({ redirect: false });
      router.replace("/");
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  if (!data) return null;
  const isOwner = !((data.user as any).parentId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#25D366]" /> {s.title}
          </DialogTitle>
          <DialogDescription>{s.description}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" dir={dir}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="profile" className="flex-1 text-xs">{s.tabs.profile}</TabsTrigger>
            <TabsTrigger value="password" className="flex-1 text-xs">{s.tabs.password}</TabsTrigger>
            {isOwner && <TabsTrigger value="whatsapp" className="flex-1 text-xs">{s.tabs.whatsapp}</TabsTrigger>}
          </TabsList>

          {/* ── Profile ── */}
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
              <p className="text-xs text-gray-400">{s.profile.emailHint}</p>
            </div>
            <Button onClick={() => save("profile", { name, phone })} disabled={saving}
              className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl">
              {saving && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
              {s.profile.saveBtn}
            </Button>

            {/* ── Account Deletion ── */}
            <div className="pt-4 mt-6 border-t border-red-100 dark:border-red-900/30 space-y-2">
              {!showDeleteConfirm ? (
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="w-full rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border-none shadow-none">
                  {locale === "ar" ? "حذف الحساب نهائياً" : "Delete Account Permanently"}
                </Button>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3 text-red-800 dark:text-red-300">
                  <p className="text-sm font-bold flex items-center gap-1.5"><Shield className="w-4 h-4" /> {locale === "ar" ? "⚠️ حذف الحساب نهائياً" : "⚠️ Permanent Deletion"}</p>
                  <p className="text-xs leading-relaxed">
                    {locale === "ar" ? "سيتم حذف جميع حملاتك، جهات الاتصال، القوالب، بيانات الاشتراك، وربط الواتساب. هذا الإجراء لا يمكن التراجع عنه." : "All your campaigns, contacts, templates, subscription data, and WhatsApp connection will be deleted. This action cannot be undone."}
                  </p>

                  {hasPassword && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">{locale === "ar" ? "أدخل كلمة المرور للتأكيد:" : "Enter password to confirm:"}</Label>
                      <Input type="password" value={deletePw} onChange={e => setDeletePw(e.target.value)} className="text-sm rounded-xl bg-white dark:bg-gray-800 border-red-200 dark:border-red-800" />
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      {locale === "ar" ? "إلغاء" : "Cancel"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={deleteAccount} disabled={deleting || (hasPassword && !deletePw)} className="flex-1 rounded-xl">
                      {deleting && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
                      {locale === "ar" ? "نعم، احذف حسابي" : "Yes, delete my account"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Password ── */}
          <TabsContent value="password" className="space-y-4">
            {!hasPassword ? (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3 mb-2">
                <p className="text-sm font-bold text-blue-800 dark:text-blue-300">🔐 {locale === "ar" ? "إنشاء كلمة مرور" : "Create Password"}</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  {locale === "ar" ? "حسابك مرتبط بـ Google فقط. يمكنك إنشاء كلمة مرور لتسجيل الدخول بالإيميل أيضاً." : "Your account is linked to Google. Create a password to also log in with email."}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-sm">{s.password.current}</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} className="pr-9 text-sm rounded-xl" />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm">{s.password.new}</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="pr-9 text-sm rounded-xl" />
              </div>
              {newPw && (
                <div className="flex gap-1 mt-1">
                  {[4, 6, 8, 10].map((threshold, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${newPw.length >= threshold
                      ? i < 1 ? "bg-red-400" : i < 2 ? "bg-orange-400" : i < 3 ? "bg-yellow-400" : "bg-green-400"
                      : "bg-gray-200 dark:bg-gray-700"
                      }`} />
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{s.password.confirm}</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input type="password" value={confPw} onChange={e => setConfPw(e.target.value)}
                  className={`pr-9 text-sm rounded-xl ${confPw && newPw !== confPw ? "border-red-400" : ""}`} />
              </div>
              {confPw && newPw !== confPw && <p className="text-xs text-red-500">{s.password.mismatch}</p>}
            </div>
            <Button
              onClick={() => { if (newPw !== confPw) { toast.error(s.password.mismatch); return; } save(hasPassword ? "password" : "create_password", hasPassword ? { currentPassword: curPw, newPassword: newPw } : { newPassword: newPw }); }}
              disabled={saving || (hasPassword && !curPw) || !newPw || newPw !== confPw}
              className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl">
              {saving && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
              {hasPassword ? s.password.changeBtn : (locale === "ar" ? "إنشاء كلمة المرور" : "Create Password")}
            </Button>
          </TabsContent>

          {/* ── WhatsApp ── */}
          {isOwner && (
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
              <Button
                onClick={() => save("whatsapp", { accessToken: wAccessToken, phoneNumberId: wPhoneNumberId, wabaId: wWabaId })}
                disabled={saving || !wAccessToken || !wPhoneNumberId || !wWabaId}
                className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl">
                {saving && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
                {s.whatsapp.saveBtn}
              </Button>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

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
  const { data: session } = useSession();
  const [claudeConnected, setClaudeConnected] = useState(false);
  const [activeTopPanel, setActiveTopPanel] = useState<"claude" | "assistant" | "notifications" | null>(null);

  useEffect(() => {
    fetch("/api/me/api-key")
      .then(r => r.ok ? r.json() : { apiKey: "" })
      .then(d => setClaudeConnected(!!d.apiKey))
      .catch(() => { });
  }, []);

  const { t, dir, locale } = useLanguage();
  const { dashData, loadingDash, refreshDash, hasMetaConnection, isSuper } = useSubscription();
  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // "/dashboard" → "home", "/dashboard/campaigns" → "campaigns" ... إلخ
  const activeSection = pathname === "/dashboard" ? "home" : (pathname.split("/")[2] ?? "home");

  useEffect(() => {
    const handleTriggerReview = () => {
      if (!dashData || dashData.user.hasTestimonial) return;
      const lastPrompt = localStorage.getItem("last_review_prompt");
      if (lastPrompt) {
        const diffDays = (Date.now() - parseInt(lastPrompt)) / (1000 * 60 * 60 * 24);
        if (diffDays < 1) return; // Cooldown is 1 day
      }
      setShowReviewPrompt(true);
      localStorage.setItem("last_review_prompt", Date.now().toString());
    };

    window.addEventListener("trigger-review-prompt", handleTriggerReview);
    return () => window.removeEventListener("trigger-review-prompt", handleTriggerReview);
  }, [dashData]);

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

  const openAssistantPanel = (open: boolean) => {
    setActiveTopPanel(open ? "assistant" : null);
  };

  // نفس التنقل البرمجي القديم (كان window event / setActiveSection) بقى router.push حقيقي
  const navigateTo = (section: string) => router.push(sidebarHref(section));

  useEffect(() => {
    const h = (e: any) => { if (e.detail) navigateTo(e.detail); };
    window.addEventListener("navigate-to", h);
    return () => window.removeEventListener("navigate-to", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build sidebar items from translations
  const sidebarItems = SIDEBAR_IDS.map(item => ({
    ...item,
    label: t.sidebar[item.id as keyof typeof t.sidebar],
  }));

  const displayName = dashData?.user.name ?? session?.user?.name ?? (locale === "ar" ? "المستخدم" : "User");
  const initials = displayName.slice(0, 2).toUpperCase();
  const planName = dashData?.plan.planName ?? "—";
  const planColor = PLAN_COLORS[dashData?.plan.plan ?? "free"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors duration-200" dir={dir}>

      {/* ── Desktop Sidebar ── */}
      <aside className={`w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 fixed top-0 bottom-0 z-40 hidden lg:flex flex-col transition-colors duration-200 ${dir === "rtl" ? "border-l right-0" : "border-r left-0"}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center overflow-hidden">
            <img src="/favicon.svg" alt="WANI" className="w-full h-full object-cover" />
          </div>
          <span className="text-lg font-bold mx-3">
            {locale === "ar" ? "وني" : "WANI"}
          </span>
        </div>

        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <Link key={item.id} href={sidebarHref(item.id)}
              data-sidebar-id={item.id}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${activeSection === item.id
                ? "bg-[#25D366]/10 text-[#25D366] font-semibold"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}>
              <item.icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
            </Link>
          ))}

          {isSuper && (
            <Link href={sidebarHref("admin")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mt-2 ${activeSection === "admin"
                ? "bg-red-50 dark:bg-red-900/20 text-red-600 font-semibold"
                : "text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                }`}>
              <adminItem.icon className="w-[18px] h-[18px]" />
              <span>{t.sidebar.admin}</span>
            </Link>
          )}
        </nav>

        <div className="border-t border-gray-100 dark:border-gray-700 p-4 flex-shrink-0 space-y-1">
          <ThemeToggle />
          <LanguageToggle />

          <div className="flex items-center gap-2.5 py-2">
            <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${planColor}`}>{planName}</span>
            </div>
          </div>

          <button onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm">
            <LogOut className="w-4 h-4" /><span>{t.signOut}</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Full-Screen Menu ── */}
      {mobileMenuOpen && (
        <div
          dir={dir}
          className="lg:hidden fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col overflow-y-auto"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#25D366] flex items-center justify-center overflow-hidden">
                <img src="/favicon.svg" alt="WANI" className="w-full h-full object-cover" />
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

          {/* User info */}
          <div className="flex items-center gap-3 mx-4 mt-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{displayName}</p>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${planColor}`}>{planName}</span>
            </div>
          </div>

          {/* Nav items */}
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

            {isSuper && (
              <Link
                href={sidebarHref("admin")}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[15px] font-medium transition-all ${activeSection === "admin"
                  ? "bg-red-500 text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 text-red-500"
                  }`}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span>{t.sidebar.admin}</span>
              </Link>
            )}
          </nav>

          {/* Footer actions */}
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
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-[15px] text-red-500"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span>{t.signOut}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <main className={`flex-1 min-w-0 ${dir === "rtl" ? "lg:mr-64" : "lg:ml-64"}`}>
        {/* Header */}
        <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 transition-colors duration-200">

          {/* Hamburger — mobile only */}
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

          <div className="flex-1 hidden lg:block" />

          <div className="flex items-center gap-2">
            <NotificationBell
              onNavigate={navigateTo}
              lang={locale === "en" ? "en" : "ar"}
              isOpen={activeTopPanel === "notifications"}
              onOpenChange={openNotifications}
            />

            {/* Claude Connected Badge */}
            {claudeConnected && (
              <ClaudeHeaderBadge
                locale={locale}
                dir={dir}
                onNavigate={navigateTo}
                isOpen={activeTopPanel === "claude"}
                onOpenChange={openClaudePanel}
              />
            )}
            <div id="assistant-header-slot" className="flex items-center" />

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
          <DashboardAssistant
            userId={session?.user?.id ?? ""}
            locale={locale as "ar" | "en"}
            activeSection={activeSection}
            whatsappConnected={hasMetaConnection}
            totalContacts={dashData?.stats.totalContacts ?? 0}
            deliveryRate={dashData?.stats.deliveryRate ?? 0}
            planStatus={dashData?.plan.status ?? "active"}
            planName={dashData?.plan.planName ?? ""}
            onNavigate={navigateTo}
            helperMountId="assistant-header-slot"
            helperOpen={activeTopPanel === "assistant"}
            onHelperOpenChange={openAssistantPanel}
            onboardingCompleted={dashData?.user.onboardingCompleted}
          />
          <PushNotificationPrompt />
          {loadingDash && !dashData ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>
          ) : children}
        </div>
      </main>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} data={dashData} onSaved={refreshDash} />
      <ReviewPrompt
        open={showReviewPrompt}
        onClose={() => setShowReviewPrompt(false)}
        defaultName={dashData?.user.name ?? ""}
        defaultPhone={dashData?.user.phone ?? ""}
      />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SubscriptionProvider>
        <DashboardShellInner>{children}</DashboardShellInner>
      </SubscriptionProvider>
    </LanguageProvider>
  );
}
