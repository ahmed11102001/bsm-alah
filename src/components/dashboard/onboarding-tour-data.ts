import type { ComponentType } from "react";
import {
  Home, Users, Send, FileText, MessageSquare,
  BarChart3, Bot, ShoppingBag, Code,
} from "lucide-react";

export interface TourStep {
  sidebarId: string;
  icon: ComponentType<{ className?: string }>;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    sidebarId: "home",
    icon: Home,
    titleAr: "الصفحة الرئيسية",
    titleEn: "Home Dashboard",
    descAr: "لوحة التحكم الرئيسية - هنا تشوف نظرة عامة على حسابك، إحصائيات الرسائل، وآخر الحملات.",
    descEn: "Main dashboard - overview of your account, message stats, and recent campaigns.",
  },
  {
    sidebarId: "team",
    icon: Users,
    titleAr: "الفريق",
    titleEn: "Team",
    descAr: "إدارة فريقك - أضف أعضاء فريق وحدد صلاحيات كل واحد.",
    descEn: "Manage your team - add members and set permissions for each one.",
  },
  {
    sidebarId: "contacts",
    icon: Users,
    titleAr: "الجمهور",
    titleEn: "Audience",
    descAr: "الجمهور - أضف وأدر كل جمهورك وقوائمك.",
    descEn: "Audience - add and manage all your audience lists.",
  },
  {
    sidebarId: "campaigns",
    icon: Send,
    titleAr: "الحملات",
    titleEn: "Campaigns",
    descAr: "الحملات - أنشئ حملات رسائل واتساب وتابع نتائجها لحظة بلحظة.",
    descEn: "Campaigns - create WhatsApp message campaigns and track results in real-time.",
  },
  {
    sidebarId: "templates",
    icon: FileText,
    titleAr: "القوالب",
    titleEn: "Templates",
    descAr: "القوالب - جهّز قوالب رسائل جاهزة ومعتمدة من Meta عشان تستخدمها في حملاتك.",
    descEn: "Templates - prepare pre-approved Meta message templates for your campaigns.",
  },
  {
    sidebarId: "chat",
    icon: MessageSquare,
    titleAr: "المحادثات",
    titleEn: "Conversations",
    descAr: "المحادثات - تواصل مباشرة مع عملائك في الوقت الفعلي.",
    descEn: "Conversations - chat directly with your customers in real-time.",
  },
  {
    sidebarId: "reports",
    icon: BarChart3,
    titleAr: "التقارير",
    titleEn: "Reports",
    descAr: "التقارير - تقارير تفصيلية عن أداء حملاتك ورسائلك ومعدلات التوصيل.",
    descEn: "Reports - detailed reports on your campaigns, messages, and delivery rates.",
  },
  {
    sidebarId: "automation",
    icon: Bot,
    titleAr: "الأتمتة الذكية",
    titleEn: "Smart Automation",
    descAr: "الأتمتة الذكية - اعمل ردود تلقائية وسيناريوهات ذكية تشتغل لوحدها.",
    descEn: "Smart Automation - set up auto-replies and smart scenarios that run automatically.",
  },
  {
    sidebarId: "store",
    icon: ShoppingBag,
    titleAr: "المتجر",
    titleEn: "Store",
    descAr: "المتجر - ربط متجرك الإلكتروني بواتساب واستقبل الطلبات تلقائيًا.",
    descEn: "Store - connect your online store to WhatsApp and receive orders automatically.",
  },
  {
    sidebarId: "api",
    icon: Code,
    titleAr: "API",
    titleEn: "API",
    descAr: "API - للمطورين: وصّل واتساب بأنظمتك الخاصة وتحكم برمجيًا.",
    descEn: "API - for developers: connect WhatsApp to your custom systems programmatically.",
  },
];

export const TOUR_TEXT = {
  ar: {
    next: "التالي",
    prev: "السابق",
    skip: "تخطي الجولة",
    finish: "إنهاء الجولة 🎉",
    stepOf: (c: number, t: number) => `${c} من ${t}`,
    tourTitle: "جولة تعريفية",
  },
  en: {
    next: "Next",
    prev: "Previous",
    skip: "Skip Tour",
    finish: "Finish Tour 🎉",
    stepOf: (c: number, t: number) => `${c} of ${t}`,
    tourTitle: "Guided Tour",
  },
} as const;
