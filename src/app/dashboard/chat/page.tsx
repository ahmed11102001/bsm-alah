"use client";

import {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { toast } from "sonner";
import {
  Search, Send, Paperclip, Mic, X, MoreVertical, Check, CheckCheck,
  Clock, Image as ImageIcon, FileText, Video, MapPin, Smile,
  MessageSquare, ChevronDown, Users, Archive, Trash2, Plus,
  MicOff, Loader2, Megaphone, Filter, Circle, Mic2,
  ArrowLeft, ChevronLeft, Bot,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/language-context";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// ─── i18n ─────────────────────────────────────────────────────────────────────
type Lang = "ar" | "en";

const t: Record<Lang, Record<string, string>> = {
  ar: {
    search: "بحث بالاسم أو الرقم",
    all: "الكل", replied: "تم الرد", today: "اليوم",
    unread: "غير مقروءة", archived: "الأرشيف", ai_replied: "رد AI 🤖",
    noConvs: "لا توجد محادثات حتى الآن",
    noConvsHint: "ستظهر المحادثات هنا بعد رد العملاء",
    startCampaign: "ابدأ حملة الآن",
    noMsgs: "لا توجد رسائل بعد",
    pickConv: "اختر محادثة للبدء",
    pickConvHint: "ستظهر محادثات العملاء هنا بعد ردودهم على رسائلك",
    typeMsg: "اكتب رسالة...",
    you: "أنت: ",
    image: "📷 صورة", video: "🎥 فيديو",
    audio: "🎙 رسالة صوتية", document: "📄 ملف",
    saveImage: "حفظ الصورة", downloadFile: "تحميل الملف",
    emoji: "إيموجي", chooseTemplate: "اختر قالباً",
    noTemplates: "لا توجد قوالب معتمدة",
    templateSent: "تم إرسال القالب",
    locationSent: "تم إرسال الموقع",
    locationFailed: "فشل إرسال الموقع",
    locationDenied: "لم يتم السماح بالوصول للموقع",
    noGeolocation: "المتصفح لا يدعم الموقع",
    fileSent: "تم إرسال الملف",
    micError: "لا يمكن الوصول للميكروفون",
    archived_ok: "تم الأرشفة",
    unarchived_ok: "تم إلغاء الأرشفة",
    deleted: "تم الحذف",
    deleteFailed: "فشل الحذف",
    addedToAudience: "تمت الإضافة للقائمة",
    noAudiences: "لا توجد قوائم — أنشئها من جهات الاتصال",
    voiceOn: "Voice ON", voice: "Voice",
    voiceOnMsg: "🎙️ Voice Agent مفعّل",
    voiceOffMsg: "Voice Agent موقوف",
    archiveConv: "أرشفة المحادثة",
    unarchiveConv: "إلغاء الأرشفة",
    deleteConv: "حذف المحادثة",
    addToList: "إضافة لقائمة",
    closeConv: "إغلاق المحادثة",
    photoLabel: "صورة", videoLabel: "فيديو",
    docLabel: "ملف / مستند", locationLabel: "الموقع",
    templateLabel: "قالب رسمي",
    today_label: "اليوم", yesterday: "أمس",
    reactions: "ردود الفعل", close: "إغلاق",
  },
  en: {
    search: "Search by name or number",
    all: "All", replied: "Replied", today: "Today",
    unread: "Unread", archived: "Archived", ai_replied: "AI Replied 🤖",
    noConvs: "No conversations yet",
    noConvsHint: "Conversations will appear here after customers reply",
    startCampaign: "Start a Campaign",
    noMsgs: "No messages yet",
    pickConv: "Select a conversation",
    pickConvHint: "Customer conversations will appear here after they reply",
    typeMsg: "Type a message...",
    you: "You: ",
    image: "📷 Image", video: "🎥 Video",
    audio: "🎙 Voice message", document: "📄 File",
    saveImage: "Save image", downloadFile: "Download file",
    emoji: "Emoji", chooseTemplate: "Choose a template",
    noTemplates: "No approved templates",
    templateSent: "Template sent",
    locationSent: "Location sent",
    locationFailed: "Failed to send location",
    locationDenied: "Location access denied",
    noGeolocation: "Browser doesn't support geolocation",
    fileSent: "File sent",
    micError: "Cannot access microphone",
    archived_ok: "Archived", unarchived_ok: "Unarchived",
    deleted: "Deleted", deleteFailed: "Delete failed",
    addedToAudience: "Added to list",
    noAudiences: "No lists — create them from contacts",
    voiceOn: "Voice ON", voice: "Voice",
    voiceOnMsg: "🎙️ Voice Agent enabled",
    voiceOffMsg: "Voice Agent disabled",
    archiveConv: "Archive conversation",
    unarchiveConv: "Unarchive",
    deleteConv: "Delete conversation",
    addToList: "Add to list",
    closeConv: "Close conversation",
    photoLabel: "Photo", videoLabel: "Video",
    docLabel: "File / Document", locationLabel: "Location",
    templateLabel: "Official template",
    today_label: "Today", yesterday: "Yesterday",
    reactions: "Reactions", close: "Close",
  },
};

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
  voiceAgentEnabled?: boolean;
}
interface Message {
  id: string; content: string | null; type: string;
  direction: string; status: string; mediaUrl: string | null; createdAt: string;
  reactions?: { emoji: string; senderId: string }[];
}
type FilterType = "all" | "replied" | "today" | "unread" | "archived" | "ai_replied";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (c: Contact) => (c.name ?? c.phone).slice(0, 2).toUpperCase();

const avatarColor = (id: string) => {
  const colors = [
    "bg-teal-500","bg-green-500","bg-blue-500",
    "bg-purple-500","bg-pink-500","bg-orange-500","bg-cyan-500",
  ];
  const n = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[n % colors.length];
};

function mediaSrc(mediaUrl: string, opts?: { download?: boolean }) {
  if (/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
  const base = `/api/chat/media/${encodeURIComponent(mediaUrl)}`;
  return opts?.download ? `${base}?download=1` : base;
}

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="underline text-blue-400 break-all"
      >
        {part}
      </a>
    ) : part
  );
}

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
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function dateStr(iso: string, lang: Lang) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return t[lang].today_label;
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return t[lang].yesterday;
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" });
}

