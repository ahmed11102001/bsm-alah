// الأنواع المشتركة لصفحة الشات — نُقلت من chat/page.tsx

export interface Audience { id: string; name: string }
export interface Template { id: string; name: string; content: string; status: string }
export interface Contact { id: string; name: string | null; phone: string }
export interface LastMsg {
  id: string; content: string | null; type: string;
  direction: string; status: string; createdAt: string;
}
export interface Conversation {
  contact: Contact;
  lastMessage: LastMsg | null;
  unreadCount: number;
  lastMessageAt: string | null;
  isArchived: boolean;
  voiceAgentEnabled?: boolean;
  textAiEnabled?: boolean;
  aiStatus?: string;
  handoffReason?: string | null;
  handoffAt?: string | null;
}
export interface Message {
  id: string; content: string | null; type: string;
  direction: string; status: string; mediaUrl: string | null; createdAt: string;
  reactions?: { emoji: string; senderId: string }[];
  replyToMessageId?: string | null;
  replyTo?: { id: string; content: string | null; type: string; mediaUrl: string | null; direction: string } | null;
}
export type FilterType = "all" | "replied" | "today" | "unread" | "archived" | "ai_replied" | "automation";
