"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Send, Paperclip, Smile, Phone,
  MoreVertical, Check, CheckCheck, FileText, Mic, X,
  Star, Archive, Trash2, Clock, MessageSquare,
  RefreshCw, ArrowLeft, Info, BellOff,
  Layout, Reply, Copy, Zap, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

/* ===========================
   TYPES
=========================== */
interface Contact {
  id: string;
  name?: string | null;
  phone: string;
  audienceId?: string | null;
}

interface Message {
  id: string;
  content: string | null;
  type: string;
  direction: string;
  status: string;
  createdAt: string;
  contactId: string;
}

interface Conversation {
  contact: Contact;
  lastMessage: Message | null;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
}

interface Template {
  id: string;
  name: string;
  content: string;
  status: string;
  language: string;
  category: string;
}

/* ===========================
   HELPERS
=========================== */
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);

  if (days === 0)
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (days === 1) return "أمس";
  if (days < 7) return `${days} أيام`;

  return date.toLocaleDateString("ar-EG", {
    day: "2-digit",
    month: "2-digit",
  });
};

const formatDateSeparator = (dateStr: string) => {
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86400000
  );

  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";

  return new Date(dateStr).toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
};

function MsgStatus({ status }: { status: string }) {
  if (status === "pending")
    return <Clock className="w-3 h-3 text-gray-400" />;

  if (status === "sent")
    return <Check className="w-3 h-3 text-gray-400" />;

  if (status === "delivered")
    return <CheckCheck className="w-3 h-3 text-gray-400" />;

  if (status === "read")
    return <CheckCheck className="w-3 h-3 text-blue-400" />;

  if (status === "failed")
    return <AlertCircle className="w-3 h-3 text-red-400" />;

  return null;
}

function Avatar({
  name,
  phone,
  size = "md",
}: {
  name?: string | null;
  phone: string;
  size?: "sm" | "md" | "lg";
}) {
  const styles = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-20 h-20 text-3xl",
  };

  return (
    <div
      className={`${styles[size]} rounded-full bg-gradient-to-br from-[#075E54] to-[#25D366] flex items-center justify-center text-white font-bold`}
    >
      {(name?.[0] || phone[0] || "?").toUpperCase()}
    </div>
  );
}