const QUICK_REACTIONS = ["❤️","😂","😮","😢","🙏","👍"];

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({
  msg, onReact, lang, dark,
}: {
  msg: Message;
  onReact?: (msgId: string, emoji: string) => void;
  lang: Lang;
  dark: boolean;
}) {
  const isMe = msg.direction === "outbound";
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [showReactions, setShowReactions] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const resolvedMediaSrc = msg.mediaUrl ? mediaSrc(msg.mediaUrl) : null;
  const resolvedMediaDownloadSrc = msg.mediaUrl ? mediaSrc(msg.mediaUrl, { download: true }) : null;

  const handleSaveImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!resolvedMediaSrc || saving) return;
    setSaving(true);
    try {
      const res = await fetch(resolvedMediaDownloadSrc ?? resolvedMediaSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = blob.type.split("/")[1]?.split("+")[0] ?? "jpg";
      a.href = url;
      a.download = `image_${msg.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, msg.id]);

  const reactionCounts = (msg.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  const bubbleBg = isMe
    ? (dark ? "bg-[#005c4b]" : "bg-[#d9fdd3]")
    : (dark ? "bg-[#1f2c34]" : "bg-white");

  const textColor = dark ? "text-[#e9edef]" : "text-[#111b21]";

  return (
    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} mb-1`}>
      <div className="relative inline-block max-w-[80%] sm:max-w-[68%]">
        {showReactions && onReact && (
          <div className={`absolute -top-10 z-20 flex items-center gap-1 rounded-full shadow-lg border px-2 py-1
            ${dark ? "bg-[#233138] border-[#2a3942]" : "bg-white border-gray-100"}
            ${isMe ? "right-0" : "left-0"}`}>
            {QUICK_REACTIONS.map(emoji => (
              <button key={emoji}
                onClick={e => { e.stopPropagation(); onReact(msg.id, emoji); setShowReactions(false); }}
                className="text-lg hover:scale-125 transition-transform leading-none">
                {emoji}
              </button>
            ))}
            <button onClick={e => { e.stopPropagation(); setShowReactions(false); }}
              className="text-gray-400 hover:text-gray-600 text-xs mr-1">✕</button>
          </div>
        )}

        <div
          onClick={() => onReact && setShowReactions(p => !p)}
          className={`rounded-xl px-3 py-2 text-sm shadow-sm cursor-pointer
            ${isMe ? "rounded-tr-none" : "rounded-tl-none"} ${bubbleBg}`}
        >
          {msg.type === "image" && resolvedMediaSrc && (
            <>
              {/* Lightbox modal */}
              {lightboxOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                  onClick={() => setLightboxOpen(false)}
                >
                  <button
                    onClick={() => setLightboxOpen(false)}
                    className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-2 z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSaveImage}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full px-4 py-2 text-sm flex items-center gap-2 z-10"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    {t[lang].saveImage}
                  </button>
                  <img
                    src={resolvedMediaSrc}
                    alt=""
                    className="max-w-[92vw] max-h-[85vh] rounded-xl object-contain shadow-2xl"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              )}
              {/* Thumbnail — click to open lightbox */}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setLightboxOpen(true); }}
                className="block w-full"
              >
                <img src={resolvedMediaSrc} alt="" className="rounded-lg mb-1 max-w-full max-h-60 object-cover cursor-zoom-in" />
              </button>
              {/* Save button — downloads via blob */}
              <button
                type="button"
                onClick={handleSaveImage}
                disabled={saving}
                className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline mb-1 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {t[lang].saveImage}
              </button>
            </>
          )}
          {msg.type === "video" && resolvedMediaSrc && (
            <video src={resolvedMediaSrc} controls onClick={e => e.stopPropagation()}
              className="rounded-lg mb-1 max-w-full max-h-48" />
          )}
          {msg.type === "audio" && resolvedMediaSrc && (
            <>
              <audio ref={audioRef} src={resolvedMediaSrc} controls onClick={e => e.stopPropagation()}
                className="mb-1 w-full max-w-[200px]" />
              <div className="flex items-center gap-1 mb-1">
                {([1, 1.5, 2] as const).map(r => (
                  <button key={r} type="button"
                    onClick={e => { e.stopPropagation(); setSpeed(r); }}
                    className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                      speed === r ? "bg-[#25d366] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>{r}x</button>
                ))}
              </div>
            </>
          )}
          {msg.type === "document" && resolvedMediaSrc && (
            <a href={resolvedMediaSrc} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 text-blue-400 text-xs mb-1 hover:underline">
              <FileText className="w-4 h-4" /> {t[lang].downloadFile}
            </a>
          )}
          {msg.type === "sticker" && resolvedMediaSrc && (
            <img
              src={resolvedMediaSrc}
              alt="sticker"
              className="w-32 h-32 object-contain mb-1"
              style={{ background: "transparent" }}
            />
          )}

          {msg.content && (
            <p className={`leading-relaxed whitespace-pre-wrap break-words ${textColor}`}>
              {linkify(msg.content)}
            </p>
          )}

          <div className={`flex items-center gap-0.5 mt-0.5 text-[10px] text-gray-400
            ${isMe ? "justify-end" : "justify-start"}`}>
            {timeStr(msg.createdAt)}
            <MsgTick status={msg.status} isMe={isMe} />
          </div>

          {Object.keys(reactionCounts).length > 0 && (
            <div className={`flex gap-1 flex-wrap mt-1.5 pt-1.5 border-t border-black/10 ${isMe ? "justify-end" : "justify-start"}`}>
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <span key={emoji}
                  className="inline-flex items-center gap-0.5 bg-black/10 rounded-full px-1.5 py-0.5 text-xs">
                  {emoji}{count > 1 && <span className="text-gray-500 text-[10px]">{count}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { resolvedTheme } = useTheme();
  const { locale, dir } = useLanguage();
  const dark = resolvedTheme === "dark";
  const lang: Lang = locale === "en" ? "en" : "ar";

  const [convs, setConvs]               = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [search, setSearch]             = useState("");
  const [filter, setFilter]             = useState<FilterType>("all");

  const [selected, setSelected]         = useState<Conversation | null>(null);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);

  // mobile: show chat panel over sidebar
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const [text, setText]                 = useState("");
  const [sending, setSending]           = useState(false);
  const [showAttach, setShowAttach]     = useState(false);
  const [showEmoji, setShowEmoji]       = useState(false);
  const [recording, setRecording]       = useState(false);
  const [showTpl, setShowTpl]           = useState(false);
  const [templates, setTemplates]       = useState<Template[]>([]);
  const [audiences, setAudiences]       = useState<Audience[]>([]);

  const endRef      = useRef<HTMLDivElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Theme classes ────────────────────────────────────────────────
  const bg       = dark ? "bg-[#111b21]" : "bg-[#f0f2f5]";
  const sidebarBg = dark ? "bg-[#1f2c34]" : "bg-white";
  const headerBg  = dark ? "bg-[#202c33]" : "bg-[#f0f2f5]";
  const inputBg   = dark ? "bg-[#2a3942]" : "bg-white";
  const textMain  = dark ? "text-[#e9edef]" : "text-[#111b21]";
  const textSub   = dark ? "text-[#8696a0]" : "text-gray-400";
  const border    = dark ? "border-[#2a3942]" : "border-gray-200";
  const borderLight = dark ? "border-[#2a3942]" : "border-gray-100";
  const searchBg  = dark ? "bg-[#2a3942] text-[#d1d7db] placeholder-[#8696a0]" : "bg-[#f0f2f5] text-gray-800 placeholder-gray-400";
  const hoverRow  = dark ? "hover:bg-[#2a3942]" : "hover:bg-[#f5f6f6]";
  const selectedRow = dark ? "bg-[#2a3942]" : "bg-[#e8f5e9]";
  const msgAreaBg = dark ? "#0b141a" : "#efeae2";

  // ── Fetch helpers ────────────────────────────────────────────────
  const fetchConvs = useCallback(async () => {
    try {
      const q = new URLSearchParams({ type: "conversations", filter, search });
      const r = await fetch(`/api/chat?${q}`);
      const d = await r.json();
      setConvs(d.conversations ?? []);
    } catch { /* silent */ }
    finally { setLoadingConvs(false); }
  }, [filter, search]);

  const fetchMsgs = useCallback(async (contactId: string) => {
    setLoadingMsgs(true);
    try {
      const r = await fetch(`/api/chat?type=messages&contactId=${contactId}`);
      const d = await r.json();
      setMessages(d.messages ?? []);
      setConvs(prev => prev.map(c =>
        c.contact.id === contactId ? { ...c, unreadCount: 0 } : c
      ));
    } finally { setLoadingMsgs(false); }
  }, []);

  const selectConv = useCallback((conv: Conversation) => {
    setSelected(conv);
    fetchMsgs(conv.contact.id);
    setShowTpl(false); setShowAttach(false);
    setMobileShowChat(true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMsgs(conv.contact.id), 8000);
  }, [fetchMsgs]);

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
    fetchConvs(); fetchTemplates(); fetchAudiences();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchConvs, fetchTemplates, fetchAudiences]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Actions ──────────────────────────────────────────────────────
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

  const sendReaction = async (msgId: string, emoji: string) => {
    if (!selected) return;
    setMessages(prev => prev.map(m =>
      m.id === msgId
        ? { ...m, reactions: [...(m.reactions ?? []), { emoji, senderId: "me" }] }
        : m
    ));
    try {
      await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action:"react", contactId: selected.contact.id, messageId: msgId, emoji }),
      });
    } catch { /* silent */ }
  };

  const sendTemplate = async (tpl: Template) => {
    if (!selected || sending) return;
    setSending(true); setShowTpl(false);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action:"send", contactId: selected.contact.id, type:"template", templateName: tpl.name, content: `[Template] ${tpl.name}` }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success(t[lang].templateSent);
      fetchMsgs(selected.contact.id);
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  const sendLocation = () => {
    if (!selected) return;
    if (!navigator.geolocation) { toast.error(t[lang].noGeolocation); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setSending(true);
      try {
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action:"send", contactId: selected.contact.id, type:"text", content: `📍 Location: https://maps.google.com/?q=${lat},${lng}` }),
        });
        if (!r.ok) throw new Error();
        toast.success(t[lang].locationSent);
        fetchMsgs(selected.contact.id);
      } catch { toast.error(t[lang].locationFailed); }
      finally { setSending(false); }
    }, () => toast.error(t[lang].locationDenied));
  };

  const sendFile = async (file: File, mediaType: string) => {
    if (!selected) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contactId", selected.contact.id);
      formData.append("type", mediaType);
      const r = await fetch("/api/chat", { method: "POST", body: formData });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? t[lang].locationFailed); }
      toast.success(t[lang].fileSent);
      fetchMsgs(selected.contact.id);
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  const toggleRecord = async () => {
    if (recording) {
      mediaRecRef.current?.stop(); setRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mediaRecRef.current = mr;
        mr.ondataavailable = e => chunksRef.current.push(e.data);
        mr.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          await sendFile(new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" }), "audio");
        };
        mr.start(); setRecording(true);
      } catch { toast.error(t[lang].micError); }
    }
  };

  const setConversationArchived = async (contactId: string, shouldArchive: boolean) => {
    try {
      const r = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: shouldArchive ? "archive" : "unarchive", contactId }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success(shouldArchive ? t[lang].archived_ok : t[lang].unarchived_ok);
      setSelected(null); setMobileShowChat(false); fetchConvs();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteConversation = async (contactId: string) => {
    try {
      await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", contactId }),
      });
      toast.success(t[lang].deleted);
      setSelected(null); setMobileShowChat(false); fetchConvs();
    } catch { toast.error(t[lang].deleteFailed); }
  };

  const addToAudience = async (contactId: string, audienceId: string) => {
    try {
      const r = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addToAudience", contactId, audienceId }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success(t[lang].addedToAudience);
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleVoiceAgent = async (contactId: string, enable: boolean) => {
    try {
      const r = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleVoiceAgent", contactId, enable }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      setConvs(prev => prev.map(c =>
        c.contact.id === contactId ? { ...c, voiceAgentEnabled: enable } : c
      ));
      if (selected?.contact.id === contactId) {
        setSelected(prev => prev ? { ...prev, voiceAgentEnabled: enable } : prev);
      }
      toast.success(enable ? t[lang].voiceOnMsg : t[lang].voiceOffMsg);
    } catch (e: any) { toast.error(e.message); }
  };

  const filteredConvs = useMemo(() => {
    const q = search.toLowerCase();
    return convs.filter(c => {
      const name = (c.contact.name ?? c.contact.phone).toLowerCase();
      if (q && !name.includes(q) && !c.contact.phone.includes(q)) return false;
      return true;
    });
  }, [convs, search]);

  const ATTACH_OPTIONS = [
    { key: "image",    label: t[lang].photoLabel,   icon: <ImageIcon className="w-4 h-4" />,  accept: "image/*",                       color: "bg-purple-500" },
    { key: "video",    label: t[lang].videoLabel,   icon: <Video className="w-4 h-4" />,      accept: "video/*",                       color: "bg-red-500", disabled: true },
    { key: "document", label: t[lang].docLabel,     icon: <FileText className="w-4 h-4" />,   accept: ".pdf,.doc,.docx,.xls,.xlsx,.txt", color: "bg-blue-500" },
  ];

  // ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex h-[calc(100vh-64px)] ${bg} overflow-hidden relative`}
      style={{ direction: dir }}
    >
      {/* ══════════ SIDEBAR ══════════ */}
      {/* On mobile: hidden when chat is open */}
      <aside className={`
        ${sidebarBg} flex flex-col border-r ${border}
        flex-shrink-0
        w-full sm:w-[340px]
        ${mobileShowChat ? "hidden sm:flex" : "flex"}
      `}>

        {/* Top bar — search + theme/lang toggles */}
        <div className={`px-3 pt-3 pb-2 ${sidebarBg} border-b ${borderLight}`}>
          {/* Controls row */}
          <div className="flex items-center justify-between mb-2.5">
            <span className={`text-base font-semibold ${textMain}`}>
              {lang === "ar" ? "المحادثات" : "Chats"}
            </span>
            <div className="flex items-center gap-1.5">
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className={`absolute top-2.5 w-4 h-4 ${textSub} ${dir === "rtl" ? "right-3" : "left-3"}`} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t[lang].search}
              className={`w-full ${searchBg} rounded-xl py-2 text-sm outline-none
                ${dir === "rtl" ? "pr-9 pl-4" : "pl-9 pr-4"}`}
            />
            {search && (
              <button onClick={() => setSearch("")}
                className={`absolute top-2.5 ${textSub} hover:text-gray-600 ${dir === "rtl" ? "left-3" : "right-3"}`}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className={`flex gap-1.5 px-3 py-2 border-b ${borderLight} overflow-x-auto scrollbar-hide`}>
          {(["all","replied","today","unread","archived"] as FilterType[]).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === f
                  ? "bg-[#25d366] text-white"
                  : dark
                    ? "bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {t[lang][f]}
            </button>
          ))}
          {/* AI Replied — فلتر مستقل بتصميم مميز */}
          <button
            onClick={() => setFilter("ai_replied")}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
              filter === "ai_replied"
                ? "bg-violet-500 border-violet-500 text-white"
                : dark
                  ? "bg-[#2a3942] border-violet-500/30 text-violet-400 hover:border-violet-400 hover:text-violet-300"
                  : "bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100"
            }`}>
            <Bot className="w-3 h-3" />
            {t[lang].ai_replied}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <MessageSquare className={`w-12 h-12 mb-3 ${dark ? "text-[#2a3942]" : "text-gray-200"}`} />
              <p className={`text-sm mb-1 ${textSub}`}>{t[lang].noConvs}</p>
              <p className={`text-xs mb-5 ${dark ? "text-[#2a3942]" : "text-gray-300"}`}>{t[lang].noConvsHint}</p>
              <Button size="sm"
                className="bg-[#25d366] hover:bg-[#20bb5a] text-white gap-1.5"
                onClick={() => window.dispatchEvent(new CustomEvent("navigate-to", { detail: "campaigns" }))}>
                <Megaphone className="w-4 h-4" /> {t[lang].startCampaign}
              </Button>
            </div>
          ) : filteredConvs.map(conv => {
            const isSelected = selected?.contact.id === conv.contact.id;
            const last = conv.lastMessage;
            const isUnread = conv.unreadCount > 0;
            const typePreviewMap: Record<string, string> = {
              image: t[lang].image, video: t[lang].video,
              audio: t[lang].audio, document: t[lang].document,
            };
            return (
              <div key={conv.contact.id}
                onClick={() => selectConv(conv)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b ${borderLight}
                  transition-colors ${isSelected ? selectedRow : `${sidebarBg} ${hoverRow}`}`}>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center
                  text-white font-semibold text-sm flex-shrink-0 ${avatarColor(conv.contact.id)}`}>
                  {initials(conv.contact)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm truncate ${isUnread ? "font-bold" : "font-medium"} ${textMain}`}>
                      {conv.contact.name ?? conv.contact.phone}
                    </span>
                    <span className={`text-[11px] flex-shrink-0 mx-2 ${isUnread ? "text-[#25d366] font-medium" : textSub}`}>
                      {conv.lastMessageAt ? dateStr(conv.lastMessageAt, lang) : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate ${isUnread ? textMain : textSub}`}>
                      {last
                        ? <>
                            {last.direction === "outbound" && <span className={textSub}>{t[lang].you}</span>}
                            {typePreviewMap[last.type] ?? last.content ?? ""}
                          </>
                        : <span className={`italic ${dark ? "text-[#2a3942]" : "text-gray-300"}`}>
                            {t[lang].noMsgs}
                          </span>}
                    </p>
                    {isUnread ? (
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full bg-[#25d366] text-white text-[10px] flex items-center justify-center font-bold ${dir === "rtl" ? "mr-2" : "ml-2"}`}>
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    ) : <span className={`w-2 ${dir === "rtl" ? "mr-2" : "ml-2"}`} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ══════════ CHAT PANEL ══════════ */}
      <main className={`
        flex-1 flex flex-col relative overflow-hidden
        ${!mobileShowChat ? "hidden sm:flex" : "flex"}
        w-full
      `}>
        {selected ? (
          <>
            {/* Chat header */}
            <header className={`${headerBg} px-3 py-2 flex items-center justify-between z-10 border-b ${border}`}>
              <div className="flex items-center gap-2">
                {/* Back button on mobile */}
                <button
                  onClick={() => { setMobileShowChat(false); }}
                  className={`sm:hidden p-1.5 rounded-full transition-colors ${dark ? "text-[#8696a0] hover:bg-[#2a3942]" : "text-gray-500 hover:bg-gray-200"}`}
                >
                  {dir === "rtl" ? <ChevronDown className="w-5 h-5 rotate-90" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${avatarColor(selected.contact.id)}`}>
                  {initials(selected.contact)}
                </div>
                <div>
                  <p className={`font-semibold text-sm ${textMain}`}>{selected.contact.name ?? selected.contact.phone}</p>
                  <p className={`text-xs ${textSub}`}>{selected.contact.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleVoiceAgent(selected.contact.id, !selected.voiceAgentEnabled)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all
                    ${selected.voiceAgentEnabled
                      ? "bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                      : dark ? "bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                >
                  <Mic2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{selected.voiceAgentEnabled ? t[lang].voiceOn : t[lang].voice}</span>
                </button>
                <button
                  onClick={() => { setSelected(null); setMessages([]); setMobileShowChat(false); }}
                  className={`p-2 rounded-full transition-colors ${dark ? "text-[#8696a0] hover:bg-[#2a3942]" : "text-gray-500 hover:bg-gray-200"}`}
                >
                  <X className="w-5 h-5" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`p-2 rounded-full transition-colors ${dark ? "text-[#8696a0] hover:bg-[#2a3942]" : "text-gray-600 hover:bg-gray-200"}`}>
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2 text-sm">
                        <Plus className="w-4 h-4" /> {t[lang].addToList}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-48">
                        {audiences.length === 0
                          ? <div className="text-xs text-gray-400 px-3 py-2">{t[lang].noAudiences}</div>
                          : audiences.map(a => (
                            <DropdownMenuItem key={a.id} className="text-sm gap-2 cursor-pointer"
                              onClick={() => addToAudience(selected.contact.id, a.id)}>
                              <Users className="w-3.5 h-3.5" /> {a.name}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 text-sm cursor-pointer"
                      onClick={() => setConversationArchived(selected.contact.id, !selected.isArchived)}>
                      <Archive className="w-4 h-4" /> {selected.isArchived ? t[lang].unarchiveConv : t[lang].archiveConv}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-sm text-red-600 cursor-pointer focus:text-red-600"
                      onClick={() => deleteConversation(selected.contact.id)}>
                      <Trash2 className="w-4 h-4" /> {t[lang].deleteConv}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto px-3 sm:px-6 py-4"
              style={{
                backgroundImage: dark
                  ? "none"
                  : `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: msgAreaBg,
              }}
            >
              {loadingMsgs ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center">
                  <p className={`text-xs px-4 py-1.5 rounded-full ${dark ? "bg-[#1f2c34] text-[#8696a0]" : "bg-white/60 text-gray-400"}`}>
                    {t[lang].noMsgs}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const showDate = i === 0 || dateStr(messages[i-1].createdAt, lang) !== dateStr(msg.createdAt, lang);
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-3">
                            <span className={`text-[11px] px-3 py-0.5 rounded-full shadow-sm
                              ${dark ? "bg-[#1f2c34] text-[#8696a0]" : "bg-white/70 text-gray-500"}`}>
                              {dateStr(msg.createdAt, lang)}
                            </span>
                          </div>
                        )}
                        <Bubble msg={msg} onReact={sendReaction} lang={lang} dark={dark} />
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </>
              )}
            </div>

            {/* Template picker */}
            {showTpl && (
              <div className={`${sidebarBg} border-t ${border} max-h-56 overflow-y-auto z-10`}>
                <div className={`flex items-center justify-between px-4 pt-3 pb-2 border-b ${borderLight}`}>
                  <p className={`text-xs font-medium ${textSub}`}>{t[lang].chooseTemplate}</p>
                  <button onClick={() => setShowTpl(false)} className={`p-1 rounded-full ${textSub} hover:bg-gray-100`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {templates.length === 0
                  ? <p className={`text-sm ${textSub} px-4 pb-3`}>{t[lang].noTemplates}</p>
                  : templates.map(tp => (
                    <button key={tp.id} onClick={() => sendTemplate(tp)}
                      className={`w-full text-right px-4 py-3 border-b ${borderLight} transition-colors ${hoverRow}`}>
                      <p className={`text-sm font-medium ${textMain}`}>{tp.name}</p>
                    </button>
                  ))}
              </div>
            )}

            {/* Input bar */}
            <footer className={`${headerBg} px-2 sm:px-3 py-2.5 flex items-end gap-1.5 sm:gap-2 z-10 border-t ${border}`}>
              {/* Attach */}
              <div className="relative">
                <button
                  onClick={() => { setShowAttach(p => !p); setShowTpl(false); setShowEmoji(false); }}
                  className={`p-2 rounded-full transition-colors ${showAttach
                    ? dark ? "bg-[#2a3942] text-[#e9edef]" : "bg-gray-300 text-gray-700"
                    : dark ? "text-[#8696a0] hover:bg-[#2a3942]" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  {showAttach ? <X className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
                </button>
                {showAttach && (
                  <div className={`absolute bottom-12 ${dir === "rtl" ? "right-0" : "left-0"}
                    ${dark ? "bg-[#233138] border-[#2a3942]" : "bg-white border-gray-100"}
                    rounded-2xl shadow-xl overflow-hidden border w-44`}>
                    {ATTACH_OPTIONS.map(a => {
                      const isDisabled = Boolean(a.disabled);
                      return (
                        <label key={a.key}
                          onClick={e => { if (isDisabled) e.preventDefault(); }}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                            isDisabled ? "opacity-50 cursor-not-allowed" : `cursor-pointer ${hoverRow}`
                          }`}>
                          <span className={`w-8 h-8 rounded-full ${a.color} flex items-center justify-center text-white flex-shrink-0`}>
                            {a.icon}
                          </span>
                          <span className={`text-sm ${isDisabled ? textSub : textMain}`}>{a.label}</span>
                          <input type="file" accept={a.accept} className="hidden" disabled={isDisabled}
                            onChange={async e => {
                              if (isDisabled) return;
                              const f = e.target.files?.[0];
                              if (!f) return;
                              await sendFile(f, a.key);
                              setShowAttach(false);
                              e.target.value = "";
                            }} />
                        </label>
                      );
                    })}
                    <button onClick={() => { sendLocation(); setShowAttach(false); }}
                      className={`flex items-center gap-3 px-4 py-3 w-full transition-colors ${hoverRow}`}>
                      <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">
                        <MapPin className="w-4 h-4" />
                      </span>
                      <span className={`text-sm ${textMain}`}>{t[lang].locationLabel}</span>
                    </button>
                    <button onClick={() => { setShowTpl(p => !p); setShowAttach(false); }}
                      className={`flex items-center gap-3 px-4 py-3 w-full transition-colors ${hoverRow}`}>
                      <span className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </span>
                      <span className={`text-sm ${textMain}`}>{t[lang].templateLabel}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Emoji */}
              <div className="relative">
                <button
                  onClick={() => { setShowEmoji(p => !p); setShowAttach(false); setShowTpl(false); }}
                  className={`p-2 rounded-full transition-colors ${showEmoji
                    ? dark ? "bg-[#2a3942] text-[#e9edef]" : "bg-gray-300 text-gray-700"
                    : dark ? "text-[#8696a0] hover:bg-[#2a3942]" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  <Smile className="w-5 h-5" />
                </button>
                {showEmoji && (
                  <div className={`absolute bottom-12 ${dir === "rtl" ? "right-0" : "left-0"}
                    ${dark ? "bg-[#233138] border-[#2a3942]" : "bg-white border-gray-100"}
                    rounded-2xl shadow-xl border p-3 w-64 sm:w-72 z-20`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium ${textSub}`}>{t[lang].emoji}</span>
                      <button onClick={() => setShowEmoji(false)} className={textSub}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 max-h-44 overflow-y-auto">
                      {["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥸","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🫣","🤭","🤫","🤥","😶","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿","👹","👺","💀","☠️","👻","👽","🤖","💩","❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","👍","👎","👏","🙌","🤝","🙏","✌️","🤞","🤟","🤘","🤙","👋","🤚","🖐","✋","🖖","💪","🔥","⭐","✨","💥","💫","🎉","🎊","🎈"].map(em => (
                        <button key={em} onClick={() => setText(t => t + em)}
                          className={`text-xl rounded-lg p-0.5 transition-colors ${dark ? "hover:bg-[#2a3942]" : "hover:bg-gray-100"}`}>
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Textarea */}
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
                }}
                placeholder={t[lang].typeMsg}
                rows={1}
                className={`flex-1 ${inputBg} rounded-xl px-3 py-2.5 text-sm outline-none resize-none
                  max-h-28 overflow-y-auto border border-transparent
                  ${dark
                    ? "text-[#e9edef] placeholder-[#8696a0] focus:border-[#2a3942]"
                    : "text-[#111b21] placeholder-gray-400 focus:border-gray-200"}
                  transition-colors`}
                style={{ lineHeight: "1.5" }}
              />

              {/* Send or Mic */}
              {text.trim() ? (
                <button onClick={sendText} disabled={sending}
                  className="w-10 h-10 rounded-full bg-[#25d366] flex items-center justify-center
                    text-white flex-shrink-0 hover:bg-[#20bb5a] transition-colors disabled:opacity-50">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              ) : (
                <button onClick={toggleRecord}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-all
                    ${recording ? "bg-red-500 animate-pulse" : "bg-[#25d366] hover:bg-[#20bb5a]"}`}>
                  {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
            </footer>
          </>
        ) : (
          /* Empty state */
          <div className={`flex-1 flex flex-col items-center justify-center ${bg}`}>
            <div className="text-center max-w-xs px-6">
              <div className={`w-24 h-24 rounded-full shadow-sm flex items-center justify-center mx-auto mb-6
                ${dark ? "bg-[#1f2c34]" : "bg-white"}`}>
                <MessageSquare className="w-12 h-12 text-[#25d366]" />
              </div>
              <h2 className={`text-xl font-light mb-2 ${textMain}`}>{t[lang].pickConv}</h2>
              <p className={`text-sm mb-6 leading-relaxed ${textSub}`}>{t[lang].pickConvHint}</p>
              {filteredConvs.length === 0 && (
                <Button className="bg-[#25d366] hover:bg-[#20bb5a] text-white gap-2"
                  onClick={() => window.dispatchEvent(new CustomEvent("navigate-to", { detail: "campaigns" }))}>
                  <Megaphone className="w-4 h-4" /> {t[lang].startCampaign}
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}