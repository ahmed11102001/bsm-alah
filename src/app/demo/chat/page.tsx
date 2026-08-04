"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bubble } from "@/app/dashboard/chat/_components/bubble";
import { TimelineView } from "@/app/dashboard/chat/_components/timelineview";
import { t, type Lang } from "@/app/dashboard/chat/_components/i18n";
import type { Audience, Conversation, FilterType, Message, Template } from "@/app/dashboard/chat/_components/types";
import { avatarColor, dateStr, initials, timeStr } from "@/app/dashboard/chat/_components/utils";
import { MsgTick } from "@/app/dashboard/chat/_components/masgtic";
import {
  Search,
  Send,
  Paperclip,
  Mic,
  X,
  MoreVertical,
  Clock,
  Image as ImageIcon,
  FileText,
  Video,
  MapPin,
  Smile,
  MessageSquare,
  ChevronDown,
  ChevronLeft,
  Users,
  Archive,
  Trash2,
  Plus,
  MicOff,
  Loader2,
  Megaphone,
  Bot,
} from "lucide-react";
import {
  DEMO_CHAT_AUDIENCES,
  DEMO_CHAT_CONVERSATIONS,
  DEMO_CHAT_MESSAGES,
  DEMO_CHAT_TEMPLATES,
} from "../_lib/demo-data";

const TYPE_PREVIEW: Record<string, string> = {
  image: t.en.image,
  video: t.en.video,
  audio: t.en.audio,
  document: t.en.document,
};

