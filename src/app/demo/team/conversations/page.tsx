"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

type Member = { id: string; name: string | null; email: string; image: string | null; role: string };
type Conversation = {
  id: string;
  name: string | null;
  phone: string;
  assignedToUserId: string | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
  unreadCount: number;
  isArchived: boolean;
  lastMessageAt: string | null;
  lastMessage: { content: string | null; type: string; createdAt: string; direction: string } | null;
};

const DEMO_MEMBERS: Member[] = [
  { id: "demo-user-1", name: "عميل وني (أنت)", email: "demo@wani.app", image: null, role: "OWNER" },
  { id: "demo-team-2", name: "ليلى محمد", email: "layla@wani.app", image: null, role: "FULL_ACCESS" },
  { id: "demo-team-3", name: "سارة علي", email: "sara@wani.app", image: null, role: "CHAT_ONLY" },
];

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "demo-contact-sara",
    name: "سارة أحمد",
    phone: "201112223334",
    assignedToUserId: "demo-team-2",
    assignedTo: { id: "demo-team-2", name: "ليلى محمد", email: "layla@wani.app" },
    unreadCount: 0,
    isArchived: false,
    lastMessageAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    lastMessage: { content: "تمام، هوصلك رابط تأكيد الطلب دلوقتي 🌸", type: "text", createdAt: new Date(Date.now() - 2 * 60_000).toISOString(), direction: "outbound" },
  },
  {
    id: "demo-contact-omar",
    name: "عمر خالد",
    phone: "201223344556",
    assignedToUserId: "demo-team-3",
    assignedTo: { id: "demo-team-3", name: "سارة علي", email: "sara@wani.app" },
    unreadCount: 0,
    isArchived: false,
    lastMessageAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    lastMessage: { content: "تم شحن طلبك رقم #4821 🚚 هيوصلك خلال يومين", type: "text", createdAt: new Date(Date.now() - 40 * 60_000).toISOString(), direction: "outbound" },
  },
  {
    id: "demo-contact-mona",
    name: "منى عبد الله",
    phone: "201099887766",
    assignedToUserId: null,
    assignedTo: null,
    unreadCount: 1,
    isArchived: false,
    lastMessageAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    lastMessage: { content: "عندكم شحن لأسوان؟", type: "text", createdAt: new Date(Date.now() - 18 * 60_000).toISOString(), direction: "inbound" },
  },
  {
    id: "demo-contact-hadeer",
    name: "هدير مصطفى",
    phone: "201155667788",
    assignedToUserId: "demo-user-1",
    assignedTo: { id: "demo-user-1", name: "عميل وني (أنت)", email: "demo@wani.app" },
    unreadCount: 0,
    isArchived: true,
    lastMessageAt: new Date(Date.now() - 9 * 24 * 3600_000).toISOString(),
    lastMessage: { content: "شكرًا ليكم، حاجات هدية حلوة أوي 🎁", type: "text", createdAt: new Date(Date.now() - 9 * 24 * 3600_000).toISOString(), direction: "inbound" },
  },
  {
    id: "demo-contact-khaled",
    name: "خالد المصري",
    phone: "201007778899",
    assignedToUserId: null,
    assignedTo: null,
    unreadCount: 0,
    isArchived: false,
    lastMessageAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    lastMessage: { content: "هل متوفر الدفع عند الاستلام؟", type: "text", createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(), direction: "inbound" },
  },
  {
    id: "demo-contact-mariam",
    name: "مريم جمال",
    phone: "201009990011",
    assignedToUserId: "demo-team-2",
    assignedTo: { id: "demo-team-2", name: "ليلى محمد", email: "layla@wani.app" },
    unreadCount: 2,
    isArchived: false,
    lastMessageAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
    lastMessage: { content: "عايزة أغير مقاس العباية اللي طلبتها", type: "text", createdAt: new Date(Date.now() - 5 * 3600_000).toISOString(), direction: "inbound" },
  },
];

const inputClass = "h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20";

