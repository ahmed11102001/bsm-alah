"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings, Lock, Loader2,
  User, Copy, Eye, EyeOff, MessageCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import PageHeader from "@/components/dashboard/PageHeader";
import { useSubscription } from "@/lib/dashboard-context";
import {
  PageHeaderSkeleton, FormSkeleton,
} from "@/components/dashboard/DashboardSkeletons";
import WhatsAppProfileView from "./_components/WhatsAppProfileView";
import AppearanceSettings from "./_components/AppearanceSettings";

function SectionHeader({ icon, title, desc, index }: {
  icon: React.ReactNode; title: string; desc: string; index: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          {title}
          <span className="text-[10px] font-bold text-muted-foreground/70">{index}</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { dir, locale } = useLanguage();
  const { dashData: data, loadingDash } = useSubscription();

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
      <PageHeader
        icon={<Settings className="w-6 h-6 text-primary" />}
        iconClassName="w-12 h-12 bg-primary/10 dark:bg-primary/15 text-primary"
        title={locale === "ar" ? "إعدادات الواتساب" : "WhatsApp Settings"}
        subtitle={locale === "ar" ? "الربط وبيانات الاعتماد وبروفايل النشاط التجاري" : "Connection, credentials and business profile"}
      />

      {/* ── Appearance / المظهر ── */}
      <AppearanceSettings />

      {/* ═══════════════ إعدادات حساب الواتساب ═══════════════ */}
      <section className="space-y-4">
        <SectionHeader
          icon={<MessageCircle className="w-5 h-5" />}
          title={locale === "ar" ? "إعدادات حساب الواتساب" : "WhatsApp Account Settings"}
          desc={locale === "ar" ? "الربط وبيانات الاعتماد وبروفايل النشاط التجاري" : "Connection, credentials and business profile"}
          index="01"
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
                    className="w-full sm:w-auto sm:px-8 mt-4 rounded-xl border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 font-bold gap-2 py-5 transition-all"
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
                          className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white"
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