export default function DemoChatPage() {
  const { resolvedTheme } = useTheme();
  const { locale, dir } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dark = resolvedTheme === "dark";
  const lang: Lang = locale === "en" ? "en" : "ar";

  const [convs, setConvs] = useState<Conversation[]>(DEMO_CHAT_CONVERSATIONS);
  const [searchInput, setSearchInput] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [chatViewMode, setChatViewMode] = useState<"chat" | "timeline">("chat");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTpl, setShowTpl] = useState(false);

  const [templates] = useState<Template[]>(DEMO_CHAT_TEMPLATES);
  const [audiences] = useState<Audience[]>(DEMO_CHAT_AUDIENCES);

  const endRef = useRef<HTMLDivElement>(null);
  const msgAreaRef = useRef<HTMLDivElement>(null);
  const loadTimerRef = useRef<number | null>(null);
  const isAtBottomRef = useRef(true);

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
  const msgAreaBg = dark ? "#0b141a" : "#efeae2";

  const fetchMsgs = useCallback((contactId: string) => {
    if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current);
    setLoadingMsgs(true);
    loadTimerRef.current = window.setTimeout(() => {
      setMessages(DEMO_CHAT_MESSAGES[contactId] ?? []);
      setLoadingMsgs(false);
      loadTimerRef.current = null;
    }, 180);
  }, []);

  const openConversation = useCallback((conv: Conversation, mode: "chat" | "timeline" = "chat") => {
    setSelected({ ...conv, unreadCount: 0 });
    setChatViewMode(mode);
    setMobileShowChat(true);
    setShowAttach(false);
    setShowEmoji(false);
    setShowTpl(false);
    setConvs(prev => prev.map(c => c.contact.id === conv.contact.id ? { ...c, unreadCount: 0 } : c));
    isAtBottomRef.current = true;
    fetchMsgs(conv.contact.id);
  }, [fetchMsgs]);

  const selectConv = useCallback((conv: Conversation, mode: "chat" | "timeline" = "chat") => {
    router.push(`/demo/chat?contact=${conv.contact.id}`);
    openConversation(conv, mode);
  }, [openConversation, router]);

  useEffect(() => {
    if (!searchParams) return;
    const contactId = searchParams.get("contact");
    if (!contactId) return;
    const conv = convs.find(c => c.contact.id === contactId);
    if (!conv) return;
    openConversation(conv, "chat");
  }, [searchParams, convs, openConversation]);

  useEffect(() => {
    return () => {
      if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    if (isAtBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const filteredConvs = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    return convs.filter(conv => {
      if (filter === "replied" && conv.unreadCount > 0) return false;
      if (filter === "today") {
        if (!conv.lastMessageAt) return false;
        const d = new Date(conv.lastMessageAt);
        const today = new Date();
        if (d.toDateString() !== today.toDateString()) return false;
      }
      if (filter === "unread" && conv.unreadCount === 0) return false;
      if (filter === "archived" && !conv.isArchived) return false;
      if (filter === "ai_replied" && !(conv.aiStatus === "AUTO" || conv.textAiEnabled)) return false;
      if (filter === "automation" && !(conv.textAiEnabled || conv.aiStatus === "AUTO")) return false;
      if (!query) return true;
      const name = (conv.contact.name ?? conv.contact.phone).toLowerCase();
      return name.includes(query) || conv.contact.phone.includes(query);
    });
  }, [convs, filter, searchInput]);

  const sendText = async () => {
    if (!text.trim() || !selected || sending) return;
    const body = text.trim();
    setText("");
    setSending(true);

    const now = new Date().toISOString();
    const newMsg: Message = {
      id: `demo-msg-${Date.now()}`,
      content: body,
      type: "text",
      direction: "outbound",
      status: "delivered",
      mediaUrl: null,
      createdAt: now,
    };

    setMessages(prev => [...prev, newMsg]);
    setConvs(prev => prev.map(c => c.contact.id === selected.contact.id
      ? { ...c, lastMessage: newMsg, lastMessageAt: now, unreadCount: 0 }
      : c
    ));
    setSelected(prev => prev ? { ...prev, lastMessage: newMsg, lastMessageAt: now, unreadCount: 0 } : prev);
    setSending(false);
  };

  const sendTemplate = (tpl: Template) => {
    if (!selected || sending) return;
    setSending(true);
    const now = new Date().toISOString();
    const newMsg: Message = {
      id: `demo-msg-${Date.now()}`,
      content: `[Template] ${tpl.name}`,
      type: "template",
      direction: "outbound",
      status: "delivered",
      mediaUrl: null,
      createdAt: now,
    };
    setMessages(prev => [...prev, newMsg]);
    setConvs(prev => prev.map(c => c.contact.id === selected.contact.id
      ? { ...c, lastMessage: newMsg, lastMessageAt: now }
      : c
    ));
    setSelected(prev => prev ? { ...prev, lastMessage: newMsg, lastMessageAt: now } : prev);
    toast.success(t[lang].templateSent);
    setSending(false);
  };

  const sendLocation = () => {
    if (!selected) return;
    const now = new Date().toISOString();
    const newMsg: Message = {
      id: `demo-msg-${Date.now()}`,
      content: "📍 Location: demo location",
      type: "text",
      direction: "outbound",
      status: "delivered",
      mediaUrl: null,
      createdAt: now,
    };
    setMessages(prev => [...prev, newMsg]);
    setConvs(prev => prev.map(c => c.contact.id === selected.contact.id
      ? { ...c, lastMessage: newMsg, lastMessageAt: now }
      : c
    ));
    setSelected(prev => prev ? { ...prev, lastMessage: newMsg, lastMessageAt: now } : prev);
    toast.success(t[lang].locationSent);
  };

  const sendFile = (_file: File, _mediaType: string) => {
    toast.message(locale === "ar" ? "متاح في النسخة الكاملة" : "Available in the full version", {
      description: locale === "ar" ? "رفع الملفات محاكى فقط في الديمو." : "File uploads are simulated in demo mode.",
    });
  };

  const toggleRecord = () => {
    toast.message(locale === "ar" ? "متاح في النسخة الكاملة" : "Available in the full version", {
      description: locale === "ar" ? "تسجيل الصوت غير متاح في الديمو." : "Voice recording is not available in demo mode.",
    });
  };

  const sendReaction = (msgId: string, emoji: string) => {
    if (!selected) return;
    setMessages(prev => prev.map(msg =>
      msg.id === msgId
        ? { ...msg, reactions: [...(msg.reactions ?? []), { emoji, senderId: "me" }] }
        : msg
    ));
  };

  const setConversationArchived = (contactId: string, shouldArchive: boolean) => {
    setConvs(prev => prev.map(c => c.contact.id === contactId ? { ...c, isArchived: shouldArchive } : c));
    if (selected?.contact.id === contactId) {
      setSelected(null);
      setMobileShowChat(false);
      setMessages([]);
    }
    toast.success(shouldArchive ? t[lang].archived_ok : t[lang].unarchived_ok);
  };

  const deleteConversation = (contactId: string) => {
    setConvs(prev => prev.filter(c => c.contact.id !== contactId));
    if (selected?.contact.id === contactId) {
      setSelected(null);
      setMobileShowChat(false);
      setMessages([]);
    }
    toast.success(t[lang].deleted);
  };

  const addToAudience = (contactId: string, audienceId: string) => {
    const audience = audiences.find(a => a.id === audienceId);
    toast.success(`${audience?.name ?? "Audience"} ${locale === "ar" ? "تمت إضافته" : "added to list"}`);
  };

  const toggleVoiceAgent = (contactId: string, enable: boolean) => {
    setConvs(prev => prev.map(c => c.contact.id === contactId ? { ...c, voiceAgentEnabled: enable } : c));
    setSelected(prev => prev ? (prev.contact.id === contactId ? { ...prev, voiceAgentEnabled: enable } : prev) : prev);
    toast.success(enable ? t[lang].voiceOnMsg : t[lang].voiceOffMsg);
  };

  const toggleTextAi = (contactId: string, enable: boolean) => {
    setConvs(prev => prev.map(c => c.contact.id === contactId ? { ...c, textAiEnabled: enable } : c));
    setSelected(prev => prev ? (prev.contact.id === contactId ? { ...prev, textAiEnabled: enable } : prev) : prev);
    toast.success(enable ? t[lang].aiOnMsg : t[lang].aiOffMsg);
  };

  const resumeAi = (contactId: string) => {
    setConvs(prev => prev.map(c => c.contact.id === contactId ? { ...c, aiStatus: "AUTO", handoffReason: null, handoffAt: null } : c));
    setSelected(prev => prev ? (prev.contact.id === contactId ? { ...prev, aiStatus: "AUTO", handoffReason: null, handoffAt: null } : prev) : prev);
    toast.success(t[lang].resumeAiSuccess);
  };

  const isExpired = useMemo(() => {
    if (!selected) return false;
    const lastInbound = [...messages].reverse().find(m => m.direction === "inbound");
    if (!lastInbound) return messages.length > 0;
    return (Date.now() - new Date(lastInbound.createdAt).getTime()) > 24 * 60 * 60 * 1000;
  }, [messages, selected]);

  const onScroll = () => {
    const el = msgAreaRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isAtBottomRef.current = atBottom;
  };

  return (
    <div className={`flex h-[calc(100vh-64px)] ${bg} overflow-hidden relative`} style={{ direction: dir }}>
      <aside className={`
        ${sidebarBg} flex flex-col border-r ${border}
        flex-shrink-0
        w-full sm:w-[340px]
        ${mobileShowChat ? "hidden sm:flex" : "flex"}
      `}>
        <div className={`px-3 pt-3 pb-2 ${sidebarBg} border-b ${borderLight}`}>
          <div className="flex items-center justify-between mb-2.5">
            <span className={`text-base font-semibold ${textMain}`}>
              {lang === "ar" ? "المحادثات" : "Chats"}
            </span>
          </div>
          <div className="relative">
            <Search className={`absolute top-2.5 w-4 h-4 ${textSub} ${dir === "rtl" ? "right-3" : "left-3"}`} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t[lang].search}
              className={`w-full ${searchBg} rounded-xl py-2 text-sm outline-none ${dir === "rtl" ? "pr-9 pl-4" : "pl-9 pr-4"}`}
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")}
                className={`absolute top-2.5 ${textSub} hover:text-gray-600 ${dir === "rtl" ? "left-3" : "right-3"}`}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

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

        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <MessageSquare className={`w-12 h-12 mb-3 ${dark ? "text-[#2a3942]" : "text-gray-200"}`} />
              <p className={`text-sm mb-1 ${textSub}`}>{t[lang].noConvs}</p>
              <p className={`text-xs mb-5 ${dark ? "text-[#2a3942]" : "text-gray-300"}`}>{t[lang].noConvsHint}</p>
              <Button className="bg-[#25d366] hover:bg-[#20bb5a] text-white gap-1.5"
                onClick={() => window.dispatchEvent(new CustomEvent("navigate-to", { detail: "campaigns" }))}>
                <Megaphone className="w-4 h-4" /> {t[lang].startCampaign}
              </Button>
            </div>
          ) : filteredConvs.map(conv => {
            const isSelected = selected?.contact.id === conv.contact.id;
            const last = conv.lastMessage;
            const isUnread = conv.unreadCount > 0;
            return (
              <div key={conv.contact.id}
                onClick={() => selectConv(conv)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b ${borderLight} transition-colors ${isSelected ? selectedRow : `${sidebarBg} ${hoverRow}`}`}>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${avatarColor(conv.contact.id)}`}>
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
                            {TYPE_PREVIEW[last.type] ?? last.content ?? ""}
                          </>
                        : <span className={`italic ${dark ? "text-[#2a3942]" : "text-gray-300"}`}>{t[lang].noMsgs}</span>}
                    </p>
                    <div className="flex items-center gap-1">
                      {isUnread ? (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#25d366] text-white text-[10px] flex items-center justify-center font-bold">
                          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                        </span>
                      ) : <span className="w-2" />}
                      {filter === "automation" && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            selectConv(conv, "timeline");
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors border ${dark ? "bg-[#233138] border-amber-500/30 text-amber-400 hover:bg-[#2a3942]" : "bg-white border-amber-200 text-amber-600 hover:bg-amber-50"}`}>
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

      <main className={`
        flex-1 flex flex-col relative overflow-hidden
        ${!mobileShowChat ? "hidden sm:flex" : "flex"}
        w-full
      `}>
        {selected ? (
          <>
            <header className={`${headerBg} px-3 py-2 flex items-center justify-between z-10 border-b ${border}`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setMobileShowChat(false); }}
                  className={`sm:hidden p-1.5 rounded-full transition-colors ${dark ? "text-[#8696a0] hover:bg-[#2a3942]" : "text-gray-500 hover:bg-gray-200"}`}>
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
                  onClick={() => toggleTextAi(selected.contact.id, !selected.textAiEnabled)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${selected.textAiEnabled !== false
                    ? "bg-[#25d366] text-white shadow-[0_0_12px_rgba(37,211,102,0.5)]"
                    : dark ? "bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{selected.textAiEnabled !== false ? t[lang].aiOn : t[lang].ai}</span>
                </button>
                <button
                  onClick={() => toggleVoiceAgent(selected.contact.id, !selected.voiceAgentEnabled)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${selected.voiceAgentEnabled
                    ? "bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                    : dark ? "bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  <Mic className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{selected.voiceAgentEnabled ? t[lang].voiceOn : t[lang].voice}</span>
                </button>
                <button
                  onClick={() => { setSelected(null); setMessages([]); setMobileShowChat(false); }}
                  className={`p-2 rounded-full transition-colors ${dark ? "text-[#8696a0] hover:bg-[#2a3942]" : "text-gray-500 hover:bg-gray-200"}`}>
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

            <div
              ref={msgAreaRef}
              className="flex-1 overflow-y-auto px-3 sm:px-6 py-4"
              dir="ltr"
              onScroll={onScroll}
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
              ) : chatViewMode === "timeline" ? (
                <TimelineView messages={messages} lang={lang} dark={dark} />
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const showDate = i === 0 || dateStr(messages[i - 1].createdAt, lang) !== dateStr(msg.createdAt, lang);
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-3">
                            <span className={`text-[11px] px-3 py-0.5 rounded-full shadow-sm ${dark ? "bg-[#1f2c34] text-[#8696a0]" : "bg-white/70 text-gray-500"}`}>
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

            <footer className={`${headerBg} px-2 sm:px-3 py-2.5 flex items-end gap-1.5 sm:gap-2 z-10 border-t ${border}`}>
              <div className="relative">
                <button
                  onClick={() => { setShowAttach(p => !p); setShowTpl(false); setShowEmoji(false); }}
                  className={`p-2 rounded-full transition-colors ${showAttach
                    ? dark ? "bg-[#2a3942] text-[#e9edef]" : "bg-gray-300 text-gray-700"
                    : dark ? "text-[#8696a0] hover:bg-[#2a3942]" : "text-gray-600 hover:bg-gray-200"}`}>
                  {showAttach ? <X className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
                </button>
                {showAttach && (
                  <div className={`absolute bottom-12 ${dir === "rtl" ? "right-0" : "left-0"} ${dark ? "bg-[#233138] border-[#2a3942]" : "bg-white border-gray-100"} rounded-2xl shadow-xl overflow-hidden border w-44`}>
                    <div className={`flex items-center gap-3 px-4 py-3 transition-colors opacity-50 cursor-not-allowed`}>
                      <span className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white flex-shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </span>
                      <span className={`text-sm ${textMain}`}>{t[lang].image}</span>
                    </div>
                    <div className={`flex items-center gap-3 px-4 py-3 transition-colors opacity-50 cursor-not-allowed`}>
                      <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white flex-shrink-0">
                        <Video className="w-4 h-4" />
                      </span>
                      <span className={`text-sm ${textMain}`}>{t[lang].video}</span>
                    </div>
                    <div className={`flex items-center gap-3 px-4 py-3 transition-colors opacity-50 cursor-not-allowed`}>
                      <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </span>
                      <span className={`text-sm ${textMain}`}>{t[lang].document}</span>
                    </div>
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

              <div className="relative">
                <button
                  onClick={() => { setShowEmoji(p => !p); setShowAttach(false); setShowTpl(false); }}
                  className={`p-2 rounded-full transition-colors ${showEmoji
                    ? dark ? "bg-[#2a3942] text-[#e9edef]" : "bg-gray-300 text-gray-700"
                    : dark ? "text-[#8696a0] hover:bg-[#2a3942]" : "text-gray-600 hover:bg-gray-200"}`}>
                  <Smile className="w-5 h-5" />
                </button>
                {showEmoji && (
                  <div className={`absolute bottom-12 ${dir === "rtl" ? "right-0" : "left-0"} ${dark ? "bg-[#233138] border-[#2a3942]" : "bg-white border-gray-100"} rounded-2xl shadow-xl border p-3 w-64 sm:w-72 z-20`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium ${textSub}`}>{t[lang].emoji}</span>
                      <button onClick={() => setShowEmoji(false)} className={textSub}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 max-h-44 overflow-y-auto">
                      {[
                        "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🤫", "🤥", "😶", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "💀", "☠️", "👻", "👽", "🤖", "💩", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "🤙", "👋", "🤚", "🖐", "✋", "🖖", "💪", "🔥", "⭐", "✨", "💥", "💫", "🎉", "🎊", "🎈"
                      ].map(em => (
                        <button key={em} onClick={() => setText(t => t + em)}
                          className={`text-xl rounded-lg p-0.5 transition-colors ${dark ? "hover:bg-[#2a3942]" : "hover:bg-gray-100"}`}>
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
                }}
                placeholder={t[lang].typeMsg}
                rows={1}
                className={`flex-1 ${inputBg} rounded-xl px-3 py-2.5 text-sm outline-none resize-none max-h-28 overflow-y-auto border border-transparent ${dark ? "text-[#e9edef] placeholder-[#8696a0] focus:border-[#2a3942]" : "text-[#111b21] placeholder-gray-400 focus:border-gray-200"} transition-colors`}
                style={{ lineHeight: "1.5"}}
              />

              {text.trim() ? (
                <button onClick={sendText} disabled={sending}
                  className="w-10 h-10 rounded-full bg-[#25d366] flex items-center justify-center text-white flex-shrink-0 hover:bg-[#20bb5a] transition-colors disabled:opacity-50">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              ) : (
                <button onClick={toggleRecord}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-all ${dark ? "bg-[#25d366]" : "bg-[#25d366] hover:bg-[#20bb5a]"}`}>
                  <MicOff className="w-4 h-4" />
                </button>
              )}
            </footer>
          </>
        ) : (
          <div className={`flex-1 flex flex-col items-center justify-center ${bg}`}>
            <div className="text-center max-w-xs px-6">
              <div className={`w-24 h-24 rounded-full shadow-sm flex items-center justify-center mx-auto mb-6 ${dark ? "bg-[#1f2c34]" : "bg-white"}`}>
                <MessageSquare className="w-12 h-12 text-[#25d366]" />
              </div>
              <h2 className={`text-xl font-light mb-2 ${textMain}`}>{t[lang].pickConv}</h2>
              <p className={`text-sm mb-6 leading-relaxed ${textSub}`}>{t[lang].pickConvHint}</p>
              {filteredConvs.length === 0 ? null : (
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
