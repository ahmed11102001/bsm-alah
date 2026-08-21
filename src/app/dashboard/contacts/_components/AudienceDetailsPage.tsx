"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, SlidersHorizontal, Copy, X, Plus, Edit2, Loader2, Users, ArrowRight,
  MessageCircle, Bot, AlertCircle, Pin, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { normalizePhone, isValidPhone } from "./phone-utils";
import type { Audience, ContactRow } from "./types";

type AudienceContact = ContactRow & {
  lastMessageAt: string | null;
  unreadCount: number;
  isArchived: boolean;
  isPinned: boolean;
  textAiEnabled: boolean;
  voiceAgentEnabled: boolean;
  aiStatus: string;
  handoffAt: string | null;
  handoffReason: string | null;
  assignedToUserId: string | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
  _count: { messages: number; storeOrders: number };
};

type Stats = {
  active: number;
  unread: number;
  ai: number;
  handoff: number;
  pinned: number;
};

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function relativeDate(value: string | null, locale: string) {
  if (!value) return "لا يوجد نشاط";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return formatDate(value, locale);
}

export default function AudienceDetailsPage() {
  const { dir, locale } = useLanguage();
  const params = useParams<{ audienceId: string }>();
  const audienceId = params?.audienceId;
  const [audience, setAudience] = useState<Audience | null>(null);
  const [rows, setRows] = useState<AudienceContact[]>([]);
  const [stats, setStats] = useState<Stats>({ active: 0, unread: 0, ai: 0, handoff: 0, pinned: 0 });
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("lastActivity");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [addPhone, setAddPhone] = useState("");
  const [addName, setAddName] = useState("");
  const [editContacts, setEditContacts] = useState<ContactRow[]>([]);

  const isReadOnly = !audience || ["vip", "engaged", "no-response"].includes(audience.type);

  useEffect(() => {
    if (!audienceId) return;
    let cancelled = false;

    const loadAudience = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/audiences?audienceId=${encodeURIComponent(audienceId)}`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "الجمهور غير موجود");
        if (cancelled) return;
        setAudience(data);
        setSearch("");
        setFilter("all");
        setSort("lastActivity");
        setPage(1);
        setEditMode(false);
        setEditContacts([]);
        setAddPhone("");
        setAddName("");
      } catch (e: any) {
        if (!cancelled) toast.error(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAudience();
    return () => { cancelled = true; };
  }, [audienceId]);

  useEffect(() => {
    if (!audience || editMode) return;

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      audienceId: audience.id,
      page: String(page),
      pageSize: "50",
      search,
      filter,
      sort,
    });

    fetch(`/api/audiences/contacts?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "تعذر تحميل العملاء");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setRows(data.contacts ?? []);
        setStats(data.stats ?? { active: 0, unread: 0, ai: 0, handoff: 0, pinned: 0 });
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch((e) => !cancelled && toast.error(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [audience, editMode, page, search, filter, sort]);

  const startEdit = async () => {
    if (!audience || isReadOnly) return;
    setEditLoading(true);
    try {
      const r = await fetch(`/api/audiences?audienceId=${encodeURIComponent(audience.id)}&includeContacts=all`);
      if (!r.ok) throw new Error((await r.json()).error || "تعذر تحميل العملاء");
      const data = await r.json();
      setEditContacts(data.contacts ?? []);
      setEditMode(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEditLoading(false);
    }
  };

  const addContact = () => {
    const phone = normalizePhone(addPhone);
    if (!isValidPhone(phone)) {
      toast.error("رقم الهاتف غير صحيح");
      return;
    }
    if (editContacts.some((c) => c.phone === phone)) {
      toast.error("الرقم موجود بالفعل");
      return;
    }
    setEditContacts((prev) => [...prev, {
      id: crypto.randomUUID(),
      phone,
      name: addName.trim() || null,
    }]);
    setAddPhone("");
    setAddName("");
  };

  const saveChanges = async () => {
    if (!audience) return;
    setSaving(true);
    try {
      const r = await fetch("/api/audiences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: audience.id, contacts: editContacts }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "تعذر حفظ التعديلات");
      toast.success("تم حفظ الجمهور");
      setAudience({ ...audience, contacts: editContacts, contactCount: editContacts.length });
      setEditMode(false);
      setPage(1);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => toast.success("تم نسخ الرقم"));
  };

  const shownEditContacts = editContacts;

  if (!audience) {
    return (
      <main className="min-h-[calc(100vh-80px)] p-4 lg:p-8" dir={dir}>
        <div className="mx-auto flex min-h-[60vh] max-w-[1600px] items-center justify-center text-gray-400">
          {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : <p>تعذر تحميل الجمهور</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-white dark:bg-gray-950" dir={dir}>
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-[1600px] flex-col">
        <header className="border-b border-gray-100 px-4 py-5 sm:px-6 lg:px-8 dark:border-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/dashboard/contacts" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white" aria-label="العودة للجمهور">
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-gray-900 dark:text-white">{audience.name}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {total.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} عميل • إدارة وتحليل الجمهور
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isReadOnly && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startEdit}
                    disabled={editLoading || editMode}
                    className="gap-1.5 dark:border-gray-700 dark:text-gray-200"
                  >
                    {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit2 className="h-4 w-4" />}
                    تعديل الأرقام
                  </Button>
                )}
            </div>
          </div>
        </header>

        {editMode ? (
            <div className="flex min-h-0 flex-1 flex-col p-6">
              <div className="mb-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold dark:text-white">
                  <Plus className="h-4 w-4" /> إضافة عميل
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="اسم العميل"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="dark:bg-gray-900 dark:border-gray-700"
                  />
                  <Input
                    dir="ltr"
                    placeholder="+2010..."
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addContact()}
                    className="font-mono dark:bg-gray-900 dark:border-gray-700"
                  />
                  <Button onClick={addContact} className="bg-green-500 hover:bg-green-600">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-gray-100 dark:border-gray-800">
                {shownEditContacts.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold dark:bg-gray-800 dark:text-gray-200">
                      {(c.name ?? c.phone).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium dark:text-white">{c.name || "بدون اسم"}</p>
                      <p className="font-mono text-xs text-gray-500">{c.phone}</p>
                    </div>
                    <button onClick={() => copyPhone(c.phone)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditContacts((prev) => prev.filter((x) => x.id !== c.id))}
                      className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button variant="outline" className="flex-1 dark:border-gray-700 dark:text-gray-200" onClick={() => setEditMode(false)}>
                  إلغاء
                </Button>
                <Button className="flex-1 bg-green-500 hover:bg-green-600" onClick={saveChanges} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  حفظ التعديلات
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 border-b border-gray-100 px-6 py-4 sm:grid-cols-5 dark:border-gray-800">
                <Metric icon={<Users className="h-4 w-4" />} label="إجمالي العملاء" value={total} />
                <Metric icon={<MessageCircle className="h-4 w-4" />} label="نشط آخر 7 أيام" value={stats.active} />
                <Metric icon={<AlertCircle className="h-4 w-4" />} label="عندهم رسائل" value={stats.unread} />
                <Metric icon={<Bot className="h-4 w-4" />} label="AI مفعّل" value={stats.ai} />
                <Metric icon={<Pin className="h-4 w-4" />} label="مثبّت" value={stats.pinned} />
              </div>

              <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <div className="relative w-full">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    className="h-10 pr-9 dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex shrink-0 items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                    <select
                      value={sort}
                      onChange={(e) => { setPage(1); setSort(e.target.value); }}
                      className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="lastActivity">آخر نشاط</option>
                      <option value="messages">الأكثر رسائل</option>
                      <option value="name">الاسم</option>
                      <option value="oldest">الأقدم نشاطًا</option>
                    </select>
                  </div>

                  <span className="text-[11px] text-gray-400">الفلاتر</span>
                </div>

                <div
                  dir="rtl"
                  className="mt-2 w-full overflow-x-auto overflow-y-hidden pb-2 [scrollbar-color:#9ca3af_#f3f4f6] [scrollbar-width:auto] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <div dir="rtl" className="flex w-max min-w-full flex-nowrap items-center justify-start gap-2 px-0.5">
                    <FilterButton active={filter === "all"} onClick={() => { setPage(1); setFilter("all"); }}>الكل</FilterButton>
                    <FilterButton active={filter === "active"} onClick={() => { setPage(1); setFilter("active"); }}>نشط</FilterButton>
                    <FilterButton active={filter === "unread"} onClick={() => { setPage(1); setFilter("unread"); }}>عليه متابعة</FilterButton>
                    <FilterButton active={filter === "ai"} onClick={() => { setPage(1); setFilter("ai"); }}>AI</FilterButton>
                    <FilterButton active={filter === "handoff"} onClick={() => { setPage(1); setFilter("handoff"); }}>تدخل بشري</FilterButton>
                    <FilterButton active={filter === "pinned"} onClick={() => { setPage(1); setFilter("pinned"); }}>مثبّت</FilterButton>
                    <FilterButton active={filter === "archived"} onClick={() => { setPage(1); setFilter("archived"); }}>مؤرشف</FilterButton>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
                {loading ? (
                  <div className="flex h-56 items-center justify-center text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : rows.length === 0 ? (
                  <div className="flex h-56 flex-col items-center justify-center text-center text-gray-400">
                    <Users className="mb-3 h-10 w-10 opacity-40" />
                    <p className="text-sm">لا يوجد عملاء يطابقون البحث أو الفلتر</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="hidden min-w-[900px] grid-cols-[2fr_1.2fr_.8fr_.9fr_1.1fr_1fr_1.1fr] gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400 md:grid">
                      <span>العميل</span><span>آخر نشاط</span><span>الرسائل</span><span>الطلبات</span>
                      <span>الحالة</span><span>AI</span><span>المسؤول</span>
                    </div>

                    {rows.map((c) => (
                      <div key={c.id} className="grid gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800 md:min-w-[900px] md:grid-cols-[2fr_1.2fr_.8fr_.9fr_1.1fr_1fr_1.1fr] md:items-center">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {(c.name ?? c.phone).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">{c.name || "بدون اسم"}</p>
                            <button onClick={() => copyPhone(c.phone)} className="font-mono text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                              {c.phone}
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-700 dark:text-gray-300">{relativeDate(c.lastMessageAt, locale)}</p>
                          {c.lastMessageAt && <p className="mt-0.5 text-[10px] text-gray-400">{formatDate(c.lastMessageAt, locale)}</p>}
                        </div>

                        <div className="text-sm font-semibold dark:text-white">{c._count.messages.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</div>
                        <div className="text-sm font-semibold dark:text-white">{c._count.storeOrders.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</div>

                        <div className="flex flex-wrap gap-1">
                          {c.unreadCount > 0 && <Badge>متابعة {c.unreadCount}</Badge>}
                          {c.handoffAt && <Badge tone="amber">تدخل بشري</Badge>}
                          {c.isPinned && <Badge tone="blue">مثبّت</Badge>}
                          {c.isArchived && <Badge tone="gray">مؤرشف</Badge>}
                          {!c.unreadCount && !c.handoffAt && !c.isPinned && !c.isArchived && <Badge tone="green">طبيعي</Badge>}
                        </div>

                        <div>
                          <Badge tone={c.textAiEnabled ? "green" : "gray"}>{c.textAiEnabled ? "مفعّل" : "متوقف"}</Badge>
                        </div>

                        <div className="min-w-0 text-xs text-gray-500 dark:text-gray-400">
                          {c.assignedTo?.name || c.assignedTo?.email || "غير معين"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 dark:border-gray-800">
                <p className="text-xs text-gray-500">
                  {total ? `عرض ${(page - 1) * 50 + 1}–${Math.min(page * 50, total)} من ${total}` : "0 عميل"}
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="dark:border-gray-700">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="min-w-16 text-center text-xs text-gray-500">{totalPages ? `${page} / ${totalPages}` : "—"}</span>
                  <Button size="sm" variant="outline" disabled={!totalPages || page >= totalPages || loading} onClick={() => setPage((p) => p + 1)} className="dark:border-gray-700">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-800">
      <div className="mb-1 flex items-center gap-1.5 text-gray-400">{icon}<span className="text-[10px]">{label}</span></div>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value.toLocaleString("ar-EG")}</p>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition ${
        active
          ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ children, tone = "red" }: { children: ReactNode; tone?: "red" | "green" | "amber" | "blue" | "gray" }) {
  const classes = {
    red: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
    green: "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  }[tone];

  return <span className={`inline-flex rounded-md px-1.5 py-1 text-[10px] font-semibold ${classes}`}>{children}</span>;
}
