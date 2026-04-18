"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Send, Paperclip, Smile, Phone, Video,
  MoreVertical, ChevronDown, Check, CheckCheck,
  Image, FileText, Mic, X, Star, Archive, Trash2,
  Tag, User, Clock, MessageSquare, Filter, RefreshCw,
  ArrowLeft, Info, Bell, BellOff, Ban, ChevronRight,
  Layout, Plus, Download, Forward, Reply, Copy, Zap
} from "lucide-react";
import { toast } from "sonner";

// ===== TYPES =====
interface Contact {
  id: string;
  name?: string;
  phone: string;
  isOnline?: boolean;
  lastSeen?: string;
  tags?: string[];
  notes?: string;
  audienceId?: string;
}

interface Message {
  id: string;
  content: string;
  type: "text" | "image" | "document" | "template" | "audio";
  direction: "inbound" | "outbound";
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  createdAt: string;
  contactId: string;
  templateName?: string;
  mediaUrl?: string;
  replyTo?: string;
}

interface Conversation {
  contact: Contact;
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
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

// ===== MOCK DATA للتجربة =====
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    contact: { id: "1", name: "أحمد محمد", phone: "201012345678", isOnline: true, tags: ["عميل مهم", "VIP"] },
    lastMessage: { id: "m1", content: "شكراً جداً على المساعدة!", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 5 * 60000).toISOString(), contactId: "1" },
    unreadCount: 2, isPinned: true
  },
  {
    contact: { id: "2", name: "سارة علي", phone: "201098765432", isOnline: false, lastSeen: "منذ ساعة", tags: ["عميل جديد"] },
    lastMessage: { id: "m2", content: "متى يصل الطلب؟", type: "text", direction: "inbound", status: "delivered", createdAt: new Date(Date.now() - 30 * 60000).toISOString(), contactId: "2" },
    unreadCount: 1
  },
  {
    contact: { id: "3", name: "محمود أحمد", phone: "201155555555", isOnline: true, tags: [] },
    lastMessage: { id: "m3", content: "تم الدفع بنجاح ✅", type: "text", direction: "outbound", status: "read", createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), contactId: "3" },
    unreadCount: 0
  },
  {
    contact: { id: "4", name: "فاطمة حسن", phone: "201233333333", isOnline: false, lastSeen: "أمس", tags: ["متابعة"] },
    lastMessage: { id: "m4", content: "أريد الاستفسار عن المنتج", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 24 * 3600000).toISOString(), contactId: "4" },
    unreadCount: 0
  },
  {
    contact: { id: "5", name: "خالد إبراهيم", phone: "201277777777", isOnline: false, lastSeen: "منذ يومين", tags: [] },
    lastMessage: { id: "m5", content: "هل يوجد خصم؟", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 48 * 3600000).toISOString(), contactId: "5" },
    unreadCount: 0
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  "1": [
    { id: "1", content: "السلام عليكم! كيف حالك؟", type: "text", direction: "outbound", status: "read", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), contactId: "1" },
    { id: "2", content: "وعليكم السلام! أنا بخير شكراً. عندي سؤال عن المنتج", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 3600000 * 1.9).toISOString(), contactId: "1" },
    { id: "3", content: "أكيد، تفضل اسأل! سنكون سعيدين بمساعدتك 😊", type: "text", direction: "outbound", status: "read", createdAt: new Date(Date.now() - 3600000 * 1.8).toISOString(), contactId: "1" },
    { id: "4", content: "ما هي مواصفات المنتج الجديد وما هو السعر؟", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(), contactId: "1" },
    { id: "5", content: "المنتج الجديد يأتي بمواصفات ممتازة:\n• الحجم: كبير\n• اللون: متعدد\n• الضمان: سنة كاملة\n\nالسعر: 299 جنيه فقط مع التوصيل المجاني! 🎁", type: "text", direction: "outbound", status: "read", createdAt: new Date(Date.now() - 3600000).toISOString(), contactId: "1" },
    { id: "6", content: "ممتاز! هل يمكن الدفع بالتقسيط؟", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 30 * 60000).toISOString(), contactId: "1" },
    { id: "7", content: "نعم بالطبع! لدينا خيار التقسيط على 6 أو 12 شهر بدون فوائد 💳", type: "text", direction: "outbound", status: "read", createdAt: new Date(Date.now() - 20 * 60000).toISOString(), contactId: "1" },
    { id: "8", content: "شكراً جداً على المساعدة!", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 5 * 60000).toISOString(), contactId: "1" },
  ],
  "2": [
    { id: "1", content: "مرحباً، أريد الاستفسار عن طلبي", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 3600000).toISOString(), contactId: "2" },
    { id: "2", content: "أهلاً بك! رقم طلبك من فضلك؟", type: "text", direction: "outbound", status: "read", createdAt: new Date(Date.now() - 50 * 60000).toISOString(), contactId: "2" },
    { id: "3", content: "رقم الطلب: #12345", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 40 * 60000).toISOString(), contactId: "2" },
    { id: "4", content: "متى يصل الطلب؟", type: "text", direction: "inbound", status: "delivered", createdAt: new Date(Date.now() - 30 * 60000).toISOString(), contactId: "2" },
  ],
};

