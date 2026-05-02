"use client";

import ChatPage    from "@/app/dashboard/chat/page";
import TeamPage    from "@/app/dashboard/team/page";
import { signOut, useSession } from "next-auth/react";
import "@/app/globals.css";
import { useState, useEffect, useCallback } from "react";
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
  MessageCircle, Bell, Search, Home, CheckCircle, Eye,
  Loader2, ArrowUpRight, Zap, Shield, Phone, Mail,
  Lock, Wifi, RefreshCw, X, Star,
} from "lucide-react";
import Contacts   from "@/components/dashboard/Contacts";
import Templates  from "@/components/dashboard/Templates";
import Campaigns  from "@/components/dashboard/Campaigns";
import Reports    from "@/components/dashboard/Reports";
import Automation from "@/components/dashboard/Automation";
import API        from "@/components/dashboard/API";
import AdminPage  from "@/app/dashboard/admin/page";
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

// ─── Sidebar items ────────────────────────────────────────────────────────────
const sidebarItems = [
  { icon: Home,         label: "الرئيسية",       id: "home"       },
  { icon: Users,        label: "الفريق",         id: "team"       },
  { icon: Users,        label: "جهات الاتصال",   id: "contacts"   },
  { icon: Send,         label: "الحملات",         id: "campaigns"  },
  { icon: FileText,     label: "القوالب",         id: "templates"  },
  { icon: MessageSquare,label: "المحادثات",       id: "chat"       },
  { icon: BarChart3,    label: "التقارير",        id: "reports"    },
  { icon: Settings,     label: "الأتمتة الذكية", id: "automation" },
  { icon: Code,         label: "API",             id: "api"        },
];

// الـ Admin item — بيتضاف ديناميكياً لو isSuper بس
const adminItem = { icon: Shield, label: "Admin", id: "admin" };

const PLAN_COLORS: Record<string, string> = {
  free:       "bg-gray-100 text-gray-600",
  starter:    "bg-blue-100 text-blue-700",
  pro:        "bg-[#25D366]/10 text-[#25D366]",
  enterprise: "bg-purple-100 text-purple-700",
};

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  running:   "bg-blue-100 text-blue-700",
  scheduled: "bg-yellow-100 text-yellow-700",
  failed:    "bg-red-100 text-red-700",
  draft:     "bg-gray-100 text-gray-600",
};
const STATUS_LABEL: Record<string, string> = {
  completed: "مكتملة", running: "قيد التنفيذ",
  scheduled: "مجدولة", failed: "فشلت", draft: "مسودة",
};

