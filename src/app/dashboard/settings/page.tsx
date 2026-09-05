"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings, Users, Phone, Mail, Lock, Shield, Loader2,
  User, Copy, Eye, EyeOff, MessageCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useSubscription } from "@/lib/dashboard-context";
import { signOutWithPushCleanup } from "@/lib/push-client";
import {
  PageHeaderSkeleton, FormSkeleton,
} from "@/components/dashboard/DashboardSkeletons";
import WhatsAppProfileView from "./_components/WhatsAppProfileView";

function SectionHeader({ icon, title, desc, index }: {
  icon: React.ReactNode; title: string; desc: string; index: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 h-10 rounded-2xl bg-[#25D366]/10 dark:bg-[#25D366]/15 text-[#25D366] flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          {title}
          <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600">{index}</span>
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-3xl p-5 sm:p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { dir, locale } = useLanguage();
  const { t } = useLanguage();
  const router = useRouter();
  const s = t.settings;
  const { dashData: data, loadingDash, refreshDash: onSaved } = useSubscription();

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleting, setDeleting] = useState(false);

  // WhatsApp credentials are owner-only. The token is never returned by the
  // normal settings GET endpoint; it is revealed only after password re-auth.
  const isOwner = data?.user.role === "OWNER";
  const [whatsappToken, setWhatsappToken] = useState("");
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [revealWhatsapp, setRevealWhatsapp] = useState(false);
  const [whatsappRevealPassword, setWhatsappRevealPassword] = useState("");
  const [revealingWhatsapp, setRevealingWhatsapp] = useState(false);

  // Sub-view state for WhatsApp Profile Management
  const [showWaProfileView, setShowWaProfileView] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.user.name ?? "");
      setPhone(data.user.phone ?? "");
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

  const revealWhatsAppCredentials = async () => {
    if (!whatsappRevealPassword) {
      toast.error(locale === "ar" ? "أدخل كلمة المرور أولاً" : "Enter your password first");
      return;
    }

    setRevealingWhatsapp(true);
    try {
      const r = await fetch("/api/me/settings/whatsapp-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: whatsappRevealPassword }),
      });
      const d = await r.json();

      if (!r.ok) throw new Error(d.error || (locale === "ar" ? "تعذر إظهار البيانات" : "Unable to reveal credentials"));

      setWhatsappToken(d.accessToken ?? "");
      setShowWhatsappToken(true);
      setRevealWhatsapp(false);
      setWhatsappRevealPassword("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRevealingWhatsapp(false);
    }
  };

  const copyText = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(locale === "ar" ? "تم النسخ" : "Copied");
    } catch {
      toast.error(locale === "ar" ? "تعذر النسخ" : "Copy failed");
    }
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
      // احذف الحساب فعليًا هيمسح الاشتراك من الداتابيز أصلاً (cascade)، لكن
      // نلغي اشتراك الـPush من المتصفح كمان عشان الـendpoint يبقى منتهي تمامًا
      await signOutWithPushCleanup(signOut, { redirect: false });
      router.replace("/");
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  if (loadingDash || !data) {
    return (
      <div className="space-y-6" dir={dir}>
        <PageHeaderSkeleton />
        <FormSkeleton rows={4} />
        <FormSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-4xl" dir={dir}>
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-2xl bg-[#25D366]/10 dark:bg-[#25D366]/15 text-[#25D366] flex items-center justify-center flex-shrink-0">
          <Settings className="w-6 h-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{s.description}</p>
        </div>
      </div>

      {/* ═══════════════ الجزء الأول: إعدادات المستخدم ═══════════════ */}
      <section className="space-y-4">
        <SectionHeader
          icon={<User className="w-5 h-5" />}
          title={locale === "ar" ? "إعدادات المستخدم" : "User Settings"}
          desc={locale === "ar" ? "بياناتك الشخصية وكلمة المرور وإدارة الحساب" : "Your personal data, password and account management"}
          index="01"
        />

        {/* ── Profile Card ── */}
        <Card>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl mb-5">
            <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {(data.user.name ?? data.user.email).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{data.user.name ?? "—"}</p>
              <p className="text-xs text-gray-400 truncate">{data.user.email}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-sm">{s.profile.fullName}</Label>
              <div className="relative">
                <Users className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input value={name} onChange={e => setName(e.target.value)} className="pr-9 text-sm rounded-xl" />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-sm">{s.profile.phone}</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input dir="ltr" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="201234567890" className="pr-9 text-sm rounded-xl" />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5 mt-4">
            <Label className="text-sm">{s.profile.email}</Label>
            <div className="relative">
              <Mail className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input value={data.user.email} disabled
                className="pr-9 text-sm rounded-xl bg-gray-50 dark:bg-gray-800 cursor-not-allowed" />
            </div>
            <p className="text-xs text-gray-400">{s.profile.emailHint}</p>
          </div>

          {/* Save Profile */}
          <Button onClick={() => save("profile", { name, phone })} disabled={saving}
            className="w-full sm:w-auto sm:px-10 mt-5 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl">
            {saving && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
            {s.profile.saveBtn}
          </Button>
        </Card>

        {/* ── Password Card ── */}
        <Card>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-[#25D366]" />
            {hasPassword
              ? (locale === "ar" ? "تغيير كلمة المرور" : "Change Password")
              : (locale === "ar" ? "إنشاء كلمة مرور" : "Create Password")}
          </p>

          {!hasPassword ? (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                {locale === "ar" ? "حسابك مرتبط بـ Google فقط. يمكنك إنشاء كلمة مرور لتسجيل الدخول بالإيميل أيضاً." : "Your account is linked to Google. Create a password to also log in with email."}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 mb-4">
              <Label className="text-sm">{s.password.current}</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} className="pr-9 text-sm rounded-xl" />
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
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
          </div>

          <Button
            onClick={() => { if (newPw !== confPw) { toast.error(s.password.mismatch); return; } save(hasPassword ? "password" : "create_password", hasPassword ? { currentPassword: curPw, newPassword: newPw } : { newPassword: newPw }); }}
            disabled={saving || (hasPassword && !curPw) || !newPw || newPw !== confPw}
            className="w-full sm:w-auto sm:px-10 mt-5 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl">
            {saving && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
            {hasPassword ? s.password.changeBtn : (locale === "ar" ? "إنشاء كلمة المرور" : "Create Password")}
          </Button>
        </Card>

        {/* ── Danger Zone ── */}
        <Card className="border-red-200/70 dark:border-red-900/40">
          {!showDeleteConfirm ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                  {locale === "ar" ? "حذف الحساب نهائياً" : "Delete Account Permanently"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {locale === "ar" ? "حذف كل بياناتك ولا يمكن التراجع عنه" : "Deletes all your data and cannot be undone"}
                </p>
              </div>
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border-none shadow-none sm:w-auto w-full">
                {locale === "ar" ? "حذف الحساب نهائياً" : "Delete Account Permanently"}
              </Button>
            </div>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-4 space-y-3 text-red-800 dark:text-red-300">
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
        </Card>
      </section>

      {/* ═══════════════ الجزء الثاني: إعدادات حساب الواتساب ═══════════════ */}
      <section className="space-y-4">
        <SectionHeader
          icon={<MessageCircle className="w-5 h-5" />}
          title={locale === "ar" ? "إعدادات حساب الواتساب" : "WhatsApp Account Settings"}
          desc={locale === "ar" ? "الربط وبيانات الاعتماد وبروفايل النشاط التجاري" : "Connection, credentials and business profile"}
          index="02"
        />

        {isOwner ? (
          showWaProfileView ? (
            <Card>
              <WhatsAppProfileView onBack={() => setShowWaProfileView(false)} locale={locale} dir={dir} />
            </Card>
          ) : (
            <>
              {/* Connection Status Card */}
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {locale === "ar" ? "حساب واتساب المرتبط" : "Connected WhatsApp account"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {locale === "ar"
                        ? "بيانات الربط الخاصة بحسابك على WhatsApp Business."
                        : "Connection details for your WhatsApp Business account."}
                    </p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${data.whatsapp
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                    {data.whatsapp
                      ? (locale === "ar" ? "متصل" : "Connected")
                      : (locale === "ar" ? "غير متصل" : "Not connected")}
                  </span>
                </div>

                {data.whatsapp && (
                  <Button
                    onClick={() => setShowWaProfileView(true)}
                    variant="outline"
                    className="w-full sm:w-auto sm:px-8 mt-4 rounded-xl border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/5 hover:border-[#25D366]/50 font-bold gap-2 py-5 transition-all"
                  >
                    <User className="w-4 h-4" />
                    {locale === "ar" ? "إدارة بروفايل واتساب" : "Manage WhatsApp Profile"}
                  </Button>
                )}

                {!data.whatsapp && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5 text-center mt-4">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {locale === "ar" ? "لا يوجد حساب واتساب مرتبط" : "No WhatsApp account connected"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {locale === "ar"
                        ? "قم بربط WhatsApp Business من إعدادات التكامل."
                        : "Connect WhatsApp Business from the integrations settings."}
                    </p>
                  </div>
                )}
              </Card>

              {data.whatsapp && (
                <Card>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">
                    {locale === "ar" ? "بيانات الاعتماد" : "Credentials"}
                  </p>
                  {/* Credentials */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Phone Number ID</Label>
                      <div className="flex gap-2" dir="ltr">
                        <Input
                          value={data.whatsapp.phoneNumberId}
                          readOnly
                          className="text-sm rounded-xl bg-gray-50 dark:bg-gray-800"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => copyText(data.whatsapp!.phoneNumberId)}
                          className="w-11 flex-shrink-0 rounded-xl px-0"
                          title={locale === "ar" ? "نسخ" : "Copy"}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">WABA ID</Label>
                      <div className="flex gap-2" dir="ltr">
                        <Input
                          value={data.whatsapp.wabaId}
                          readOnly
                          className="text-sm rounded-xl bg-gray-50 dark:bg-gray-800"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => copyText(data.whatsapp!.wabaId)}
                          className="w-11 flex-shrink-0 rounded-xl px-0"
                          title={locale === "ar" ? "نسخ" : "Copy"}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-4">
                    <Label className="text-sm">Access Token</Label>
                    <div className="flex gap-2" dir="ltr">
                      <div className="relative flex-1">
                        <Input
                          type={showWhatsappToken ? "text" : "password"}
                          value={whatsappToken || "••••••••••••••••••••••••••••••••"}
                          readOnly
                          className="text-sm rounded-xl pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (whatsappToken) {
                              setShowWhatsappToken(prev => !prev);
                            } else {
                              setRevealWhatsapp(true);
                            }
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          title={showWhatsappToken ? "Hide token" : "Reveal token"}
                        >
                          {showWhatsappToken
                            ? <EyeOff className="w-4 h-4" />
                            : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={!whatsappToken}
                        onClick={() => copyText(whatsappToken)}
                        className="w-11 flex-shrink-0 rounded-xl px-0"
                        title={locale === "ar" ? "نسخ" : "Copy"}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {revealWhatsapp && (
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/10 p-4 space-y-3 mt-4">
                      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        {locale === "ar"
                          ? "لأمان حسابك، أدخل كلمة مرور حساب WANI لإظهار Access Token."
                          : "For security, enter your WANI account password to reveal the Access Token."}
                      </p>
                      <Input
                        type="password"
                        value={whatsappRevealPassword}
                        onChange={e => setWhatsappRevealPassword(e.target.value)}
                        placeholder={locale === "ar" ? "كلمة المرور" : "Account password"}
                        className="text-sm rounded-xl bg-white dark:bg-gray-900"
                        onKeyDown={e => {
                          if (e.key === "Enter") revealWhatsAppCredentials();
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setRevealWhatsapp(false);
                            setWhatsappRevealPassword("");
                          }}
                          className="flex-1 rounded-xl"
                        >
                          {locale === "ar" ? "إلغاء" : "Cancel"}
                        </Button>
                        <Button
                          type="button"
                          onClick={revealWhatsAppCredentials}
                          disabled={revealingWhatsapp || !whatsappRevealPassword}
                          className="flex-1 rounded-xl bg-[#25D366] hover:bg-[#20bb5a] text-white"
                        >
                          {revealingWhatsapp && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
                          {locale === "ar" ? "إظهار" : "Reveal"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-4">
                    {locale === "ar"
                      ? "هذه البيانات متاحة للمالك فقط. الـ Access Token لا يتم إرساله للواجهة إلا بعد التحقق من كلمة المرور."
                      : "These credentials are available to the owner only. The Access Token is never sent to the browser until the account password is verified."}
                  </div>
                </Card>
              )}
            </>
          )
        ) : (
          <Card>
            <div className="flex items-center gap-3 text-gray-400">
              <Lock className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">
                {locale === "ar"
                  ? "إعدادات حساب الواتساب متاحة لمالك الحساب فقط."
                  : "WhatsApp account settings are available to the account owner only."}
              </p>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
