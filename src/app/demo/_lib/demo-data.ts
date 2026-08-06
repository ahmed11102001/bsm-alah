// ─────────────────────────────────────────────────────────────────────────
// مركز بيانات الديمو الوهمية كلها. أي صفحة ديمو جديدة تستورد من هنا بدل ما
// تكرر بيانات وهمية جوه الملف نفسه — عشان الشخصية (اسم المتجر، الأرقام،
// العملاء) تفضل متسقة عبر كل الصفحات.
// ─────────────────────────────────────────────────────────────────────────

import type { DashboardData } from "./dashboard-context";
import type { Audience } from "@/app/dashboard/contacts/_components/types";
import type { Campaign, Template as CampaignTemplate, AudienceOption } from "@/app/dashboard/campaigns/_components/types";
import type { Template as DashboardTemplate } from "@/app/dashboard/templates/_components/types";
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
  aiAgentReplies: 72,
  recentConversations: [
    { id: "demo-c-1", name: "ندي حمدي", lastMessage: "متى ستحمل العطر الجديد؟", lastMessageAt: new Date(Date.now() - 45 * 60000).toISOString(), status: "auto", unread: true },
    { id: "demo-c-2", name: "سالي صلاح", lastMessage: "هل السعر يشمل الشحن؟", lastMessageAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), status: "needs_human", unread: false },
    { id: "demo-c-3", name: "خالد المصري", lastMessage: "شكراً على الرد السريع", lastMessageAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), status: "human_active", unread: true },
    { id: "demo-c-4", name: "مريم جمال", lastMessage: "هل يمكنني الدفع عند الاستلام؟", lastMessageAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), status: "auto", unread: false },
    { id: "demo-c-5", name: "أحمد خالد", lastMessage: "أريد أطيب العطور الرجالية", lastMessageAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), status: "needs_human", unread: true },
  ],
};

// ─── Template spending breakdown (Marketing vs Service) for the Home donut card ──
export const DEMO_TEMPLATE_COST = { marketing: 96.40, service: 41.85 };

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

export const DEMO_CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
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
    content: "أهلاً {{1}}، لا تفوت الشحن المجاني وحصل على منتجك قبل نهاية اليوم.",
    status: "approved",
    language: "ar",
    category: "UTILITY",
  },
  {
    id: "tmpl-3",
    name: "شكراً لتواصلك",
    content: "شكراً لتواصلك معنا {{1}}! هل تفضل العطور الشرقية أم العطور الزهرية؟",
    status: "approved",
    language: "ar",
    category: "SERVICE",
  },
  {
    id: "tmpl-4",
    name: "استعادة العملاء",
    content: "مرحباً {{1}}، اشتقنا لك! عد الآن واحصل على خصم 15% على منتجك القادم.",
    status: "approved",
    language: "ar",
    category: "MARKETING",
  },
  {
    id: "tmpl-5",
    name: "عرض VIP الخاص",
    content: "عزيزي {{1}}، كعميل VIP نقدم لك تجربة فاخرة مع هدية مجانية عند الطلب هذا الأسبوع.",
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
    template: { name: "عرض VIP الخاص", content: "عزيزي {{1}}، كعميل VIP نقدم لك تجربة فاخرة مع هدية مجانية عند الطلب هذا الأسبوع.", category: "SERVICE" },
  },
  {
    id: "demo-cmp-5",
    name: "متابعة الترحيب",
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
    template: { name: "شكراً لتواصلك", content: "شكراً لتواصلك معنا {{1}}! هل تفضل العطور الشرقية أم العطور الزهرية؟", category: "SERVICE" },
  },
];

export const DEMO_CAMPAIGN_AUDIENCES: AudienceOption[] = [
  { id: "demo-aud-vip", name: "عملاء VIP", type: "vip", contactCount: 42 },
  { id: "demo-aud-engaged", name: "عملاء متفاعلون", type: "engaged", contactCount: 184 },
  { id: "demo-aud-no-response", name: "مهملون من دون رد", type: "no-response", contactCount: 98 },
  { id: "demo-aud-custom-1", name: "قائمة العروض الخاصة", type: "custom", contactCount: 12 },
];

