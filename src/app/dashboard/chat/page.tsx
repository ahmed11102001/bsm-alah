"use client";

import {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { toast } from "sonner";
import {
  Search, Send, Paperclip, Mic, X, MoreVertical, Check, CheckCheck,
  Clock, Image as ImageIcon, FileText, Video, MapPin, Smile,
  MessageSquare, ChevronDown, Users, Archive, Trash2, Plus,
  MicOff, Loader2, Megaphone, Filter, Circle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Audience { id: string; name: string }
interface Template { id: string; name: string; content: string; status: string }

interface Contact { id: string; name: string | null; phone: string }
interface LastMsg {
  id: string; content: string | null; type: string;
  direction: string; status: string; createdAt: string;
}
interface Conversation {
  contact: Contact;
  lastMessage: LastMsg | null;
  unreadCount: number;
  lastMessageAt: string | null;
  isArchived: boolean;
}

interface Message {
  id: string; content: string | null; type: string;
  direction: string; status: string; mediaUrl: string | null; createdAt: string;
}

type Filter = "all" | "replied" | "today" | "unread" | "archived";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (c: Contact) =>
  (c.name ?? c.phone).slice(0, 2).toUpperCase();

const avatarColor = (id: string) => {
  const colors = [
    "bg-teal-500", "bg-green-500", "bg-blue-500",
    "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-cyan-500",
  ];
  const n = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[n % colors.length];
};

const typeIcon: Record<string, React.ReactNode> = {
  image:    <ImageIcon className="w-3.5 h-3.5 inline ml-1" />,
  video:    <Video className="w-3.5 h-3.5 inline ml-1" />,
  audio:    <Mic className="w-3.5 h-3.5 inline ml-1" />,
  document: <FileText className="w-3.5 h-3.5 inline ml-1" />,
  template: <FileText className="w-3.5 h-3.5 inline ml-1" />,
};

const typePreview: Record<string, string> = {
  image: "📷 صورة", video: "🎥 فيديو",
  audio: "🎙 رسالة صوتية", document: "📄 ملف",
};

function MsgTick({ status, isMe }: { status: string; isMe: boolean }) {
  if (!isMe) return null;
  if (status === "pending")   return <Clock className="w-3 h-3 opacity-60" />;
  if (status === "sent")      return <Check className="w-3 h-3" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3" />;
  if (status === "read")      return <CheckCheck className="w-3 h-3 text-[#53bdeb]" />;
  if (status === "failed")    return <X className="w-3 h-3 text-red-400" />;
  return null;
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-EG", {
    hour: "2-digit", minute: "2-digit",
  });
}

function dateStr(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "اليوم";
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "أمس";
  return d.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
}

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Message }) {
  const isMe = msg.direction === "outbound";
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`relative max-w-[68%] rounded-xl px-3 py-2 text-sm shadow-sm
          ${isMe ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none"}`}
      >
        {/* media */}
        {msg.type === "image" && msg.mediaUrl && (
          <img src={msg.mediaUrl} alt="" className="rounded-lg mb-1 max-w-full max-h-60 object-cover" />
        )}
        {msg.type === "video" && msg.mediaUrl && (
          <video src={msg.mediaUrl} controls className="rounded-lg mb-1 max-w-full max-h-48" />
        )}
        {msg.type === "audio" && msg.mediaUrl && (
          <audio src={msg.mediaUrl} controls className="mb-1 w-48" />
        )}
        {msg.type === "document" && msg.mediaUrl && (
          <a href={msg.mediaUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-blue-600 text-xs mb-1 hover:underline">
            <FileText className="w-4 h-4" /> تحميل الملف
          </a>
        )}

        {msg.content && (
          <p className="leading-relaxed whitespace-pre-wrap break-words text-[#111b21]">
            {msg.content}
          </p>
        )}

        <div className={`flex items-center gap-0.5 mt-0.5 text-[10px] text-gray-400
          ${isMe ? "justify-end" : "justify-start"}`}
        >
          {timeStr(msg.createdAt)}
          <MsgTick status={msg.status} isMe={isMe} />
        </div>
      </div>
    </div>
  );
}

