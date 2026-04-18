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
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: "FULL_ACCESS" | "CHAT_ONLY" | "OWNER";
  inviteCode: string | null; // الحقل الجديد
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
      <h1 className="text-3xl font-black mb-6 text-gray-900">إدارة الفريق</h1>

      {session?.user?.role !== "CHAT_ONLY" && (
        <form onSubmit={handleAddMember} className="grid md:grid-cols-4 gap-4 bg-white p-6 rounded-2xl border shadow-sm mb-8">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 mr-2">الاسم</label>
            <input name="name" placeholder="اسم الموظف" className="p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#075E54]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 mr-2">الإيميل</label>
            <input name="email" type="email" placeholder="email@company.com" className="p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#075E54]" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 mr-2">الصلاحية</label>
            <select name="role" className="p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#075E54] appearance-none">
              <option value="CHAT_ONLY">رد على المحادثات (Agent)</option>
              <option value="FULL_ACCESS">تحكم كامل (Admin)</option>
            </select>
          </div>
          <button disabled={isSubmitting} className="bg-[#075E54] hover:bg-[#064944] text-white rounded-xl h-[52px] mt-auto font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
            إضافة عضو
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" size={40} /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((m) => (
            <div key={m.id} className="p-5 bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${m.role === 'OWNER' ? 'bg-amber-500' : 'bg-[#075E54]'}`}>
                      {m.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-none">{m.name || "بدون اسم"}</h3>
                      <p className="text-xs text-gray-500 mt-1">{m.email}</p>
                    </div>
                  </div>
                  {m.role !== "OWNER" && m.id !== session?.user?.id && (
                    <button onClick={() => deleteMember(m.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    m.role === 'FULL_ACCESS' ? 'bg-purple-50 text-purple-600' : 
                    m.role === 'OWNER' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {m.role === "FULL_ACCESS" ? <ShieldCheck size={12} /> : 
                     m.role === "OWNER" ? <ShieldAlert size={12} /> : <MessageSquare size={12} />}
                    {m.role === "FULL_ACCESS" ? "Full Access" : m.role === "OWNER" ? "Owner" : "Chat Only"}
                  </div>
                </div>
              </div>

              {/* جزء الكود الجديد */}
              {m.inviteCode && (
                <div className="mt-4 pt-4 border-t border-dashed">
                  <p className="text-[10px] font-bold text-gray-400 mb-2">كود انضمام الفريق:</p>
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <code className="text-sm font-mono font-bold text-[#075E54] tracking-widest">{m.inviteCode}</code>
                    <button 
                      onClick={() => handleCopy(m.inviteCode!, m.id)}
                      className="text-[#075E54] hover:bg-white p-1.5 rounded-md transition-colors"
                    >
                      {copiedId === m.id ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
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