export const DEMO_TEMPLATES: DashboardTemplate[] = [
  {
    id: "demo-tpl-1",
    name: "order_confirmation",
    category: "UTILITY",
    language: "ar",
    status: "APPROVED",
    body: "مرحباً {{1}} 👋\n\nطلبك رقم #{{2}} تم تأكيده بنجاح. سنرسل لك تفاصيل الشحن قريباً.",
    headerType: "none",
    footer: "Wani Store",
    buttons: [
      { type: "quick_reply", text: "أرسل لي التتبع", value: "TRACK_ORDER" },
      { type: "quick_reply", text: "تعديل الطلب", value: "EDIT_ORDER" },
    ],
    exampleVars: ["أحمد", "12345"],
    createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-tpl-2",
    name: "abandoned_cart_reminder",
    category: "MARKETING",
    language: "ar",
    status: "PENDING",
    body: "أهلاً {{1}}، نسيت منتجاً في سلتك بقيمة {{2}}. اكمل الطلب الآن واحصل على شحن مجاني!",
    headerType: "image",
    footer: "Wani Store",
    buttons: [
      { type: "url", text: "أكمل الطلب", value: "https://demo.wani.app/cart" },
    ],
    exampleVars: ["سارة", "240 ج.م"],
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-tpl-3",
    name: "support_followup",
    category: "UTILITY",
    language: "ar",
    status: "REJECTED",
    rejectedReason: "يجب تعديل نص الافتتاحية لتجنب الحشو.",
    body: "مرحباً {{1}}، نتمنى أن يكون طلبك قد وصل. هل تحتاج أي مساعدة إضافية؟",
    headerType: "none",
    footer: "Wani Store",
    buttons: [
      { type: "quick_reply", text: "نعم، أحتاج مساعدة", value: "NEED_HELP" },
      { type: "quick_reply", text: "لا شكراً", value: "NO_THANKS" },
    ],
    exampleVars: ["أحمد"],
    createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-tpl-4",
    name: "vip_offer",
    category: "MARKETING",
    language: "ar",
    status: "PAUSED",
    body: "عزيزي {{1}}, كعميل VIP نقدّم لك خصم 25% على المنتج المفضل لديك. العرض ينتهي غداً.",
    headerType: "none",
    footer: "Wani Store",
    exampleVars: ["خالد"],
    createdAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-tpl-5",
    name: "otp_login",
    category: "AUTHENTICATION",
    language: "en",
    status: "APPROVED",
    body: "Your login code is {{1}}. It expires in 10 minutes.",
    headerType: "none",
    footer: "Wani Secure",
    exampleVars: ["123456"],
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
  },
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

// ─────────────────────────────────────────────────────────────────────────
// بيانات ديمو لصفحة التقارير (كل التابات) وصفحة المتجر
// ─────────────────────────────────────────────────────────────────────────
import type { Overview, CustomerRow, TeamRow, LogsData, StoreReportData } from "@/app/dashboard/reports/_shared";
import type { AutomationReportData } from "@/app/dashboard/reports/automation/page";
import type { StoreData, Customer, AutomationItem, AutomationTemplate } from "@/app/dashboard/store/_components/types";

export const DEMO_REPORTS_OVERVIEW: Overview = {
  totals: {
    sent: 18420, delivered: 17960, read: 15310, failed: 460,
    inbound: 3284, uniqueContacts: 4812,
    deliveryRate: 97.5, readRate: 85.2, replyRate: 22.4,
  },
  daily: Array.from({ length: 14 }, (_, i) => ({
    day: new Date(Date.now() - (13 - i) * 24 * 3600 * 1000).toISOString().slice(0, 10),
    sent: 1100 + Math.round(Math.sin(i / 2) * 200 + i * 15),
    delivered: 1050 + Math.round(Math.sin(i / 2) * 200 + i * 15),
    received: 180 + Math.round(Math.cos(i / 2) * 40 + i * 4),
  })),
  hourly: Array.from({ length: 24 }, (_, h) => ({
    hour: h, cnt: h >= 10 && h <= 23 ? Math.round(40 + Math.sin((h - 10) / 4) * 35 + Math.random() * 15) : Math.round(Math.random() * 8),
  })),
  bestCampaigns: [
    { name: "عرض الربيع 2026", sentCount: 1240, deliveredCount: 1180, readCount: 1050, failedCount: 10, rate: 84.7 },
    { name: "متابعة عملاء VIP", sentCount: 180, deliveredCount: 178, readCount: 165, failedCount: 1, rate: 91.7 },
    { name: "تذكير العربات", sentCount: 420, deliveredCount: 402, readCount: 348, failedCount: 2, rate: 82.9 },
  ],
};

export const DEMO_REPORTS_CUSTOMERS: CustomerRow[] = [
  { id: "demo-cust-1", phone: "201001112233", name: "ندى حمدي", lastMessageAt: new Date(Date.now() - 45 * 60000).toISOString(), totalMessages: 32, unreadCount: 1, createdAt: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString() },
  { id: "demo-cust-2", phone: "201004445566", name: "سالي صلاح", lastMessageAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), totalMessages: 18, unreadCount: 0, createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString() },
  { id: "demo-cust-3", phone: "201007778899", name: "خالد المصري", lastMessageAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), totalMessages: 47, unreadCount: 0, createdAt: new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString() },
  { id: "demo-cust-4", phone: "201009990011", name: "مريم جمال", lastMessageAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), totalMessages: 9, unreadCount: 2, createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString() },
  { id: "demo-cust-5", phone: "201002223344", name: "أحمد خالد", lastMessageAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), totalMessages: 5, unreadCount: 0, createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString() },
];