// ─── Attach menu options ──────────────────────────────────────────────────────
const ATTACH = [
  { key: "image",    label: "صورة",           icon: <ImageIcon className="w-4 h-4" />,  accept: "image/*",                  color: "bg-purple-500" },
  { key: "video",    label: "فيديو",           icon: <Video className="w-4 h-4" />,      accept: "video/*",                  color: "bg-red-500" },
  { key: "document", label: "ملف / مستند",    icon: <FileText className="w-4 h-4" />,   accept: ".pdf,.doc,.docx,.xls,.xlsx,.txt", color: "bg-blue-500" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  // conversations
  const [convs,       setConvs]        = useState<Conversation[]>([]);
  const [loadingConvs,setLoadingConvs] = useState(true);
  const [search,      setSearch]       = useState("");
  const [filter,      setFilter]       = useState<Filter>("all");

  // selected
  const [selected,    setSelected]     = useState<Conversation | null>(null);
  const [messages,    setMessages]     = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs]  = useState(false);

  // input
  const [text,        setText]         = useState("");
  const [sending,     setSending]      = useState(false);
  const [showAttach,  setShowAttach]   = useState(false);
  const [recording,   setRecording]    = useState(false);
  const [showTpl,     setShowTpl]      = useState(false);
  const [templates,   setTemplates]    = useState<Template[]>([]);
  const [audiences,   setAudiences]    = useState<Audience[]>([]);

  const endRef     = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const mediaRecRef= useRef<MediaRecorder | null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch conversations ──────────────────────────────────────────
  const fetchConvs = useCallback(async () => {
    try {
      const q = new URLSearchParams({ type: "conversations", filter, search });
      const r = await fetch(`/api/chat?${q}`);
      const d = await r.json();
      setConvs(d.conversations ?? []);
    } catch { /* silent */ }
    finally { setLoadingConvs(false); }
  }, [filter, search]);

  // ── Fetch messages ────────────────────────────────────────────────
  const fetchMsgs = useCallback(async (contactId: string) => {
    setLoadingMsgs(true);
    try {
      const r = await fetch(`/api/chat?type=messages&contactId=${contactId}`);
      const d = await r.json();
      setMessages(d.messages ?? []);
      // mark as read locally
      setConvs(prev => prev.map(c =>
        c.contact.id === contactId ? { ...c, unreadCount: 0 } : c
      ));
    } finally { setLoadingMsgs(false); }
  }, []);

  // ── Select conversation ───────────────────────────────────────────
  const selectConv = useCallback((conv: Conversation) => {
    setSelected(conv);
    fetchMsgs(conv.contact.id);
    setShowTpl(false);
    setShowAttach(false);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMsgs(conv.contact.id), 8000);
  }, [fetchMsgs]);

  // ── Misc fetches ──────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    const r = await fetch("/api/templates");
    const d = await r.json();
    setTemplates(Array.isArray(d) ? d.filter((t: Template) =>
      ["approved","APPROVED"].includes(t.status)) : []);
  }, []);

  const fetchAudiences = useCallback(async () => {
    const r = await fetch("/api/audiences");
    const d = await r.json();
    setAudiences(Array.isArray(d) ? d : []);
  }, []);

  useEffect(() => {
    fetchConvs();
    fetchTemplates();
    fetchAudiences();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchConvs, fetchTemplates, fetchAudiences]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send text ─────────────────────────────────────────────────────
  const sendText = async () => {
    if (!text.trim() || !selected || sending) return;
    const body = text; setText(""); setSending(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action:"send", contactId: selected.contact.id, content: body, type:"text" }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      fetchMsgs(selected.contact.id);
    } catch (e: any) { toast.error(e.message); setText(body); }
    finally { setSending(false); }
  };

  // ── Send template ─────────────────────────────────────────────────
  const sendTemplate = async (tpl: Template) => {
    if (!selected || sending) return;
    setSending(true); setShowTpl(false);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:"send", contactId: selected.contact.id,
          type:"template", templateName: tpl.name,
          content: `[قالب] ${tpl.name}`,
        }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success("تم إرسال القالب");
      fetchMsgs(selected.contact.id);
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  // ── Send location ─────────────────────────────────────────────────
  const sendLocation = () => {
    if (!selected) return;
    if (!navigator.geolocation) { toast.error("المتصفح لا يدعم الموقع"); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setSending(true);
      try {
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action:"send", contactId: selected.contact.id,
            type:"text", content: `📍 الموقع: https://maps.google.com/?q=${lat},${lng}`,
          }),
        });
        if (!r.ok) throw new Error();
        toast.success("تم إرسال الموقع");
        fetchMsgs(selected.contact.id);
      } catch { toast.error("فشل إرسال الموقع"); }
      finally { setSending(false); }
    }, () => toast.error("لم يتم السماح بالوصول للموقع"));
  };

  // ── Send file ─────────────────────────────────────────────────────
  const sendFile = async (file: File, mediaType: string) => {
    if (!selected) return;
    setSending(true);
    try {
      // 1. Upload to Meta or your storage (here we use a base64 approach for demo)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contactId", selected.contact.id);
      formData.append("type", mediaType);

      const r = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "فشل الإرسال"); }
      toast.success("تم إرسال الملف");
      fetchMsgs(selected.contact.id);
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  // ── Voice note ────────────────────────────────────────────────────
  const toggleRecord = async () => {
    if (recording) {
      mediaRecRef.current?.stop();
      setRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mediaRecRef.current = mr;
        mr.ondataavailable = (e) => chunksRef.current.push(e.data);
        mr.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const file = new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
          await sendFile(file, "audio");
        };
        mr.start();
        setRecording(true);
      } catch { toast.error("لا يمكن الوصول للميكروفون"); }
    }
  };

  // ── Contact actions ───────────────────────────────────────────────
  const setConversationArchived = async (contactId: string, shouldArchive: boolean) => {
    try {
      const r = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: shouldArchive ? "archive" : "unarchive",
          contactId,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? "فشلت العملية");
      }
      toast.success(shouldArchive ? "تم الأرشفة" : "تم إلغاء الأرشفة");
      setSelected(null);
      fetchConvs();
    } catch (e: any) { toast.error(e.message ?? "فشلت العملية"); }
  };

  const deleteConversation = async (contactId: string) => {
    try {
      await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", contactId }),
      });
      toast.success("تم الحذف");
      setSelected(null);
      fetchConvs();
    } catch { toast.error("فشل الحذف"); }
  };

  const addToAudience = async (contactId: string, audienceId: string) => {
    try {
      const r = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addToAudience", contactId, audienceId }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success("تمت الإضافة للقائمة");
    } catch (e: any) { toast.error(e.message); }
  };

  // ── Filtered convs ────────────────────────────────────────────────
  const filteredConvs = useMemo(() => {
    const q = search.toLowerCase();
    return convs.filter(c => {
      const name = (c.contact.name ?? c.contact.phone).toLowerCase();
      if (q && !name.includes(q) && !c.contact.phone.includes(q)) return false;
      return true;
    });
  }, [convs, search]);

  // ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-[calc(100vh-64px)] bg-[#f0f2f5] overflow-hidden"
      style={{ direction: "rtl" }}
    >
      {/* ══════════ SIDEBAR ══════════ */}
      <aside className="w-[340px] flex-shrink-0 bg-white flex flex-col border-l border-gray-200">

        {/* Search */}
        <div className="p-3 bg-white border-b border-gray-100">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الرقم"
              className="w-full bg-[#f0f2f5] rounded-xl py-2 pr-9 pl-4 text-sm outline-none placeholder-gray-400 text-gray-800"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 px-3 py-2 border-b border-gray-100 overflow-x-auto">
          {([
            { value: "all",      label: "الكل" },
            { value: "replied",  label: "تم الرد" },
            { value: "today",    label: "اليوم" },
            { value: "unread",   label: "غير مقروءة" },
            { value: "archived", label: "الأرشيف" },
          ] as { value: Filter; label: string }[]).map(f => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); }}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === f.value
                  ? "bg-[#25d366] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400 mb-1">لا توجد محادثات حتى الآن</p>
              <p className="text-xs text-gray-300 mb-5">ستظهر المحادثات هنا بعد رد العملاء</p>
              <Button
                size="sm"
                className="bg-[#25d366] hover:bg-[#20bb5a] text-white gap-1.5"
                onClick={() => {
                  // navigate to campaigns via parent state — send a custom event
                  window.dispatchEvent(new CustomEvent("navigate-to", { detail: "campaigns" }));
                }}
              >
                <Megaphone className="w-4 h-4" /> ابدأ حملة الآن
              </Button>
            </div>
          ) : (
            filteredConvs.map(conv => {
              const isSelected = selected?.contact.id === conv.contact.id;
              const last = conv.lastMessage;
              const isUnread = conv.unreadCount > 0;
              return (
                <div
                  key={conv.contact.id}
                  onClick={() => selectConv(conv)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50
                    transition-colors hover:bg-[#f5f6f6]
                    ${isSelected ? "bg-[#e8f5e9]" : "bg-white"}`}
                >
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center
                    text-white font-semibold text-base flex-shrink-0
                    ${avatarColor(conv.contact.id)}`}>
                    {initials(conv.contact)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm truncate ${isUnread ? "font-bold text-[#111b21]" : "font-medium text-[#111b21]"}`}>
                        {conv.contact.name ?? conv.contact.phone}
                      </span>
                      <span className={`text-[11px] flex-shrink-0 mr-2 ${isUnread ? "text-[#25d366] font-medium" : "text-gray-400"}`}>
                        {conv.lastMessageAt ? dateStr(conv.lastMessageAt) : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate ${isUnread ? "text-[#111b21]" : "text-gray-400"}`}>
                        {last
                          ? <>
                              {last.direction === "outbound" && <span className="text-gray-400">أنت: </span>}
                              {typeIcon[last.type]}
                              {typePreview[last.type] ?? last.content ?? ""}
                            </>
                          : <span className="italic text-gray-300">لا توجد رسائل</span>
                        }
                      </p>
                      {/* Unread badge */}
                      {isUnread ? (
                        <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-[#25d366] text-white text-[10px] flex items-center justify-center font-bold">
                          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                        </span>
                      ) : (
                        <Circle className="w-2 h-2 text-transparent flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ══════════ CHAT ══════════ */}
      <main className="flex-1 flex flex-col relative overflow-hidden">

        {selected ? (
          <>
            {/* Chat header */}
            <header className="bg-[#f0f2f5] px-4 py-2.5 flex items-center justify-between z-10 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center
                  text-white font-semibold ${avatarColor(selected.contact.id)}`}>
                  {initials(selected.contact)}
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#111b21]">
                    {selected.contact.name ?? selected.contact.phone}
                  </p>
                  <p className="text-xs text-gray-500">{selected.contact.phone}</p>
                </div>
              </div>

              {/* Three-dot menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-600">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {/* Add to audience */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 text-sm">
                      <Plus className="w-4 h-4" /> إضافة لقائمة
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                      {audiences.length === 0 ? (
                        <div className="text-xs text-gray-400 px-3 py-2">
                          لا توجد قوائم — أنشئها من جهات الاتصال
                        </div>
                      ) : (
                        audiences.map(a => (
                          <DropdownMenuItem
                            key={a.id}
                            className="text-sm gap-2 cursor-pointer"
                            onClick={() => addToAudience(selected.contact.id, a.id)}
                          >
                            <Users className="w-3.5 h-3.5" /> {a.name}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="gap-2 text-sm cursor-pointer"
                    onClick={() => setConversationArchived(selected.contact.id, !selected.isArchived)}
                  >
                    <Archive className="w-4 h-4" /> {selected.isArchived ? "إلغاء الأرشفة" : "أرشفة المحادثة"}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="gap-2 text-sm text-red-600 cursor-pointer focus:text-red-600"
                    onClick={() => deleteConversation(selected.contact.id)}
                  >
                    <Trash2 className="w-4 h-4" /> حذف المحادثة
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto px-6 py-4"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: "#efeae2",
              }}
            >
              {loadingMsgs ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center">
                  <p className="text-xs text-gray-400 bg-white/60 px-4 py-1.5 rounded-full">
                    لا توجد رسائل بعد
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const showDate =
                      i === 0 ||
                      dateStr(messages[i - 1].createdAt) !== dateStr(msg.createdAt);
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-3">
                            <span className="text-[11px] text-gray-500 bg-white/70 px-3 py-0.5 rounded-full shadow-sm">
                              {dateStr(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <Bubble msg={msg} />
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </>
              )}
            </div>

            {/* Template picker */}
            {showTpl && (
              <div className="bg-white border-t border-gray-200 max-h-56 overflow-y-auto z-10">
                <p className="text-xs text-gray-400 px-4 pt-3 pb-2 font-medium">اختر قالباً</p>
                {templates.length === 0 ? (
                  <p className="text-sm text-gray-400 px-4 pb-3">لا توجد قوالب معتمدة</p>
                ) : templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => sendTemplate(t)}
                    className="w-full text-right px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{t.content}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <footer className="bg-[#f0f2f5] px-3 py-2.5 flex items-end gap-2 z-10 border-t border-gray-200">

              {/* Attach menu */}
              <div className="relative">
                <button
                  onClick={() => { setShowAttach(p => !p); setShowTpl(false); }}
                  className={`p-2 rounded-full transition-colors ${showAttach ? "bg-gray-300 text-gray-700" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {showAttach && (
                  <div className="absolute bottom-12 right-0 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 w-44">
                    {ATTACH.map(a => (
                      <label key={a.key} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                        <span className={`w-8 h-8 rounded-full ${a.color} flex items-center justify-center text-white flex-shrink-0`}>
                          {a.icon}
                        </span>
                        <span className="text-sm text-gray-700">{a.label}</span>
                        <input type="file" accept={a.accept} className="hidden"
                          ref={fileRef}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            await sendFile(f, a.key);
                            setShowAttach(false);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    ))}
                    {/* Location */}
                    <button
                      onClick={() => { sendLocation(); setShowAttach(false); }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 w-full transition-colors"
                    >
                      <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">
                        <MapPin className="w-4 h-4" />
                      </span>
                      <span className="text-sm text-gray-700">الموقع</span>
                    </button>
                    {/* Template */}
                    <button
                      onClick={() => { setShowTpl(p => !p); setShowAttach(false); }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 w-full transition-colors"
                    >
                      <span className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </span>
                      <span className="text-sm text-gray-700">قالب رسمي</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Textarea */}
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault(); sendText();
                  }
                }}
                placeholder="اكتب رسالة..."
                rows={1}
                className="flex-1 bg-white rounded-xl px-4 py-2.5 text-sm outline-none resize-none
                  max-h-28 overflow-y-auto text-[#111b21] placeholder-gray-400
                  border border-transparent focus:border-gray-200 transition-colors"
                style={{ lineHeight: "1.5" }}
              />

              {/* Send or Mic */}
              {text.trim() ? (
                <button
                  onClick={sendText}
                  disabled={sending}
                  className="w-10 h-10 rounded-full bg-[#25d366] flex items-center justify-center
                    text-white flex-shrink-0 hover:bg-[#20bb5a] transition-colors disabled:opacity-50"
                >
                  {sending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                </button>
              ) : (
                <button
                  onClick={toggleRecord}
                  className={`w-10 h-10 rounded-full flex items-center justify-center
                    text-white flex-shrink-0 transition-all
                    ${recording
                      ? "bg-red-500 animate-pulse"
                      : "bg-[#25d366] hover:bg-[#20bb5a]"}`}
                >
                  {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
            </footer>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5]">
            <div className="text-center max-w-xs">
              <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-12 h-12 text-[#25d366]" />
              </div>
              <h2 className="text-xl font-light text-[#41525d] mb-2">
                اختر محادثة للبدء
              </h2>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                ستظهر محادثات العملاء هنا بعد ردودهم على رسائلك
              </p>
              {filteredConvs.length === 0 && (
                <Button
                  className="bg-[#25d366] hover:bg-[#20bb5a] text-white gap-2"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("navigate-to", { detail: "campaigns" }));
                  }}
                >
                  <Megaphone className="w-4 h-4" /> ابدأ حملة الآن
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
