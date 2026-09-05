"use client";
import { ChatListSkeleton, ChatMessagesSkeleton } from "@/components/dashboard/DashboardSkeletons";

import {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { toast } from "sonner";
import {
  Search, Send, Paperclip, Mic, X, Reply, MoreVertical, Check, CheckCheck,
  Clock, Image as ImageIcon, FileText, Video, MapPin, Smile,
  MessageSquare, ChevronDown, Users, Archive, Trash2, Plus,
  MicOff, Loader2, Megaphone, Filter, Circle, Mic2, Lock,
  ArrowLeft, ChevronLeft, Bot,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/language-context";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// ─── i18n ─────────────────────────────────────────────────────────────────────
import { t, type Lang } from "./_components/i18n";
import type { Audience, Template, Contact, LastMsg, Conversation, Message, FilterType } from "./_components/types";
import { avatarColor, initials, mediaSrc, linkify, timeStr, dateStr } from "./_components/utils";
import { MsgTick } from "./_components/masgtic";
import { Bubble } from "./_components/bubble";
import { TimelineView } from "./_components/timelineview";

export default function ChatPage() {
  const { resolvedTheme } = useTheme();
  const { data: authSession } = useSession();
  const { locale, dir } = useLanguage();
  const dark = resolvedTheme === "dark";
  const lang: Lang = locale === "en" ? "en" : "ar";

  // عضو CHAT_ONLY (رد المحادثات فقط) — الـBackend بيمنعه من delete/addToAudience/
  // toggleVoiceAgent/toggleTextAi (PATCH /api/chat)، فمينفعش الـUI يعرضله
  // أزرار هيضغط عليها وتفشل. نفس الحدود بالظبط بتاعة PATCH_ACTION_PERMISSIONS.
  const isChatOnly = authSession?.user?.role === "CHAT_ONLY";

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [searchInput, setSearchInput] = useState("");   // قيمة خانة البحث الفورية (للعرض)
  const [search, setSearch] = useState("");             // القيمة المؤجلة (debounced) اللي بتتبعت للسيرفر
  const [filter, setFilter] = useState<FilterType>("all");

  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [chatViewMode, setChatViewMode] = useState<"chat" | "timeline">("chat");

  // mobile: show chat panel over sidebar
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showTpl, setShowTpl] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);

  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgAreaRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef<boolean>(true);
  const isInitialLoad = useRef<boolean>(true);
  const messagesRef = useRef<Message[]>([]);
  const messageRequestId = useRef(0);
  const messageRequestRef = useRef<AbortController | null>(null);
  const messageRequestInFlight = useRef(false);
  const pendingScroll = useRef<"initial" | "new" | null>(null);
  const [hasNewMsgs, setHasNewMsgs] = useState(false);
  const [assignmentMembers, setAssignmentMembers] = useState<{ id: string; name: string | null; email: string; image: string | null }[]>([]);
  const [canAssign, setCanAssign] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwarding, setForwarding] = useState<Message | null>(null);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardTargets, setForwardTargets] = useState<Conversation[]>([]);
  const [forwardTarget, setForwardTarget] = useState<Conversation | null>(null);
  const [forwardingBusy, setForwardingBusy] = useState(false);
  const [canSendMedia, setCanSendMedia] = useState(true);
  const [globalTextEnabled, setGlobalTextEnabled] = useState(true);
  const [globalVoiceEnabled, setGlobalVoiceEnabled] = useState(false);

  // ── حساب إذا كانت المحادثة منتهية الـ 24 ساعة ─────────────────────
  const isExpired = useMemo(() => {
    if (!selected) return false;
    const lastInbound = messages.slice().reverse().find(m => m.direction === "inbound");
    if (!lastInbound) return messages.length > 0;
    return (Date.now() - new Date(lastInbound.createdAt).getTime()) > 24 * 60 * 60 * 1000;
  }, [selected, messages]);


  // ── Theme classes ────────────────────────────────────────────────
  const bg = dark ? "bg-[#111b21]" : "bg-[#f0f2f5]";
  const sidebarBg = dark ? "bg-[#1f2c34]" : "bg-white";
  const headerBg = dark ? "bg-[#202c33]" : "bg-[#f0f2f5]";
  const inputBg = dark ? "bg-[#2a3942]" : "bg-white";
  const textMain = dark ? "text-[#e9edef]" : "text-[#111b21]";
  const textSub = dark ? "text-[#8696a0]" : "text-gray-400";
  const border = dark ? "border-[#2a3942]" : "border-gray-200";
  const borderLight = dark ? "border-[#2a3942]" : "border-gray-100";
  const searchBg = dark ? "bg-[#2a3942] text-[#d1d7db] placeholder-[#8696a0]" : "bg-[#f0f2f5] text-gray-800 placeholder-gray-400";
  const hoverRow = dark ? "hover:bg-[#2a3942]" : "hover:bg-[#f5f6f6]";
  const selectedRow = dark ? "bg-[#2a3942]" : "bg-[#e8f5e9]";
  const msgAreaBg = dark ? "#0b141a" : "#f0f2f5";

  // ── Fetch helpers ────────────────────────────────────────────────
  const fetchConvs = useCallback(async () => {
    try {
      const q = new URLSearchParams({ type: "conversations", filter, search });
      const r = await fetch(`/api/chat?${q}`);
      const d = await r.json();
      setConvs(d.conversations ?? []);
      if (typeof d.canSendMedia === "boolean") {
        setCanSendMedia(d.canSendMedia);
      }
      if (typeof d.globalTextEnabled === "boolean") {
        setGlobalTextEnabled(d.globalTextEnabled);
      }
      if (typeof d.globalVoiceEnabled === "boolean") {
        setGlobalVoiceEnabled(d.globalVoiceEnabled);
      }
    } catch { /* silent */ }
    finally { setLoadingConvs(false); }
  }, [filter, search]);

  const fetchMsgs = useCallback(async (contactId: string, initial = false) => {
    // لا نسمح بتداخل polling requests؛ النتيجة القديمة لا يجب أن تكتب فوق الأحدث.
    if (messageRequestInFlight.current && !initial) return;
    const requestId = ++messageRequestId.current;
    if (initial) messageRequestRef.current?.abort();
    const controller = new AbortController();
    messageRequestRef.current = controller;
    messageRequestInFlight.current = true;
    if (initial) setLoadingMsgs(true);
    try {
      const r = await fetch(`/api/chat?type=messages&contactId=${contactId}`, { signal: controller.signal });
      const d = await r.json();
      if (typeof d.canSendMedia === "boolean") {
        setCanSendMedia(d.canSendMedia);
      }
      const newMsgs: Message[] = d.messages ?? [];
      if (requestId !== messageRequestId.current || controller.signal.aborted) return;

      // حفظ الـ scroll position قبل أي update
      const el = msgAreaRef.current;
      const prevScrollTop = el?.scrollTop ?? 0;
      const prevScrollH = el?.scrollHeight ?? 0;
      const wasAtBottom = isAtBottom.current;
      const previousMessages = messagesRef.current;
      const previousCount = previousMessages.length;
      const changed = newMsgs.length !== previousCount || newMsgs.some((msg, i) => {
        const previous = previousMessages[i];
        return !previous || previous.id !== msg.id || previous.status !== msg.status || previous.reactions?.length !== msg.reactions?.length;
      });

      if (changed) {
        messagesRef.current = newMsgs;
        setMessages(newMsgs);
      }
      setConvs(prev => prev.map(c =>
        c.contact.id === contactId ? { ...c, unreadCount: 0 } : c
      ));

      // لو المستخدم مش في الأسفل (بيقرأ رسايل قديمة) → رجّع نفس الـ position
      const hasNewMessages = newMsgs.length > previousCount;
      if (!wasAtBottom && !initial && hasNewMessages && el) {
        // لو في رسايل جديدة فعلاً → أظهر indicator
        setHasNewMsgs(true);
        requestAnimationFrame(() => {
          el.scrollTop = prevScrollTop + (el.scrollHeight - prevScrollH);
        });
      } else {
        if (initial || wasAtBottom) setHasNewMsgs(false);
      }
      if (initial) pendingScroll.current = "initial";
      else if (wasAtBottom && hasNewMessages) pendingScroll.current = "new";
    } catch (error) {
      // إلغاء طلب قديم عند تبديل المحادثة متوقع ولا يجب أن يغيّر واجهة المستخدم.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.warn("Failed to refresh chat messages", error);
      }
    } finally {
      if (requestId === messageRequestId.current) {
        messageRequestInFlight.current = false;
        if (initial) setLoadingMsgs(false);
      }
    }
  }, []);

  const selectConv = useCallback((conv: Conversation, mode: "chat" | "timeline" = "chat") => {
    setSelected(conv);
    setChatViewMode(mode);
    isInitialLoad.current = true;   // ← أول فتح للمحادثة → scroll للأسفل
    isAtBottom.current = true;
    messagesRef.current = [];
    setMessages([]);
    pendingScroll.current = "initial";
    fetchMsgs(conv.contact.id, true);
    setShowTpl(false); setShowAttach(false);
    setMobileShowChat(true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMsgs(conv.contact.id), 8000);
  }, [fetchMsgs]);

  useEffect(() => {
    if (!selected) { setAssignmentMembers([]); setCanAssign(false); return; }
    let active = true;
    fetch(`/api/chat/assignment?contactId=${encodeURIComponent(selected.contact.id)}`)
      .then(r => r.json())
      .then(d => { if (active) { setAssignmentMembers(d.members ?? []); setCanAssign(Boolean(d.canAssign)); } })
      .catch(() => { if (active) { setAssignmentMembers([]); setCanAssign(false); } });
    return () => { active = false; };
  }, [selected?.contact.id]);

  const updateAssignment = async (assignedToUserId: string | null) => {
    if (!selected || assignmentLoading) return;
    const previous = selected;
    const member = assignmentMembers.find(m => m.id === assignedToUserId) ?? null;
    setAssignmentLoading(true);
    setSelected({ ...selected, contact: { ...selected.contact, assignedToUserId, assignedTo: member ? { id: member.id, name: member.name } : null } });
    try {
      const r = await fetch("/api/chat/assignment", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId: selected.contact.id, assignedToUserId }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setConvs(prev => prev.map(c => c.contact.id === selected.contact.id ? { ...c, contact: { ...c.contact, assignedToUserId, assignedTo: member ? { id: member.id, name: member.name } : null } } : c));
      toast.success(lang === "ar" ? "تم تحديث مسؤول المحادثة" : "Conversation assignment updated");
    } catch (e: any) {
      setSelected(previous); toast.error(e.message ?? (lang === "ar" ? "تعذر تحديث التعيين" : "Could not update assignment"));
    } finally { setAssignmentLoading(false); }
  };

  const fetchTemplates = useCallback(async () => {
    const r = await fetch("/api/templates");
    const d = await r.json();
    setTemplates(Array.isArray(d) ? d.filter((t: Template) =>
      ["approved", "APPROVED"].includes(t.status)) : []);
  }, []);

  const fetchAudiences = useCallback(async () => {
    const r = await fetch("/api/audiences");
    const d = await r.json();
    setAudiences(Array.isArray(d) ? d : []);
  }, []);

  // ── Debounce لخانة البحث ─────────────────────────────────────────
  // search (اللي بيتبعت فعليًا للسيرفر) بيتحدث بعد توقف المستخدم عن
  // الكتابة بـ 400ms، بدل ما يعمل fetch مع كل حرف.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    fetchConvs(); fetchTemplates(); fetchAudiences();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      messageRequestRef.current?.abort();
    };
  }, [fetchConvs, fetchTemplates, fetchAudiences]);

  // ── بولينج دوري لقائمة المحادثات (sidebar) ─────────────────────────
  // عشان الـ unread badges والمحادثات الجديدة تتحدث live حتى لو مفيش
  // محادثة مفتوحة، أو المستخدم مش بيغيّر filter/search.
  useEffect(() => {
    const convsPollId = setInterval(() => {
      // متستناش fetchConvs لو الصفحة في الخلفية (tab مش ظاهر) — وفّر طلبات لا داعي لها
      if (document.visibilityState === "visible") {
        fetchConvs();
      }
    }, 8000);
    return () => clearInterval(convsPollId);
  }, [fetchConvs]);

  // ── Smart scroll — ينزل للأسفل بس في 3 حالات ─────────────────────
  useEffect(() => {
    if (messages.length === 0) return;

    // حالة 1: أول تحميل للمحادثة → scroll فوري بدون animation
    if (isInitialLoad.current || pendingScroll.current === "initial") {
      endRef.current?.scrollIntoView({ behavior: "auto" });
      isInitialLoad.current = false;
      pendingScroll.current = null;
      return;
    }

    // حالة 2: المستخدم في الأسفل → scroll smooth للرسائل الجديدة
    // حالة 3: المستخدم بيقرأ من فوق → لا تحرك إيه (fetchMsgs هيرجع الـ position)
    if (pendingScroll.current === "new" && isAtBottom.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    pendingScroll.current = null;
  }, [messages]);

  // ── Actions ──────────────────────────────────────────────────────
  const sendText = async () => {
    if (!text.trim() || !selected || sending) return;
    const body = text; setText(""); setSending(true);
    isAtBottom.current = true; // بعد الإرسال نزل للأسفل
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", contactId: selected.contact.id, content: body, type: "text", replyToMessageId: replyingTo?.id }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      fetchMsgs(selected.contact.id);
    } catch (e: any) { toast.error(e.message); setText(body); }
    finally { setSending(false); setReplyingTo(null); }
  };

  const copyMessage = async (msg: Message) => {
    if (!msg.content) return;
    try { await navigator.clipboard.writeText(msg.content); toast.success(lang === "ar" ? "تم نسخ الرسالة" : "Message copied"); }
    catch { toast.error(lang === "ar" ? "تعذر نسخ الرسالة" : "Could not copy message"); }
  };

  const openForward = (msg: Message) => {
    setForwarding(msg); setForwardTarget(null); setForwardSearch("");
    fetch("/api/chat?type=conversations&filter=within24h").then(r => r.json()).then(d => setForwardTargets(d.conversations ?? [])).catch(() => setForwardTargets([]));
  };

  const submitForward = async () => {
    if (!forwarding || !forwardTarget || forwardingBusy) return;
    setForwardingBusy(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forward", sourceMessageId: forwarding.id, targetContactId: forwardTarget.contact.id }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      toast.success(lang === "ar" ? "تمت إعادة توجيه الرسالة" : "Message forwarded"); setForwarding(null);
    } catch (e: any) { toast.error(e.message ?? (lang === "ar" ? "تعذر إعادة التوجيه" : "Forward failed")); }
    finally { setForwardingBusy(false); }
  };

  const scrollToMessage = (id: string) => document.getElementById(`message-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

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
        body: JSON.stringify({ action: "react", contactId: selected.contact.id, messageId: msgId, emoji }),
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
        body: JSON.stringify({ action: "send", contactId: selected.contact.id, type: "template", templateName: tpl.name, content: `[Template] ${tpl.name}` }),
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
          body: JSON.stringify({ action: "send", contactId: selected.contact.id, type: "text", content: `📍 Location: https://maps.google.com/?q=${lat},${lng}` }),
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
    if (!canSendMedia) {
      toast.error(
        lang === "ar"
          ? "إرسال الصور والملفات متاح في باقة Go وما فوقها. يرجى ترقية باقتك."
          : "Sending images and files requires Go plan or higher. Please upgrade."
      );
      return;
    }
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
    if (!canSendMedia) {
      toast.error(
        lang === "ar"
          ? "تسجيل وإرسال الرسائل الصوتية متاح في باقة Go وما فوقها. يرجى ترقية باقتك."
          : "Voice messages require Go plan or higher. Please upgrade."
      );
      return;
    }
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
    if (!globalVoiceEnabled && enable) {
      toast.error(lang === "ar" ? "فعّل الردود الصوتية في إعدادات الربط (ElevenLabs) أولاً" : "Enable Voice Replies in Integrations (ElevenLabs) first");
      return;
    }
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

  const toggleTextAi = async (contactId: string, enable: boolean) => {
    if (!globalTextEnabled && enable) {
      toast.error(lang === "ar" ? "الردود النصية معطلة في إعدادات الـ AI Agent" : "Text replies are disabled in AI Agent settings");
      return;
    }
    try {
      const r = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleTextAi", contactId, enable }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      setConvs(prev => prev.map(c =>
        c.contact.id === contactId ? { ...c, textAiEnabled: enable } : c
      ));
      if (selected?.contact.id === contactId) {
        setSelected(prev => prev ? { ...prev, textAiEnabled: enable } : prev);
      }
      toast.success(enable ? t[lang].aiOnMsg : t[lang].aiOffMsg);
    } catch (e: any) { toast.error(e.message); }
  };

  const resumeAi = async (contactId: string) => {
    try {
      const r = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resumeAi", contactId }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      setConvs(prev => prev.map(c =>
        c.contact.id === contactId ? { ...c, aiStatus: "AUTO", handoffReason: null, handoffAt: null } : c
      ));
      if (selected?.contact.id === contactId) {
        setSelected(prev => prev ? { ...prev, aiStatus: "AUTO", handoffReason: null, handoffAt: null } : prev);
      }
      toast.success(t[lang].resumeAiSuccess);
    } catch (e: any) { toast.error(e.message); }
  };

  // فلترة فورية محلية باستخدام searchInput (مش search المؤجلة) — بتدي إحساس
  // فوري للمستخدم وهو بيكتب لحد ما نتيجة البحث الفعلية من السيرفر توصل
  // (بعد الـ debounce). البحث الحقيقي ضد كل قاعدة البيانات بيحصل في fetchConvs.
  const filteredConvs = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter(c => {
      const name = (c.contact.name ?? c.contact.phone).toLowerCase();
      return name.includes(q) || c.contact.phone.includes(q);
    });
  }, [convs, searchInput]);

  const ATTACH_OPTIONS = [
    { key: "image", label: t[lang].photoLabel, icon: <ImageIcon className="w-4 h-4" />, accept: "image/*", color: "bg-purple-500", locked: !canSendMedia },
    { key: "video", label: t[lang].videoLabel, icon: <Video className="w-4 h-4" />, accept: "video/*", color: "bg-red-500", disabled: true },
    { key: "document", label: t[lang].docLabel, icon: <FileText className="w-4 h-4" />, accept: ".pdf,.doc,.docx,.xls,.xlsx,.txt", color: "bg-blue-500", locked: !canSendMedia },
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
        ${sidebarBg} flex flex-col min-h-0 border-r ${border}
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
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t[lang].search}
              className={`w-full ${searchBg} rounded-xl py-2 text-sm outline-none
                ${dir === "rtl" ? "pr-9 pl-4" : "pl-9 pr-4"}`}
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")}
                className={`absolute top-2.5 ${textSub} hover:text-gray-600 ${dir === "rtl" ? "left-3" : "right-3"}`}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className={`flex gap-1.5 px-3 py-2 border-b ${borderLight} overflow-x-auto scrollbar-hide`}>
          {(["all", "replied", "today", "unread", "archived"] as FilterType[]).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filter === f
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
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${filter === "ai_replied"
              ? "bg-violet-500 border-violet-500 text-white"
              : dark
                ? "bg-[#2a3942] border-violet-500/30 text-violet-400 hover:border-violet-400 hover:text-violet-300"
                : "bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100"
              }`}>
            <Bot className="w-3 h-3" />
            {t[lang].ai_replied}
          </button>
          {/* Automation — فلتر جديد للأتمتة */}
          <button
            onClick={() => setFilter("automation")}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${filter === "automation"
              ? "bg-amber-500 border-amber-500 text-white"
              : dark
                ? "bg-[#2a3942] border-amber-500/30 text-amber-400 hover:border-amber-400 hover:text-amber-300"
                : "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
              }`}>
            <Clock className="w-3 h-3" />
            {t[lang].automation}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {loadingConvs ? (
            <ChatListSkeleton rows={7} />
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
                    <div className="flex items-center gap-1">
                      {isUnread ? (
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full bg-[#25d366] text-white text-[10px] flex items-center justify-center font-bold`}>
                          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                        </span>
                      ) : <span className="w-2" />}
                      {filter === "automation" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectConv(conv, "timeline");
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors border ${dark ? "bg-[#233138] border-amber-500/30 text-amber-400 hover:bg-[#2a3942]" : "bg-white border-amber-200 text-amber-600 hover:bg-amber-50"}`}
                        >
                          <Clock className="w-3 h-3" />
                          مسار الأتمتة
                        </button>
                      )}
                    </div>
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
                <div className="hidden md:flex items-center gap-1.5 ml-3">
                  <span className={`text-[11px] ${textSub}`}>{lang === "ar" ? "مسؤول المحادثة" : "Assigned to"}</span>
                  {canAssign ? (
                    <select
                      value={selected.contact.assignedToUserId ?? ""}
                      disabled={assignmentLoading}
                      onChange={e => updateAssignment(e.target.value || null)}
                      className={`max-w-[150px] rounded-lg border px-2 py-1 text-xs outline-none ${inputBg} ${textMain} ${border} disabled:opacity-60`}
                    >
                      <option value="">{lang === "ar" ? "غير معيّنة" : "Unassigned"}</option>
                      {assignmentMembers.map(member => <option key={member.id} value={member.id}>{member.name || member.email}</option>)}
                    </select>
                  ) : (
                    <span className={`text-xs font-medium ${textMain}`}>{selected.contact.assignedTo?.name || (lang === "ar" ? "غير معيّنة" : "Unassigned")}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!isChatOnly && (
                  <>
                    <button
                      onClick={() => toggleTextAi(selected.contact.id, !selected.textAiEnabled)}
                      title={!globalTextEnabled ? (lang === "ar" ? "الردود النصية معطلة في الإعدادات" : "Text Replies disabled in settings") : undefined}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all
                        ${!globalTextEnabled
                          ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-[#2a3942] dark:text-gray-500"
                          : selected.textAiEnabled !== false
                          ? "bg-[#25d366] text-white shadow-[0_0_12px_rgba(37,211,102,0.5)]"
                          : dark ? "bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{selected.textAiEnabled !== false ? t[lang].aiOn : t[lang].ai}</span>
                    </button>
                    <button
                      onClick={() => toggleVoiceAgent(selected.contact.id, !selected.voiceAgentEnabled)}
                      title={!globalVoiceEnabled ? (lang === "ar" ? "الردود الصوتية معطلة في الإعدادات" : "Voice Replies disabled in settings") : undefined}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all
                        ${!globalVoiceEnabled
                          ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-[#2a3942] dark:text-gray-500"
                          : selected.voiceAgentEnabled
                          ? "bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                          : dark ? "bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >
                      <Mic2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{selected.voiceAgentEnabled ? t[lang].voiceOn : t[lang].voice}</span>
                    </button>
                  </>
                )}
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
                    {!isChatOnly && (
                      <>
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
                      </>
                    )}
                    <DropdownMenuItem className="gap-2 text-sm cursor-pointer"
                      onClick={() => setConversationArchived(selected.contact.id, !selected.isArchived)}>
                      <Archive className="w-4 h-4" /> {selected.isArchived ? t[lang].unarchiveConv : t[lang].archiveConv}
                    </DropdownMenuItem>
                    {!isChatOnly && (
                      <DropdownMenuItem className="gap-2 text-sm text-red-600 cursor-pointer focus:text-red-600"
                        onClick={() => deleteConversation(selected.contact.id)}>
                        <Trash2 className="w-4 h-4" /> {t[lang].deleteConv}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {selected.aiStatus && selected.aiStatus !== "AUTO" && (
              <div className={`px-3 py-2 border-b ${selected.aiStatus === "NEEDS_HUMAN" ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" : "bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-semibold">{selected.aiStatus === "NEEDS_HUMAN" ? t[lang].handoffWarning : t[lang].handoffActive}</p>
                    {selected.handoffReason && <p className="text-xs opacity-80">{selected.handoffReason}</p>}
                  </div>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => resumeAi(selected.contact.id)}>
                    {t[lang].resumeAi}
                  </Button>
                </div>
              </div>
            )}

            {/* Expired Window Warning */}
            {isExpired && (
              <div className={`px-3 py-2 border-b ${dark ? "bg-red-900/20 border-red-900/50 text-red-200" : "bg-red-50 border-red-100 text-red-700"}`}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-lg leading-none">⚠️</span>
                  <div className="text-sm">
                    <p className="font-semibold">
                      {lang === "ar" ? "محادثة عدا عليها 24 ساعة بدون رد" : "Conversation expired (24h+ with no reply)"}
                    </p>
                    <p className="opacity-90 mt-0.5">
                      {lang === "ar"
                        ? "لو بعت رسالة عادية دلوقتي الواتساب هيحظرك. ابعت قالب من علامة الدبوس (📎) ف الشات، اختار قوالب، وابعت القالب المناسب."
                        : "Sending a regular message will get you blocked. Tap the attachment icon (📎), choose templates, and send an approved template."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Messages area */}
            <div
              ref={msgAreaRef}
              className="flex-1 overflow-y-auto px-3 sm:px-6 py-4" dir="ltr"
              onScroll={() => {
                const el = msgAreaRef.current;
                if (!el) return;
                const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                isAtBottom.current = atBottom;
                if (atBottom) setHasNewMsgs(false);
              }}
              style={{
                backgroundColor: msgAreaBg,
              }}
            >
              {loadingMsgs && messages.length === 0 ? (
                <ChatMessagesSkeleton />
              ) : messages.length === 0 ? (
                <div className="flex justify-center">
                  <p className={`text-xs px-4 py-1.5 rounded-full ${dark ? "bg-[#1f2c34] text-[#8696a0]" : "bg-white/60 text-gray-400"}`}>
                    {t[lang].noMsgs}
                  </p>
                </div>
              ) : chatViewMode === "timeline" ? (
                <TimelineView messages={messages} lang={lang} dark={dark} />
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const showDate = i === 0 || dateStr(messages[i - 1].createdAt, lang) !== dateStr(msg.createdAt, lang);
                    return (
                      <div key={msg.id} id={`message-${msg.id}`}>
                        {showDate && (
                          <div className="flex justify-center my-3">
                            <span className={`text-[11px] px-3 py-0.5 rounded-full shadow-sm
                              ${dark ? "bg-[#1f2c34] text-[#8696a0]" : "bg-white/70 text-gray-500"}`}>
                              {dateStr(msg.createdAt, lang)}
                            </span>
                          </div>
                        )}
                        <Bubble msg={msg} contactId={selected?.contact?.id} onReact={sendReaction} onReply={setReplyingTo} onCopy={copyMessage} onForward={openForward} onQuoteClick={scrollToMessage} lang={lang} dark={dark} />
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                  {/* ── New messages indicator ── */}
                  {hasNewMsgs && (
                    <div className="sticky bottom-3 flex justify-center z-10 pointer-events-none">
                      <button
                        onClick={() => {
                          endRef.current?.scrollIntoView({ behavior: "smooth" });
                          setHasNewMsgs(false);
                          isAtBottom.current = true;
                        }}
                        className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shadow-lg transition-all"
                        style={{ background: dark ? "#005c4b" : "#25D366", color: "#fff" }}
                      >
                        ↓ رسائل جديدة
                      </button>
                    </div>
                  )}
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
            {replyingTo && (
              <div className={`${headerBg} border-t ${border} px-3 py-2 flex items-center gap-2`}>
                <Reply className="w-4 h-4 text-[#25d366]" />
                <div className="min-w-0 flex-1 border-l-2 border-[#25d366] pl-2">
                  <p className={`text-xs font-semibold ${textMain}`}>{replyingTo.direction === "outbound" ? (lang === "ar" ? "أنت" : "You") : (lang === "ar" ? "العميل" : "Customer")}</p>
                  <p className={`text-xs truncate ${textSub}`}>{replyingTo.content || replyingTo.type}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className={textSub}><X className="w-4 h-4" /></button>
              </div>
            )}
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
                      const isLocked = Boolean(a.locked);
                      const isDisabled = Boolean(a.disabled) || isLocked;
                      return (
                        <label key={a.key}
                          onClick={e => {
                            if (isLocked) {
                              e.preventDefault();
                              toast.error(
                                lang === "ar"
                                  ? "إرسال الصور والملفات متاح في باقة Go وما فوقها. يرجى ترقية باقتك."
                                  : "Sending images and files requires Go plan or higher. Please upgrade."
                              );
                              return;
                            }
                            if (isDisabled) e.preventDefault();
                          }}
                          className={`flex items-center justify-between px-4 py-3 transition-colors ${
                            isDisabled && !isLocked
                              ? "opacity-50 cursor-not-allowed"
                              : isLocked
                              ? "opacity-60 hover:opacity-90 cursor-pointer"
                              : `cursor-pointer ${hoverRow}`
                          }`}>
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full ${a.color} flex items-center justify-center text-white flex-shrink-0`}>
                              {a.icon}
                            </span>
                            <span className={`text-sm ${isDisabled && !isLocked ? textSub : textMain}`}>{a.label}</span>
                          </div>
                          {isLocked && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Go</span>
                            </span>
                          )}
                          {!isLocked && (
                            <input type="file" accept={a.accept} className="hidden" disabled={isDisabled}
                              onChange={async e => {
                                if (isDisabled) return;
                                const f = e.target.files?.[0];
                                if (!f) return;
                                await sendFile(f, a.key);
                                setShowAttach(false);
                                e.target.value = "";
                              }} />
                          )}
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
                      {["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🤫", "🤥", "😶", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "💀", "☠️", "👻", "👽", "🤖", "💩", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "🤙", "👋", "🤚", "🖐", "✋", "🖖", "💪", "🔥", "⭐", "✨", "💥", "💫", "🎉", "🎊", "🎈"].map(em => (
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
        {forwarding && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setForwarding(null)}>
            <div className={`${sidebarBg} rounded-2xl shadow-2xl w-full max-w-md p-4`} onClick={e => e.stopPropagation()} dir={dir}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold ${textMain}`}>{lang === "ar" ? "إعادة توجيه الرسالة" : "Forward message"}</h3>
                <button onClick={() => setForwarding(null)} className={textSub}><X className="w-5 h-5" /></button>
              </div>
              <div className={`rounded-lg p-2 mb-3 text-sm ${dark ? "bg-[#2a3942]" : "bg-gray-100"} ${textMain}`}>{forwarding.content || forwarding.type}</div>
              {/* توضيح نافذة 24 ساعة */}
              <div className={`rounded-lg px-3 py-2 mb-2 text-xs flex items-center gap-2 ${dark ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{lang === "ar" ? "المحادثات داخل نافذة 24 ساعة فقط" : "Only conversations within the 24h window"}</span>
              </div>
              <input value={forwardSearch} onChange={e => setForwardSearch(e.target.value)} placeholder={lang === "ar" ? "ابحث بالاسم أو الرقم" : "Search by name or phone"} className={`w-full rounded-lg border px-3 py-2 text-sm mb-2 outline-none ${inputBg} ${textMain} ${border}`} />
              <div className="max-h-56 overflow-y-auto space-y-1">
                {forwardTargets.filter(c => c.contact.id !== selected?.contact.id && `${c.contact.name ?? ""} ${c.contact.phone}`.toLowerCase().includes(forwardSearch.toLowerCase())).length === 0 ? (
                  <div className={`text-center py-6 text-sm ${textSub}`}>
                    {lang === "ar" ? "لا توجد محادثات نشطة داخل نافذة 24 ساعة" : "No active conversations within the 24h window"}
                  </div>
                ) : (
                  forwardTargets.filter(c => c.contact.id !== selected?.contact.id && `${c.contact.name ?? ""} ${c.contact.phone}`.toLowerCase().includes(forwardSearch.toLowerCase())).map(c => (
                    <button key={c.contact.id} onClick={() => setForwardTarget(c)} className={`w-full text-left rounded-lg px-3 py-2 flex items-center justify-between ${forwardTarget?.contact.id === c.contact.id ? "bg-[#d9fdd3]" : hoverRow}`}>
                      <span className={textMain}>{c.contact.name || c.contact.phone}</span><span className={`text-xs ${textSub}`}>{c.contact.phone}</span>
                    </button>
                  ))
                )}
              </div>
              <button disabled={!forwardTarget || forwardingBusy} onClick={submitForward} className="w-full mt-3 rounded-lg bg-[#25d366] text-white py-2 disabled:opacity-50">{forwardingBusy ? "..." : (lang === "ar" ? "إرسال" : "Send")}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}