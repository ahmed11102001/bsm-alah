"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  UserPlus,
  ShieldCheck,
  MessageSquare,
  Trash2,
  Loader2,
  ShieldAlert,
  Copy,
  CheckCircle2,
  Users
} from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: "FULL_ACCESS" | "CHAT_ONLY" | "OWNER";
  inviteCode: string | null;
}

export default function TeamPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      if (res.ok) setMembers(data);
    } catch {
      toast.error("خطأ في تحميل الفريق");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("تم نسخ كود الانضمام");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      email: String(formData.get("email") || ""),
      name: String(formData.get("name") || ""),
      role: String(formData.get("role")),
    };

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل الإضافة");
        return;
      }

      toast.success("تم إضافة العضو بنجاح");
      setMembers((prev) => [data, ...prev]);
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm("متأكد من الحذف؟")) return;
    try {
      const res = await fetch(`/api/team?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
        toast.success("تم الحذف");
      }
    } catch {
      toast.error("خطأ في الحذف");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans" dir="rtl">
      {/* رأس الصفحة */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-br from-[#075E54] to-[#064944] rounded-lg">
            <Users size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">إدارة الفريق</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mr-11">أدر فريقك وأضف أعضاء جدد</p>
      </div>

      {/* نموذج إضافة عضو */}
      {session?.user?.role !== "CHAT_ONLY" && (
        <form onSubmit={handleAddMember} className="grid md:grid-cols-4 gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-lg mb-8 transition-colors">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-2">الاسم</label>
            <input 
              name="name" 
              placeholder="اسم الموظف" 
              className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl outline-none focus:ring-2 focus:ring-[#075E54] border border-gray-200 dark:border-gray-600 transition-colors" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-2">الإيميل</label>
            <input 
              name="email" 
              type="email" 
              placeholder="email@company.com" 
              className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl outline-none focus:ring-2 focus:ring-[#075E54] border border-gray-200 dark:border-gray-600 transition-colors" 
              required 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-2">الصلاحية</label>
            <select 
              name="role" 
              className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-[#075E54] appearance-none border border-gray-200 dark:border-gray-600 transition-colors cursor-pointer" 
            >
              <option value="CHAT_ONLY">رد على المحادثات (Agent)</option>
              <option value="FULL_ACCESS">تحكم كامل (Admin)</option>
            </select>
          </div>
          <button 
            disabled={isSubmitting} 
            className="bg-gradient-to-r from-[#075E54] to-[#064944] hover:from-[#064944] hover:to-[#053a35] text-white rounded-xl h-[52px] mt-auto font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
            إضافة عضو
          </button>
        </form>
      )}

      {/* قائمة الأعضاء */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-gray-300 dark:text-gray-600" size={40} />
            <p className="text-sm text-gray-500 dark:text-gray-400">جاري تحميل الفريق...</p>
          </div>
        </div>
      ) : members.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-gray-400 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">لا يوجد أعضاء في الفريق حالياً</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">ابدأ بإضافة أول عضو في فريقك</p>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((m) => (
            <div 
              key={m.id} 
              className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md dark:hover:shadow-xl transition-all flex flex-col justify-between hover:border-gray-300 dark:hover:border-gray-600"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                      m.role === 'OWNER' 
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
                        : 'bg-gradient-to-br from-[#075E54] to-[#064944]'
                    }`}>
                      {m.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white leading-none">{m.name || "بدون اسم"}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.email}</p>
                    </div>
                  </div>
                  {m.role !== "OWNER" && m.id !== session?.user?.id && (
                    <button 
                      onClick={() => deleteMember(m.id)} 
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                {/* شارة الصلاحية */}
                <div className="mt-4 flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-colors ${
                    m.role === 'FULL_ACCESS' 
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                      : m.role === 'OWNER' 
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' 
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }`}>
                    {m.role === "FULL_ACCESS" ? <ShieldCheck size={12} /> : 
                     m.role === "OWNER" ? <ShieldAlert size={12} /> : <MessageSquare size={12} />}
                    {m.role === "FULL_ACCESS" ? "Full Access" : m.role === "OWNER" ? "Owner" : "Chat Only"}
                  </div>
                </div>
              </div>

              {/* كود الانضمام */}
              {m.inviteCode && (
                <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-2">كود انضمام الفريق:</p>
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors">
                    <code className="text-sm font-mono font-bold text-[#075E54] dark:text-[#25D366] tracking-widest">{m.inviteCode}</code>
                    <button 
                      onClick={() => handleCopy(m.inviteCode!, m.id)}
                      className="text-[#075E54] dark:text-[#25D366] hover:bg-white dark:hover:bg-gray-600 p-1.5 rounded-md transition-colors"
                    >
                      {copiedId === m.id ? <CheckCircle2 size={16} className="text-green-500 dark:text-green-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}