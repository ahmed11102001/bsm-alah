"use client";

// ─────────────────────────────────────────────────────────────────────────
// نسخة الديمو من src/app/dashboard/chat/page.tsx
// مطابقة تماماً لواجهة وتجربة الداشبورد مع محاكاة تفاعلية محلية كاملة
// ─────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
    Search, Send, Paperclip, Mic, X, Reply, MoreVertical, Loader2,
    Image as ImageIcon, FileText, Video, MapPin, Smile,
    MessageSquare, ChevronDown, Users, Archive, Trash2, Plus,
    Megaphone, Clock, ChevronLeft, Bot, Mic2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/language-context";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
    DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

import { t, type Lang } from "./_components/i18n";
import type { Conversation, Message, FilterType } from "./_components/types";
import { avatarColor, initials, timeStr, dateStr } from "./_components/utils";
import { Bubble } from "./_components/bubble";
import { TimelineView } from "./_components/timelineview";
import {
    DEMO_CONVERSATIONS, DEMO_MESSAGES_BY_CONTACT, DEMO_TEMPLATES, DEMO_AUDIENCES,
    DEMO_ASSIGNMENT_MEMBERS,
} from "../_lib/chat-data";

const demoLocked = (locale: string) => {
    toast.message(locale === "ar" ? "🔒 متاح في النسخة الكاملة" : "🔒 Available in the full version", {
        description: locale === "ar"
            ? "المرفقات والتسجيل الصوتي محتاجين صلاحيات جهاز حقيقية — سجّل مجانًا لتجربتها."
            : "Attachments and voice recording need real device permissions — sign up free to try them.",
    });
};

const isAutomationMsg = (m: Message) =>
    m.content?.includes("[متابعة ذكية]") || m.content?.includes("[قالب]");