export const DEMO_REPORTS_TEAM: TeamRow[] = [
  { id: "demo-user-1", name: DEMO_USER_NAME, role: "OWNER", sent: 820, replied: 640 },
  { id: "demo-team-2", name: "ياسمين عادل", role: "FULL_ACCESS", sent: 410, replied: 355 },
  { id: "demo-team-3", name: "عمر شريف", role: "CHAT_ONLY", sent: 260, replied: 198 },
];

export const DEMO_REPORTS_LOGS: LogsData = {
  total: 5, page: 1, limit: 50,
  messages: [
    { id: "demo-log-1", content: "متى ستحمل العطر الجديد؟", type: "text", status: "read", direction: "inbound", createdAt: new Date(Date.now() - 45 * 60000).toISOString(), contact: { phone: "201001112233", name: "ندى حمدي" }, campaign: null, user: null },
    { id: "demo-log-2", content: "أهلاً! العطر الجديد هيتوفر الأسبوع الجاي إن شاء الله ✨", type: "text", status: "delivered", direction: "outbound", createdAt: new Date(Date.now() - 43 * 60000).toISOString(), contact: { phone: "201001112233", name: "ندى حمدي" }, campaign: null, user: { name: DEMO_USER_NAME, email: DEMO_USER_EMAIL } },
    { id: "demo-log-3", content: null, type: "template", status: "delivered", direction: "outbound", createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), contact: { phone: "201004445566", name: "سالي صلاح" }, campaign: { name: "تذكير العربات" }, user: null },
    { id: "demo-log-4", content: "هل السعر يشمل الشحن؟", type: "text", status: "read", direction: "inbound", createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), contact: { phone: "201007778899", name: "خالد المصري" }, campaign: null, user: null },
    { id: "demo-log-5", content: null, type: "image", status: "failed", direction: "outbound", createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), contact: { phone: "201009990011", name: "مريم جمال" }, campaign: { name: "عرض الربيع 2026" }, user: { name: "ياسمين عادل", email: "yasmin@demo.wani.app" } },
  ],
};