const MOCK_TEMPLATES: Template[] = [
  { id: "1", name: "ترحيب", content: "مرحباً {{1}}! أهلاً بك في خدمتنا. كيف يمكننا مساعدتك اليوم؟ 😊", status: "APPROVED", language: "ar", category: "MARKETING" },
  { id: "2", name: "تأكيد_طلب", content: "شكراً {{1}}! تم استلام طلبك رقم #{{2}} بنجاح. سيتم التوصيل خلال {{3}} أيام عمل.", status: "APPROVED", language: "ar", category: "UTILITY" },
  { id: "3", name: "عرض_خاص", content: "🎁 عرض حصري لك {{1}}! خصم {{2}}% على جميع المنتجات. استخدم الكود: {{3}}", status: "APPROVED", language: "ar", category: "MARKETING" },
  { id: "4", name: "متابعة", content: "مرحباً {{1}}! نتمنى أن تكون بخير. هل يمكننا مساعدتك في شيء؟", status: "APPROVED", language: "ar", category: "UTILITY" },
];

// ===== HELPER FUNCTIONS =====
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "أمس";
  if (days < 7) return `${days} أيام`;
  return date.toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit" });
};

const formatDateSeparator = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  return date.toLocaleDateString("ar-EG", { weekday: "long", day: "2-digit", month: "long" });
};

const MessageStatus = ({ status }: { status: string }) => {
  if (status === "pending") return <Clock className="w-3 h-3 text-gray-400" />;
  if (status === "sent") return <Check className="w-3 h-3 text-gray-400" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3 text-gray-400" />;
  if (status === "read") return <CheckCheck className="w-3 h-3 text-blue-400" />;
  if (status === "failed") return <X className="w-3 h-3 text-red-400" />;
  return null;
};

