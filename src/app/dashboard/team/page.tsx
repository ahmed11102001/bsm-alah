"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  UserPlus, ShieldCheck, MessageSquare, Trash2,
  Loader2, ShieldAlert, CheckCircle2, Users,
  RotateCw, XCircle, Clock, MailCheck, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { useSubscription } from "@/lib/dashboard-context";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: "FULL_ACCESS" | "CHAT_ONLY" | "OWNER";
  image?: string | null;
  createdAt?: string;
  conversationCount?: number;
  repliesCount?: number;
}

interface TeamInvitation {
  id: string;
  email: string;
  name: string | null;
  role: "FULL_ACCESS" | "CHAT_ONLY";
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  lastSentAt: string;
  sendCount: number;
  createdAt: string;
}

const ROLE_CFG = {
  OWNER: { icon: ShieldAlert, pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", avatar: "from-amber-500 to-amber-600" },
  FULL_ACCESS: { icon: ShieldCheck, pill: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", avatar: "from-[#075E54] to-[#064944]" },
  CHAT_ONLY: { icon: MessageSquare, pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", avatar: "from-[#075E54] to-[#064944]" },
} as const;

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string, locale: "ar" | "en"): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.max(0, Math.floor(diff / 60000));
  if (locale === "en") {
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

function MemberCard({
  member,
  isSelf,
  canDelete,
  onDelete,
}: {
  member: TeamMember;
  isSelf: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const { t, locale } = useLanguage();
  const tm = t.team;
  const cfg = ROLE_CFG[member.role] ?? ROLE_CFG.CHAT_ONLY;
  const Icon = cfg.icon;
  const roleLabel = tm.roles[member.role] ?? member.role;
  const formattedDate = member.createdAt
    ? (locale === "ar"
        ? new Date(member.createdAt).toLocaleDateString("ar-EG")
        : new Date(member.createdAt).toLocaleDateString("en-US"))
    : "—";

  return (
    <div className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex flex-col gap-3.5 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${cfg.avatar} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none shadow-sm`}>
          {getInitials(member.name, member.email)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight flex items-center gap-1.5">
            <span>{member.name || "—"}</span>
            {isSelf && <span className="text-[10px] text-gray-400 font-normal">{tm.self}</span>}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5" dir="ltr">{member.email}</p>
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(member.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            title={tm.deleteTitle}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-50 dark:border-gray-700/50">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.pill}`}>
          <Icon className="w-3 h-3" />
          {roleLabel}
        </span>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {tm.activeStatus || "نشط"}
        </span>
      </div>

      {/* التفاصيل الخاصة بالعضو الحالي فقط — الـAPI لا يعيد الإحصائيات لغيره */}
      {isSelf && member.conversationCount !== undefined && member.repliesCount !== undefined && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
          <div className="flex flex-col items-center gap-1 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium text-center">
              {locale === "ar" ? "محادثات مسموح لك بالرد عليها" : "Reply-eligible Chats"}
            </p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{member.conversationCount ?? 0}</p>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium text-center">
              {locale === "ar" ? "ردودي" : "My Replies"}
            </p>
            <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{member.repliesCount ?? 0}</p>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium text-center">
              {locale === "ar" ? "تاريخ الانضمام" : "Joined"}
            </p>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 text-center">{formattedDate}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InvitationCard({
  invitation,
  locale,
  resending,
  cancelling,
  onResend,
  onCancel,
}: {
  invitation: TeamInvitation;
  locale: "ar" | "en";
  resending: boolean;
  cancelling: boolean;
  onResend: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const { t } = useLanguage();
  const tm = t.team;
  const cfg = ROLE_CFG[invitation.role] ?? ROLE_CFG.CHAT_ONLY;
  const Icon = cfg.icon;
  const roleLabel = tm.roles[invitation.role] ?? invitation.role;

  return (
    <div className="bg-white dark:bg-gray-800 border border-dashed border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 flex flex-col gap-3.5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-300 text-xs font-bold flex-shrink-0 select-none">
          {getInitials(invitation.name, invitation.email)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
            {invitation.name || "—"}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5" dir="ltr">{invitation.email}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.pill}`}>
          <Icon className="w-3 h-3" />
          {roleLabel}
        </span>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-800/40 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {tm.pendingStatus}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700/60 pt-3 text-[11px] text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {tm.sentAgo ? tm.sentAgo(timeAgo(invitation.lastSentAt || invitation.createdAt, locale)) : timeAgo(invitation.lastSentAt || invitation.createdAt, locale)}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onResend(invitation.id)}
            disabled={resending || cancelling}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#075E54] dark:text-[#25D366] bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
            title={tm.resendBtn}
          >
            <RotateCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
            <span>{tm.resendBtn}</span>
          </button>

          <button
            onClick={() => onCancel(invitation.id)}
            disabled={resending || cancelling}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
            title={tm.cancelBtn}
          >
            <XCircle className="w-3 h-3" />
            <span>{tm.cancelBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { canTeam: canAddMembers, teamAtMax: atLimit } = useSubscription();
  const { data: session } = useSession();
  const { t, dir, locale } = useLanguage();
  const router = useRouter();
  const tm = t.team;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const isOwner = session?.user?.role !== "CHAT_ONLY";

  function showLimitToast() {
    toast.custom(() => (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 flex flex-col gap-2 min-w-[260px]" dir="rtl">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          وصلت الحد الأقصى للأعضاء في باقتك
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          رقّي الباقة لإضافة المزيد من أعضاء الفريق.
        </p>
        <button
          onClick={() => { toast.dismiss(); router.push("/checkout"); }}
          className="mt-1 text-xs font-semibold text-white bg-[#075E54] hover:bg-[#064944] px-4 py-2 rounded-lg transition-colors"
        >
          ترقية الباقة ←
        </button>
      </div>
    ), { duration: 6000 });
  }

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data)) {
          setMembers(data);
          setInvitations([]);
        } else {
          setMembers(data.members || []);
          setInvitations(data.invitations || []);
        }
      }
    } catch {
      toast.error(tm.fetchError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const name = String(fd.get("name") || "").trim();
    const role = String(fd.get("role"));

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || tm.addForm.addFailed);
        return;
      }

      // Show clear success toast indicating email was sent
      toast.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">{tm.addForm.addSuccess}</p>
          <p className="text-xs opacity-90">
            {tm.addForm.addSuccessDesc ? tm.addForm.addSuccessDesc(email) : `أرسلنا كود الانضمام إلى البريد الإلكتروني ${email}`}
          </p>
        </div>
      );

      if (data.invitation) {
        setInvitations(prev => [data.invitation, ...prev]);
      } else {
        fetchTeam();
      }

      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error(tm.addForm.connError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      const res = await fetch("/api/team/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || tm.resendError);
        return;
      }
      toast.success(tm.resendSuccess);
      if (data.invitation) {
        setInvitations(prev =>
          prev.map(inv => (inv.id === invitationId ? data.invitation : inv))
        );
      }
    } catch {
      toast.error(tm.resendError);
    } finally {
      setResendingId(null);
    }
  };

  const handleCancel = async (invitationId: string) => {
    if (!confirm(tm.cancelConfirm)) return;

    setCancellingId(invitationId);
    try {
      const res = await fetch("/api/team/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || tm.cancelError);
        return;
      }
      toast.success(tm.cancelSuccess);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch {
      toast.error(tm.cancelError);
    } finally {
      setCancellingId(null);
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm(tm.deleteConfirm)) return;
    try {
      const res = await fetch(`/api/team?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== id));
        toast.success(tm.deleteSuccess);
      }
    } catch {
      toast.error(tm.deleteError);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tm.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {members.length > 0 ? tm.memberCount(members.length) : tm.subtitle}
        </p>
        {isOwner && (
          <button
            onClick={() => router.push("/dashboard/team/conversations")}
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#075E54] hover:bg-[#064944] text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <MessageSquare className="w-4 h-4" />
            {locale === "ar" ? "إدارة المحادثات" : "Manage Conversations"}
          </button>
        )}
      </div>

      {/* Add member form */}
      {isOwner && canAddMembers && !atLimit && (
        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 mb-8 shadow-sm"
        >
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-[#25D366]" />
            {tm.addForm.title}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{tm.addForm.name}</label>
              <input
                name="name"
                placeholder={tm.addForm.namePlaceholder}
                className="h-9 px-3 text-sm bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                {tm.addForm.email} <span className="text-red-400">*</span>
              </label>
              <input
                name="email"
                type="email"
                placeholder="email@company.com"
                required
                className="h-9 px-3 text-sm bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{tm.addForm.role}</label>
              <select
                name="role"
                className="h-9 px-3 text-sm bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-all appearance-none cursor-pointer"
              >
                <option value="CHAT_ONLY">{tm.addForm.roleAgent}</option>
                <option value="FULL_ACCESS">{tm.addForm.roleAdmin}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-xl bg-[#25D366] hover:bg-[#1fb956] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {tm.addForm.addBtn}
            </button>
          </div>
        </form>
      )}

      {isOwner && canAddMembers && atLimit && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 mb-8 shadow-sm">
          <button
            onClick={showLimitToast}
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-xl bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            {locale === "ar" ? "وصلت الحد الأقصى للأعضاء" : "Member limit reached"}
          </button>
        </div>
      )}

      {isOwner && !canAddMembers && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => toast.error(locale === "ar" ? "إضافة أعضاء الفريق متاحة من باقة Starter فما فوق. قم بالترقية أولاً." : "Adding team members is available on Starter plan and above. Please upgrade first.")}
          className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-8 shadow-sm cursor-not-allowed opacity-80"
        >
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            {tm.addForm.title}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {locale === "ar" ? "متاحة من باقة Starter فما فوق" : "Available on Starter plan and above"}
          </p>
        </div>
      )}

      {/* Main Content Areas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
          <p className="text-sm text-gray-400 dark:text-gray-500">{tm.loading}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Active Team Members */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#075E54] dark:text-[#25D366]" />
                <span>{tm.membersSectionTitle || "أعضاء الفريق"}</span>
                <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                  {members.length}
                </span>
              </h2>
            </div>

            {members.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{tm.empty}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{tm.emptyHint}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map(m => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    isSelf={m.id === (session?.user as any)?.id}
                    canDelete={m.role !== "OWNER" && m.id !== (session?.user as any)?.id}
                    onDelete={deleteMember}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Pending Invitations */}
          {invitations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MailCheck className="w-4 h-4 text-amber-500" />
                  <span>{tm.pendingSectionTitle || "الدعوات المعلقة"}</span>
                  <span className="text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    {invitations.length}
                  </span>
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                  {tm.pendingSubtitle || "دعوات تم إرسالها وفي انتظار قبول العضو"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {invitations.map(inv => (
                  <InvitationCard
                    key={inv.id}
                    invitation={inv}
                    locale={locale}
                    resending={resendingId === inv.id}
                    cancelling={cancellingId === inv.id}
                    onResend={handleResend}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}