export default function DemoConversationAssignmentPage() {
  const { dir, locale } = useLanguage();
  const router = useRouter();
  const ar = locale === "ar";

  const [rows, setRows] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [members] = useState<Member[]>(DEMO_MEMBERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [assignment, setAssignment] = useState("all");
  const [assigneeId, setAssigneeId] = useState("");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busy, setBusy] = useState(false);

  const filteredRows = useMemo(() => {
    let list = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(r => (r.name?.toLowerCase().includes(q) ?? false) || r.phone.includes(q));
    }
    if (assignment === "unassigned") {
      list = list.filter(r => !r.assignedToUserId);
    } else if (assignment === "assigned") {
      list = list.filter(r => Boolean(r.assignedToUserId));
    }
    if (assigneeId) {
      list = list.filter(r => r.assignedToUserId === assigneeId);
    }
    if (status === "unread") {
      list = list.filter(r => r.unreadCount > 0);
    } else if (status === "replied") {
      list = list.filter(r => r.lastMessage?.direction === "outbound");
    } else if (status === "archived") {
      list = list.filter(r => r.isArchived);
    } else if (status === "active") {
      list = list.filter(r => !r.isArchived);
    }
    return list;
  }, [rows, search, assignment, assigneeId, status]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const allVisibleSelected = pagedRows.length > 0 && pagedRows.every(row => selected.has(row.id));
  const selectedCount = selected.size;
  const selectedMember = useMemo(() => members.find(m => m.id === assigneeId), [members, assigneeId]);

  const toggleRow = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => setSelected(prev => {
    const next = new Set(prev);
    if (allVisibleSelected) pagedRows.forEach(row => next.delete(row.id)); else pagedRows.forEach(row => next.add(row.id));
    return next;
  });

  const bulkUpdate = (targetUserId: string | null) => {
    if (!selectedCount || busy) return;
    setBusy(true);
    setTimeout(() => {
      const targetMember = members.find(m => m.id === targetUserId) ?? null;
      setRows(prev => prev.map(row => {
        if (!selected.has(row.id)) return row;
        return {
          ...row,
          assignedToUserId: targetUserId,
          assignedTo: targetMember ? { id: targetMember.id, name: targetMember.name, email: targetMember.email } : null,
        };
      }));
      toast.success(targetUserId
        ? `${selectedCount} ${ar ? "محادثة تم تعيينها" : "conversations assigned"}`
        : `${selectedCount} ${ar ? "محادثة أصبحت غير معينة" : "conversations unassigned"}`
      );
      setSelected(new Set());
      setBusy(false);
    }, 300);
  };

  const quickAssign = (contactId: string, targetUserId: string | null) => {
    const member = members.find(m => m.id === targetUserId) ?? null;
    setRows(prev => prev.map(row => {
      if (row.id !== contactId) return row;
      return {
        ...row,
        assignedToUserId: targetUserId,
        assignedTo: member ? { id: member.id, name: member.name, email: member.email } : null,
      };
    }));
    toast.success(ar ? "تم تحديث المسؤول" : "Assignment updated");
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto" dir={dir}>
      <button onClick={() => router.push("/demo/team")} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#075E54] dark:hover:text-[#25D366] mb-5">
        <ArrowLeft className={`w-4 h-4 ${dir === "rtl" ? "rotate-180" : ""}`} /> {ar ? "العودة للفريق" : "Back to Team"}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{ar ? "إدارة تعيين المحادثات" : "Conversation Assignment"}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{ar ? "إدارة مسؤول كل محادثة من مكان واحد" : "Manage which team member handles each conversation."}</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{total} {ar ? "محادثة" : "conversations"}</div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ar ? "ابحث بالاسم أو الرقم" : "Search conversations..."} className={`${inputClass} w-full pl-9`} />
          </div>
          <select value={assignment} onChange={e => setAssignment(e.target.value)} className={inputClass}>
            <option value="all">{ar ? "كل التعيينات" : "All assignments"}</option>
            <option value="unassigned">{ar ? "غير معينة" : "Unassigned"}</option>
            <option value="assigned">{ar ? "معينة" : "Assigned"}</option>
          </select>
          <select value={assigneeId} onChange={e => { setAssigneeId(e.target.value); setAssignment(e.target.value ? "all" : assignment); }} className={inputClass}>
            <option value="">{ar ? "كل الأعضاء" : "All team members"}</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
            <option value="all">{ar ? "كل الحالات" : "All statuses"}</option>
            <option value="unread">{ar ? "غير مقروءة" : "Unread"}</option>
            <option value="replied">{ar ? "تم الرد عليها" : "Replied"}</option>
            <option value="active">{ar ? "نشطة" : "Active"}</option>
            <option value="archived">{ar ? "مؤرشفة" : "Archived"}</option>
          </select>
          <select value={date} onChange={e => setDate(e.target.value)} className={inputClass}>
            <option value="all">{ar ? "كل التواريخ" : "All dates"}</option>
            <option value="today">{ar ? "اليوم" : "Today"}</option>
            <option value="7d">{ar ? "آخر 7 أيام" : "Last 7 days"}</option>
            <option value="30d">{ar ? "آخر 30 يومًا" : "Last 30 days"}</option>
          </select>
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className={inputClass}>
            <option value="20">20 / {ar ? "صفحة" : "page"}</option>
            <option value="50">50 / {ar ? "صفحة" : "page"}</option>
            <option value="100">100 / {ar ? "صفحة" : "page"}</option>
          </select>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="sticky top-2 z-20 bg-[#075E54] text-white rounded-xl p-3 mb-3 flex flex-wrap items-center gap-3 shadow-lg">
          <span className="font-semibold text-sm">{ar ? `تم تحديد ${selectedCount}` : `Selected: ${selectedCount}`}</span>
          <span className="text-xs opacity-80">{ar ? "من النتائج الحالية" : "from current results"}</span>
          <select disabled={busy} value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="h-9 rounded-lg px-2 text-sm text-gray-900">
            <option value="">{ar ? "اختر عضوًا" : "Select team member"}</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
          </select>
          <button disabled={busy || !selectedMember} onClick={() => bulkUpdate(assigneeId)} className="h-9 px-3 rounded-lg bg-[#25D366] disabled:opacity-50 text-sm font-semibold">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : ar ? "تعيين" : "Assign"}
          </button>
          <button disabled={busy} onClick={() => bulkUpdate(null)} className="h-9 px-3 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-50 text-sm">
            {ar ? "إلغاء التعيين" : "Unassign"}
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[36px_minmax(180px,1.3fr)_minmax(160px,2fr)_minmax(150px,1fr)] gap-3 items-center px-4 py-3 bg-gray-50 dark:bg-gray-800/70 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
          <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label={ar ? "تحديد الكل" : "Select all visible"} />
          <span>{ar ? "العميل" : "Customer"}</span>
          <span>{ar ? "آخر رسالة" : "Last message"}</span>
          <span>{ar ? "المسؤول" : "Assigned to"}</span>
        </div>
        {pagedRows.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            <Users className="w-9 h-9 mx-auto mb-2 opacity-40" />
            {search
              ? (ar ? "لا توجد نتائج للبحث" : "No conversations match your search")
              : assignment === "unassigned"
                ? (ar ? "لا توجد محادثات غير معينة" : "No unassigned conversations")
                : (ar ? "لا توجد محادثات" : "No conversations found")}
          </div>
        ) : (
          pagedRows.map(row => (
            <div key={row.id} className="grid grid-cols-[36px_minmax(180px,1.3fr)_minmax(160px,2fr)_minmax(150px,1fr)] gap-3 items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
              <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{row.name || row.phone}</p>
                <p className="text-xs text-gray-400 truncate">{row.phone}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{row.lastMessage?.content || (row.lastMessage ? `[${row.lastMessage.type}]` : "—")}</p>
                <p className="text-[11px] text-gray-400">
                  {row.lastMessageAt ? new Date(row.lastMessageAt).toLocaleString(ar ? "ar-EG" : "en-US") : "—"}
                  {row.unreadCount > 0 && <span className="ml-2 text-[#25D366]">{row.unreadCount} unread</span>}
                </p>
              </div>
              <select
                value={row.assignedToUserId ?? ""}
                onChange={e => quickAssign(row.id, e.target.value || null)}
                className="h-9 max-w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 text-xs text-gray-900 dark:text-white"
              >
                <option value="">{ar ? "غير معينة" : "Unassigned"}</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
              </select>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-gray-500 dark:text-gray-400">{ar ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); setSelected(new Set()); }} className="p-2 rounded-lg border disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); setSelected(new Set()); }} className="p-2 rounded-lg border disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
