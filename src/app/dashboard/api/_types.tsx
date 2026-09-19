import React from "react";
import { Filter, MessageSquare, Bot, Code2, Webhook } from "lucide-react";

export type CardId = "whatsapp" | "webhook" | "claude" | "elevenlabs";
export type CategoryId = "all" | "messaging" | "ai" | "developer";

export interface CategoryDef {
  id: CategoryId;
  labelAr: string;
  labelEn: string;
  icon: React.ReactNode;
  cardIds: CardId[];
}

export const CATEGORIES: CategoryDef[] = [
  { id: "all", labelAr: "الكل", labelEn: "All", icon: <Filter className="w-3.5 h-3.5" />, cardIds: ["whatsapp", "claude", "elevenlabs", "webhook"] },
  { id: "messaging", labelAr: "المراسلة", labelEn: "Messaging", icon: <MessageSquare className="w-3.5 h-3.5" />, cardIds: ["whatsapp"] },
  { id: "ai", labelAr: "الذكاء الاصطناعي", labelEn: "AI & Voice", icon: <Bot className="w-3.5 h-3.5" />, cardIds: ["claude", "elevenlabs"] },
  { id: "developer", labelAr: "المطورين", labelEn: "Developers", icon: <Code2 className="w-3.5 h-3.5" />, cardIds: ["webhook"] },
];

export interface CardVisual {
  id: CardId;
  icon: React.ReactNode;
}

export const CARD_VISUALS: CardVisual[] = [
  { id: "whatsapp", icon: <img src="/partners/meta.svg" alt="Meta" className="w-5 h-5 object-contain" /> },
  { id: "webhook", icon: <Webhook className="w-5 h-5 text-gray-700 dark:text-gray-300" /> },
  { id: "claude", icon: <img src="/partners/claude.svg.svg" alt="Claude" className="w-5 h-5 object-contain" /> },
  { id: "elevenlabs", icon: <img src="/partners/elevenlabs.svg" alt="ElevenLabs" className="w-6 h-6 object-contain" /> },
];

export interface StepItem {
  title: string;
  desc: string;
}

export interface ExternalLinkItem {
  href: string;
  label: string;
}

export interface CardDef {
  id: CardId;
  title: string;
  subtitle: string;
  steps: StepItem[];
  externalLink?: ExternalLinkItem;
  /** محتوى إضافي اختياري داخل الدليل (مثال: صندوق نسخ الصلاحيات) */
  guideExtra?: React.ReactNode;
}
