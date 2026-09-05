"use client";
import { TableRowsSkeleton } from "@/components/dashboard/DashboardSkeletons";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  ShieldCheck,
  MessageSquare,
  Trash2,
  Loader2,
  ShieldAlert,
  Users,
  RotateCw,
  XCircle,
  Clock,
  MailCheck,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { useSubscription } from "@/lib/dashboard-context";
import { hasPermission } from "@/lib/permissions";

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
  OWNER: {
    icon: ShieldAlert,
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    avatar: "from-amber-500 to-amber-600",
  },
  FULL_ACCESS: {
    icon: ShieldCheck,
    pill: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    avatar: "from-[#075E54] to-[#064944]",
  },
  CHAT_ONLY: {
    icon: MessageSquare,
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    avatar: "from-[#075E54] to-[#064944]",
  },
} as const;

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string, locale: "ar" | "en") {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));

  if (locale === "en") {
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}

function MemberCard({
  member,
  isSelf,
  canDelete,
  onDelete,
  showDetails,
  canPromote,
  canDemote,
  changingRole,
  onChangeRole,
}: {
  member: TeamMember;
  isSelf: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
  showDetails: boolean;
  canPromote: boolean;
  canDemote: boolean;
  changingRole: boolean;
  onChangeRole: (id: string, newRole: "FULL_ACCESS" | "CHAT_ONLY") => void;
}) {
  const { t, locale } = useLanguage();
  const tm = t.team;
  const cfg = ROLE_CFG[member.role] ?? ROLE_CFG.CHAT_ONLY;
  const Icon = cfg.icon;
  const roleLabel = tm.roles[member.role] ?? member.role;
  const isAdmin = member.role === "FULL_ACCESS";

  const formattedDate = member.createdAt
    ? new Date(member.createdAt).toLocaleDateString(
      locale === "ar" ? "ar-EG" : "en-US"
    )
    : "—";

  return (
    <div className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex flex-col gap-3.5 hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${cfg.avatar} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
        >
          {getInitials(member.name, member.email)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
            <span>{member.name || "—"}</span>
            {isSelf && (
              <span className="text-[10px] text-gray-400 font-normal">
                {tm.self}
              </span>
            )}
          </p>
          <p
            className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5"
            dir="ltr"
          >
            {member.email}
          </p>
        </div>

        {canDelete && (
          <button
            onClick={() => onDelete(member.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
            title={tm.deleteTitle}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-50 dark:border-gray-700/50">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.pill}`}
        >
          <Icon className="w-3 h-3" />
          {roleLabel}
        </span>

        {isAdmin ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#075E54] dark:text-[#25D366] bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-md">
            <MessageSquare className="w-3 h-3" />
            {locale === "ar" ? "كل المحادثات" : "All conversations"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {tm.activeStatus || "نشط"}
          </span>
        )}
      </div>

      {(canPromote || canDemote) && (
        <button
          onClick={() => onChangeRole(member.id, canPromote ? "FULL_ACCESS" : "CHAT_ONLY")}
          disabled={changingRole}
          title={canPromote ? tm.promoteTitle : tm.demoteTitle}
          className={`w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            canPromote
              ? "text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300"
              : "text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300"
          }`}
        >
          {changingRole ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : canPromote ? (
            <ArrowUpCircle className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownCircle className="w-3.5 h-3.5" />
          )}
          {canPromote ? tm.promoteBtn : tm.demoteBtn}
        </button>
      )}

      {showDetails &&
        member.conversationCount !== undefined &&
        member.repliesCount !== undefined && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
            <div className="flex flex-col items-center gap-1 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-[10px] text-gray-500 text-center">
                {isAdmin
                  ? locale === "ar"
                    ? "الوصول"
                    : "Access"
                  : locale === "ar"
                    ? "محادثات مسموح لك بالرد عليها"
                    : "Reply-eligible Chats"}
              </p>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {isAdmin
                  ? locale === "ar"
                    ? "الكل"
                    : "All"
                  : member.conversationCount}
              </p>
            </div>

            <div className="flex flex-col items-center gap-1 p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <p className="text-[10px] text-gray-500 text-center">
                {locale === "ar" ? "ردودي" : "My Replies"}
              </p>
              <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                {member.repliesCount}
              </p>
            </div>

            <div className="flex flex-col items-center gap-1 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <p className="text-[10px] text-gray-500 text-center">
                {locale === "ar" ? "تاريخ الانضمام" : "Joined"}
              </p>
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 text-center">
                {formattedDate}
              </p>
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

  return (
    <div className="bg-white dark:bg-gray-800 border border-dashed border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-xs font-bold">
          {getInitials(invitation.name, invitation.email)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {invitation.name || "—"}
          </p>
          <p className="text-[11px] text-gray-400 truncate" dir="ltr">
            {invitation.email}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.pill}`}
        >
          <Icon className="w-3 h-3" />
          {tm.roles[invitation.role] ?? invitation.role}
        </span>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {tm.pendingStatus}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {tm.sentAgo
            ? tm.sentAgo(timeAgo(invitation.lastSentAt || invitation.createdAt, locale))
            : timeAgo(invitation.lastSentAt || invitation.createdAt, locale)}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onResend(invitation.id)}
            disabled={resending || cancelling}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#075E54] bg-green-50 disabled:opacity-50"
          >
            <RotateCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
            {tm.resendBtn}
          </button>

          <button
            onClick={() => onCancel(invitation.id)}
            disabled={resending || cancelling}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 bg-red-50 disabled:opacity-50"
          >
            <XCircle className="w-3 h-3" />
            {tm.cancelBtn}
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
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  const currentRole = session?.user?.role;
  const isOwner = currentRole === "OWNER";

  // FULL_ACCESS already has CHAT_ASSIGN in the server permission matrix.
  // Use the same permission source in the client so Admin can open the
  // conversation manager exactly like the Owner.
  const canManageConversations = hasPermission(currentRole, "CHAT_ASSIGN");

  function showLimitToast() {
    toast.custom(
      () => (
        <div
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 flex flex-col gap-2 min-w-[260px]"
          dir="rtl"
        >
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            وصلت الحد الأقصى للأعضاء في باقتك
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            رقّي الباقة لإضافة المزيد من أعضاء الفريق.
          </p>
          <button
            onClick={() => {
              toast.dismiss();
              router.push("/checkout");
            }}
            className="mt-1 text-xs font-semibold text-white bg-[#075E54] hover:bg-[#064944] px-4 py-2 rounded-lg"
          >
            ترقية الباقة ←
          </button>
        </div>
      ),
      { duration: 6000 }
    );
  }

  const fetchTeam = useCallback(async (silent = false) => {
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
      } else if (!silent) {
        toast.error(data.error || tm.fetchError);
      }
    } catch {
      if (!silent) toast.error(tm.fetchError);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tm.fetchError]);

  useEffect(() => {
    fetchTeam();
  }, []);

  // تحديث دوري صامت كل 20 ثانية عشان حالة الدعوات والأعضاء تتحدث لوحدها
  useEffect(() => {
    const id = setInterval(() => fetchTeam(true), 20_000);
    return () => clearInterval(id);
  }, [fetchTeam]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") fetchTeam(true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchTeam]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    const name = String(fd.get("name") || "").trim();
    const role = String(fd.get("role") || "CHAT_ONLY");

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

      toast.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">{tm.addForm.addSuccess}</p>
          <p className="text-xs opacity-90">
            {tm.addForm.addSuccessDesc
              ? tm.addForm.addSuccessDesc(email)
              : `أرسلنا كود الانضمام إلى البريد الإلكتروني ${email}`}
          </p>
        </div>
      );

      if (data.invitation) {
        setInvitations((prev) => [data.invitation, ...prev]);
      } else {
        await fetchTeam();
      }

      form.reset();
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
        setInvitations((prev) =>
          prev.map((inv) => (inv.id === invitationId ? data.invitation : inv))
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
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch {
      toast.error(tm.cancelError);
    } finally {
      setCancellingId(null);
    }
  };

  const changeMemberRole = async (id: string, newRole: "FULL_ACCESS" | "CHAT_ONLY") => {
    const isPromote = newRole === "FULL_ACCESS";
    const confirmMsg = isPromote ? tm.promoteConfirm : tm.demoteConfirm;
    if (!confirm(confirmMsg)) return;

    setChangingRoleId(id);

    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || (isPromote ? tm.promoteError : tm.demoteError));
        return;
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
      );
      toast.success(isPromote ? tm.promoteSuccess : tm.demoteSuccess);
    } catch {
      toast.error(isPromote ? tm.promoteError : tm.demoteError);
    } finally {
      setChangingRoleId(null);
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm(tm.deleteConfirm)) return;

    try {
      const res = await fetch(`/api/team?id=${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || tm.deleteError);
        return;
      }

      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success(tm.deleteSuccess);
    } catch {
      toast.error(tm.deleteError);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto" dir={dir}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {tm.title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {members.length > 0 ? tm.memberCount(members.length) : tm.subtitle}
        </p>

        {canManageConversations && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => router.push("/dashboard/team/conversations")}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#075E54] hover:bg-[#064944] text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              {locale === "ar" ? "إدارة المحادثات وتعيينها" : "Manage & Assign Conversations"}
            </button>

            {currentRole === "FULL_ACCESS" && (
              <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-green-50 dark:bg-green-950/30 text-[#075E54] dark:text-[#25D366] text-xs font-semibold border border-green-100 dark:border-green-900/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                {locale === "ar" ? "كل المحادثات مفتوحة" : "All conversations are open"}
              </span>
            )}
          </div>
        )}
      </div>

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
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                {tm.addForm.name}
              </label>
              <input
                name="name"
                placeholder={tm.addForm.namePlaceholder}
                className="h-9 px-3 text-sm bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
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
                className="h-9 px-3 text-sm bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                {tm.addForm.role}
              </label>
              <select
                name="role"
                className="h-9 px-3 text-sm bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
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
              className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-xl bg-[#25D366] hover:bg-[#1fb956] text-white disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {tm.addForm.addBtn}
            </button>
          </div>
        </form>
      )}

      {isOwner && canAddMembers && atLimit && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 mb-8 shadow-sm">
          <button
            onClick={showLimitToast}
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-xl bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <UserPlus className="w-4 h-4" />
            {locale === "ar" ? "وصلت الحد الأقصى للأعضاء" : "Member limit reached"}
          </button>
        </div>
      )}

      {isOwner && !canAddMembers && (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-8 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            {tm.addForm.title}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {locale === "ar"
              ? "متاحة من باقة Starter فما فوق"
              : "Available on Starter plan and above"}
          </p>
        </div>
      )}

      {loading ? (
        <TableRowsSkeleton rows={4} cols={2} />
      ) : (
        <div className="space-y-8">
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
                <Users className="w-6 h-6 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">{tm.empty}</p>
                <p className="text-xs text-gray-400 mt-1">{tm.emptyHint}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => {
                  const isMemberSelf = member.id === session?.user?.id;
                  // Any Owner or Admin can promote a Chat-only agent to Admin.
                  const canPromote =
                    member.role === "CHAT_ONLY" &&
                    (isOwner || currentRole === "FULL_ACCESS") &&
                    !isMemberSelf;
                  // Only the Owner can demote an Admin back to Chat-only —
                  // an Admin can never demote another Admin (or themselves).
                  const canDemote =
                    member.role === "FULL_ACCESS" && isOwner && !isMemberSelf;

                  return (
                    <MemberCard
                      key={member.id}
                      member={member}
                      isSelf={isMemberSelf}
                      canDelete={isOwner && member.role !== "OWNER" && !isMemberSelf}
                      onDelete={deleteMember}
                      showDetails={
                        currentRole === "OWNER" ||
                        currentRole === "FULL_ACCESS" ||
                        isMemberSelf
                      }
                      canPromote={canPromote}
                      canDemote={canDemote}
                      changingRole={changingRoleId === member.id}
                      onChangeRole={changeMemberRole}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {invitations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MailCheck className="w-4 h-4 text-amber-500" />
                  <span>{tm.pendingSectionTitle || "الدعوات المعلقة"}</span>
                  <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {invitations.length}
                  </span>
                </h2>
                <p className="text-xs text-gray-400 hidden sm:block">
                  {tm.pendingSubtitle || "دعوات تم إرسالها وفي انتظار قبول العضو"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {invitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    locale={locale}
                    resending={resendingId === invitation.id}
                    cancelling={cancellingId === invitation.id}
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