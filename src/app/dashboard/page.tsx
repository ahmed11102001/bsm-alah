"use client";

import ChatPage    from "@/app/dashboard/chat/page";
import TeamPage    from "@/app/dashboard/team/page";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import "@/app/globals.css";
import { useState, useEffect, useCallback } from "react";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import { Button }   from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge }    from "@/components/ui/badge";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users, MessageSquare, Send, FileText, BarChart3, Settings,
  Code, LogOut, Plus, TrendingUp, Calendar, ChevronLeft,
  MessageCircle, Home, CheckCircle,
  Loader2, ArrowUpRight, Shield, Phone, Mail,
  Lock, Wifi, RefreshCw, Star, Sun, Moon, Monitor, ShoppingBag,
  Languages,
} from "lucide-react";
import Contacts        from "@/components/dashboard/Contacts";
import Templates       from "@/components/dashboard/Templates";
import Campaigns       from "@/components/dashboard/Campaigns";
import Reports         from "@/components/dashboard/Reports";
import Automation      from "@/components/dashboard/Automation";
import API             from "@/components/dashboard/API";
import Store           from "@/components/dashboard/store";
import AdminPage       from "@/app/dashboard/admin/page";
import NotificationBell from "@/components/dashboard/NotificationBell";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardData {
  user: { id: string; name: string | null; email: string; phone: string | null; role: string };
  whatsapp: { phoneNumberId: string; wabaId: string } | null;
  stats: {
    totalSent: number; totalDelivered: number; totalRead: number;
    totalInbound: number; totalCampaigns: number; totalContacts: number;
    deliveryRate: number; readRate: number; replyRate: number;
  };
  plan: {
    plan: string; planName: string; status: string;
    limits: {
      contacts: number; teamMembers: number; campaignsPerMonth: number;
      scheduledCampaigns: boolean; advancedReports: boolean;
      apiAccess: boolean; mediaMessages: boolean; customAudiences: boolean;
    };
    usage: { contacts: number; teamMembers: number; campaignsThisMonth: number };
  };
  recentCampaigns: {
    id: string; name: string; status: string;
    sentCount: number; deliveredCount: number; readCount: number;
    failedCount: number; createdAt: string;
    template: { name: string } | null;
  }[];
}

// ─── Sidebar items (built at render time from translations) ──────────────────
const SIDEBAR_IDS = [
  { icon: Home,          id: "home"       },
  { icon: Users,         id: "team"       },
  { icon: Users,         id: "contacts"   },
  { icon: Send,          id: "campaigns"  },
  { icon: FileText,      id: "templates"  },
  { icon: MessageSquare, id: "chat"       },
  { icon: BarChart3,     id: "reports"    },
  { icon: Settings,      id: "automation" },
  { icon: ShoppingBag,   id: "store"      },
  { icon: Code,          id: "api"        },
] as const;

const adminItem = { icon: Shield, id: "admin" };

