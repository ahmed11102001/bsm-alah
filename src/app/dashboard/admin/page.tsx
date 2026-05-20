"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter }  from "next/navigation";
import {
  Shield, Plus, Pencil, Trash2, RotateCcw, X, Check, Loader2,
  Star, Ticket, MessageSquareQuote, FileText,
  Eye, EyeOff, ExternalLink, ImageIcon, AlignLeft, Sparkles,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

// ─── Types ────────────────────────────────────────────────────────────────────
const PLANS = ["free", "starter", "pro", "enterprise"] as const;
type Plan = typeof PLANS[number];

const PLAN_COLORS: Record<Plan, string> = {
  free:       "bg-gray-100   text-gray-600   dark:bg-gray-700   dark:text-gray-300",
  starter:    "bg-blue-100   text-blue-700   dark:bg-blue-900/40  dark:text-blue-300",
  pro:        "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  enterprise: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
};

interface User {
  id: string; name: string | null; email: string;
  isSuper: boolean; createdAt: string;
  subscription: {
    plan: Plan; status: string; isBetaUser: boolean;
    aiPlanCredits: number; aiExtraCredits: number; aiUsedCredits: number;
  } | null;
}
interface Testimonial {
  id: string; name: string; brandName: string; phone: string;
  rating: number; content: string; approved: boolean; createdAt: string;
}
interface Coupon {
  id: string; code: string; discountType: string; discountValue: number;
  maxUses: number; usedCount: number; expiresAt: string | null;
  active: boolean; createdAt: string;
}
interface Article {
  id: string; title: string; slug: string; excerpt: string | null;
  coverImage: string | null; published: boolean;
  publishedAt: string | null; createdAt: string;
}

type Tab = "users" | "testimonials" | "coupons" | "articles";

const blankArticle = {
  title: "", slug: "", excerpt: "", content: "", coverImage: "", published: false,
};

function toSlug(title: string) {
  return title.trim().toLowerCase()
    .replace(/[\u0600-\u0605\u060C\u060D\u061B\u061C\u061D\u061E\u061F\u066A-\u066D\u06D4]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0621-\u06D3\u06D5-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// ─── Shared input class ───────────────────────────────────────────────────────
const inp = "w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366] bg-white";
const btn = "flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#20b557] transition disabled:opacity-50";

// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, dir, locale } = useLanguage();
  const adm = t.admin;
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  const [activeTab, setActiveTab] = useState<Tab>("users");

  // users
  const [users,      setUsers]      = useState<User[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [editPlan,   setEditPlan]   = useState<Plan>("free");
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [restoring,  setRestoring]  = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [form,       setForm]       = useState({ name: "", email: "", password: "", plan: "enterprise" as Plan });
  // AI credits
  const [editCreditsId,    setEditCreditsId]    = useState<string | null>(null);
  const [creditsDelta,     setCreditsDelta]     = useState<string>("");
  const [savingCredits,    setSavingCredits]    = useState(false);
  // pagination + search
  const [cursors,    setCursors]    = useState<(string | null)[]>([null]);
  const [pageIdx,    setPageIdx]    = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userSearch, setUserSearch] = useState("");

  // testimonials
  const [testimonials,    setTestimonials]    = useState<Testimonial[]>([]);
  const [testimonialsTab, setTestimonialsTab] = useState<"pending" | "approved">("pending");
  const [loadingT,        setLoadingT]        = useState(false);
  const [actionT,         setActionT]         = useState<string | null>(null);

  // coupons
  const [coupons,     setCoupons]     = useState<Coupon[]>([]);
  const [loadingC,    setLoadingC]    = useState(false);
  const [showCouponF, setShowCouponF] = useState(false);
  const [couponForm,  setCouponForm]  = useState({
    prefix: "SAVE", discountType: "percent", discountValue: "", maxUses: "1", expiresAt: "",
  });
  const [savingC, setSavingC] = useState(false);

  // articles
  const [articles,      setArticles]      = useState<Article[]>([]);
  const [loadingA,      setLoadingA]      = useState(false);
  const [showArticleF,  setShowArticleF]  = useState(false);
  const [editArticleId, setEditArticleId] = useState<string | null>(null);
  const [articleForm,   setArticleForm]   = useState(blankArticle);
  const [savingA,       setSavingA]       = useState(false);
  const [deletingA,     setDeletingA]     = useState<string | null>(null);
  const [articlePreview,setArticlePreview]= useState(false);

  // guard
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isSuper) router.replace("/not-found");
  }, [session, status, router]);

  // fetchers
  const fetchUsers = async (cursor: string | null = null, search = "", deleted = false) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cursor)  params.set("cursor", cursor);
    if (search)  params.set("search", search);
    if (deleted) params.set("deleted", "true");
    const r = await fetch(`/api/admin/users?${params}`);
    if (r.ok) {
      const data = await r.json();
      setUsers(data.users);
      setNextCursor(data.nextCursor);
      setTotalUsers(data.total);
    }
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
  const fetchArticles = async () => {
    setLoadingA(true);
    const r = await fetch("/api/admin/articles");
    if (r.ok) setArticles(await r.json());
    setLoadingA(false);
  };

  useEffect(() => {
    fetchUsers(cursors[pageIdx], userSearch, showDeleted);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdx, cursors, userSearch, showDeleted]);
  useEffect(() => {
    if (activeTab === "testimonials") fetchTestimonials(testimonialsTab);
    if (activeTab === "coupons")      fetchCoupons();
    if (activeTab === "articles")     fetchArticles();
  }, [activeTab, testimonialsTab]);

  // ── user actions ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.email || !form.password) return;
    setSaving(true);
    const r = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (r.ok) {
      setShowForm(false);
      setForm({ name: "", email: "", password: "", plan: "enterprise" });
      // reset to first page after creating
      setCursors([null]);
      setPageIdx(0);
    }
    else { const d = await r.json(); alert(d.error); }
  };
  const handlePlanSave = async (userId: string) => {
    setSaving(true);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: editPlan }),
    });
    setSaving(false); setEditId(null);
    fetchUsers(cursors[pageIdx], userSearch, showDeleted);
  };
  const handleCreditsSave = async (userId: string) => {
    const delta = parseInt(creditsDelta, 10);
    if (isNaN(delta)) return;
    setSavingCredits(true);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiExtraCredits: delta }),
    });
    setSavingCredits(false);
    setEditCreditsId(null);
    setCreditsDelta("");
    fetchUsers(cursors[pageIdx], userSearch, showDeleted);
  };
  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`حذف ناعم للمستخدم: ${email}\nهيتحذف من الـ dashboard لكن بياناته هتفضل في الـ DB.\nممكن تسترجعه لاحقاً.`)) return;
    setDeleting(userId);
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setDeleting(null);
    fetchUsers(cursors[pageIdx], userSearch, showDeleted);
  };

  const handleRestore = async (userId: string) => {
    setRestoring(userId);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: true }),
    });
    setRestoring(null);
    fetchUsers(cursors[pageIdx], userSearch, showDeleted);
  };

  // ── testimonial actions ───────────────────────────────────────────────────
  const handleTestimonialAction = async (id: string, action: "approve" | "reject") => {
    setActionT(id);
    await fetch("/api/admin/testimonials", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setActionT(null); fetchTestimonials(testimonialsTab);
  };

  // ── coupon actions ────────────────────────────────────────────────────────
  const handleCreateCoupon = async () => {
    if (!couponForm.discountValue) return;
    setSavingC(true);
    const r = await fetch("/api/admin/coupons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...couponForm,
        discountValue: Number(couponForm.discountValue),
        maxUses: Number(couponForm.maxUses),
        expiresAt: couponForm.expiresAt || null,
      }),
    });
    setSavingC(false);
    if (r.ok) {
      setShowCouponF(false);
      setCouponForm({ prefix: "SAVE", discountType: "percent", discountValue: "", maxUses: "1", expiresAt: "" });
      fetchCoupons();
    } else {
      const d = await r.json().catch(() => ({}));
      alert(d.error ?? adm.coupons.createErr);
    }
  };
  const handleDeactivateCoupon = async (id: string) => {
    await fetch("/api/admin/coupons", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchCoupons();
  };

  // ── article actions ───────────────────────────────────────────────────────
  const openNewArticle = () => {
    setEditArticleId(null); setArticleForm(blankArticle);
    setShowArticleF(true); setArticlePreview(false);
  };
  const openEditArticle = (a: Article) => {
    setEditArticleId(a.id);
    setArticleForm({ title: a.title, slug: a.slug, excerpt: a.excerpt ?? "",
      content: "", coverImage: a.coverImage ?? "", published: a.published });
    fetch(`/api/admin/articles?id=${a.id}`).then(r => r.json())
      .then((d: any) => setArticleForm(f => ({ ...f, content: d.content ?? "" }))).catch(() => {});
    setShowArticleF(true); setArticlePreview(false);
  };
  const handleSaveArticle = async () => {
    if (!articleForm.title.trim() || !articleForm.content.trim()) {
      alert(adm.articles.validationErr); return;
    }
    setSavingA(true);
    const method = editArticleId ? "PATCH" : "POST";
    const body   = editArticleId ? { ...articleForm, id: editArticleId } : articleForm;
    const r = await fetch("/api/admin/articles", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setSavingA(false);
    if (r.ok) { setShowArticleF(false); setEditArticleId(null); setArticleForm(blankArticle); fetchArticles(); }
    else { const d = await r.json().catch(() => ({})); alert(d.error ?? adm.articles.saveErr); }
  };
  const handleDeleteArticle = async (id: string, title: string) => {
    if (!confirm(adm.articles.deleteConfirm(title))) return;
    setDeletingA(id);
    await fetch("/api/admin/articles", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    setDeletingA(null); fetchArticles();
  };
  const handleTogglePublish = async (a: Article) => {
    await fetch("/api/admin/articles", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, published: !a.published }),
    });
    fetchArticles();
  };

  if (status === "loading" || !session?.user?.isSuper) return null;

  const PLAN_LABELS = adm.plans;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors" dir={dir}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{adm.title}</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">{adm.subtitle}</p>
            </div>
          </div>
          {activeTab === "users"    && <button onClick={() => setShowForm(true)}    className={btn}><Plus className="w-4 h-4" /> {adm.users.newBtn}</button>}
          {activeTab === "coupons"  && <button onClick={() => setShowCouponF(true)} className={btn}><Plus className="w-4 h-4" /> {adm.coupons.newBtn}</button>}
          {activeTab === "articles" && !showArticleF && <button onClick={openNewArticle} className={btn}><Plus className="w-4 h-4" /> {adm.articles.newBtn}</button>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 mb-6 w-fit flex-wrap">
          {([
            { id: "users",        label: adm.tabs.users,        icon: Shield             },
            { id: "testimonials", label: adm.tabs.testimonials, icon: MessageSquareQuote },
            { id: "coupons",      label: adm.tabs.coupons,      icon: Ticket             },
            { id: "articles",     label: adm.tabs.articles,     icon: FileText           },
          ] as { id: Tab; label: string; icon: any }[]).map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowArticleF(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-[#25D366] text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* ══ USERS ══ */}
        {activeTab === "users" && (<>
          {showForm && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">{adm.users.createTitle}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  { label: adm.users.fields.name,     key: "name",     type: "text",     ph: adm.users.placeholders.name     },
                  { label: adm.users.fields.email,    key: "email",    type: "email",    ph: adm.users.placeholders.email    },
                  { label: adm.users.fields.password, key: "password", type: "password", ph: adm.users.placeholders.password },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{f.label}</label>
                    <input value={(form as any)[f.key]} type={f.type} placeholder={f.ph}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className={inp} />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{adm.users.fields.plan}</label>
                  <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value as Plan }))}
                    className={inp + " cursor-pointer"}>
                    {PLANS.map(p => <option key={p} value={p}>{(PLAN_LABELS as any)[p]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleCreate} disabled={saving} className={btn}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {adm.users.createBtn}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Header: count + search + deleted toggle */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {totalUsers} {totalUsers === 1 ? "مستخدم" : "مستخدم"}
                  {userSearch && ` — "${userSearch}"`}
                </p>
                {/* toggle عرض المحذوفين */}
                <button
                  onClick={() => { setShowDeleted(v => !v); setCursors([null]); setPageIdx(0); }}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-medium transition ${
                    showDeleted
                      ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                      : "border-gray-300 text-gray-400 hover:border-red-300 hover:text-red-500 dark:border-gray-600"
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  {showDeleted ? "عرض الـ active" : "عرض المحذوفين"}
                </button>
              </div>
              <input
                value={userSearch}
                onChange={e => {
                  setUserSearch(e.target.value);
                  setCursors([null]);
                  setPageIdx(0);
                }}
                placeholder="ابحث بالإيميل أو الاسم..."
                className="border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-[#25D366] bg-white w-56"
              />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                    {adm.users.headers.map((h, i) => (
                      <th key={i} className="text-right px-6 py-3 font-medium">{h}</th>
                    ))}
                    <th className="text-right px-6 py-3 font-medium">AI كريديتس</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name || "—"}
                          {user.isSuper && <span className="mr-2 text-xs text-red-500 font-bold">{adm.users.superBadge}</span>}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {editId === user.id ? (
                            <div className="flex items-center gap-2">
                              <select value={editPlan} onChange={e => setEditPlan(e.target.value as Plan)}
                                className="border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#25D366]">
                                {PLANS.map(p => <option key={p} value={p}>{(PLAN_LABELS as any)[p]}</option>)}
                              </select>
                              <button onClick={() => handlePlanSave(user.id)} disabled={saving} className="text-green-600 hover:text-green-500">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PLAN_COLORS[user.subscription?.plan ?? "free"]}`}>
                              {(PLAN_LABELS as any)[user.subscription?.plan ?? "free"]}
                            </span>
                          )}
                          {/* Beta badge — internal only, مش جزء من plan dropdown */}
                          {user.subscription?.isBetaUser && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              β Beta
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 dark:text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString(dateLocale)}
                      </td>
                      {/* ── AI Credits column ── */}
                      <td className="px-6 py-4">
                        {user.subscription?.plan === "enterprise" ? (
                          editCreditsId === user.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={creditsDelta}
                                onChange={e => setCreditsDelta(e.target.value)}
                                placeholder="+500000"
                                className="w-28 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-400"
                              />
                              <button
                                onClick={() => handleCreditsSave(user.id)}
                                disabled={savingCredits}
                                className="text-purple-600 hover:text-purple-800"
                              >
                                {savingCredits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button onClick={() => { setEditCreditsId(null); setCreditsDelta(""); }} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditCreditsId(user.id); setCreditsDelta(""); }}
                              className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400"
                              title="تعديل كريديتس AI"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span className="font-mono">
                                {((user.subscription?.aiPlanCredits ?? 0) + (user.subscription?.aiExtraCredits ?? 0)).toLocaleString()}
                              </span>
                              <Pencil className="w-3 h-3 opacity-50" />
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          {/* toggle beta flag */}
                          <button
                            onClick={async () => {
                              const next = !user.subscription?.isBetaUser;
                              await fetch(`/api/admin/users/${user.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ isBetaUser: next }),
                              });
                              fetchUsers(cursors[pageIdx], userSearch, showDeleted);
                            }}
                            title={user.subscription?.isBetaUser ? "إلغاء Beta" : "تفعيل Beta"}
                            className={`text-xs px-2 py-0.5 rounded-full border font-medium transition ${
                              user.subscription?.isBetaUser
                                ? "border-emerald-400 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                : "border-gray-300 text-gray-400 hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-600"
                            }`}
                          >
                            β
                          </button>
                          {/* edit plan — مش موجود في وضع المحذوفين */}
                          {!showDeleted && (
                            <button onClick={() => { setEditId(user.id); setEditPlan(user.subscription?.plan ?? "free"); }}
                              className="text-gray-400 hover:text-blue-600 transition" title={adm.users.editPlanTitle}>
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {/* soft delete أو restore حسب الوضع */}
                          {!user.isSuper && (
                            showDeleted ? (
                              <button onClick={() => handleRestore(user.id)} disabled={restoring === user.id}
                                className="text-gray-400 hover:text-emerald-600 transition" title="استرجاع المستخدم">
                                {restoring === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                              </button>
                            ) : (
                              <button onClick={() => handleDelete(user.id, user.email)} disabled={deleting === user.id}
                                className="text-gray-400 hover:text-red-500 transition" title="حذف ناعم">
                                {deleting === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* Pagination footer */}
            {!loading && (pageIdx > 0 || nextCursor) && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                <button
                  onClick={() => setPageIdx(i => i - 1)}
                  disabled={pageIdx === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ← السابق
                </button>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  صفحة {pageIdx + 1}
                </span>
                <button
                  onClick={() => {
                    if (nextCursor) {
                      setCursors(prev => {
                        const updated = [...prev];
                        updated[pageIdx + 1] = nextCursor;
                        return updated;
                      });
                      setPageIdx(i => i + 1);
                    }
                  }}
                  disabled={!nextCursor}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  التالي →
                </button>
              </div>
            )}
          </div>
        </>)}

        {/* ══ TESTIMONIALS ══ */}
        {activeTab === "testimonials" && (
          <div>
            <div className="flex gap-2 mb-4">
              {(["pending", "approved"] as const).map(f => (
                <button key={f} onClick={() => setTestimonialsTab(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    testimonialsTab === f
                      ? "bg-[#25D366] text-white"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                  }`}>
                  {f === "pending" ? adm.testimonials.pending : adm.testimonials.approved}
                </button>
              ))}
            </div>
            {loadingT ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : testimonials.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                {testimonialsTab === "pending" ? adm.testimonials.emptyPending : adm.testimonials.emptyApproved}
              </div>
            ) : (
              <div className="space-y-4">
                {testimonials.map(t => (
                  <div key={t.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold text-gray-900 dark:text-white">{t.name}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{t.brandName}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{t.phone}</span>
                        </div>
                        <div className="flex gap-0.5 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < t.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 dark:text-gray-600"}`} />
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{t.content}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(t.createdAt).toLocaleDateString(dateLocale)}</p>
                      </div>
                      {!t.approved ? (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleTestimonialAction(t.id, "approve")} disabled={actionT === t.id}
                            className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-600 disabled:opacity-50">
                            {actionT === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} {adm.testimonials.approveBtn}
                          </button>
                          <button onClick={() => handleTestimonialAction(t.id, "reject")} disabled={actionT === t.id}
                            className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50">
                            <X className="w-3 h-3" /> {adm.testimonials.rejectBtn}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full font-medium flex-shrink-0">
                          {adm.testimonials.approvedBadge}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ COUPONS ══ */}
        {activeTab === "coupons" && (
          <div>
            {showCouponF && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white">{adm.coupons.createTitle}</h2>
                  <button onClick={() => setShowCouponF(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{adm.coupons.fields.prefix}</label>
                    <input value={couponForm.prefix} placeholder="SAVE"
                      onChange={e => setCouponForm(f => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                      className={inp} />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{adm.coupons.fields.prefixHint}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{adm.coupons.fields.discountType}</label>
                    <select value={couponForm.discountType} onChange={e => setCouponForm(f => ({ ...f, discountType: e.target.value }))}
                      className={inp + " cursor-pointer"}>
                      <option value="percent">{adm.coupons.fields.typePercent}</option>
                      <option value="fixed">{adm.coupons.fields.typeFixed}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{adm.coupons.fields.discountValue(couponForm.discountType)}</label>
                    <input value={couponForm.discountValue} type="number" min="1"
                      placeholder={couponForm.discountType === "percent" ? "20" : "50"}
                      onChange={e => setCouponForm(f => ({ ...f, discountValue: e.target.value }))}
                      className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{adm.coupons.fields.maxUses}</label>
                    <input value={couponForm.maxUses} type="number" min="1"
                      onChange={e => setCouponForm(f => ({ ...f, maxUses: e.target.value }))}
                      className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{adm.coupons.fields.expiresAt}</label>
                    <input value={couponForm.expiresAt} type="date"
                      onChange={e => setCouponForm(f => ({ ...f, expiresAt: e.target.value }))}
                      className={inp} />
                  </div>
                </div>
                <button onClick={handleCreateCoupon} disabled={savingC || !couponForm.discountValue} className={btn}>
                  {savingC ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {adm.coupons.createBtn}
                </button>
              </div>
            )}

            {loadingC ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : coupons.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500 text-sm">{adm.coupons.empty}</div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <tr>{adm.coupons.headers.map((h, i) => (
                      <th key={i} className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {coupons.map(c => (
                      <tr key={c.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#25D366] bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">{c.code}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{adm.coupons.unit(c.discountType, c.discountValue)}</td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{c.usedCount} / {c.maxUses}</td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString(dateLocale) : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.active ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                            {c.active ? adm.coupons.active : adm.coupons.inactive}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {c.active && (
                            <button onClick={() => handleDeactivateCoupon(c.id)}
                              className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300">{adm.coupons.deactivate}</button>
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

        {/* ══ ARTICLES ══ */}
        {activeTab === "articles" && (
          <div>
            {showArticleF && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 overflow-hidden">
                {/* Editor header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {editArticleId ? adm.articles.editTitle : adm.articles.createTitle}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setArticlePreview(p => !p)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        articlePreview
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}>
                      {articlePreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {articlePreview ? adm.articles.hidePreview : adm.articles.preview}
                    </button>
                    <button onClick={() => { setShowArticleF(false); setEditArticleId(null); }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
                  </div>
                </div>

                <div className={`grid gap-0 ${articlePreview ? "grid-cols-2" : "grid-cols-1"}`}>
                  {/* Fields */}
                  <div className="p-6 space-y-4 border-l border-gray-100 dark:border-gray-700">
                    {/* Title */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{adm.articles.fields.title}</label>
                      <input value={articleForm.title} placeholder={adm.articles.fields.titlePh}
                        onChange={e => {
                          const title = e.target.value;
                          setArticleForm(f => ({ ...f, title, slug: editArticleId ? f.slug : toSlug(title) }));
                        }}
                        className={inp + " font-semibold"} />
                    </div>
                    {/* Slug */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">
                        {adm.articles.fields.slugLabel}
                        <span className="font-normal text-gray-400 dark:text-gray-500 mr-1">— /articles/{articleForm.slug || "..."}</span>
                      </label>
                      <input value={articleForm.slug} placeholder={adm.articles.fields.slugPh} dir="ltr"
                        onChange={e => setArticleForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                        className={inp + " font-mono"} />
                    </div>
                    {/* Cover */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5 block">
                        <ImageIcon className="w-3.5 h-3.5" /> {adm.articles.fields.cover}
                      </label>
                      <input value={articleForm.coverImage} placeholder={adm.articles.fields.coverPh} dir="ltr"
                        onChange={e => setArticleForm(f => ({ ...f, coverImage: e.target.value }))}
                        className={inp + " font-mono"} />
                      {articleForm.coverImage && (
                        <div className="mt-2 rounded-xl overflow-hidden h-28 border border-gray-100 dark:border-gray-700">
                          <img src={articleForm.coverImage} alt="cover" className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      )}
                    </div>
                    {/* Excerpt */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5 block">
                        <AlignLeft className="w-3.5 h-3.5" /> {adm.articles.fields.excerpt}
                      </label>
                      <textarea value={articleForm.excerpt} placeholder={adm.articles.fields.excerptPh} rows={2}
                        onChange={e => setArticleForm(f => ({ ...f, excerpt: e.target.value }))}
                        className={inp + " resize-none"} />
                    </div>
                    {/* Content */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{adm.articles.fields.content}</label>
                      <textarea value={articleForm.content} placeholder={adm.articles.fields.contentPh} rows={16}
                        onChange={e => setArticleForm(f => ({ ...f, content: e.target.value }))}
                        className={inp + " resize-y leading-relaxed font-mono"} />
                    </div>
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div onClick={() => setArticleForm(f => ({ ...f, published: !f.published }))}
                          className={`w-10 h-6 rounded-full transition-colors relative ${articleForm.published ? "bg-[#25D366]" : "bg-gray-200 dark:bg-gray-600"}`}>
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${articleForm.published ? "right-1" : "right-5"}`} />
                        </div>
                        <span className={`text-sm font-medium ${articleForm.published ? "text-green-700 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                          {articleForm.published ? adm.articles.published : adm.articles.draft}
                        </span>
                      </label>
                      <button onClick={handleSaveArticle} disabled={savingA} className={btn}>
                        {savingA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {editArticleId ? adm.articles.saveBtn : adm.articles.publishBtn}
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  {articlePreview && (
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto max-h-[700px]">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-4 tracking-widest uppercase">{adm.articles.previewLabel}</p>
                      {articleForm.coverImage && (
                        <div className="rounded-xl overflow-hidden mb-5 aspect-video">
                          <img src={articleForm.coverImage} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{articleForm.title || adm.articles.fields.titlePh}</h1>
                      {articleForm.excerpt && (
                        <p className="text-gray-500 dark:text-gray-400 mb-4 border-r-4 border-[#25D366] pr-3 text-sm leading-relaxed">{articleForm.excerpt}</p>
                      )}
                      <hr className="border-gray-200 dark:border-gray-700 mb-4" />
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-loose whitespace-pre-wrap">
                        {articleForm.content || <span className="text-gray-300 dark:text-gray-600">{adm.articles.fields.contentPreviewPh}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!showArticleF && (
              <>
                {loadingA ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                ) : articles.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
                    <FileText className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 dark:text-gray-500 text-sm">{adm.articles.empty}</p>
                    <button onClick={openNewArticle} className={btn + " mt-4 mx-auto"}>
                      <Plus className="w-4 h-4" /> {adm.articles.firstBtn}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {articles.map(a => (
                      <div key={a.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex items-center gap-4 hover:border-gray-200 dark:hover:border-gray-600 transition">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                          {a.coverImage
                            ? <img src={a.coverImage} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><FileText className="w-5 h-5 text-gray-300 dark:text-gray-500" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{a.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${a.published ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                              {a.published ? adm.articles.published : adm.articles.draft}
                            </span>
                          </div>
                          {a.excerpt && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{a.excerpt}</p>}
                          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{new Date(a.createdAt).toLocaleDateString(dateLocale)}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => handleTogglePublish(a)}
                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                            title={a.published ? adm.articles.toggleHide : adm.articles.toggleShow}>
                            {a.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          {a.published && (
                            <a href={`/articles/${a.slug}`} target="_blank" rel="noreferrer"
                              className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                              title={adm.articles.viewBtn}>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button onClick={() => openEditArticle(a)}
                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                            title={adm.articles.editBtn}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteArticle(a.id, a.title)} disabled={deletingA === a.id}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                            {deletingA === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}