/* ===========================
   PAGE
=========================== */
export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [contactNote, setContactNote] = useState("");

  const [showTemplates, setShowTemplates] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);

  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ===========================
     FETCH CONVERSATIONS
  =========================== */
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConvs(true);

      const res = await fetch("/api/conversations");
      const data = await res.json();

      const sorted = data.sort((a: Conversation, b: Conversation) => {
        const aDate = a.lastMessage?.createdAt || "";
        const bDate = b.lastMessage?.createdAt || "";

        return (
          new Date(bDate).getTime() - new Date(aDate).getTime()
        );
      });

      setConversations(sorted);
    } catch {
      toast.error("فشل تحميل المحادثات");
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  /* ===========================
     FETCH MESSAGES
  =========================== */
  const fetchMessages = useCallback(async (contactId: string) => {
    try {
      setLoadingMsgs(true);

      const res = await fetch(`/api/chat?contactId=${contactId}`);
      const data = await res.json();

      setMessages(data.messages || []);
    } catch {
      toast.error("فشل تحميل الرسائل");
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  /* ===========================
     FETCH TEMPLATES
  =========================== */
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();

      setTemplates(
        data.filter((x: Template) => x.status === "APPROVED")
      );
    } catch {}
  }, []);

  /* ===========================
     EFFECTS
  =========================== */
  useEffect(() => {
    fetchConversations();
    fetchTemplates();
  }, [fetchConversations, fetchTemplates]);

  useEffect(() => {
    if (!selectedConv) return;

    fetchMessages(selectedConv.contact.id);

    const controller = new AbortController();

    const interval = setInterval(() => {
      fetchMessages(selectedConv.contact.id);
      fetchConversations();
    }, 15000);

    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [selectedConv, fetchMessages, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /* ===========================
     SEND MESSAGE
  =========================== */
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || isSending) return;

    const text = newMessage.trim();

    setNewMessage("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactId: selectedConv.contact.id,
          content: text,
          type: "text",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "فشل الإرسال");
      }

      fetchMessages(selectedConv.contact.id);
      fetchConversations();
    } catch {
      toast.error("خطأ في الإرسال");
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  /* ===========================
     SAVE NOTE
  =========================== */
  const saveNote = async () => {
    if (!selectedConv) return;

    try {
      await fetch("/api/contact-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactId: selectedConv.contact.id,
          note: contactNote,
        }),
      });

      toast.success("تم حفظ الملاحظة");
    } catch {
      toast.error("فشل حفظ الملاحظة");
    }
  };

  /* ===========================
     AUTO HEIGHT
  =========================== */
  const handleTextArea = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setNewMessage(e.target.value);

    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  /* ===========================
     FILTERS
  =========================== */
  const filteredConversations = conversations.filter((conv) => {
    const q = searchQuery.toLowerCase();

    return (
      conv.contact.name?.toLowerCase().includes(q) ||
      conv.contact.phone.includes(q)
    );
  });

  const filteredTemplates = templates.filter((t) => {
    const q = templateSearch.toLowerCase();

    return (
      t.name.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q)
    );
  });

  /* ===========================
     RENDER
  =========================== */
  return (
    <div className="flex h-screen bg-gray-100" dir="rtl">

      {/* SIDEBAR */}
      <aside className="w-[380px] bg-white border-l flex flex-col">

        <div className="bg-[#075E54] text-white p-4 font-bold text-lg">
          المحادثات
        </div>

        <div className="p-3 border-b">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث..."
            className="w-full bg-gray-100 rounded-full px-4 py-2 text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <p className="p-5 text-center text-gray-400">
              جاري التحميل...
            </p>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.contact.id}
                onClick={() => setSelectedConv(conv)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b hover:bg-gray-50"
              >
                <Avatar
                  name={conv.contact.name}
                  phone={conv.contact.phone}
                />

                <div className="flex-1 text-right">
                  <p className="font-semibold text-sm">
                    {conv.contact.name || conv.contact.phone}
                  </p>

                  <p className="text-xs text-gray-500 truncate">
                    {conv.lastMessage?.content || "—"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* CHAT */}
      <main className="flex-1 flex flex-col">

        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            اختر محادثة
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="bg-[#075E54] text-white p-4 font-bold flex justify-between">
              <span>
                {selectedConv.contact.name ||
                  selectedConv.contact.phone}
              </span>

              <button
                onClick={() =>
                  setShowContactInfo(!showContactInfo)
                }
              >
                <Info className="w-5 h-5" />
              </button>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#ECE5DD] space-y-2">
              {loadingMsgs ? (
                <p className="text-center text-gray-500">
                  جاري التحميل...
                </p>
              ) : (
                messages.map((msg) => {
                  const isOut =
                    msg.direction === "outbound";

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isOut
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow ${
                          isOut
                            ? "bg-[#DCF8C6]"
                            : "bg-white"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}
            <div className="bg-white border-t p-3 flex gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={newMessage}
                onChange={handleTextArea}
                placeholder="اكتب رسالة..."
                className="flex-1 resize-none max-h-28 rounded-2xl border px-4 py-2 text-sm"
              />

              <button
                onClick={sendMessage}
                disabled={isSending}
                className="w-12 h-12 rounded-full bg-[#075E54] text-white flex items-center justify-center"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </>
        )}
      </main>

      {/* CONTACT INFO */}
      {showContactInfo && selectedConv && (
        <aside className="w-[320px] bg-white border-r p-4 flex flex-col gap-4">

          <h2 className="font-bold text-lg">
            معلومات العميل
          </h2>

          <Avatar
            name={selectedConv.contact.name}
            phone={selectedConv.contact.phone}
            size="lg"
          />

          <p className="font-semibold">
            {selectedConv.contact.name ||
              "بدون اسم"}
          </p>

          <p className="text-sm text-gray-500">
            {selectedConv.contact.phone}
          </p>

          <textarea
            rows={5}
            value={contactNote}
            onChange={(e) =>
              setContactNote(e.target.value)
            }
            placeholder="ملاحظات..."
            className="border rounded-xl p-3 text-sm"
          />

          <button
            onClick={saveNote}
            className="bg-[#075E54] text-white py-2 rounded-xl"
          >
            حفظ الملاحظة
          </button>
        </aside>
      )}
    </div>
  );
}