const PLAN_COLORS: Record<string, string> = {
  free:       "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  starter:    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  pro:        "bg-[#25D366]/10 text-[#25D366]",
  enterprise: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  running:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  scheduled: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  failed:    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  draft:     "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};


function limitLabel(n: number) { return n === -1 ? "∞" : n.toLocaleString(); }
function usagePct(used: number, limit: number) {
  if (limit === -1) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={compact ? "w-9 h-9" : "w-full h-10"} />;

  const cycle = () => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  const icon  = theme === "dark" ? <Moon className="w-4 h-4" /> : theme === "light" ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />;
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
  const label  = locale === "ar" ? "EN" : "ع";

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
  const { t, dir } = useLanguage();
  const s = t.settings;
  const [saving, setSaving] = useState(false);
  const [name,  setName]  = useState("");
  const [phone, setPhone] = useState("");
  const [curPw,  setCurPw]  = useState("");
  const [newPw,  setNewPw]  = useState("");
  const [confPw, setConfPw] = useState("");
  const [wAccessToken,   setWAccessToken]   = useState("");
  const [wPhoneNumberId, setWPhoneNumberId] = useState("");
  const [wWabaId,        setWWabaId]        = useState("");

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
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
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
            <TabsTrigger value="profile"  className="flex-1 text-xs">{s.tabs.profile}</TabsTrigger>
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
          </TabsContent>

          {/* ── Password ── */}
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
              {newPw && (
                <div className="flex gap-1 mt-1">
                  {[4,6,8,10].map((threshold,i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${
                      newPw.length >= threshold
                        ? i<1 ? "bg-red-400" : i<2 ? "bg-orange-400" : i<3 ? "bg-yellow-400" : "bg-green-400"
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
              onClick={() => { if (newPw !== confPw) { toast.error(s.password.mismatch); return; } save("password", { currentPassword: curPw, newPassword: newPw }); }}
              disabled={saving || !curPw || !newPw || newPw !== confPw}
              className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl">
              {saving && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
              {s.password.changeBtn}
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

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan }: { plan: DashboardData["plan"] }) {
  const { t } = useLanguage();
  const p = t.home.plan;
  const contactsPct  = usagePct(plan.usage.contacts,           plan.limits.contacts);
  const campaignsPct = usagePct(plan.usage.campaignsThisMonth, plan.limits.campaignsPerMonth);
  const teamPct      = usagePct(plan.usage.teamMembers,        plan.limits.teamMembers);
  const isNearLimit  = (pct: number) => pct >= 80;

  return (
    <Card className="border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-sm">{p.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${PLAN_COLORS[plan.plan] ?? "bg-gray-100 text-gray-600"}`}>
                {plan.planName}
              </span>
              <span className="text-xs text-gray-400">{plan.status === "active" ? p.active : p.expired}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline"
              className="text-xs h-8 gap-1 hover:border-[#25D366] hover:text-[#25D366] hidden sm:flex"
              onClick={() => toast.info("قريباً — نظام الدفع")}>
              <RefreshCw className="w-3 h-3" /> {p.changePlan}
            </Button>
            <Button size="sm"
              className="text-xs h-8 gap-1 bg-[#25D366] hover:bg-[#20bb5a] text-white"
              onClick={() => toast.info("قريباً — نظام الدفع")}>
              <ArrowUpRight className="w-3 h-3" /> {p.upgrade}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: p.contacts,       used: plan.usage.contacts,           limit: plan.limits.contacts,          pct: contactsPct  },
            { label: p.campaignsMonth, used: plan.usage.campaignsThisMonth, limit: plan.limits.campaignsPerMonth, pct: campaignsPct },
            { label: p.teamMembers,    used: plan.usage.teamMembers,         limit: plan.limits.teamMembers,       pct: teamPct      },
          ].map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                <span className={`text-xs font-semibold ${isNearLimit(item.pct) ? "text-orange-500" : ""}`}>
                  {item.used.toLocaleString()} / {limitLabel(item.limit)}
                </span>
              </div>
              <Progress value={item.pct} className={`h-1.5 ${isNearLimit(item.pct) ? "[&>div]:bg-orange-400" : "[&>div]:bg-[#25D366]"}`} />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
          {(Object.entries(p.features) as [keyof typeof p.features, string][]).map(([key, label]) => {
            const on = plan.limits[key as keyof typeof plan.limits] as boolean;
            return (
              <span key={key} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                on ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                   : "bg-gray-100 text-gray-400 dark:bg-gray-700 line-through"
              }`}>{label}</span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Home Dashboard ───────────────────────────────────────────────────────────
function HomeDashboard({ data, onCreateCampaign, onOpenSettings }: {
  data: DashboardData; onCreateCampaign: () => void; onOpenSettings: () => void;
}) {
  const { t, locale, dir } = useLanguage();
  const h = t.home;
  const { stats, recentCampaigns, user } = data;
  const firstName = (user.name ?? "").split(" ")[0] || (locale === "ar" ? "مرحباً" : "there");
  const numFmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");

  const kpis = [
    { label: h.kpi.totalSent,    value: stats.totalSent,      sub: h.kpi.deliveryRate(stats.deliveryRate),   icon: <Send className="w-5 h-5 text-blue-600" />,          bg: "bg-blue-50 dark:bg-blue-900/20",    trend: stats.totalSent > 0 ? "up" : null },
    { label: h.kpi.delivered,    value: stats.totalDelivered, sub: h.kpi.deliveredOf(stats.deliveryRate),    icon: <CheckCircle className="w-5 h-5 text-green-600" />,   bg: "bg-green-50 dark:bg-green-900/20",  trend: "up" },
    { label: h.kpi.totalReplies, value: stats.totalInbound,   sub: h.kpi.replyRate(stats.replyRate),         icon: <MessageSquare className="w-5 h-5 text-purple-600" />, bg: "bg-purple-50 dark:bg-purple-900/20", trend: stats.totalInbound > 0 ? "up" : null },
    { label: h.kpi.campaigns,    value: stats.totalCampaigns, sub: h.kpi.thisMonth(data.plan.usage.campaignsThisMonth), icon: <BarChart3 className="w-5 h-5 text-orange-600" />, bg: "bg-orange-50 dark:bg-orange-900/20", trend: null },
  ] as const;

  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  return (
    <div dir={dir}>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-0.5">{h.greeting(firstName)}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{h.subtitle}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={onOpenSettings} className="gap-1.5 text-sm hidden sm:flex">
            <Settings className="w-4 h-4" /> {h.settingsBtn}
          </Button>
          <Button size="sm" className="bg-[#25D366] hover:bg-[#20bb5a] text-white gap-1.5 text-sm w-full sm:w-auto justify-center" onClick={onCreateCampaign}>
            <Plus className="w-4 h-4" /> {h.newCampaign}
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {kpis.map((k) => (
          <Card key={k.label} className="border border-gray-100 dark:border-gray-700 shadow-sm">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1 leading-tight">{k.label}</p>
                  <p className="text-xl sm:text-2xl font-bold leading-none">{numFmt(k.value)}</p>
                  {k.sub && (
                    <p className={`text-[10px] sm:text-xs mt-1.5 flex items-center gap-1 ${k.trend === "up" ? "text-green-600" : "text-gray-400"}`}>
                      {k.trend === "up" && <TrendingUp className="w-3 h-3 flex-shrink-0" />}
                      <span className="truncate">{k.sub}</span>
                    </p>
                  )}
                </div>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ms-2 ${k.bg}`}>
                  {k.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Plan Card ── */}
      <PlanCard plan={data.plan} />

      {/* ── Recent Campaigns ── */}
      <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4 sm:px-5">
          <CardTitle className="text-base font-bold">{h.campaigns.title}</CardTitle>
          <button onClick={onCreateCampaign} className="text-xs text-[#25D366] hover:underline flex items-center gap-1 flex-shrink-0">
            {h.campaigns.viewAll} <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {recentCampaigns.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Send className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{h.campaigns.empty}</p>
              <button onClick={onCreateCampaign} className="mt-3 text-xs text-[#25D366] hover:underline">{h.campaigns.startFirst}</button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                      {Object.values(h.campaigns.headers).map(hd => (
                        <th key={hd} className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">{hd}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentCampaigns.map((c) => (
                      <tr key={c.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4 font-medium max-w-[160px] truncate">{c.name}</td>
                        <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(c.createdAt).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">{numFmt(c.sentCount)}</td>
                        <td className="py-3 px-4 text-green-600 font-medium">{numFmt(c.deliveredCount)}</td>
                        <td className="py-3 px-4 text-blue-600 font-medium">{numFmt(c.readCount)}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {h.campaigns.status[c.status as keyof typeof h.campaigns.status] ?? c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {recentCampaigns.map((c) => (
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-sm truncate flex-1">{c.name}</p>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {h.campaigns.status[c.status as keyof typeof h.campaigns.status] ?? c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(c.createdAt).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3 text-blue-500" />
                        {numFmt(c.sentCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {numFmt(c.deliveredCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-purple-500" />
                        {numFmt(c.readCount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function DashboardInner({ onLogout }: { onLogout: () => void }) {
  const { data: session } = useSession();
  const { t, dir, locale } = useLanguage();
  const [activeSection,  setActiveSection]  = useState("home");
  const [dashData,       setDashData]       = useState<DashboardData | null>(null);
  const [loadingDash,    setLoadingDash]    = useState(true);
  const [showSettings,   setShowSettings]   = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchDash = useCallback(async () => {
    setLoadingDash(true);
    try {
      const r = await fetch("/api/dashboard");
      if (r.ok) setDashData(await r.json());
    } finally { setLoadingDash(false); }
  }, []);

  useEffect(() => { fetchDash(); }, [fetchDash]);

  useEffect(() => {
    const h = (e: any) => { if (e.detail) setActiveSection(e.detail); };
    window.addEventListener("navigate-to", h);
    return () => window.removeEventListener("navigate-to", h);
  }, []);

  // Build sidebar items from translations
  const sidebarItems = SIDEBAR_IDS.map(item => ({
    ...item,
    label: t.sidebar[item.id as keyof typeof t.sidebar],
  }));

  const displayName = dashData?.user.name ?? session?.user?.name ?? (locale === "ar" ? "المستخدم" : "User");
  const initials    = displayName.slice(0, 2).toUpperCase();
  const planName    = dashData?.plan.planName ?? "—";
  const planColor   = PLAN_COLORS[dashData?.plan.plan ?? "free"];

  const renderContent = () => {
    switch (activeSection) {
      case "home":       return dashData
        ? <HomeDashboard data={dashData} onCreateCampaign={() => setActiveSection("campaigns")} onOpenSettings={() => setShowSettings(true)} />
        : <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>;
      case "chat":       return <ChatPage />;
      case "contacts":   return <Contacts />;
      case "team":       return <TeamPage />;
      case "templates":  return <Templates />;
      case "campaigns":  return <Campaigns />;
      case "reports":    return <Reports />;
      case "automation": return <Automation />;
      case "store":      return <Store />;
      case "api":        return <API />;
      case "admin":      return session?.user?.isSuper ? <AdminPage /> : null;
      default:           return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors duration-200" dir={dir}>

      {/* ── Desktop Sidebar ── */}
      <aside className={`w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 fixed top-0 bottom-0 z-40 hidden lg:flex flex-col transition-colors duration-200 ${dir === "rtl" ? "border-l right-0" : "border-r left-0"}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold mx-3">
            {locale === "ar" ? <>واتس <span className="text-[#25D366]">برو</span></> : <>Whats<span className="text-[#25D366]">Pro</span></>}
          </span>
        </div>

        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                activeSection === item.id
                  ? "bg-[#25D366]/10 text-[#25D366] font-semibold"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}>
              <item.icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
            </button>
          ))}

          {session?.user?.isSuper && (
            <button onClick={() => setActiveSection("admin")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mt-2 ${
                activeSection === "admin"
                  ? "bg-red-50 dark:bg-red-900/20 text-red-600 font-semibold"
                  : "text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
              }`}>
              <adminItem.icon className="w-[18px] h-[18px]" />
              <span>{t.sidebar.admin}</span>
            </button>
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
              <div className="w-8 h-8 rounded-xl bg-[#25D366] flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold">
                {locale === "ar"
                  ? <>واتس <span className="text-[#25D366]">برو</span></>
                  : <>Whats<span className="text-[#25D366]">Pro</span></>}
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
              <button
                key={item.id}
                onClick={() => { setActiveSection(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[15px] font-medium transition-all ${
                  activeSection === item.id
                    ? "bg-[#25D366] text-white shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}

            {session?.user?.isSuper && (
              <button
                onClick={() => { setActiveSection("admin"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[15px] font-medium transition-all ${
                  activeSection === "admin"
                    ? "bg-red-500 text-white shadow-sm"
                    : "bg-white dark:bg-gray-800 text-red-500"
                }`}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span>{t.sidebar.admin}</span>
              </button>
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
                onClick={() => { setShowSettings(true); setMobileMenuOpen(false); }}
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
      <main className={`flex-1 ${dir === "rtl" ? "lg:mr-64" : "lg:ml-64"}`}>
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

          {/* Desktop spacer */}
          <div className="flex-1 hidden lg:block" />

          <div className="flex items-center gap-1">
            <LanguageToggle compact />
            <ThemeToggle compact />

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <Settings className="w-[18px] h-[18px]" />
            </button>

            <NotificationBell onNavigate={(section) => setActiveSection(section)} />

            <div className="flex items-center gap-2">
              <div className={`${dir === "rtl" ? "text-right" : "text-left"} hidden sm:block`}>
                <p className="text-sm font-semibold leading-tight">{displayName}</p>
                <p className="text-[10px] text-gray-400">{planName}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white text-sm font-bold">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6">{renderContent()}</div>
      </main>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} data={dashData} onSaved={fetchDash} />
    </div>
  );
}

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <LanguageProvider>
      <DashboardInner onLogout={onLogout} />
    </LanguageProvider>
  );
}