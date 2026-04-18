"use client";

import TeamPage from '@/app/dashboard/team/page';
import { useEffect, useState } from "react";
import {
  UserPlus,
  ShieldCheck,
  MessageSquare,
  Trash2,
  Mail,
  Loader2,
  User,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: "FULL_ACCESS" | "CHAT_ONLY" | "OWNER";
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== FETCH =====
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

  // ===== ADD MEMBER =====
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

      toast.success("تم إضافة العضو");

      // تحديث بدون refetch (أسرع)
      setMembers((prev) => [data, ...prev]);

      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== DELETE =====
  const deleteMember = async (id: string) => {
    if (!confirm("متأكد من الحذف؟")) return;

    try {
      const res = await fetch(`/api/team?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "فشل الحذف");
        return;
      }

      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success("تم الحذف");
    } catch {
      toast.error("خطأ في الحذف");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">إدارة الفريق</h1>

      {/* FORM */}
      <form
        onSubmit={handleAddMember}
        className="grid md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border mb-6"
      >
        <input
          name="name"
          placeholder="الاسم"
          className="p-3 bg-gray-50 rounded-lg"
        />

        <input
          name="email"
          type="email"
          placeholder="الإيميل"
          className="p-3 bg-gray-50 rounded-lg"
          required
        />

        <select name="role" className="p-3 bg-gray-50 rounded-lg">
          <option value="CHAT_ONLY">Chat Only</option>
          <option value="FULL_ACCESS">Full Access</option>
        </select>

        <button
          disabled={isSubmitting}
          className="bg-green-600 text-white rounded-lg flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            "إضافة"
          )}
        </button>
      </form>

      {/* LIST */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {members.map((m) => (
            <div
              key={m.id}
              className="p-4 bg-white border rounded-xl"
            >
              <div className="flex justify-between">
                <div>
                  <h3 className="font-bold">{m.name}</h3>
                  <p className="text-sm text-gray-500">{m.email}</p>
                </div>

                {m.role !== "OWNER" && (
                  <button
                    onClick={() => deleteMember(m.id)}
                    className="text-red-500"
                  >
                    <Trash2 />
                  </button>
                )}
              </div>

              <div className="mt-3 text-sm flex items-center gap-2">
                {m.role === "FULL_ACCESS" ? (
                  <ShieldCheck size={16} />
                ) : m.role === "OWNER" ? (
                  <ShieldAlert size={16} />
                ) : (
                  <MessageSquare size={16} />
                )}

                {m.role}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}