export default function DemoChatPage() {
    const { resolvedTheme } = useTheme();
    const { locale, dir } = useLanguage();
    const dark = resolvedTheme === "dark";
    const lang: Lang = locale === "en" ? "en" : "ar";

    const [convs, setConvs] = useState<Conversation[]>(DEMO_CONVERSATIONS);
    const [msgsByContact, setMsgsByContact] = useState<Record<string, Message[]>>(DEMO_MESSAGES_BY_CONTACT);
    const [searchInput, setSearchInput] = useState("");
    const [filter, setFilter] = useState<FilterType>("all");

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [chatViewMode, setChatViewMode] = useState<"chat" | "timeline">("chat");
    const [mobileShowChat, setMobileShowChat] = useState(false);

    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [showAttach, setShowAttach] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [showTpl, setShowTpl] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [hasNewMsgs, setHasNewMsgs] = useState(false);

    // Forwarding
    const [forwarding, setForwarding] = useState<Message | null>(null);
    const [forwardSearch, setForwardSearch] = useState("");
    const [forwardTarget, setForwardTarget] = useState<Conversation | null>(null);
    const [forwardingBusy, setForwardingBusy] = useState(false);

    const endRef = useRef<HTMLDivElement>(null);
    const msgAreaRef = useRef<HTMLDivElement>(null);
    const isAtBottom = useRef<boolean>(true);

    const selected = convs.find(c => c.contact.id === selectedId) ?? null;
    const messages = selectedId ? (msgsByContact[selectedId] ?? []) : [];

    // ── حساب إذا كانت المحادثة منتهية الـ 24 ساعة ─────────────────────
    const isExpired = useMemo(() => {
        if (!selected) return false;
        const lastInbound = messages.slice().reverse().find(m => m.direction === "inbound");
        if (!lastInbound) return messages.length > 0;
        return (Date.now() - new Date(lastInbound.createdAt).getTime()) > 24 * 60 * 60 * 1000;
    }, [selected, messages]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "auto" });
    }, [selectedId]);

    // ── Theme classes (نفس الأصلي بالظبط) ──────────────────────────────────────
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

    const selectConv = (conv: Conversation, mode: "chat" | "timeline" = "chat") => {
        setSelectedId(conv.contact.id);
        setChatViewMode(mode);
        setShowTpl(false);
        setShowAttach(false);
        setReplyingTo(null);
        setMobileShowChat(true);
        if (conv.unreadCount > 0) {
            setConvs(prev => prev.map(c => c.contact.id === conv.contact.id ? { ...c, unreadCount: 0 } : c));
        }
    };

    const updateAssignment = (assignedToUserId: string | null) => {
        if (!selected) return;
        const member = DEMO_ASSIGNMENT_MEMBERS.find(m => m.id === assignedToUserId) ?? null;
        setConvs(prev => prev.map(c => c.contact.id === selected.contact.id ? {
            ...c,
            contact: {
                ...c.contact,
                assignedToUserId,
                assignedTo: member ? { id: member.id, name: member.name } : null,
            },
        } : c));
        toast.success(lang === "ar" ? "تم تحديث مسؤول المحادثة" : "Conversation assignment updated");
    };

    const appendMessage = (contactId: string, msg: Message) => {
        setMsgsByContact(prev => ({ ...prev, [contactId]: [...(prev[contactId] ?? []), msg] }));
        setConvs(prev => prev.map(c => c.contact.id === contactId
            ? { ...c, lastMessage: { id: msg.id, content: msg.content, type: msg.type, direction: msg.direction, status: msg.status, createdAt: msg.createdAt }, lastMessageAt: msg.createdAt }
            : c));
    };

    const sendText = () => {
        if (!text.trim() || !selected || sending) return;
        const body = text;
        setText("");
        setSending(true);
        const id = `m-${Date.now()}`;
        const msg: Message = {
            id,
            content: body,
            type: "text",
            direction: "outbound",
            status: "sent",
            mediaUrl: null,
            createdAt: new Date().toISOString(),
            replyToMessageId: replyingTo?.id,
            replyTo: replyingTo ? {
                id: replyingTo.id,
                content: replyingTo.content,
                type: replyingTo.type,
                mediaUrl: replyingTo.mediaUrl,
                direction: replyingTo.direction,
            } : null,
        };
        appendMessage(selected.contact.id, msg);
        setSending(false);
        setReplyingTo(null);

        // إحساس بالواقعية: بعد ثانية ونص الرسالة تتحول لـ "delivered"
        setTimeout(() => {
            setMsgsByContact(prev => ({
                ...prev,
                [selected.contact.id]: (prev[selected.contact.id] ?? []).map(m => m.id === id ? { ...m, status: "delivered" } : m),
            }));
        }, 1400);
    };

    const copyMessage = async (msg: Message) => {
        if (!msg.content) return;
        try {
            await navigator.clipboard.writeText(msg.content);
            toast.success(lang === "ar" ? "تم نسخ الرسالة" : "Message copied");
        } catch {
            toast.error(lang === "ar" ? "تعذر نسخ الرسالة" : "Could not copy message");
        }
    };

    const openForward = (msg: Message) => {
        setForwarding(msg);
        setForwardTarget(null);
        setForwardSearch("");
    };

    const submitForward = () => {
        if (!forwarding || !forwardTarget || forwardingBusy) return;
        setForwardingBusy(true);
        setTimeout(() => {
            const id = `m-${Date.now()}`;
            const forwardedMsg: Message = {
                id,
                content: forwarding.content,
                type: forwarding.type,
                direction: "outbound",
                status: "delivered",
                mediaUrl: forwarding.mediaUrl,
                createdAt: new Date().toISOString(),
            };
            appendMessage(forwardTarget.contact.id, forwardedMsg);
            toast.success(lang === "ar" ? "تمت إعادة توجيه الرسالة" : "Message forwarded");
            setForwarding(null);
            setForwardingBusy(false);
        }, 350);
    };

    const scrollToMessage = (id: string) => {
        document.getElementById(`message-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const sendReaction = (msgId: string, emoji: string) => {
        if (!selected) return;
        setMsgsByContact(prev => ({
            ...prev,
            [selected.contact.id]: (prev[selected.contact.id] ?? []).map(m =>
                m.id === msgId ? { ...m, reactions: [...(m.reactions ?? []), { emoji, senderId: "me" }] } : m),
        }));
    };

    const sendTemplate = (tplName: string) => {
        if (!selected) return;
        setShowTpl(false);
        const id = `m-${Date.now()}`;
        appendMessage(selected.contact.id, {
            id, content: `[قالب] ${tplName}`, type: "text", direction: "outbound", status: "sent", mediaUrl: null, createdAt: new Date().toISOString(),
        });
        toast.success(t[lang].templateSent);
    };

    const setConversationArchived = (contactId: string, shouldArchive: boolean) => {
        setConvs(prev => prev.map(c => c.contact.id === contactId ? { ...c, isArchived: shouldArchive } : c));
        toast.success(shouldArchive ? t[lang].archived_ok : t[lang].unarchived_ok);
        setSelectedId(null); setMobileShowChat(false);
    };

    const deleteConversation = (contactId: string) => {
        setConvs(prev => prev.filter(c => c.contact.id !== contactId));
        toast.success(t[lang].deleted);
        setSelectedId(null); setMobileShowChat(false);
    };

    const addToAudience = (audienceName: string) => {
        toast.success(`${t[lang].addedToAudience} (${audienceName})`);
    };

    const toggleVoiceAgent = (contactId: string, enable: boolean) => {
        setConvs(prev => prev.map(c => c.contact.id === contactId ? { ...c, voiceAgentEnabled: enable } : c));
        toast.success(enable ? t[lang].voiceOnMsg : t[lang].voiceOffMsg);
    };

    const toggleTextAi = (contactId: string, enable: boolean) => {
        setConvs(prev => prev.map(c => c.contact.id === contactId ? { ...c, textAiEnabled: enable } : c));
        toast.success(enable ? t[lang].aiOnMsg : t[lang].aiOffMsg);
    };

    const resumeAi = (contactId: string) => {
        setConvs(prev => prev.map(c => c.contact.id === contactId ? { ...c, aiStatus: "AUTO", handoffReason: null, handoffAt: null } : c));
        toast.success(t[lang].resumeAiSuccess);
    };

    // ── فلترة ────────────────────────────────────────────────────────────────
    const filteredConvs = useMemo(() => {
        const q = searchInput.trim().toLowerCase();
        let list = convs;

        if (filter === "archived") list = list.filter(c => c.isArchived);
        else {
            list = list.filter(c => !c.isArchived);
            if (filter === "unread") list = list.filter(c => c.unreadCount > 0);
            else if (filter === "today") list = list.filter(c => c.lastMessageAt && dateStr(c.lastMessageAt, lang) === t[lang].today_label);
            else if (filter === "ai_replied") list = list.filter(c => c.textAiEnabled && c.aiStatus === "AUTO");
            else if (filter === "automation") list = list.filter(c => (msgsByContact[c.contact.id] ?? []).some(isAutomationMsg));
            else if (filter === "replied") list = list.filter(c => (msgsByContact[c.contact.id] ?? []).some(m => m.direction === "outbound"));
        }

        if (!q) return list;
        return list.filter(c => {
            const name = (c.contact.name ?? c.contact.phone).toLowerCase();
            return name.includes(q) || c.contact.phone.includes(q);
        });
    }, [convs, searchInput, filter, msgsByContact, lang]);

    const ATTACH_OPTIONS = [
        { key: "image", label: t[lang].photoLabel, icon: <ImageIcon className="w-4 h-4" />, color: "bg-purple-500" },
        { key: "video", label: t[lang].videoLabel, icon: <Video className="w-4 h-4" />, color: "bg-red-500", disabled: true },
        { key: "document", label: t[lang].docLabel, icon: <FileText className="w-4 h-4" />, color: "bg-blue-500" },
    ];

    return (
        <div className={`flex h-[calc(100vh-64px)] ${bg} overflow-hidden relative`} style={{ direction: dir }}>
            {/* ══════════ SIDEBAR ══════════ */}
            <aside className={`${sidebarBg} flex flex-col border-r ${border} flex-shrink-0 w-full sm:w-[340px] ${mobileShowChat ? "hidden sm:flex" : "flex"}`}>
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
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filter === f
                                ? "bg-[#25d366] text-white"
                                : dark ? "bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                            {t[lang][f]}
                        </button>
                    ))}
                    <button onClick={() => setFilter("ai_replied")}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${filter === "ai_replied"
                            ? "bg-violet-500 border-violet-500 text-white"
                            : dark ? "bg-[#2a3942] border-violet-500/30 text-violet-400 hover:border-violet-400 hover:text-violet-300" : "bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100"}`}>
                        <Bot className="w-3 h-3" /> {t[lang].ai_replied}
                    </button>
                    <button onClick={() => setFilter("automation")}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${filter === "automation"
                            ? "bg-amber-500 border-amber-500 text-white"
                            : dark ? "bg-[#2a3942] border-amber-500/30 text-amber-400 hover:border-amber-400 hover:text-amber-300" : "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"}`}>
                        <Clock className="w-3 h-3" /> {t[lang].automation}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredConvs.length === 0 ? (
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
                        const isSelected = selectedId === conv.contact.id;
                        const last = conv.lastMessage;
                        const isUnread = conv.unreadCount > 0;
                        const typePreviewMap: Record<string, string> = {
                            image: t[lang].image, video: t[lang].video, audio: t[lang].audio, document: t[lang].document,
                        };
                        return (
                            <div key={conv.contact.id} onClick={() => selectConv(conv)}
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
                                            {last ? <>{last.direction === "outbound" && <span className={textSub}>{t[lang].you}</span>}{typePreviewMap[last.type] ?? last.content ?? ""}</>
                                                : <span className={`italic ${dark ? "text-[#2a3942]" : "text-gray-300"}`}>{t[lang].noMsgs}</span>}
                                        </p>
                                        <div className="flex items-center gap-1">
                                            {isUnread ? (
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#25d366] text-white text-[10px] flex items-center justify-center font-bold">
                                                    {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                                                </span>
                                            ) : <span className="w-2" />}
                                            {filter === "automation" && (
                                                <button onClick={(e) => { e.stopPropagation(); selectConv(conv, "timeline"); }}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors border ${dark ? "bg-[#233138] border-amber-500/30 text-amber-400 hover:bg-[#2a3942]" : "bg-white border-amber-200 text-amber-600 hover:bg-amber-50"}`}>
                                                    <Clock className="w-3 h-3" /> مسار الأتمتة
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
            <main className={`flex-1 flex flex-col relative overflow-hidden ${!mobileShowChat ? "hidden sm:flex" : "flex"} w-full`}>
                {selected ? (
                    <>
                        <header className={`${headerBg} px-3 py-2 flex items-center justify-between z-10 border-b ${border}`}>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setMobileShowChat(false)}
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
                                <div className="hidden md:flex items-center gap-1.5 ml-3">
                                    <span className={`text-[11px] ${textSub}`}>{lang === "ar" ? "مسؤول المحادثة" : "Assigned to"}</span>
                                    <select
                                        value={selected.contact.assignedToUserId ?? ""}
                                        onChange={e => updateAssignment(e.target.value || null)}
                                        className={`max-w-[150px] rounded-lg border px-2 py-1 text-xs outline-none ${inputBg} ${textMain} ${border}`}
                                    >
                                        <option value="">{lang === "ar" ? "غير معيّنة" : "Unassigned"}</option>
                                        {DEMO_ASSIGNMENT_MEMBERS.map(member => (
                                            <option key={member.id} value={member.id}>{member.name || member.email}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button onClick={() => toggleTextAi(selected.contact.id, !selected.textAiEnabled)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all
                    ${selected.textAiEnabled !== false ? "bg-[#25d366] text-white shadow-[0_0_12px_rgba(37,211,102,0.5)]" : dark ? "bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                                    <Bot className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">{selected.textAiEnabled !== false ? t[lang].aiOn : t[lang].ai}</span>
                                </button>
                                <button onClick={() => toggleVoiceAgent(selected.contact.id, !selected.voiceAgentEnabled)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all
                    ${selected.voiceAgentEnabled ? "bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]" : dark ? "bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                                    <Mic2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">{selected.voiceAgentEnabled ? t[lang].voiceOn : t[lang].voice}</span>
                                </button>
                                <button
                                    onClick={() => { setSelectedId(null); setMobileShowChat(false); }}
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
                                                {DEMO_AUDIENCES.map(a => (
                                                    <DropdownMenuItem key={a.id} className="text-sm gap-2 cursor-pointer" onClick={() => addToAudience(a.name)}>
                                                        <Users className="w-3.5 h-3.5" /> {a.name}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={() => setConversationArchived(selected.contact.id, !selected.isArchived)}>
                                            <Archive className="w-4 h-4" /> {selected.isArchived ? t[lang].unarchiveConv : t[lang].archiveConv}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="gap-2 text-sm text-red-600 cursor-pointer focus:text-red-600" onClick={() => deleteConversation(selected.contact.id)}>
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
                            }}>
                            {messages.length === 0 ? (
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
                                                        <span className={`text-[11px] px-3 py-0.5 rounded-full shadow-sm ${dark ? "bg-[#1f2c34] text-[#8696a0]" : "bg-white/70 text-gray-500"}`}>
                                                            {dateStr(msg.createdAt, lang)}
                                                        </span>
                                                    </div>
                                                )}
                                                <Bubble
                                                    msg={msg}
                                                    onReact={sendReaction}
                                                    onReply={setReplyingTo}
                                                    onCopy={copyMessage}
                                                    onForward={openForward}
                                                    onQuoteClick={scrollToMessage}
                                                    lang={lang}
                                                    dark={dark}
                                                />
                                            </div>
                                        );
                                    })}
                                    <div ref={endRef} />
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

                        {showTpl && (
                            <div className={`${sidebarBg} border-t ${border} max-h-56 overflow-y-auto z-10`}>
                                <div className={`flex items-center justify-between px-4 pt-3 pb-2 border-b ${borderLight}`}>
                                    <p className={`text-xs font-medium ${textSub}`}>{t[lang].chooseTemplate}</p>
                                    <button onClick={() => setShowTpl(false)} className={`p-1 rounded-full ${textSub} hover:bg-gray-100`}>
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-2 space-y-1">
                                    {DEMO_TEMPLATES.map(tpl => (
                                        <button key={tpl.id} onClick={() => sendTemplate(tpl.name)}
                                            className={`w-full text-right px-3 py-2 rounded-xl transition-colors ${hoverRow}`}>
                                            <p className={`text-sm font-medium ${textMain}`}>{tpl.name}</p>
                                            <p className={`text-xs truncate ${textSub}`}>{tpl.content}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input bar quote preview */}
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

                        {/* Composer */}
                        <footer className={`${headerBg} px-3 py-2.5 flex items-end gap-2 border-t ${border}`}>
                            <div className="relative">
                                <button onClick={() => { setShowAttach(p => !p); setShowEmoji(false); }}
                                    className={`p-2 rounded-full transition-colors ${showAttach ? dark ? "bg-[#2a3942] text-[#e9edef]" : "bg-gray-300 text-gray-700" : dark ? "text-[#8696a0] hover:bg-[#2a3942]" : "text-gray-600 hover:bg-gray-200"}`}>
                                    {showAttach ? <X className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
                                </button>
                                {showAttach && (
                                    <div className={`absolute bottom-12 ${dir === "rtl" ? "right-0" : "left-0"} ${dark ? "bg-[#233138] border-[#2a3942]" : "bg-white border-gray-100"} rounded-2xl shadow-xl overflow-hidden border w-44`}>
                                        {ATTACH_OPTIONS.map(a => (
                                            <button key={a.key} onClick={() => { demoLocked(locale); setShowAttach(false); }}
                                                className={`flex items-center gap-3 px-4 py-3 w-full transition-colors ${hoverRow}`}>
                                                <span className={`w-8 h-8 rounded-full ${a.color} flex items-center justify-center text-white flex-shrink-0`}>{a.icon}</span>
                                                <span className={`text-sm ${textMain}`}>{a.label}</span>
                                            </button>
                                        ))}
                                        <button onClick={() => { demoLocked(locale); setShowAttach(false); }}
                                            className={`flex items-center gap-3 px-4 py-3 w-full transition-colors ${hoverRow}`}>
                                            <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0"><MapPin className="w-4 h-4" /></span>
                                            <span className={`text-sm ${textMain}`}>{t[lang].locationLabel}</span>
                                        </button>
                                        <button onClick={() => { setShowTpl(p => !p); setShowAttach(false); }}
                                            className={`flex items-center gap-3 px-4 py-3 w-full transition-colors ${hoverRow}`}>
                                            <span className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white flex-shrink-0"><FileText className="w-4 h-4" /></span>
                                            <span className={`text-sm ${textMain}`}>{t[lang].templateLabel}</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button onClick={() => { setShowEmoji(p => !p); setShowAttach(false); setShowTpl(false); }}
                                    className={`p-2 rounded-full transition-colors ${showEmoji ? dark ? "bg-[#2a3942] text-[#e9edef]" : "bg-gray-300 text-gray-700" : dark ? "text-[#8696a0] hover:bg-[#2a3942]" : "text-gray-600 hover:bg-gray-200"}`}>
                                    <Smile className="w-5 h-5" />
                                </button>
                                {showEmoji && (
                                    <div className={`absolute bottom-12 ${dir === "rtl" ? "right-0" : "left-0"} ${dark ? "bg-[#233138] border-[#2a3942]" : "bg-white border-gray-100"} rounded-2xl shadow-xl border p-3 w-64 sm:w-72 z-20`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-medium ${textSub}`}>{t[lang].emoji}</span>
                                            <button onClick={() => setShowEmoji(false)} className={textSub}><X className="w-4 h-4" /></button>
                                        </div>
                                        <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 max-h-44 overflow-y-auto">
                                            {["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🤫", "🤥", "😶", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "💀", "☠️", "👻", "👽", "🤖", "💩", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "🤙", "👋", "🤚", "🖐", "✋", "🖖", "💪", "🔥", "⭐", "✨", "💥", "💫", "🎉", "🎊", "🎈"].map(em => (
                                                <button key={em} onClick={() => setText(t2 => t2 + em)} className={`text-xl rounded-lg p-0.5 transition-colors ${dark ? "hover:bg-[#2a3942]" : "hover:bg-gray-100"}`}>
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
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
                                placeholder={t[lang].typeMsg}
                                rows={1}
                                className={`flex-1 ${inputBg} rounded-xl px-3 py-2.5 text-sm outline-none resize-none max-h-28 overflow-y-auto border border-transparent ${dark ? "text-[#e9edef] placeholder-[#8696a0] focus:border-[#2a3942]" : "text-[#111b21] placeholder-gray-400 focus:border-gray-200"} transition-colors`}
                                style={{ lineHeight: "1.5" }}
                            />

                            {text.trim() ? (
                                <button onClick={sendText} disabled={sending}
                                    className="w-10 h-10 rounded-full bg-[#25d366] flex items-center justify-center text-white flex-shrink-0 hover:bg-[#20bb5a] transition-colors disabled:opacity-50">
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            ) : (
                                <button onClick={() => demoLocked(locale)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 bg-[#25d366] hover:bg-[#20bb5a] transition-all">
                                    <Mic className="w-4 h-4" />
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
                        </div>
                    </div>
                )}

                {/* Forwarding Modal */}
                {forwarding && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setForwarding(null)}>
                        <div className={`${sidebarBg} rounded-2xl shadow-2xl w-full max-w-md p-4`} onClick={e => e.stopPropagation()} dir={dir}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className={`font-semibold ${textMain}`}>{lang === "ar" ? "إعادة توجيه الرسالة" : "Forward message"}</h3>
                                <button onClick={() => setForwarding(null)} className={textSub}><X className="w-5 h-5" /></button>
                            </div>
                            <div className={`rounded-lg p-2 mb-3 text-sm ${dark ? "bg-[#2a3942]" : "bg-gray-100"} ${textMain}`}>
                                {forwarding.content || forwarding.type}
                            </div>
                            <input
                                value={forwardSearch}
                                onChange={e => setForwardSearch(e.target.value)}
                                placeholder={lang === "ar" ? "ابحث بالاسم أو الرقم" : "Search by name or phone"}
                                className={`w-full rounded-lg border px-3 py-2 text-sm mb-2 outline-none ${inputBg} ${textMain} ${border}`}
                            />
                            <div className="max-h-56 overflow-y-auto space-y-1">
                                {convs
                                    .filter(c => c.contact.id !== selectedId && `${c.contact.name ?? ""} ${c.contact.phone}`.toLowerCase().includes(forwardSearch.toLowerCase()))
                                    .map(c => (
                                        <button
                                            key={c.contact.id}
                                            onClick={() => setForwardTarget(c)}
                                            className={`w-full text-left rounded-lg px-3 py-2 flex items-center justify-between ${forwardTarget?.contact.id === c.contact.id ? "bg-[#d9fdd3] dark:bg-[#005c4b]/40" : hoverRow}`}
                                        >
                                            <span className={textMain}>{c.contact.name || c.contact.phone}</span>
                                            <span className={`text-xs ${textSub}`}>{c.contact.phone}</span>
                                        </button>
                                    ))}
                            </div>
                            <button
                                disabled={!forwardTarget || forwardingBusy}
                                onClick={submitForward}
                                className="w-full mt-3 rounded-lg bg-[#25d366] hover:bg-[#20bb5a] text-white py-2 font-semibold disabled:opacity-50 transition-colors"
                            >
                                {forwardingBusy ? "..." : (lang === "ar" ? "إرسال" : "Send")}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}