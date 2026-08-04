// ─────────────────────────────────────────────────────────────────────────
// مركز بيانات الديمو الوهمية كلها. أي صفحة ديمو جديدة تستورد من هنا بدل ما
// تكرر بيانات وهمية جوه الملف نفسه — عشان الشخصية (اسم المتجر، الأرقام،
// العملاء) تفضل متسقة عبر كل الصفحات.
// ─────────────────────────────────────────────────────────────────────────

import type { DashboardData } from "./dashboard-context";

export const DEMO_STORE_NAME = "متجر ليالي للعطور";
export const DEMO_USER_NAME = "أحمد سمير";
export const DEMO_USER_EMAIL = "demo@wani.app";

export const DEMO_DASHBOARD_DATA: DashboardData = {
  user: {
    id: "demo-user-1",
    name: DEMO_USER_NAME,
    email: DEMO_USER_EMAIL,
    phone: "201001234567",
    role: "OWNER",
    hasPassword: true,
    hasTestimonial: true,
    onboardingCompleted: true,
  },
  whatsapp: {
    phoneNumberId: "1029384756",
    wabaId: "5647382910",
  },
  stats: {
    totalSent: 18_420,
    totalDelivered: 17_960,
    totalRead: 15_310,
    totalInbound: 3_284,
    totalCampaigns: 27,
    totalContacts: 4_812,
    deliveryRate: 97.5,
    readRate: 85.2,
    replyRate: 22.4,
  },
  plan: {
    plan: "enterprise",
    planName: "Enterprise",
    status: "active",
    limits: {
      contacts: -1,
      teamMembers: -1,
      campaignsPerMonth: -1,
      aiTokensPerMonth: 1_000_000,
      scheduledCampaigns: true,
      advancedReports: true,
      apiAccess: true,
      mediaMessages: true,
      customAudiences: true,
      storeIntegration: true,
      aiAgent: true,
    },
    usage: {
      contacts: 4_812,
      teamMembers: 3,
      campaignsThisMonth: 6,
    },
  },
  recentCampaigns: [
    {
      id: "demo-camp-1",
      name: "عروض الجمعة البيضاء",
      status: "completed",
      sentCount: 3200,
      deliveredCount: 3120,
      readCount: 2740,
      failedCount: 80,
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      template: { name: "black_friday_offer" },
    },
    {
      id: "demo-camp-2",
      name: "تذكير عربات متروكة",
      status: "running",
      sentCount: 412,
      deliveredCount: 398,
      readCount: 301,
      failedCount: 5,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      template: { name: "cart_abandon_reminder" },
    },
    {
      id: "demo-camp-3",
      name: "إطلاق تشكيلة الشتاء",
      status: "scheduled",
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      failedCount: 0,
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      template: { name: "winter_launch" },
    },
    {
      id: "demo-camp-4",
      name: "متابعة عملاء VIP",
      status: "completed",
      sentCount: 180,
      deliveredCount: 178,
      readCount: 165,
      failedCount: 2,
      createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
      template: { name: "vip_followup" },
    },
  ],
};

export const DEMO_OVERVIEW_DATA = {
  range: "7d",
  campaignBreakdown: { draft: 2, scheduled: 4, running: 12, completed: 8, failed: 1 },
  messagingPerformance: [
    { date: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().slice(0, 10), sent: 1620, delivered: 1550, replies: 240 },
    { date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().slice(0, 10), sent: 1720, delivered: 1670, replies: 285 },
    { date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().slice(0, 10), sent: 1840, delivered: 1782, replies: 312 },
    { date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10), sent: 1930, delivered: 1870, replies: 340 },
    { date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().slice(0, 10), sent: 2010, delivered: 1952, replies: 365 },
    { date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().slice(0, 10), sent: 1890, delivered: 1830, replies: 324 },
    { date: new Date(Date.now()).toISOString().slice(0, 10), sent: 1850, delivered: 1786, replies: 298 },
  ],
  automationPerformance: [
    { id: "rule-welcome", name: "سجل ترحيب", source: "rule" as const, isEnabled: true, triggered: 148, successRate: 92 },
    { id: "rule-abandon-cart", name: "تذكير عربة متروكة", source: "rule" as const, isEnabled: true, triggered: 84, successRate: 79 },
    { id: "wani-ai-agent", name: "Wani AI", source: "ai" as const, isEnabled: true, triggered: 72, successRate: 86 },
  ],
  recentConversations: [
    { id: "demo-c-1", name: "نور أحمد", lastMessage: "متى ستحمل العطر الجديد؟", lastMessageAt: new Date(Date.now() - 45 * 60000).toISOString(), status: "auto", unread: true },
    { id: "demo-c-2", name: "سالي صلاح", lastMessage: "هل السعر يشمل الشحن؟", lastMessageAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), status: "needs_human", unread: false },
    { id: "demo-c-3", name: "خالد المصري", lastMessage: "شكراً على الرد السريع", lastMessageAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), status: "human_active", unread: true },
    { id: "demo-c-4", name: "مريم جمال", lastMessage: "هل يمكنني الدفع عند الاستلام؟", lastMessageAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), status: "auto", unread: false },
    { id: "demo-c-5", name: "أحمد خالد", lastMessage: "أريد أطيب العطور الرجالية", lastMessageAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), status: "needs_human", unread: true },
  ],
};