function limitLabel(n: number) { return n === -1 ? "∞" : n.toLocaleString("ar-EG"); }
function usagePct(used: number, limit: number) {
  if (limit === -1) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({
  open, onClose, data, onSaved,
}: {
  open: boolean; onClose: () => void;
  data: DashboardData | null; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  // profile
  const [name,  setName]  = useState("");
  const [phone, setPhone] = useState("");

  // password
  const [curPw,  setCurPw]  = useState("");
  const [newPw,  setNewPw]  = useState("");
  const [confPw, setConfPw] = useState("");

  // whatsapp
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
      toast.success("تم الحفظ بنجاح");
      onSaved();
      if (type === "password") { setCurPw(""); setNewPw(""); setConfPw(""); }
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (!data) return null;
  const isOwner = !((data.user as any).parentId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#25D366]" /> الإعدادات
          </DialogTitle>
          <DialogDescription>إدارة بياناتك الشخصية وإعدادات الحساب</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" dir="rtl">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="profile"  className="flex-1 text-xs">الملف الشخصي</TabsTrigger>
            <TabsTrigger value="password" className="flex-1 text-xs">كلمة المرور</TabsTrigger>
            {isOwner && (
              <TabsTrigger value="whatsapp" className="flex-1 text-xs">واتساب API</TabsTrigger>
            )}
          </TabsList>

          {/* ── Profile ── */}
          <TabsContent value="profile" className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2">
              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold flex-shrink-0">
                {(data.user.name ?? data.user.email).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">{data.user.name ?? "—"}</p>
                <p className="text-xs text-gray-400">{data.user.email}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">الاسم الكامل</Label>
              <div className="relative">
                <Users className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input value={name} onChange={e => setName(e.target.value)}
                  className="pr-9 text-sm rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">رقم الهاتف</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input dir="ltr" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="201234567890" className="pr-9 text-sm rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input value={data.user.email} disabled
                  className="pr-9 text-sm rounded-xl bg-gray-50 cursor-not-allowed" />
              </div>
              <p className="text-xs text-gray-400">البريد لا يمكن تغييره</p>
            </div>

            <Button
              onClick={() => save("profile", { name, phone })}
              disabled={saving}
              className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
              حفظ التغييرات
            </Button>
          </TabsContent>

          {/* ── Password ── */}
          <TabsContent value="password" className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">كلمة المرور الحالية</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input type="password" value={curPw} onChange={e => setCurPw(e.target.value)}
                  className="pr-9 text-sm rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">كلمة المرور الجديدة</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                  className="pr-9 text-sm rounded-xl" />
              </div>
              {newPw && (
                <div className="flex gap-1 mt-1">
                  {[4,6,8,10].map((t,i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${
                      newPw.length >= t
                        ? i<1 ? "bg-red-400" : i<2 ? "bg-orange-400" : i<3 ? "bg-yellow-400" : "bg-green-400"
                        : "bg-gray-200"
                    }`} />
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input type="password" value={confPw} onChange={e => setConfPw(e.target.value)}
                  className={`pr-9 text-sm rounded-xl ${confPw && newPw !== confPw ? "border-red-400" : ""}`} />
              </div>
              {confPw && newPw !== confPw && (
                <p className="text-xs text-red-500">كلمتا المرور غير متطابقتين</p>
              )}
            </div>
            <Button
              onClick={() => {
                if (newPw !== confPw) { toast.error("كلمتا المرور غير متطابقتين"); return; }
                save("password", { currentPassword: curPw, newPassword: newPw });
              }}
              disabled={saving || !curPw || !newPw || newPw !== confPw}
              className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
              تغيير كلمة المرور
            </Button>
          </TabsContent>

          {/* ── WhatsApp ── */}
          {isOwner && (
            <TabsContent value="whatsapp" className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <Wifi className="w-4 h-4 inline ml-1" />
                هذه البيانات تُستخدم للإرسال عبر واتساب Business API الرسمي
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Access Token</Label>
                <Input dir="ltr" type="password" value={wAccessToken}
                  onChange={e => setWAccessToken(e.target.value)}
                  placeholder="EAAxxxxxx..." className="text-sm rounded-xl font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Phone Number ID</Label>
                <Input dir="ltr" value={wPhoneNumberId}
                  onChange={e => setWPhoneNumberId(e.target.value)}
                  className="text-sm rounded-xl font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">WABA ID</Label>
                <Input dir="ltr" value={wWabaId}
                  onChange={e => setWWabaId(e.target.value)}
                  className="text-sm rounded-xl font-mono" />
              </div>
              <Button
                onClick={() => save("whatsapp", {
                  accessToken: wAccessToken, phoneNumberId: wPhoneNumberId, wabaId: wWabaId,
                })}
                disabled={saving || !wAccessToken || !wPhoneNumberId || !wWabaId}
                className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
                حفظ إعدادات واتساب
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
  const contactsPct  = usagePct(plan.usage.contacts,          plan.limits.contacts);
  const campaignsPct = usagePct(plan.usage.campaignsThisMonth, plan.limits.campaignsPerMonth);
  const teamPct      = usagePct(plan.usage.teamMembers,        plan.limits.teamMembers);

  const isNearLimit = (pct: number) => pct >= 80;

  return (
    <Card className="border border-gray-100 shadow-sm mb-6">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-gray-900 text-sm">باقتك الحالية</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${PLAN_COLORS[plan.plan] ?? "bg-gray-100 text-gray-600"}`}>
                {plan.planName}
              </span>
              <span className="text-xs text-gray-400">
                {plan.status === "active" ? "✓ نشطة" : "منتهية"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline"
              className="text-xs h-8 gap-1 hover:border-[#25D366] hover:text-[#25D366]"
              onClick={() => toast.info("قريباً — نظام الدفع")}>
              <RefreshCw className="w-3 h-3" /> تغيير الباقة
            </Button>
            <Button size="sm"
              className="text-xs h-8 gap-1 bg-[#25D366] hover:bg-[#20bb5a] text-white"
              onClick={() => toast.info("قريباً — نظام الدفع")}>
              <ArrowUpRight className="w-3 h-3" /> ترقية
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Contacts */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">جهات الاتصال</span>
              <span className={`text-xs font-semibold ${isNearLimit(contactsPct) ? "text-orange-500" : "text-gray-700"}`}>
                {plan.usage.contacts.toLocaleString("ar-EG")} / {limitLabel(plan.limits.contacts)}
              </span>
            </div>
            <Progress value={contactsPct} className={`h-1.5 ${isNearLimit(contactsPct) ? "[&>div]:bg-orange-400" : "[&>div]:bg-[#25D366]"}`} />
          </div>

          {/* Campaigns */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">الحملات / شهر</span>
              <span className={`text-xs font-semibold ${isNearLimit(campaignsPct) ? "text-orange-500" : "text-gray-700"}`}>
                {plan.usage.campaignsThisMonth.toLocaleString("ar-EG")} / {limitLabel(plan.limits.campaignsPerMonth)}
              </span>
            </div>
            <Progress value={campaignsPct} className={`h-1.5 ${isNearLimit(campaignsPct) ? "[&>div]:bg-orange-400" : "[&>div]:bg-[#25D366]"}`} />
          </div>

          {/* Team */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">أعضاء الفريق</span>
              <span className={`text-xs font-semibold ${isNearLimit(teamPct) ? "text-orange-500" : "text-gray-700"}`}>
                {plan.usage.teamMembers.toLocaleString("ar-EG")} / {limitLabel(plan.limits.teamMembers)}
              </span>
            </div>
            <Progress value={teamPct} className={`h-1.5 ${isNearLimit(teamPct) ? "[&>div]:bg-orange-400" : "[&>div]:bg-[#25D366]"}`} />
          </div>
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-50">
          {[
            { key: "scheduledCampaigns", label: "جدولة" },
            { key: "advancedReports",    label: "تقارير متقدمة" },
            { key: "apiAccess",          label: "API" },
            { key: "mediaMessages",      label: "وسائط" },
            { key: "customAudiences",    label: "جمهور مخصص" },
          ].map(f => {
            const on = plan.limits[f.key as keyof typeof plan.limits] as boolean;
            return (
              <span key={f.key} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                on ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400 line-through"
              }`}>
                {f.label}
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Home Dashboard ───────────────────────────────────────────────────────────
function HomeDashboard({
  data, onCreateCampaign, onOpenSettings,
}: {
  data: DashboardData;
  onCreateCampaign: () => void;
  onOpenSettings: () => void;
}) {
  const { stats, recentCampaigns, user } = data;
  const firstName = (user.name ?? "").split(" ")[0] || "مرحباً";

  const kpis = [
    {
      label: "إجمالي المرسل",
      value: stats.totalSent,
      sub:   `نسبة وصول ${stats.deliveryRate}%`,
      icon:  <Send className="w-5 h-5 text-blue-600" />,
      bg:    "bg-blue-50",
      trend: stats.totalSent > 0 ? "up" : null,
    },
    {
      label: "تم التوصيل",
      value: stats.totalDelivered,
      sub:   `${stats.deliveryRate}% من المرسل`,
      icon:  <CheckCircle className="w-5 h-5 text-green-600" />,
      bg:    "bg-green-50",
      trend: "up",
    },
    {
      label: "إجمالي الردود",
      value: stats.totalInbound,
      sub:   `معدل رد ${stats.replyRate}%`,
      icon:  <MessageSquare className="w-5 h-5 text-purple-600" />,
      bg:    "bg-purple-50",
      trend: stats.totalInbound > 0 ? "up" : null,
    },
    {
      label: "الحملات",
      value: stats.totalCampaigns,
      sub:   `${data.plan.usage.campaignsThisMonth} هذا الشهر`,
      icon:  <BarChart3 className="w-5 h-5 text-orange-600" />,
      bg:    "bg-orange-50",
      trend: null,
    },
  ];

  return (
    <div dir="rtl">
      {/* Welcome */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            مرحباً، {firstName} 👋
          </h1>
          <p className="text-gray-500 text-sm">إليك نظرة عامة على أداء حسابك</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm" variant="outline"
            onClick={onOpenSettings}
            className="gap-1.5 text-sm"
          >
            <Settings className="w-4 h-4" /> الإعدادات
          </Button>
          <Button
            size="sm"
            className="bg-[#25D366] hover:bg-[#20bb5a] text-white gap-1.5 text-sm"
            onClick={onCreateCampaign}
          >
            <Plus className="w-4 h-4" /> حملة جديدة
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <Card key={k.label} className="border border-gray-100 shadow-sm">
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {k.value.toLocaleString("ar-EG")}
                </p>
                {k.sub && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${
                    k.trend === "up" ? "text-green-600" : "text-gray-400"
                  }`}>
                    {k.trend === "up" && <TrendingUp className="w-3 h-3" />}
                    {k.sub}
                  </p>
                )}
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>
                {k.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan Card */}
      <PlanCard plan={data.plan} />

      {/* Recent Campaigns */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-5">
          <CardTitle className="text-base font-bold">آخر الحملات</CardTitle>
          <button
            onClick={onCreateCampaign}
            className="text-xs text-[#25D366] hover:underline flex items-center gap-1"
          >
            عرض الكل <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {recentCampaigns.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Send className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">لا توجد حملات بعد</p>
              <button
                onClick={onCreateCampaign}
                className="mt-3 text-xs text-[#25D366] hover:underline"
              >
                ابدأ أول حملة الآن
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">الحملة</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">التاريخ</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">مرسل</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">وصل</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">قُرئ</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCampaigns.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-800 max-w-[160px] truncate">{c.name}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(c.createdAt).toLocaleDateString("ar-EG", {
                            month: "short", day: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-medium">{c.sentCount.toLocaleString("ar-EG")}</td>
                      <td className="py-3 px-4 text-green-600 font-medium">{c.deliveredCount.toLocaleString("ar-EG")}</td>
                      <td className="py-3 px-4 text-blue-600 font-medium">{c.readCount.toLocaleString("ar-EG")}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const { data: session } = useSession();
  const [activeSection,  setActiveSection]  = useState("home");
  const [dashData,       setDashData]       = useState<DashboardData | null>(null);
  const [loadingDash,    setLoadingDash]    = useState(true);
  const [showSettings,   setShowSettings]   = useState(false);

  const fetchDash = useCallback(async () => {
    setLoadingDash(true);
    try {
      const r = await fetch("/api/dashboard");
      if (r.ok) setDashData(await r.json());
    } finally { setLoadingDash(false); }
  }, []);

  useEffect(() => {
    fetchDash();
  }, [fetchDash]);

  // listen for navigate-to events (from chat page empty state)
  useEffect(() => {
    const h = (e: any) => { if (e.detail) setActiveSection(e.detail); };
    window.addEventListener("navigate-to", h);
    return () => window.removeEventListener("navigate-to", h);
  }, []);

  const displayName = dashData?.user.name ?? session?.user?.name ?? "المستخدم";
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
      case "api":        return <API />;
      case "admin":      return session?.user?.isSuper ? <AdminPage /> : null;
      default:           return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Desktop Sidebar ── */}
      <aside className="w-64 bg-white border-l border-gray-200 fixed right-0 top-0 bottom-0 z-40 hidden lg:flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold mr-3">
            واتس <span className="text-[#25D366]">برو</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                activeSection === item.id
                  ? "bg-[#25D366]/10 text-[#25D366] font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <item.icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              <span>{item.label}</span>
            </button>
          ))}

          {/* Admin — مش شايفه غير Super Admin */}
          {session?.user?.isSuper && (
            <button
              onClick={() => setActiveSection("admin")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mt-2 ${
                activeSection === "admin"
                  ? "bg-red-50 text-red-600 font-semibold"
                  : "text-red-400 hover:bg-red-50"
              }`}
            >
              <adminItem.icon className="w-[18px] h-[18px]" />
              <span>{adminItem.label}</span>
            </button>
          )}
        </nav>

        {/* User + plan strip */}
        <div className="border-t border-gray-100 p-4 flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${planColor}`}>
                {planName}
              </span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around p-2">
          {sidebarItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg ${
                activeSection === item.id ? "text-[#25D366]" : "text-gray-400"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label.slice(0, 5)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main ── */}
      <main className="flex-1 lg:mr-64 pb-20 lg:pb-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="hidden md:flex items-center flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                placeholder="البحث..."
                className="w-full bg-gray-50 pr-9 pl-4 py-1.5 rounded-xl border border-gray-100 focus:outline-none focus:border-[#25D366] text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Settings className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            </button>

            {/* User chip */}
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{displayName}</p>
                <p className="text-[10px] text-gray-400">{planName}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white text-sm font-bold">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-6">
          {renderContent()}
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        data={dashData}
        onSaved={fetchDash}
      />
    </div>
  );
}
