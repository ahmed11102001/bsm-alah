"use client";

import { useEffect, useState } from "react";
import { useSession }          from "next-auth/react";
import { useRouter }           from "next/navigation";
import { Shield, Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";

const PLANS = ["free", "starter", "pro", "enterprise", "beta"] as const;
type Plan   = typeof PLANS[number];

const PLAN_LABELS: Record<Plan, string> = {
  free:       "مجانية",
  starter:    "Starter",
  pro:        "Pro",
  enterprise: "Enterprise",
  beta:       "Beta ✨",
};

const PLAN_COLORS: Record<Plan, string> = {
  free:       "bg-gray-100 text-gray-600",
  starter:    "bg-blue-100 text-blue-700",
  pro:        "bg-purple-100 text-purple-700",
  enterprise: "bg-yellow-100 text-yellow-700",
  beta:       "bg-green-100 text-green-700",
};

interface User {
  id:        string;
  name:      string | null;
  email:     string;
  isSuper:   boolean;
  createdAt: string;
  subscription: { plan: Plan; status: string } | null;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users,    setUsers]    = useState<User[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<Plan>("free");
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // فورم إنشاء يوزر جديد
  const [form, setForm] = useState({ name: "", email: "", password: "", plan: "beta" as Plan });

  // حماية client-side — لو مش super ارجع 404
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isSuper) router.replace("/not-found");
  }, [session, status, router]);

  const fetchUsers = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/users");
    if (r.ok) setUsers(await r.json());
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  // إنشاء يوزر جديد
  const handleCreate = async () => {
    if (!form.email || !form.password) return;
    setSaving(true);
    const r = await fetch("/api/admin/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    setSaving(false);
    if (r.ok) {
      setShowForm(false);
      setForm({ name: "", email: "", password: "", plan: "beta" });
      fetchUsers();
    } else {
      const d = await r.json();
      alert(d.error);
    }
  };

  // تعديل الـ plan
  const handlePlanSave = async (userId: string) => {
    setSaving(true);
    await fetch(`/api/admin/users/${userId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ plan: editPlan }),
    });
    setSaving(false);
    setEditId(null);
    fetchUsers();
  };

  // حذف يوزر
  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`هتحذف ${email}؟`)) return;
    setDeleting(userId);
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setDeleting(null);
    fetchUsers();
  };

  if (status === "loading" || !session?.user?.isSuper) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Super Admin</h1>
              <p className="text-xs text-gray-400">مش شايفها غيرك 👀</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#20b557] transition"
          >
            <Plus className="w-4 h-4" />
            يوزر جديد
          </button>
        </div>

        {/* فورم إنشاء يوزر */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">إنشاء يوزر جديد</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الاسم</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ahmed"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الإيميل *</label>
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="ahmed@example.com"
                  type="email"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">كلمة المرور *</label>
                <input
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  type="password"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الباقة</label>
                <select
                  value={form.plan}
                  onChange={e => setForm(f => ({ ...f, plan: e.target.value as Plan }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366] bg-white"
                >
                  {PLANS.map(p => (
                    <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[#20b557] transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                إنشاء
              </button>
            </div>
          </div>
        )}

        {/* جدول اليوزرات */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">{users.length} مستخدم</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-right px-6 py-3 font-medium">المستخدم</th>
                  <th className="text-right px-6 py-3 font-medium">الباقة</th>
                  <th className="text-right px-6 py-3 font-medium">تاريخ التسجيل</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {user.name || "—"}
                        {user.isSuper && <span className="mr-2 text-xs text-red-500 font-bold">SUPER</span>}
                      </p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {editId === user.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editPlan}
                            onChange={e => setEditPlan(e.target.value as Plan)}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#25D366] bg-white"
                          >
                            {PLANS.map(p => (
                              <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handlePlanSave(user.id)}
                            disabled={saving}
                            className="text-green-600 hover:text-green-700"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PLAN_COLORS[user.subscription?.plan ?? "free"]}`}>
                          {PLAN_LABELS[user.subscription?.plan ?? "free"]}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-6 py-4">
                      {!user.isSuper ? (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setEditId(user.id); setEditPlan(user.subscription?.plan ?? "free"); }}
                            className="text-gray-400 hover:text-blue-600 transition"
                            title="تعديل الباقة"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.email)}
                            disabled={deleting === user.id}
                            className="text-gray-400 hover:text-red-500 transition"
                            title="حذف"
                          >
                            {deleting === user.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      ) : (
                        // Super Admin — يقدر يعدل باقته بس مش يحذف نفسه
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setEditId(user.id); setEditPlan(user.subscription?.plan ?? "free"); }}
                            className="text-gray-400 hover:text-blue-600 transition"
                            title="تعديل الباقة"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}