// ===== MAIN COMPONENT =====
export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(MOCK_CONVERSATIONS[0]);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES["1"] || []);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "pinned">("all");
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when conversation changes
  const selectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    setMessages(MOCK_MESSAGES[conv.contact.id] || []);
    setMobileShowChat(true);
    setShowContactInfo(false);
    setReplyTo(null);
    setSelectedMessage(null);
    // Mark as read
    setConversations(prev =>
      prev.map(c => c.contact.id === conv.contact.id ? { ...c, unreadCount: 0 } : c)
    );
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || isSending) return;

    setIsSending(true);
    const msg: Message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      type: "text",
      direction: "outbound",
      status: "pending",
      createdAt: new Date().toISOString(),
      contactId: selectedConv.contact.id,
      replyTo: replyTo?.id,
    };

    setMessages(prev => [...prev, msg]);
    setNewMessage("");
    setReplyTo(null);
    inputRef.current?.focus();

    // Simulate API call
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "sent" } : m));
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "delivered" } : m));
      }, 1000);
    }, 500);

    setIsSending(false);
  };

  // Send template
  const sendTemplate = async (template: Template) => {
    if (!selectedConv) return;

    const msg: Message = {
      id: Date.now().toString(),
      content: template.content,
      type: "template",
      direction: "outbound",
      status: "pending",
      createdAt: new Date().toISOString(),
      contactId: selectedConv.contact.id,
      templateName: template.name,
    };

    setMessages(prev => [...prev, msg]);
    setShowTemplates(false);
    toast.success(`تم إرسال قالب: ${template.name}`);

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "sent" } : m));
    }, 500);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConversations = conversations
    .filter(c => {
      const q = searchQuery.toLowerCase();
      if (q && !c.contact.name?.toLowerCase().includes(q) && !c.contact.phone.includes(q)) return false;
      if (filter === "unread") return c.unreadCount > 0;
      if (filter === "pinned") return c.isPinned;
      return true;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

  const filteredTemplates = MOCK_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.content.toLowerCase().includes(templateSearch.toLowerCase())
  );

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { date: string; messages: Message[] }[], msg) => {
    const date = formatDateSeparator(msg.createdAt);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === date) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({ date, messages: [msg] });
    }
    return groups;
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden" dir="rtl">

      {/* ====== SIDEBAR - قائمة المحادثات ====== */}
      <div className={`
        ${mobileShowChat ? "hidden" : "flex"} md:flex
        flex-col w-full md:w-[360px] lg:w-[400px] flex-shrink-0
        bg-white border-l border-gray-200 shadow-sm
      `}>

        {/* Header */}
        <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base">المحادثات</h1>
              {totalUnread > 0 && (
                <span className="text-xs text-green-200">{totalUnread} رسالة غير مقروءة</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors" title="تحديث">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors" title="محادثة جديدة">
              <Plus className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-white border-b border-gray-100">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="بحث أو ابدأ محادثة جديدة"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 rounded-full py-2 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#075E54]/30"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-100 bg-white">
          {[
            { key: "all", label: "الكل" },
            { key: "unread", label: "غير مقروءة" },
            { key: "pinned", label: "مثبتة" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative
                ${filter === tab.key ? "text-[#075E54]" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab.label}
              {filter === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#075E54] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد محادثات</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.contact.id}
                onClick={() => selectConversation(conv)}
                className={`
                  flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                  hover:bg-gray-50 border-b border-gray-50
                  ${selectedConv?.contact.id === conv.contact.id ? "bg-gray-100" : ""}
                `}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#075E54] to-[#25D366] flex items-center justify-center text-white font-bold text-lg">
                    {conv.contact.name?.[0] || conv.contact.phone[0]}
                  </div>
                  {conv.contact.isOnline && (
                    <span className="absolute bottom-0 left-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-900 text-sm truncate">
                        {conv.contact.name || conv.contact.phone}
                      </span>
                      {conv.isPinned && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                      {conv.isMuted && <BellOff className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex items-center gap-1 min-w-0">
                      {conv.lastMessage?.direction === "outbound" && (
                        <MessageStatus status={conv.lastMessage.status} />
                      )}
                      <p className="text-xs text-gray-500 truncate">
                        {conv.lastMessage?.type === "image" ? "📷 صورة" :
                         conv.lastMessage?.type === "document" ? "📄 مستند" :
                         conv.lastMessage?.content || ""}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="bg-[#25D366] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {conv.contact.tags && conv.contact.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {conv.contact.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ====== MAIN CHAT AREA ====== */}
      <div className={`
        ${!mobileShowChat ? "hidden" : "flex"} md:flex
        flex-col flex-1 min-w-0
      `}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3 shadow-md">
              {/* Mobile back button */}
              <button
                onClick={() => setMobileShowChat(false)}
                className="md:hidden p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Avatar */}
              <div
                className="relative cursor-pointer"
                onClick={() => setShowContactInfo(!showContactInfo)}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                  {selectedConv.contact.name?.[0] || selectedConv.contact.phone[0]}
                </div>
                {selectedConv.contact.isOnline && (
                  <span className="absolute bottom-0 left-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#075E54]" />
                )}
              </div>

              {/* Contact Info */}
              <div
                className="flex-1 cursor-pointer min-w-0"
                onClick={() => setShowContactInfo(!showContactInfo)}
              >
                <h2 className="font-bold text-base truncate">
                  {selectedConv.contact.name || selectedConv.contact.phone}
                </h2>
                <p className="text-xs text-green-200">
                  {selectedConv.contact.isOnline ? "متصل الآن" :
                   selectedConv.contact.lastSeen ? `آخر ظهور ${selectedConv.contact.lastSeen}` : selectedConv.contact.phone}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors" title="مكالمة صوتية">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors" title="مكالمة فيديو">
                  <Video className="w-5 h-5" />
                </button>
                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={() => setShowContactInfo(!showContactInfo)}
                  title="معلومات"
                >
                  <Info className="w-5 h-5" />
                </button>
                <div className="relative group">
                  <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {/* Dropdown */}
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 hidden group-hover:block">
                    {[
                      { icon: <Star className="w-4 h-4" />, label: "تثبيت المحادثة" },
                      { icon: <Archive className="w-4 h-4" />, label: "أرشفة" },
                      { icon: <BellOff className="w-4 h-4" />, label: "كتم الإشعارات" },
                      { icon: <Ban className="w-4 h-4" />, label: "حظر" },
                      { icon: <Trash2 className="w-4 h-4 text-red-500" />, label: <span className="text-red-500">حذف المحادثة</span> },
                    ].map((item, i) => (
                      <button key={i} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-700 text-sm transition-colors">
                        <span className="text-gray-500">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2325D366' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: "#ECE5DD"
              }}
              onClick={() => setSelectedMessage(null)}
            >
              {groupedMessages.map(group => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div className="flex items-center justify-center my-4">
                    <span className="bg-white text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm font-medium">
                      {group.date}
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="space-y-1">
                    {group.messages.map((msg, idx) => {
                      const isOutbound = msg.direction === "outbound";
                      const showAvatar = !isOutbound && (idx === 0 || group.messages[idx - 1]?.direction !== "inbound");
                      const isSelected = selectedMessage === msg.id;

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOutbound ? "justify-start" : "justify-end"} group`}
                        >
                          <div
                            className={`relative max-w-[75%] ${isSelected ? "opacity-75" : ""}`}
                            onDoubleClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                            onClick={(e) => { e.stopPropagation(); setSelectedMessage(isSelected ? null : msg.id); }}
                          >
                            {/* Reply to */}
                            {msg.replyTo && (
                              <div className={`mb-0.5 px-3 py-2 rounded-t-xl text-xs border-r-4 border-[#075E54]
                                ${isOutbound ? "bg-[#dcf8c6]/70" : "bg-white/70"}`}>
                                <p className="text-[#075E54] font-bold mb-0.5">ردًا على</p>
                                <p className="text-gray-600 truncate">رسالة سابقة...</p>
                              </div>
                            )}

                            {/* Message Bubble */}
                            <div className={`
                              relative px-3 py-2 rounded-2xl shadow-sm
                              ${isOutbound
                                ? "bg-[#DCF8C6] rounded-tl-sm"
                                : "bg-white rounded-tr-sm"
                              }
                            `}>
                              {/* Template badge */}
                              {msg.type === "template" && (
                                <div className="flex items-center gap-1 mb-1.5">
                                  <Zap className="w-3 h-3 text-[#075E54]" />
                                  <span className="text-[10px] text-[#075E54] font-bold uppercase tracking-wide">
                                    قالب: {msg.templateName}
                                  </span>
                                </div>
                              )}

                              {/* Content */}
                              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {msg.content}
                              </p>

                              {/* Time + Status */}
                              <div className={`flex items-center gap-1 mt-1 ${isOutbound ? "justify-start" : "justify-end"}`}>
                                <span className="text-[10px] text-gray-400">
                                  {formatTime(msg.createdAt)}
                                </span>
                                {isOutbound && <MessageStatus status={msg.status} />}
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className={`
                              absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity
                              ${isOutbound ? "-left-20" : "-right-20"}
                              flex items-center gap-1
                            `}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setReplyTo(msg); inputRef.current?.focus(); }}
                                className="p-1.5 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"
                                title="رد"
                              >
                                <Reply className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.content); toast.success("تم النسخ"); }}
                                className="p-1.5 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"
                                title="نسخ"
                              >
                                <Copy className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                              <button
                                className="p-1.5 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"
                                title="تحويل"
                              >
                                <Forward className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Preview */}
            {replyTo && (
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center gap-3">
                <div className="flex-1 border-r-4 border-[#075E54] pr-3">
                  <p className="text-xs text-[#075E54] font-bold mb-0.5">ردًا على</p>
                  <p className="text-xs text-gray-600 truncate">{replyTo.content}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Template Picker */}
            {showTemplates && (
              <div className="bg-white border-t border-gray-200 max-h-64 overflow-y-auto">
                <div className="px-4 py-2 border-b border-gray-100 sticky top-0 bg-white">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="ابحث في القوالب..."
                        value={templateSearch}
                        onChange={e => setTemplateSearch(e.target.value)}
                        className="w-full bg-gray-50 rounded-full py-1.5 pr-9 pl-4 text-sm focus:outline-none"
                      />
                    </div>
                    <button onClick={() => setShowTemplates(false)}>
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                {filteredTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => sendTemplate(template)}
                    className="w-full text-right px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-3.5 h-3.5 text-[#075E54]" />
                      <span className="text-xs font-bold text-[#075E54]">{template.name}</span>
                      <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{template.category}</span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{template.content}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="bg-gray-100 px-3 py-3 border-t border-gray-200">
              <div className="flex items-end gap-2">
                {/* Attachment + Emoji */}
                <div className="flex items-center gap-1 mb-1">
                  <button
                    onClick={() => { setShowTemplates(!showTemplates); setShowEmojiPicker(false); }}
                    className={`p-2 rounded-full transition-colors ${showTemplates ? "text-[#075E54] bg-green-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"}`}
                    title="القوالب"
                  >
                    <Layout className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                    title="إرفاق ملف"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>

                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.doc,.docx" />

                {/* Text Input */}
                <div className="flex-1 bg-white rounded-3xl px-4 py-2.5 flex items-end gap-2 shadow-sm border border-gray-100">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="اكتب رسالة..."
                    rows={1}
                    className="flex-1 resize-none focus:outline-none text-sm text-gray-800 placeholder-gray-400 max-h-32 leading-relaxed bg-transparent"
                    style={{ scrollbarWidth: "none" }}
                  />
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-gray-400 hover:text-gray-600 transition-colors mb-0.5"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>

                {/* Send / Voice */}
                {newMessage.trim() ? (
                  <button
                    onClick={sendMessage}
                    disabled={isSending}
                    className="w-11 h-11 bg-[#075E54] hover:bg-[#064944] text-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
                  >
                    <Send className="w-5 h-5" style={{ transform: "scaleX(-1)" }} />
                  </button>
                ) : (
                  <button
                    onMouseDown={() => setIsRecording(true)}
                    onMouseUp={() => setIsRecording(false)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all flex-shrink-0
                      ${isRecording ? "bg-red-500 scale-110" : "bg-[#075E54] hover:bg-[#064944]"} text-white`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#F0F2F5]">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-[#25D366]/10 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-12 h-12 text-[#25D366]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">مرحباً بك في الشات</h2>
              <p className="text-gray-500">اختر محادثة من القائمة لتبدأ</p>
            </div>
          </div>
        )}
      </div>

      {/* ====== CONTACT INFO PANEL ====== */}
      {showContactInfo && selectedConv && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto flex-shrink-0 shadow-lg animate-in slide-in-from-right">
          {/* Panel Header */}
          <div className="bg-[#075E54] text-white px-4 py-4 flex items-center gap-3">
            <button onClick={() => setShowContactInfo(false)}>
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-bold">معلومات العميل</h2>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center py-6 bg-gray-50 border-b border-gray-100">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#075E54] to-[#25D366] flex items-center justify-center text-white text-3xl font-bold mb-3">
              {selectedConv.contact.name?.[0] || selectedConv.contact.phone[0]}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{selectedConv.contact.name || "بدون اسم"}</h3>
            <p className="text-sm text-gray-500 mt-0.5 dir-ltr">{selectedConv.contact.phone}</p>
            {selectedConv.contact.isOnline ? (
              <span className="mt-2 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">متصل الآن</span>
            ) : (
              <span className="mt-2 text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{selectedConv.contact.lastSeen || "غير متصل"}</span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2 p-4 border-b border-gray-100">
            {[
              { icon: <Phone className="w-5 h-5" />, label: "اتصال", color: "text-green-600" },
              { icon: <Star className="w-5 h-5" />, label: "تثبيت", color: "text-yellow-500" },
              { icon: <BellOff className="w-5 h-5" />, label: "كتم", color: "text-gray-500" },
            ].map((a, i) => (
              <button key={i} className="flex flex-col items-center gap-1 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                <span className={a.color}>{a.icon}</span>
                <span className="text-xs text-gray-600">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-[#075E54]" />
              <h4 className="font-semibold text-gray-800 text-sm">التصنيفات</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedConv.contact.tags && selectedConv.contact.tags.length > 0 ? (
                selectedConv.contact.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer hover:text-red-500" />
                  </span>
                ))
              ) : (
                <p className="text-xs text-gray-400">لا توجد تصنيفات</p>
              )}
              <button className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs hover:bg-gray-200 transition-colors">
                <Plus className="w-3 h-3" />
                إضافة
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="p-4 border-b border-gray-100">
            <h4 className="font-semibold text-gray-800 text-sm mb-3">إحصائيات</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "إجمالي الرسائل", value: messages.length },
                { label: "رسائل مُرسلة", value: messages.filter(m => m.direction === "outbound").length },
                { label: "رسائل مُستلمة", value: messages.filter(m => m.direction === "inbound").length },
                { label: "القوالب المُستخدمة", value: messages.filter(m => m.type === "template").length },
              ].map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-[11px] text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-[#075E54]" />
              <h4 className="font-semibold text-gray-800 text-sm">ملاحظات</h4>
            </div>
            <textarea
              value={contactNote}
              onChange={e => setContactNote(e.target.value)}
              placeholder="أضف ملاحظة عن هذا العميل..."
              className="w-full bg-gray-50 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#075E54]/20 resize-none border border-gray-100"
              rows={3}
            />
            {contactNote && (
              <button
                onClick={() => toast.success("تم حفظ الملاحظة")}
                className="mt-2 w-full bg-[#075E54] text-white text-sm py-2 rounded-lg hover:bg-[#064944] transition-colors"
              >
                حفظ الملاحظة
              </button>
            )}
          </div>

          {/* Danger Zone */}
          <div className="p-4 mt-auto">
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 text-gray-600 text-sm transition-colors">
                <Archive className="w-4 h-4" />
                أرشفة المحادثة
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-50 text-red-500 text-sm transition-colors">
                <Ban className="w-4 h-4" />
                حظر هذا العميل
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-50 text-red-500 text-sm transition-colors">
                <Trash2 className="w-4 h-4" />
                حذف المحادثة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
