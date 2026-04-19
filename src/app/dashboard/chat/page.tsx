"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Send, Paperclip, Smile, Phone,
  MoreVertical, Check, CheckCheck, FileText, Mic, X,
  Clock, RefreshCw, Info, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

/* ===========================
   TYPES
=========================== */
interface Contact {
  id: string;
  name?: string | null;
  phone: string;
}

interface Message {
  id: string;
  content: string | null;
  type: string; // text, image, etc.
  direction: string; // inbound, outbound
  status: string;
  mediaUrl?: string | null;
  createdAt: string;
}

interface Conversation {
  contact: Contact;
  lastMessage: Message | null;
  unreadCount: number;
}

/* ===========================
   COMPONENTS
=========================== */
function MsgStatus({ status }: { status: string }) {
  if (status === "pending") return <Clock className="w-3 h-3 text-gray-400" />;
  if (status === "sent") return <Check className="w-3 h-3 text-gray-400" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3 text-gray-400" />;
  if (status === "read") return <CheckCheck className="w-3 h-3 text-blue-400" />;
  return null;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // جلب المحادثات
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch { toast.error("خطأ في جلب المحادثات"); }
    finally { setLoadingConvs(false); }
  }, []);

  // جلب الرسائل وتصفير العداد
  const fetchMessages = useCallback(async (contactId: string) => {
    try {
      const res = await fetch(`/api/chat?contactId=${contactId}`);
      const data = await res.json();
      setMessages(data.messages || []);
      
      // تحديث العداد محلياً فوراً
      setConversations(prev => prev.map(c => 
        c.contact.id === contactId ? { ...c, unreadCount: 0 } : c
      ));
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedConv) return;
    fetchMessages(selectedConv.contact.id);
    const interval = setInterval(() => fetchMessages(selectedConv.contact.id), 10000);
    return () => clearInterval(interval);
  }, [selectedConv, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || isSending) return;
    const text = newMessage;
    setNewMessage("");
    setIsSending(true);

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedConv.contact.id,
          content: text,
          type: "text"
        }),
      });
      fetchMessages(selectedConv.contact.id);
    } catch { toast.error("فشل الإرسال"); }
    finally { setIsSending(true); }
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] font-sans" dir="rtl">
      
      {/* SIDEBAR */}
      <aside className="w-[400px] bg-white border-l flex flex-col">
        <header className="bg-[#f0f2f5] p-3 flex justify-between items-center border-b">
          <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden">
            <img src="https://ui-avatars.com/api/?name=User&background=075E54&color=fff" alt="Profile" />
          </div>
          <div className="flex gap-4 text-gray-600">
            <MessageSquare className="w-5 h-5 cursor-pointer" />
            <MoreVertical className="w-5 h-5 cursor-pointer" />
          </div>
        </header>

        <div className="p-2 bg-white">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              placeholder="بحث أو بدء دردشة جديدة" 
              className="w-full bg-[#f0f2f5] py-1.5 pr-10 pl-4 rounded-lg text-sm outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {conversations.map((conv) => (
            <div 
              key={conv.contact.id}
              onClick={() => setSelectedConv(conv)}
              className={`flex items-center p-3 cursor-pointer border-b hover:bg-[#f5f6f6] ${selectedConv?.contact.id === conv.contact.id ? 'bg-[#ebebeb]' : ''}`}
            >
              <div className="w-12 h-12 bg-gray-400 rounded-full flex-shrink-0 text-white flex items-center justify-center font-bold text-lg">
                {conv.contact.name?.[0] || conv.contact.phone[0]}
              </div>
              <div className="mr-3 flex-1 border-b pb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-[#111b21]">{conv.contact.name || conv.contact.phone}</span>
                  <span className="text-xs text-gray-500">
                    {conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500 truncate w-48">
                    {conv.lastMessage?.type === 'image' ? '📷 صورة' : conv.lastMessage?.content}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="bg-[#25d366] text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* CHAT WINDOW */}
      <main className="flex-1 flex flex-col relative bg-[#efeae2]">
        {/* Chat Wallpaper Pattern - يمكنك استبداله بصورة واتساب الأصلية */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{backgroundImage: 'url("https://w0.peakpx.com/wallpaper/580/650/wallpaper-whatsapp-background.jpg")'}} />

        {selectedConv ? (
          <>
            <header className="bg-[#f0f2f5] p-3 flex items-center justify-between z-10 border-b">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-300 rounded-full mr-3" />
                <span className="mr-3 font-medium">{selectedConv.contact.name || selectedConv.contact.phone}</span>
              </div>
              <div className="flex gap-5 text-gray-600">
                <Search className="w-5 h-5" />
                <MoreVertical className="w-5 h-5" />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-2 z-10 custom-scrollbar">
              {messages.map((msg) => {
                const isMe = msg.direction === "outbound";
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                    <div className={`relative max-w-[65%] p-2 rounded-lg shadow-sm text-sm ${isMe ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                      
                      {/* عرض الصور لو وجدت */}
                      {msg.type === 'image' && msg.mediaUrl && (
                        <div className="mb-1">
                          <img src={msg.mediaUrl} alt="sent image" className="rounded-md max-w-full h-auto cursor-pointer hover:opacity-90" />
                        </div>
                      )}

                      <p className="leading-relaxed whitespace-pre-wrap mb-1">{msg.content}</p>
                      
                      <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500">
                        {new Date(msg.createdAt).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}
                        {isMe && <MsgStatus status={msg.status} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <footer className="bg-[#f0f2f5] p-3 flex items-center gap-3 z-10">
              <Smile className="w-6 h-6 text-gray-600 cursor-pointer" />
              <label className="cursor-pointer">
                <Paperclip className="w-6 h-6 text-gray-600" />
                {/* هنا ممكن تضيف input لإرسال الصور لاحقاً */}
              </label>
              <textarea 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="اكتب رسالة"
                className="flex-1 bg-white rounded-lg px-4 py-2 text-sm outline-none resize-none"
                rows={1}
              />
              <button onClick={sendMessage} className="text-gray-600">
                <Send className="w-6 h-6" />
              </button>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="w-64 h-64 bg-gray-200 rounded-full mb-4 flex items-center justify-center">
              <MessageSquare className="w-32 h-32 text-gray-300" />
            </div>
            <h1 className="text-2xl font-light">WhatsProf للأعمال</h1>
            <p className="text-sm mt-2">أرسل واستقبل الرسائل دون إبقاء هاتفك متصلاً بالإنترنت.</p>
          </div>
        )}
      </main>
    </div>
  );
}