"use client";
import { TableRowsSkeleton } from "@/components/dashboard/DashboardSkeletons";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Filter, Loader2, Search, UserRound, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

type Member = { id: string; name: string | null; email: string; image: string | null; role: string };
type Conversation = {
  id: string; name: string | null; phone: string; assignedToUserId: string | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
  unreadCount: number; isArchived: boolean; lastMessageAt: string | null;
  lastMessage: { content: string | null; type: string; createdAt: string; direction: string } | null;
};

const inputClass = "h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20";

export default function ConversationAssignmentManager() {
  const { dir, locale } = useLanguage();
  const router = useRouter();
  const ar = locale === "ar";
  const [rows, setRows] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [assignment, setAssignment] = useState("all");
  const [assigneeId, setAssigneeId] = useState("");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchMembers = useCallback(async () => {
    const r = await fetch("/api/chat/assignments?mode=members");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setMembers(d.members ?? []);
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search, assignment, assigneeId, status, date });
      const r = await fetch(`/api/chat/assignments?${q}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setRows(d.conversations ?? []);
      setTotal(d.pagination?.total ?? 0);
      setTotalPages(Math.max(1, d.pagination?.totalPages ?? 1));
    } catch (e: any) { toast.error(e.message ?? (ar ? "تعذر تحميل المحادثات" : "Could not load conversations")); }
    finally { setLoading(false); }
  }, [page, pageSize, search, assignment, assigneeId, status, date, ar]);

  useEffect(() => { fetchMembers().catch(e => toast.error(e.message)); }, [fetchMembers]);
  useEffect(() => { const id = setTimeout(fetchRows, 250); return () => clearTimeout(id); }, [fetchRows]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, assignment, assigneeId, status, date, pageSize]);

  const allVisibleSelected = rows.length > 0 && rows.every(row => selected.has(row.id));
  const selectedCount = selected.size;
  const selectedMember = useMemo(() => members.find(m => m.id === assigneeId), [members, assigneeId]);

  const toggleRow = (id: string) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = () => setSelected(prev => {
    const next = new Set(prev);
    if (allVisibleSelected) rows.forEach(row => next.delete(row.id)); else rows.forEach(row => next.add(row.id));
    return next;
  });

  const bulkUpdate = async (assignedToUserId: string | null) => {
    if (!selectedCount || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/chat/assignments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactIds: [...selected], assignedToUserId }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      toast.success(assignedToUserId ? `${d.count} ${ar ? "محادثة تم تعيينها" : "conversations assigned"}` : `${d.count} ${ar ? "محادثة أصبحت غير معينة" : "conversations unassigned"}`);
      setSelected(new Set()); await fetchRows();
    } catch (e: any) { toast.error(e.message ?? (ar ? "فشل تحديث التعيينات" : "Failed to update assignments")); }
    finally { setBusy(false); }
  };

  const quickAssign = async (contactId: string, assignedToUserId: string | null) => {
    try {
      const r = await fetch("/api/chat/assignment", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId, assignedToUserId }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      const member = members.find(m => m.id === assignedToUserId) ?? null;
      setRows(prev => prev.map(row => row.id === contactId ? { ...row, assignedToUserId, assignedTo: member ? { id: member.id, name: member.name, email: member.email } : null } : row));
      toast.success(ar ? "تم تحديث المسؤول" : "Assignment updated");
    } catch (e: any) { toast.error(e.message ?? (ar ? "تعذر تحديث المسؤول" : "Could not update assignment")); }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto" dir={dir}>
      <button onClick={() => router.push("/dashboard/team")} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#075E54] dark:hover:text-[#25D366] mb-5">
        <ArrowLeft className={`w-4 h-4 ${dir === "rtl" ? "rotate-180" : ""}`} /> {ar ? "العودة للفريق" : "Back to Team"}
      </button>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{ar ? "إدارة تعيين المحادثات" : "Conversation Assignment"}</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{ar ? "إدارة مسؤول كل محادثة من مكان واحد" : "Manage which team member handles each conversation."}</p></div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{total} {ar ? "محادثة" : "conversations"}</div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2"><Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={ar ? "ابحث بالاسم أو الرقم" : "Search conversations..."} className={`${inputClass} w-full pl-9`} /></div>
          <select value={assignment} onChange={e => setAssignment(e.target.value)} className={inputClass}><option value="all">{ar ? "كل التعيينات" : "All assignments"}</option><option value="unassigned">{ar ? "غير معينة" : "Unassigned"}</option><option value="assigned">{ar ? "معينة" : "Assigned"}</option></select>
          <select value={assigneeId} onChange={e => { setAssigneeId(e.target.value); setAssignment(e.target.value ? "all" : assignment); }} className={inputClass}><option value="">{ar ? "كل الأعضاء" : "All team members"}</option>{members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}</select>
          <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}><option value="all">{ar ? "كل الحالات" : "All statuses"}</option><option value="unread">{ar ? "غير مقروءة" : "Unread"}</option><option value="replied">{ar ? "تم الرد عليها" : "Replied"}</option><option value="active">{ar ? "نشطة" : "Active"}</option><option value="archived">{ar ? "مؤرشفة" : "Archived"}</option></select>
          <select value={date} onChange={e => setDate(e.target.value)} className={inputClass}><option value="all">{ar ? "كل التواريخ" : "All dates"}</option><option value="today">{ar ? "اليوم" : "Today"}</option><option value="7d">{ar ? "آخر 7 أيام" : "Last 7 days"}</option><option value="30d">{ar ? "آخر 30 يومًا" : "Last 30 days"}</option></select>
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className={inputClass}><option value="20">20 / {ar ? "صفحة" : "page"}</option><option value="50">50 / {ar ? "صفحة" : "page"}</option><option value="100">100 / {ar ? "صفحة" : "page"}</option></select>
        </div>
      </div>

      {selectedCount > 0 && <div className="sticky top-2 z-20 bg-[#075E54] text-white rounded-xl p-3 mb-3 flex flex-wrap items-center gap-3 shadow-lg"><span className="font-semibold text-sm">{ar ? `تم تحديد ${selectedCount}` : `Selected: ${selectedCount}`}</span><span className="text-xs opacity-80">{ar ? "من النتائج الحالية" : "from current results"}</span><select disabled={busy} value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="h-9 rounded-lg px-2 text-sm text-gray-900"><option value="">{ar ? "اختر عضوًا" : "Select team member"}</option>{members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}</select><button disabled={busy || !selectedMember} onClick={() => bulkUpdate(assigneeId)} className="h-9 px-3 rounded-lg bg-[#25D366] disabled:opacity-50 text-sm font-semibold">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : ar ? "تعيين" : "Assign"}</button><button disabled={busy} onClick={() => bulkUpdate(null)} className="h-9 px-3 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-50 text-sm">{ar ? "إلغاء التعيين" : "Unassign"}</button><button onClick={() => setSelected(new Set())} className="ml-auto p-1"><X className="w-4 h-4" /></button></div>}

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[36px_minmax(180px,1.3fr)_minmax(160px,2fr)_minmax(150px,1fr)] gap-3 items-center px-4 py-3 bg-gray-50 dark:bg-gray-800/70 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label={ar ? "تحديد الكل" : "Select all visible"} /><span>{ar ? "العميل" : "Customer"}</span><span>{ar ? "آخر رسالة" : "Last message"}</span><span>{ar ? "المسؤول" : "Assigned to"}</span></div>
        {loading ? <TableRowsSkeleton rows={6} cols={2} /> : rows.length === 0 ? <div className="py-16 text-center text-sm text-gray-400"><Users className="w-9 h-9 mx-auto mb-2 opacity-40" />{search ? (ar ? "لا توجد نتائج للبحث" : "No conversations match your search") : assignment === "unassigned" ? (ar ? "لا توجد محادثات غير معينة" : "No unassigned conversations") : (ar ? "لا توجد محادثات" : "No conversations found")}</div> : rows.map(row => <div key={row.id} className="grid grid-cols-[36px_minmax(180px,1.3fr)_minmax(160px,2fr)_minmax(150px,1fr)] gap-3 items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50/70 dark:hover:bg-gray-800/40"><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} /><div className="min-w-0"><p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{row.name || row.phone}</p><p className="text-xs text-gray-400 truncate">{row.phone}</p></div><div className="min-w-0"><p className="text-sm text-gray-700 dark:text-gray-300 truncate">{row.lastMessage?.content || (row.lastMessage ? `[${row.lastMessage.type}]` : "—")}</p><p className="text-[11px] text-gray-400">{row.lastMessageAt ? new Date(row.lastMessageAt).toLocaleString(ar ? "ar-EG" : "en-US") : "—"}{row.unreadCount > 0 && <span className="ml-2 text-[#25D366]">{row.unreadCount} unread</span>}</p></div><select value={row.assignedToUserId ?? ""} onChange={e => quickAssign(row.id, e.target.value || null)} className="h-9 max-w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 text-xs text-gray-900 dark:text-white"><option value="">{ar ? "غير معينة" : "Unassigned"}</option>{members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}</select></div>)}
      </div>
      <div className="flex items-center justify-between mt-4"><span className="text-xs text-gray-500 dark:text-gray-400">{ar ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span><div className="flex items-center gap-2"><button disabled={page <= 1 || loading} onClick={() => { setPage(p => p - 1); setSelected(new Set()); }} className="p-2 rounded-lg border disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><button disabled={page >= totalPages || loading} onClick={() => { setPage(p => p + 1); setSelected(new Set()); }} className="p-2 rounded-lg border disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>
    </div>
  );
}
