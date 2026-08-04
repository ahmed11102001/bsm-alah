// ─────────────────────────────────────────────────────────────────────────
// مركز بيانات الديمو الوهمية كلها. أي صفحة ديمو جديدة تستورد من هنا بدل ما
// تكرر بيانات وهمية جوه الملف نفسه — عشان الشخصية (اسم المتجر، الأرقام،
// العملاء) تفضل متسقة عبر كل الصفحات.
// ─────────────────────────────────────────────────────────────────────────

import type { DashboardData } from "./dashboard-context";
import type { Audience } from "@/app/dashboard/contacts/_components/types";
import type { Campaign, Template, AudienceOption } from "@/app/dashboard/campaigns/_components/types";
import type { Message } from "@/app/dashboard/chat/_components/types";

export const DEMO_STORE_NAME = "متجر ليالي للعطور";
export const DEMO_USER_NAME = "عميل وني";
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
    { id: "demo-c-1", name: "ندي حمدي", lastMessage: "متى ستحمل العطر الجديد؟", lastMessageAt: new Date(Date.now() - 45 * 60000).toISOString(), status: "auto", unread: true },
    { id: "demo-c-2", name: "سالي صلاح", lastMessage: "هل السعر يشمل الشحن؟", lastMessageAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), status: "needs_human", unread: false },
    { id: "demo-c-3", name: "خالد المصري", lastMessage: "شكراً على الرد السريع", lastMessageAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), status: "human_active", unread: true },
    { id: "demo-c-4", name: "مريم جمال", lastMessage: "هل يمكنني الدفع عند الاستلام؟", lastMessageAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), status: "auto", unread: false },
    { id: "demo-c-5", name: "أحمد خالد", lastMessage: "أريد أطيب العطور الرجالية", lastMessageAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), status: "needs_human", unread: true },
  ],
};
export const DEMO_CHAT_CONVERSATIONS = [
  {
    contact: { id: "demo-c-1", name: "نور أحمد", phone: "201234567890" },
    lastMessage: { id: "demo-msg-1", content: "متى ستحمل العطر الجديد؟", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
    unreadCount: 1,
    lastMessageAt: new Date(Date.now() - 45 * 60000).toISOString(),
    isArchived: false,
    voiceAgentEnabled: false,
    textAiEnabled: true,
    aiStatus: "AUTO",
    handoffReason: null,
    handoffAt: null,
  },
  {
    contact: { id: "demo-c-2", name: "سالي صلاح", phone: "201098765432" },
    lastMessage: { id: "demo-msg-2", content: "هل السعر يشمل الشحن؟", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    unreadCount: 0,
    lastMessageAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    isArchived: false,
    voiceAgentEnabled: true,
    textAiEnabled: false,
    aiStatus: "NEEDS_HUMAN",
    handoffReason: "Reply needs human review",
    handoffAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    contact: { id: "demo-c-3", name: "خالد المصري", phone: "201055512345" },
    lastMessage: { id: "demo-msg-3", content: "شكراً على الرد السريع", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
    unreadCount: 2,
    lastMessageAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    isArchived: false,
    voiceAgentEnabled: true,
    textAiEnabled: true,
    aiStatus: "AUTO",
    handoffReason: null,
    handoffAt: null,
  },
  {
    contact: { id: "demo-c-4", name: "مريم جمال", phone: "201066612345" },
    lastMessage: { id: "demo-msg-4", content: "هل يمكنني الدفع عند الاستلام؟", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
    unreadCount: 0,
    lastMessageAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    isArchived: false,
    voiceAgentEnabled: false,
    textAiEnabled: false,
    aiStatus: "MANUAL",
    handoffReason: null,
    handoffAt: null,
  },
  {
    contact: { id: "demo-c-5", name: "أحمد خالد", phone: "201077712345" },
    lastMessage: { id: "demo-msg-5", content: "أريد أطيب العطور الرجالية", type: "text", direction: "inbound", status: "read", createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
    unreadCount: 1,
    lastMessageAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    isArchived: false,
    voiceAgentEnabled: false,
    textAiEnabled: true,
    aiStatus: "AUTO",
    handoffReason: null,
    handoffAt: null,
  },
];

export const DEMO_CHAT_MESSAGES: Record<string, Message[]> = {
  "demo-c-1": [
    { id: "demo-msg-1", content: "متى ستحمل العطر الجديد؟", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
    { id: "demo-msg-1-2", content: "مرحباً نور! سنوفر الدفعة الجديدة خلال الأسبوع القادم.", type: "text", direction: "outbound", status: "delivered", mediaUrl: null, createdAt: new Date(Date.now() - 40 * 60000).toISOString() },
  ],
  "demo-c-2": [
    { id: "demo-msg-2", content: "هل السعر يشمل الشحن؟", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    { id: "demo-msg-2-2", content: "نعم، الشحن داخل القاهرة مجاني.", type: "text", direction: "outbound", status: "delivered", mediaUrl: null, createdAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString() },
    { id: "demo-msg-2-3", content: "هل يمكنني الحصول على عرض خاص؟", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: new Date(Date.now() - 1.4 * 3600 * 1000).toISOString() },
  ],
  "demo-c-3": [
    { id: "demo-msg-3", content: "شكراً على الرد السريع", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
    { id: "demo-msg-3-2", content: "العفو خالد، نحن دائماً هنا للمساعدة.", type: "text", direction: "outbound", status: "delivered", mediaUrl: null, createdAt: new Date(Date.now() - 4.5 * 3600 * 1000).toISOString() },
  ],
  "demo-c-4": [
    { id: "demo-msg-4", content: "هل يمكنني الدفع عند الاستلام؟", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
    { id: "demo-msg-4-2", content: "نعم، الدفع عند الاستلام متاح داخل القاهرة.", type: "text", direction: "outbound", status: "delivered", mediaUrl: null, createdAt: new Date(Date.now() - 23 * 3600 * 1000).toISOString() },
  ],
  "demo-c-5": [
    { id: "demo-msg-5", content: "أريد أطيب العطور الرجالية", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
    { id: "demo-msg-5-2", content: "لدينا تشكيلة مميزة من العطور الرجالية، سأسعد بمشاركتها معك.", type: "text", direction: "outbound", status: "delivered", mediaUrl: null, createdAt: new Date(Date.now() - 47 * 3600 * 1000).toISOString() },
  ],
};

export const DEMO_CHAT_TEMPLATES = [
  { id: "tpl-1", name: "عرض التوصيل المجاني", content: "احصل على شحن مجاني عند الطلب الآن.", status: "approved" },
  { id: "tpl-2", name: "تذكير بالعربة المتروكة", content: "هل تحتاج مساعدة لإكمال طلبك؟", status: "approved" },
  { id: "tpl-3", name: "ترحيب جديد", content: "مرحباً! كيف يمكنني مساعدتك اليوم؟", status: "approved" },
];

export const DEMO_CHAT_AUDIENCES = [
  { id: "aud-1", name: "عملاء VIP" },
  { id: "aud-2", name: "مهتمون بالعطور" },
  { id: "aud-3", name: "زوار المتجر" },
];

export const DEMO_CAMPAIGN_TEMPLATES: Template[] = [
  {
    id: "tmpl-1",
    name: "عرض خاص العيد",
    content: "مرحباً {{1}}! استمتع بخصم 20% على العطور المختارة حتى نهاية الأسبوع.",
    status: "approved",
    language: "ar",
    category: "MARKETING",
  },
  {
    id: "tmpl-2",
    name: "تذكير بالعربة المتروكة",
    content: "مرحباً {{1}}، لديك عناصر متروكة في عربتك. اكمل الطلب الآن واحصل على شحن مجاني.",
    status: "approved",
    language: "ar",
    category: "UTILITY",
  },
  {
    id: "tmpl-3",
    name: "شكراً لتواصلك",
    content: "شكراً لتواصلك معنا {{1}}. سنعود إليك خلال 24 ساعة.",
    status: "approved",
    language: "ar",
    category: "SERVICE",
  },
];

export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "demo-cmp-1",
    name: "عرض الربيع 2026",
    status: "completed",
    sentCount: 1240,
    deliveredCount: 1180,
    readCount: 1050,
    failedCount: 10,
    totalQueued: 1240,
    queuedCount: 0,
    scheduledAt: null,
    createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 5.5 * 24 * 3600 * 1000).toISOString(),
    template: { name: "عرض خاص العيد", content: "مرحباً {{1}}! استمتع بخصم 20% على العطور المختارة حتى نهاية الأسبوع.", category: "MARKETING" },
  },
  {
    id: "demo-cmp-2",
    name: "تذكير العربات",
    status: "running",
    sentCount: 420,
    deliveredCount: 402,
    readCount: 348,
    failedCount: 2,
    totalQueued: 520,
    queuedCount: 98,
    scheduledAt: null,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    completedAt: null,
    template: { name: "تذكير بالعربة المتروكة", content: "مرحباً {{1}}، لديك عناصر متروكة في عربتك. اكمل الطلب الآن واحصل على شحن مجاني.", category: "UTILITY" },
  },
  {
    id: "demo-cmp-3",
    name: "حملة ترحيبية جديدة",
    status: "scheduled",
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    totalQueued: 320,
    queuedCount: 320,
    scheduledAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    completedAt: null,
    template: { name: "شكراً لتواصلك", content: "شكراً لتواصلك معنا {{1}}. سنعود إليك خلال 24 ساعة.", category: "SERVICE" },
  },
  {
    id: "demo-cmp-4",
    name: "متابعة عملاء VIP",
    status: "completed",
    sentCount: 180,
    deliveredCount: 178,
    readCount: 165,
    failedCount: 1,
    totalQueued: 180,
    queuedCount: 0,
    scheduledAt: null,
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 9.5 * 24 * 3600 * 1000).toISOString(),
    template: { name: "عرض خاص العيد", content: "مرحباً {{1}}! استمتع بخصم 20% على العطور المختارة حتى نهاية الأسبوع.", category: "MARKETING" },
  },
  {
    id: "demo-cmp-5",
    name: "صيانة القالب التجريبي",
    status: "draft",
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    totalQueued: 0,
    queuedCount: 0,
    scheduledAt: null,
    createdAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
    completedAt: null,
    template: { name: "شكراً لتواصلك", content: "شكراً لتواصلك معنا {{1}}. سنعود إليك خلال 24 ساعة.", category: "SERVICE" },
  },
];

export const DEMO_CAMPAIGN_AUDIENCES: AudienceOption[] = [
  { id: "demo-aud-vip", name: "عملاء VIP", type: "vip", contactCount: 42 },
  { id: "demo-aud-engaged", name: "عملاء متفاعلون", type: "engaged", contactCount: 184 },
  { id: "demo-aud-no-response", name: "مهملون من دون رد", type: "no-response", contactCount: 98 },
  { id: "demo-aud-custom-1", name: "قائمة العروض الخاصة", type: "custom", contactCount: 12 },
];

export const DEMO_CONTACT_AUDIENCES: Audience[] = [
  {
    id: "demo-aud-vip",
    name: "عملاء VIP",
    notes: "أعلى زبائننا وأكثرهم ولاءً",
    type: "vip",
    contacts: [
      { id: "ct-1", phone: "201012345678", name: "ندى حمدي" },
      { id: "ct-2", phone: "201023456789", name: "سالي صلاح" },
      { id: "ct-3", phone: "201034567890", name: "خالد المصري" },
    ],
    contactCount: 42,
    createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-aud-engaged",
    name: "عملاء متفاعلون",
    notes: "العملاء الذين تفاعلوا مع حملتنا الأخيرة",
    type: "engaged",
    contacts: [
      { id: "ct-4", phone: "201045678901", name: "مريم جمال" },
      { id: "ct-5", phone: "201056789012", name: "أحمد خالد" },
      { id: "ct-6", phone: "201067890123", name: "نور أحمد" },
    ],
    contactCount: 184,
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-aud-no-response",
    name: "مهملون من دون رد",
    notes: "عملاء لم يردوا على آخر رسالة",
    type: "no-response",
    contacts: [
      { id: "ct-7", phone: "201078901234", name: "فاطمة حسين" },
      { id: "ct-8", phone: "201089012345", name: "ياسمين عادل" },
      { id: "ct-9", phone: "201090123456", name: "محمد سمير" },
    ],
    contactCount: 98,
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-aud-custom-1",
    name: "قائمة العروض الخاصة",
    notes: "أضفت يدويًا لعرض تخفيضات العيد",
    type: "custom",
    contacts: [
      { id: "ct-10", phone: "201011122233", name: "ليلى مصطفى" },
      { id: "ct-11", phone: "201022233344", name: "رامي الشريف" },
    ],
    contactCount: 12,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-aud-excel-1",
    name: "عملاء الصيف",
    notes: "مستوردة من ملف إكسل لحملة الصيف",
    type: "excel",
    contacts: [
      { id: "ct-12", phone: "201033344455", name: "سارة عادل" },
      { id: "ct-13", phone: "201044455566", name: "أحمد سامي" },
    ],
    contactCount: 68,
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  },
];
