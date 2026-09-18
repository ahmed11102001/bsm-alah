"use client";

// ─── صفحة الإعدادات المشتركة (برا الداشبورد والإيميل ماركتنج) ────────────────
// فيها إعدادات المستخدم اللي اتشالت من صفحة إعدادات الداشبورد:
// البيانات الشخصية + كلمة المرور + حذف الحساب + المظهر.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings, Users, Phone, Mail, Lock, Shield, Loader2,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import PageHeader from "@/components/dashboard/PageHeader";
import { signOutWithPushCleanup } from "@/lib/push-client";
import AppearanceSettings from "@/app/dashboard/settings/_components/AppearanceSettings";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 sm:p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

interface MeUser {
  name: string | null;
  email: string;
  phone: string | null;
  hasPassword: boolean;
}

export default function AccountSettingsPage() {
  const { dir, locale } = useLanguage();
  const { t } = useLanguage();
  const router = useRouter();
  const s = t.settings;
  const ar = locale === "ar";

  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchMe = async () => {
    try {
      const r = await fetch("/api/me/settings");
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.user) {
        setMe(d.user);
        setName(d.user.name ?? "");
        setPhone(d.user.phone ?? "");
        setHasPassword(!!d.user.hasPassword);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchMe();
  }, []);

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
      fetchMe();
      if (type === "password") { setCurPw(""); setNewPw(""); setConfPw(""); }
      if (type === "create_password") {
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
      toast.success(ar ? "تم حذف الحساب" : "Account deleted");
      await signOutWithPushCleanup(signOut, { redirect: false });
      router.replace("/");
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  if (loading || !me) {
    return (
      <div className="space-y-4" dir={dir}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      <PageHeader
        icon={<Settings className="w-6 h-6 text-primary" />}
        iconClassName="w-12 h-12 bg-primary/10 dark:bg-primary/15 text-primary"
        title={ar ? "الإعدادات" : "Settings"}
        subtitle={ar ? "بياناتك الشخصية وكلمة المرور وإدارة الحساب" : "Your personal data, password and account management"}
      />

      {/* ── Appearance / المظهر ── */}
      <AppearanceSettings />

      {/* ── Profile Card ── */}
      <Card>
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl mb-5">
          <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {(me.name ?? me.email).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate text-gray-900 dark:text-white">{me.name ?? "—"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{me.email}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm dark:text-gray-300">{s.profile.fullName}</Label>
            <div className="relative">
              <Users className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input value={name} onChange={e => setName(e.target.value)} className="pr-9 text-sm rounded-xl dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm dark:text-gray-300">{s.profile.phone}</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input dir="ltr" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="201234567890" className="pr-9 text-sm rounded-xl dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <Label className="text-sm dark:text-gray-300">{s.profile.email}</Label>
          <div className="relative">
            <Mail className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input value={me.email} disabled
              className="pr-9 text-sm rounded-xl bg-gray-50 dark:bg-gray-700 cursor-not-allowed" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{s.profile.emailHint}</p>
        </div>

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
            ? (ar ? "تغيير كلمة المرور" : "Change Password")
            : (ar ? "إنشاء كلمة مرور" : "Create Password")}
        </p>

        {!hasPassword ? (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4">
            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              {ar ? "حسابك مرتبط بـ Google فقط. يمكنك إنشاء كلمة مرور لتسجيل الدخول بالإيميل أيضاً." : "Your account is linked to Google. Create a password to also log in with email."}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 mb-4">
            <Label className="text-sm dark:text-gray-300">{s.password.current}</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} className="pr-9 text-sm rounded-xl dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm dark:text-gray-300">{s.password.new}</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="pr-9 text-sm rounded-xl dark:bg-gray-700 dark:border-gray-600" />
            </div>
            {newPw && (
              <div className="flex gap-1 mt-1">
                {[4, 6, 8, 10].map((threshold, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${newPw.length >= threshold
                    ? i < 1 ? "bg-red-400" : i < 2 ? "bg-orange-400" : i < 3 ? "bg-yellow-400" : "bg-[#25D366]"
                    : "bg-gray-200 dark:bg-gray-700"
                    }`} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm dark:text-gray-300">{s.password.confirm}</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input type="password" value={confPw} onChange={e => setConfPw(e.target.value)}
                className={`pr-9 text-sm rounded-xl dark:bg-gray-700 dark:border-gray-600 ${confPw && newPw !== confPw ? "border-red-400" : ""}`} />
            </div>
            {confPw && newPw !== confPw && <p className="text-xs text-red-500">{s.password.mismatch}</p>}
          </div>
        </div>

        <Button
          onClick={() => { if (newPw !== confPw) { toast.error(s.password.mismatch); return; } save(hasPassword ? "password" : "create_password", hasPassword ? { currentPassword: curPw, newPassword: newPw } : { newPassword: newPw }); }}
          disabled={saving || (hasPassword && !curPw) || !newPw || newPw !== confPw}
          className="w-full sm:w-auto sm:px-10 mt-5 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl">
          {saving && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
          {hasPassword ? s.password.changeBtn : (ar ? "إنشاء كلمة المرور" : "Create Password")}
        </Button>
      </Card>

      {/* ── Danger Zone ── */}
      <Card className="border-red-200/70 dark:border-red-900/40">
        {!showDeleteConfirm ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">
                {ar ? "حذف الحساب نهائياً" : "Delete Account Permanently"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {ar ? "حذف كل بياناتك ولا يمكن التراجع عنه" : "Deletes all your data and cannot be undone"}
              </p>
            </div>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border-none shadow-none sm:w-auto w-full">
              {ar ? "حذف الحساب نهائياً" : "Delete Account Permanently"}
            </Button>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-4 space-y-3 text-red-800 dark:text-red-300">
            <p className="text-sm font-bold flex items-center gap-1.5"><Shield className="w-4 h-4" /> {ar ? "⚠️ حذف الحساب نهائياً" : "⚠️ Permanent Deletion"}</p>
            <p className="text-xs leading-relaxed">
              {ar ? "سيتم حذف جميع حملاتك، جهات الاتصال، القوالب، بيانات الاشتراك، وربط الواتساب. هذا الإجراء لا يمكن التراجع عنه." : "All your campaigns, contacts, templates, subscription data, and WhatsApp connection will be deleted. This action cannot be undone."}
            </p>

            {hasPassword && (
              <div className="space-y-1.5">
                <Label className="text-xs">{ar ? "أدخل كلمة المرور للتأكيد:" : "Enter password to confirm:"}</Label>
                <Input type="password" value={deletePw} onChange={e => setDeletePw(e.target.value)} className="text-sm rounded-xl bg-white dark:bg-gray-800 border-red-200 dark:border-red-800" />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                {ar ? "إلغاء" : "Cancel"}
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteAccount} disabled={deleting || (hasPassword && !deletePw)} className="flex-1 rounded-xl">
                {deleting && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
                {ar ? "نعم، احذف حسابي" : "Yes, delete my account"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