export const DEMO_REPORTS_STORE: StoreReportData = {
  summary: {
    totalOrders: 312, totalRevenue: 186_400,
    totalCampaignRevenue: 54_200, campaignRevenueShare: 29.1,
    totalUniqueCustomers: 248, storesConnected: 1,
  },
  stores: [
    { source: "shopify", name: "متجر ليالي للعطور", connectedAt: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(), isActive: true },
  ],
  campaignRevenue: [
    { id: "demo-cmp-1", name: "عرض الربيع 2026", revenue: 28_400, ordersCount: 46, sentCount: 1240, readCount: 1050, completedAt: new Date(Date.now() - 5.5 * 24 * 3600 * 1000).toISOString(), createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString() },
    { id: "demo-cmp-4", name: "متابعة عملاء VIP", revenue: 19_800, ordersCount: 14, sentCount: 180, readCount: 165, completedAt: new Date(Date.now() - 9.5 * 24 * 3600 * 1000).toISOString(), createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString() },
    { id: "demo-cmp-2", name: "تذكير العربات", revenue: 6_000, ordersCount: 9, sentCount: 420, readCount: 348, completedAt: null, createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  ],
  topCustomers: [
    { phone: "201007778899", name: "خالد المصري", ordersCount: 9, totalSpent: 12_400, currency: "EGP" },
    { phone: "201001112233", name: "ندى حمدي", ordersCount: 6, totalSpent: 8_950, currency: "EGP" },
    { phone: "201004445566", name: "سالي صلاح", ordersCount: 5, totalSpent: 6_200, currency: "EGP" },
  ],
  ordersByStatus: [
    { status: "confirmed", count: 210, revenue: 132_000 },
    { status: "pending", count: 58, revenue: 31_400 },
    { status: "cancelled", count: 44, revenue: 23_000 },
  ],
  dailyTrend: Array.from({ length: 14 }, (_, i) => ({
    day: new Date(Date.now() - (13 - i) * 24 * 3600 * 1000).toISOString().slice(0, 10),
    orders: 15 + Math.round(Math.sin(i / 3) * 6 + i * 0.4),
    revenue: 8500 + Math.round(Math.sin(i / 3) * 2200 + i * 250),
  })),
  confirmedOrders: [
    { id: "demo-ord-1", orderNumber: "#4821", externalId: "4821", customerName: "خالد المصري", customerPhone: "201007778899", status: "confirmed", total: 1450, currency: "EGP", orderedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
    { id: "demo-ord-2", orderNumber: "#4820", externalId: "4820", customerName: "ندى حمدي", customerPhone: "201001112233", status: "confirmed", total: 890, currency: "EGP", orderedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString() },
    { id: "demo-ord-3", orderNumber: "#4819", externalId: "4819", customerName: "سالي صلاح", customerPhone: "201004445566", status: "pending", total: 620, currency: "EGP", orderedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString() },
  ],
  confirmedOrdersTotal: 210,
};

export const DEMO_AUTOMATION_REPORT: AutomationReportData = {
  kpis: {
    totalAutomations: 6, activeAutomations: 5, stoppedAutomations: 1,
    automationsWithErrors: 0, totalRuns: 1840, totalSuccess: 1746,
    totalFailures: 94, successRate: 94.9,
  },
  rules: [
    { id: "demo-rule-1", name: "رسالة ترحيب", type: "welcome", isEnabled: true, runCount: 640, successCount: 615, failureCount: 25, lastRun: new Date(Date.now() - 20 * 60000).toISOString() },
    { id: "demo-rule-2", name: "تذكير عربة متروكة", type: "cart_abandon", isEnabled: true, runCount: 420, successCount: 380, failureCount: 40, lastRun: new Date(Date.now() - 90 * 60000).toISOString() },
    { id: "demo-rule-3", name: "تأكيد الطلب", type: "order_confirm", isEnabled: true, runCount: 312, successCount: 305, failureCount: 7, lastRun: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
    { id: "demo-rule-4", name: "إشعار الشحن", type: "order_shipped", isEnabled: false, runCount: 0, successCount: 0, failureCount: 0, lastRun: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  ],
  errorLog: [
    { id: "demo-err-1", title: "فشل إرسال رسالة تذكير العربة", details: "انتهت صلاحية القالب — يحتاج موافقة Meta جديدة.", time: new Date(Date.now() - 6 * 3600 * 1000).toISOString() },
  ],
  topAutomations: [
    { name: "رسالة ترحيب", runs: 640 },
    { name: "تذكير عربة متروكة", runs: 420 },
    { name: "تأكيد الطلب", runs: 312 },
  ],
  aiMetrics: {
    avgResponseTime: "8.2s", fastestResponse: "2.1s", slowestResponse: "24.4s",
    aiRepliesCount: 2840, aiSuccessRate: 91.4, humanHandoffs: 186,
  },
  timeSaved: { totalAutoReplies: 2840, estimatedHoursSaved: 94, efficiencyGain: 62 },
  timeline: [
    { time: new Date(Date.now() - 20 * 60000).toISOString(), title: "تشغيل ناجح: رسالة ترحيب" },
    { time: new Date(Date.now() - 90 * 60000).toISOString(), title: "تشغيل ناجح: تذكير عربة متروكة" },
    { time: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), title: "خطأ: فشل إرسال رسالة تذكير العربة" },
  ],
  funnel: { steps: ["استلام رسالة", "رد تلقائي", "متابعة", "تحويل"], values: [1840, 1746, 940, 312] },
};

// ─── صفحة المتجر (تكامل Shopify/EasyOrders/WooCommerce) ─────────────────────
export const DEMO_STORE_DATA: StoreData = {
  shopify: {
    id: "demo-store-1", storeName: DEMO_STORE_NAME, source: "shopify",
    totalOrders: 312, totalCustomers: 248, campaignRevenue: 54_200,
    connectedAt: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
    isActive: true, lastSyncAt: new Date(Date.now() - 12 * 60000).toISOString(), totalSynced: 96,
  },
  easyorders: null,
  woocommerce: null,
};

export const DEMO_STORE_CUSTOMERS: Customer[] = [
  { phone: "201007778899", name: "خالد المصري", ordersCount: 9, totalSpent: 12_400, currency: "EGP", lastOrder: { orderNumber: "#4821", total: 1450, status: "confirmed", orderedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString() } },
  { phone: "201001112233", name: "ندى حمدي", ordersCount: 6, totalSpent: 8_950, currency: "EGP", lastOrder: { orderNumber: "#4820", total: 890, status: "confirmed", orderedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString() } },
  { phone: "201004445566", name: "سالي صلاح", ordersCount: 5, totalSpent: 6_200, currency: "EGP", lastOrder: { orderNumber: "#4819", total: 620, status: "pending", orderedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString() } },
  { phone: "201009990011", name: "مريم جمال", ordersCount: 3, totalSpent: 2_100, currency: "EGP", lastOrder: { orderNumber: "#4815", total: 700, status: "confirmed", orderedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString() } },
];

export const DEMO_STORE_AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  { id: "demo-tmpl-confirm", name: "تأكيد الطلب" },
  { id: "demo-tmpl-shipped", name: "إشعار الشحن" },
  { id: "demo-tmpl-promo", name: "عرض ترويجي" },
  { id: "demo-tmpl-cart", name: "تذكير عربة متروكة" },
];

export const DEMO_STORE_AUTOMATIONS: AutomationItem[] = [
  { id: "demo-auto-1", type: "order_confirm", isEnabled: true, templateId: "demo-tmpl-confirm", template: { id: "demo-tmpl-confirm", name: "تأكيد الطلب" }, sentCount: 305, failedCount: 7, lastSentAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), isDedicated: false, dedicatedTemplate: null },
  { id: "demo-auto-2", type: "order_shipped", isEnabled: false, templateId: "demo-tmpl-shipped", template: { id: "demo-tmpl-shipped", name: "إشعار الشحن" }, sentCount: 0, failedCount: 0, lastSentAt: null, isDedicated: false, dedicatedTemplate: null },
  { id: "demo-auto-3", type: "promo", isEnabled: true, templateId: "demo-tmpl-promo", template: { id: "demo-tmpl-promo", name: "عرض ترويجي" }, sentCount: 640, failedCount: 25, lastSentAt: new Date(Date.now() - 20 * 60000).toISOString(), isDedicated: false, dedicatedTemplate: null },
  { id: "demo-auto-4", type: "cart_abandon", isEnabled: true, templateId: "demo-tmpl-cart", template: { id: "demo-tmpl-cart", name: "تذكير عربة متروكة" }, sentCount: 420, failedCount: 40, lastSentAt: new Date(Date.now() - 90 * 60000).toISOString(), delayMinutes: 60, isDedicated: false, dedicatedTemplate: null },
];