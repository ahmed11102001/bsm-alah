"use client";

import { useEffect, useState } from "react";
import { useSession }          from "next-auth/react";
import { useRouter }           from "next/navigation";
import { Shield, Plus, Pencil, Trash2, X, Check, Loader2, Star, Ticket, MessageSquareQuote } from "lucide-react";

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

interface Testimonial {
  id:        string;
  name:      string;
  brandName: string;
  phone:     string;
  rating:    number;
  content:   string;
  approved:  boolean;
  createdAt: string;
}

interface Coupon {
  id:            string;
  code:          string;
  discountType:  string;
  discountValue: number;
  maxUses:       number;
  usedCount:     number;
  expiresAt:     string | null;
  active:        boolean;
  createdAt:     string;
}

type Tab = "users" | "testimonials" | "coupons";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("users");

  const [users,    setUsers]    = useState<User[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<Plan>("free");
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // آراء العملاء
  const [testimonials,    setTestimonials]    = useState<Testimonial[]>([]);
  const [testimonialsTab, setTestimonialsTab] = useState<"pending" | "approved">("pending");
  const [loadingT,        setLoadingT]        = useState(false);
  const [actionT,         setActionT]         = useState<string | null>(null);

  // كوبونات
  const [coupons,     setCoupons]     = useState<Coupon[]>([]);
  const [loadingC,    setLoadingC]    = useState(false);
  const [showCouponF, setShowCouponF] = useState(false);
  const [couponForm,  setCouponForm]  = useState({
    prefix: "SAVE", discountType: "percent", discountValue: "", maxUses: "1", expiresAt: "",
  });
  const [savingC, setSavingC] = useState(false);

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

  const fetchTestimonials = async (filter: "pending" | "approved") => {
    setLoadingT(true);
    const r = await fetch(`/api/admin/testimonials?filter=${filter}`);
    if (r.ok) setTestimonials(await r.json());
    setLoadingT(false);
  };

  const fetchCoupons = async () => {
    setLoadingC(true);
    const r = await fetch("/api/admin/coupons");
    if (r.ok) setCoupons(await r.json());
    setLoadingC(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (activeTab === "testimonials") fetchTestimonials(testimonialsTab);
    if (activeTab === "coupons")      fetchCoupons();
  }, [activeTab, testimonialsTab]);

  // موافقة أو رفض رأي
  const handleTestimonialAction = async (id: string, action: "approve" | "reject") => {
    setActionT(id);
    await fetch("/api/admin/testimonials", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, action }),
    });
    setActionT(null);
    fetchTestimonials(testimonialsTab);
  };

  // إنشاء كوبون
  const handleCreateCoupon = async () => {
    if (!couponForm.discountValue) return;
    setSavingC(true);
    const r = await fetch("/api/admin/coupons", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...couponForm,
        discountValue: Number(couponForm.discountValue),
        maxUses:       Number(couponForm.maxUses),
        expiresAt:     couponForm.expiresAt || null,
      }),
    });
    setSavingC(false);
    if (r.ok) {
      setShowCouponF(false);
      setCouponForm({ prefix: "SAVE", discountType: "percent", discountValue: "", maxUses: "1", expiresAt: "" });
      fetchCoupons();
    } else {
      const d = await r.json().catch(() => ({}));
      alert(d.error ?? "حدث خطأ أثناء إنشاء الكوبون");
    }
  };

  // تعطيل كوبون
  const handleDeactivateCoupon = async (id: string) => {
    await fetch("/api/admin/coupons", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    });
    fetchCoupons();
  };

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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Super Admin</h1>
              <p className="text-xs text-gray-400">مش شايفها غيرك 👀</p>
            </div>
          </div>
          {/* زر حسب التبويب */}
          {activeTab === "users" && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#20b557] transition">
              <Plus className="w-4 h-4" /> يوزر جديد
            </button>
          )}
          {activeTab === "coupons" && (
            <button onClick={() => setShowCouponF(true)}
              className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#20b557] transition">
              <Plus className="w-4 h-4" /> كوبون جديد
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit">
          {([
            { id: "users",        label: "المستخدمين",   icon: Shield },
            { id: "testimonials", label: "آراء العملاء", icon: MessageSquareQuote },
            { id: "coupons",      label: "الكوبونات",    icon: Ticket },
          ] as { id: Tab; label: string; icon: any }[]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-[#25D366] text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════ تبويب المستخدمين ══════════ */}
        {activeTab === "users" && (<>

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
        </>)}

        {/* ══════════ تبويب آراء العملاء ══════════ */}
        {activeTab === "testimonials" && (
          <div>
            <div className="flex gap-2 mb-4">
              {(["pending", "approved"] as const).map(f => (
                <button key={f} onClick={() => setTestimonialsTab(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    testimonialsTab === f ? "bg-[#25D366] text-white" : "bg-white border border-gray-200 text-gray-600"
                  }`}>
                  {f === "pending" ? "في الانتظار" : "معتمدة"}
                </button>
              ))}
            </div>
            {loadingT ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : testimonials.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
                لا توجد آراء {testimonialsTab === "pending" ? "في الانتظار" : "معتمدة"}
              </div>
            ) : (
              <div className="space-y-4">
                {testimonials.map(t => (
                  <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold text-gray-900">{t.name}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.brandName}</span>
                          <span className="text-xs text-gray-400">{t.phone}</span>
                        </div>
                        <div className="flex gap-0.5 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < t.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{t.content}</p>
                        <p className="text-xs text-gray-400 mt-2">{new Date(t.createdAt).toLocaleDateString("ar-EG")}</p>
                      </div>
                      {!t.approved ? (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleTestimonialAction(t.id, "approve")} disabled={actionT === t.id}
                            className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-600 transition disabled:opacity-50">
                            {actionT === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            موافقة
                          </button>
                          <button onClick={() => handleTestimonialAction(t.id, "reject")} disabled={actionT === t.id}
                            className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-600 transition disabled:opacity-50">
                            <X className="w-3 h-3" /> رفض
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium flex-shrink-0">معتمد ✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ تبويب الكوبونات ══════════ */}
        {activeTab === "coupons" && (
          <div>
            {showCouponF && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">إنشاء كوبون خصم</h2>
                  <button onClick={() => setShowCouponF(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">بادئة الكود</label>
                    <input value={couponForm.prefix}
                      onChange={e => setCouponForm(f => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                      placeholder="SAVE"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366]"
                    />
                    <p className="text-xs text-gray-400 mt-1">مثلاً SAVE ← سيكون SAVE-A3F9K</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">نوع الخصم</label>
                    <select value={couponForm.discountType}
                      onChange={e => setCouponForm(f => ({ ...f, discountType: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366]">
                      <option value="percent">نسبة مئوية (%)</option>
                      <option value="fixed">مبلغ ثابت (جنيه)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">قيمة الخصم {couponForm.discountType === "percent" ? "(%)" : "(جنيه)"}</label>
                    <input value={couponForm.discountValue} type="number" min="1"
                      onChange={e => setCouponForm(f => ({ ...f, discountValue: e.target.value }))}
                      placeholder={couponForm.discountType === "percent" ? "20" : "50"}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">أقصى عدد استخدامات</label>
                    <input value={couponForm.maxUses} type="number" min="1"
                      onChange={e => setCouponForm(f => ({ ...f, maxUses: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">تاريخ الانتهاء (اختياري)</label>
                    <input value={couponForm.expiresAt} type="date"
                      onChange={e => setCouponForm(f => ({ ...f, expiresAt: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366]"
                    />
                  </div>
                </div>
                <button onClick={handleCreateCoupon} disabled={savingC || !couponForm.discountValue}
                  className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[#20b557] transition disabled:opacity-50">
                  {savingC ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  إنشاء الكوبون
                </button>
              </div>
            )}
            {loadingC ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : coupons.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">لا توجد كوبونات بعد</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["الكود","الخصم","الاستخدام","الانتهاء","الحالة",""].map((h,i) => (
                        <th key={i} className="text-right py-3 px-4 font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map(c => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#25D366] bg-green-50 px-2 py-1 rounded-lg">{c.code}</span>
                        </td>
                        <td className="py-3 px-4">{c.discountType === "percent" ? `${c.discountValue}%` : `${c.discountValue} جنيه`}</td>
                        <td className="py-3 px-4 text-gray-500">{c.usedCount} / {c.maxUses}</td>
                        <td className="py-3 px-4 text-gray-500">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("ar-EG") : "—"}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {c.active ? "نشط" : "معطل"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {c.active && (
                            <button onClick={() => handleDeactivateCoupon(c.id)} className="text-xs text-red-400 hover:text-red-600 transition">تعطيل</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}