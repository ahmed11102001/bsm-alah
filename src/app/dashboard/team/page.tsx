"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  UserPlus, ShieldCheck, MessageSquare, Trash2,
  Loader2, ShieldAlert, Copy, CheckCircle2, Users,
} from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: "FULL_ACCESS" | "CHAT_ONLY" | "OWNER";
  inviteCode: string | null;
}

const ROLE_CFG = {
  OWNER:       { label: "Owner",       icon: ShieldAlert,   pill: "bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-300",  avatar: "from-amber-500  to-amber-600"  },
  FULL_ACCESS: { label: "Full Access", icon: ShieldCheck,   pill: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", avatar: "from-[#075E54] to-[#064944]" },
  CHAT_ONLY:   { label: "Agent",       icon: MessageSquare, pill: "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300",   avatar: "from-[#075E54] to-[#064944]" },
} as const;

function initials(name: string | null, email: string) {
  if (name) {
    const p = name.trim().split(" ");
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function MemberCard({ member, isSelf, canDelete, copiedId, onDelete, onCopy }: {
  member: TeamMember; isSelf: boolean; canDelete: boolean;
  copiedId: string | null; onDelete: (id: string) => void; onCopy: (code: string, id: string) => void;
}) {
  const cfg  = ROLE_CFG[member.role] ?? ROLE_CFG.CHAT_ONLY;
  const Icon = cfg.icon;

  return (
    <div className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex flex-col gap-4 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${cfg.avatar} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none`}>
          {initials(member.name, member.email)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
            {member.name || "—"}
            {isSelf && <span className="mr-1.5 text-[10px] text-gray-400">(أنت)</span>}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{member.email}</p>
        </div>
        {canDelete && (
          <button onClick={() => onDelete(member.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            title="حذف العضو">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <span className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.pill}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>

      {member.inviteCode && (
        <div className="border-t border-dashed border-gray-100 dark:border-gray-700 pt-3">
          <p className="text-[10px] text-gray-400 mb-1.5">كود الانضمام</p>
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-600 rounded-xl px-3 py-2">
            <code className="text-xs font-mono font-bold text-[#075E54] dark:text-[#25D366] tracking-widest">{member.inviteCode}</code>
            <button onClick={() => onCopy(member.inviteCode!, member.id)}
              className="p-1 rounded-md text-gray-400 hover:text-[#075E54] dark:hover:text-[#25D366] hover:bg-white dark:hover:bg-gray-600 transition-colors">
              {copiedId === member.id
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const { data: session } = useSession();
  const [members,    setMembers]    = useState<TeamMember[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId,   setCopiedId]   = useState<string | null>(null);

  const isOwner = session?.user?.role !== "CHAT_ONLY";

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      if (res.ok) setMembers(data);
    } catch { toast.error("خطأ في تحميل الفريق"); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("تم نسخ كود الانضمام");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/team", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(fd.get("email") || ""), name: String(fd.get("name") || ""), role: String(fd.get("role")) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "فشل الإضافة"); return; }
      toast.success("تم إضافة العضو بنجاح");
      setMembers(prev => [data, ...prev]);
      (e.target as HTMLFormElement).reset();
    } catch { toast.error("خطأ في الاتصال"); }
    finally  { setSubmitting(false); }
  };

  const deleteMember = async (id: string) => {
    if (!confirm("متأكد من الحذف؟")) return;
    try {
      const res = await fetch(`/api/team?id=${id}`, { method: "DELETE" });
      if (res.ok) { setMembers(prev => prev.filter(m => m.id !== id)); toast.success("تم الحذف"); }
    } catch { toast.error("خطأ في الحذف"); }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto" dir="rtl">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الفريق</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {members.length > 0
            ? `${members.length} ${members.length === 1 ? "عضو" : "أعضاء"}`
            : "أدر أعضاء فريقك وصلاحياتهم"}
        </p>
      </div>

      {/* Add member form */}
      {isOwner && (
        <form onSubmit={handleAdd}
          className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 mb-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            إضافة عضو جديد
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">الاسم</label>
              <input name="name" placeholder="اسم الموظف"
                className="h-9 px-3 text-sm bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                الإيميل <span className="text-red-400">*</span>
              </label>
              <input name="email" type="email" placeholder="email@company.com" required
                className="h-9 px-3 text-sm bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">الصلاحية</label>
              <select name="role"
                className="h-9 px-3 text-sm bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-all appearance-none cursor-pointer">
                <option value="CHAT_ONLY">Agent — رد على المحادثات</option>
                <option value="FULL_ACCESS">Admin — تحكم كامل</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-xl bg-[#25D366] hover:bg-[#1fb956] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              إضافة عضو
            </button>
          </div>
        </form>
      )}

      {/* Members grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400">جاري التحميل…</p>
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <Users className="w-7 h-7 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">لا يوجد أعضاء بعد</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">ابدأ بإضافة أول عضو في فريقك</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => (
            <MemberCard
              key={m.id}
              member={m}
              isSelf={m.id === (session?.user as any)?.id}
              canDelete={m.role !== "OWNER" && m.id !== (session?.user as any)?.id}
              copiedId={copiedId}
              onDelete={deleteMember}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}
    </div>
  );
}