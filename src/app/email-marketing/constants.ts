import {
  BarChart3,
  Users,
  FileText,
  Send,
  Settings,
  Mail,
  Activity,
  Zap,
} from "lucide-react";
import type {
  EmailContactDTO,
  EmailTemplateDTO,
  EmailCampaignDTO,
  EmailDeliveryDTO,
  SmtpConfigDTO,
  EmailOverviewStats,
} from "./types";

export const EMAIL_TABS = [
  { id: "overview", label: "نظرة عامة", href: "/dashboard/email", icon: BarChart3 },
  { id: "campaigns", label: "الحملات", href: "/dashboard/email/campaigns", icon: Send },
  { id: "templates", label: "القوالب", href: "/dashboard/email/templates", icon: FileText },
  { id: "automations", label: "الأتمتة", href: "/dashboard/email/automations", icon: Zap },
  { id: "activity", label: "النشاط وسجل الإرسال", href: "/dashboard/email/activity", icon: Activity },
  { id: "contacts", label: "جهات الاتصال", href: "/dashboard/email/contacts", icon: Users },
  { id: "settings", label: "إعدادات الربط", href: "/dashboard/email/settings", icon: Settings },
] as const;

export const SMTP_PORT_PRESETS = [
  { label: "587 (TLS / STARTTLS - موصى به)", value: 587, secure: false },
  { label: "465 (SSL)", value: 465, secure: true },
  { label: "25 (افتراضي غير مشفر)", value: 25, secure: false },
  { label: "2525 (منفذ بديل)", value: 2525, secure: false },
] as const;

// ── Mock Data للمراحل 2.1 إلى 2.5 ──

export const MOCK_SMTP_CONFIG: SmtpConfigDTO = {
  host: "smtp.mailgun.org",
  port: 587,
  secure: false,
  user: "marketing@company.com",
  fromEmail: "newsletter@company.com",
  fromName: "WANI Newsletter",
  isConfigured: false, // نجعلها false مبدئيًا لعرض البانر التنبيهي، ويمكن تفعيلها
  lastTestedAt: null,
  lastTestSuccess: null,
};

export const MOCK_OVERVIEW_STATS: EmailOverviewStats = {
  totalContacts: 1420,
  subscribedContacts: 1385,
  totalCampaigns: 18,
  totalEmailsSent: 12450,
  deliveryRate: 98.4,
  openRate: 42.1,
  isSmtpConfigured: false,
};

export const MOCK_CONTACTS: EmailContactDTO[] = [
  {
    id: "cnt_1",
    email: "ahmed.khalil@example.com",
    name: "أحمد خليل",
    tags: ["VIP", "عملاء قدامى"],
    status: "SUBSCRIBED",
    createdAt: "2026-09-10T14:30:00Z",
  },
  {
    id: "cnt_2",
    email: "sara.nour@example.com",
    name: "سارة نور",
    tags: ["مهتمين", "متجر"],
    status: "SUBSCRIBED",
    createdAt: "2026-09-12T09:15:00Z",
  },
  {
    id: "cnt_3",
    email: "mohamed.ali@company.net",
    name: "محمد علي",
    tags: ["شركات"],
    status: "SUBSCRIBED",
    createdAt: "2026-09-14T18:20:00Z",
  },
  {
    id: "cnt_4",
    email: "fatma.kamal@mail.com",
    name: "فاطمة كمال",
    tags: ["سلة متروكة"],
    status: "UNSUBSCRIBED",
    createdAt: "2026-09-15T11:00:00Z",
  },
  {
    id: "cnt_5",
    email: "omar.hassan@test.org",
    name: "عمر حسن",
    tags: ["VIP"],
    status: "BOUNCED",
    createdAt: "2026-09-16T16:45:00Z",
  },
];

export const MOCK_TEMPLATES: EmailTemplateDTO[] = [
  {
    id: "tpl_welcome",
    name: "رسالة الترحيب بالعملاء الجدد",
    subject: "أهلاً بك يا {{name}} في منصتنا 🎉",
    bodyHtml: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #064e3b;">أهلاً بك يا {{name}}!</h2>
  <p>سعداء جداً بانضمامك إلينا عبر البريد {{email}}.</p>
  <p>استكشف مميزاتنا وابدأ أولى تجاربك الناجحة اليوم.</p>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
  <p style="font-size: 12px; color: #888;">فريق واني — حلول التسويق الذكية</p>
</div>
`.trim(),
    previewText: "سعداء جداً بانضمامك إلينا...",
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-15T12:00:00Z",
  },
  {
    id: "tpl_promo",
    name: "عرض نهاية الأسبوع الحصري",
    subject: "خصم 30% خاص بك فقط ⚡",
    bodyHtml: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #047857;">عرض حصري لنهاية الأسبوع!</h2>
  <p>مرحباً {{name}}، خصم خاص على جميع خدماتنا متاح حتى منتصف الليل.</p>
  <a href="https://example.com" style="display: inline-block; background: #059669; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">استفد من العرض</a>
</div>
`.trim(),
    previewText: "خصم خاص على جميع خدماتنا...",
    createdAt: "2026-09-05T14:30:00Z",
    updatedAt: "2026-09-16T16:20:00Z",
  },
];

export const MOCK_CAMPAIGNS: EmailCampaignDTO[] = [
  {
    id: "cmp_1",
    name: "حملة الترحيب بالمشتركين الجدد",
    subject: "أهلاً بك في عائلة واني 🎉",
    templateId: "tpl_welcome",
    templateName: "رسالة الترحيب بالعملاء الجدد",
    targetTag: "مهتمين",
    targetCount: 450,
    sentCount: 450,
    deliveredCount: 442,
    failedCount: 8,
    openedCount: 280,
    status: "COMPLETED",
    createdAt: "2026-09-14T10:00:00Z",
    completedAt: "2026-09-14T10:15:00Z",
  },
  {
    id: "cmp_2",
    name: "عروض الخريف لعملاء VIP",
    subject: "خصم 30% خاص بك فقط ⚡",
    templateId: "tpl_promo",
    templateName: "عرض نهاية الأسبوع الحصري",
    targetTag: "VIP",
    targetCount: 220,
    sentCount: 220,
    deliveredCount: 218,
    failedCount: 2,
    openedCount: 165,
    status: "COMPLETED",
    createdAt: "2026-09-16T14:00:00Z",
    completedAt: "2026-09-16T14:10:00Z",
  },
  {
    id: "cmp_3",
    name: "استبيان رضا العملاء السنوي",
    subject: "رأيك يهمنا لمساعدتنا في التطور",
    templateId: "tpl_welcome",
    templateName: "رسالة الترحيب بالعملاء الجدد",
    targetTag: null,
    targetCount: 750,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    status: "DRAFT",
    createdAt: "2026-09-17T11:00:00Z",
  },
];

export const MOCK_DELIVERIES: EmailDeliveryDTO[] = [
  {
    id: "del_1",
    campaignId: "cmp_1",
    contactEmail: "ahmed.khalil@example.com",
    contactName: "أحمد خليل",
    status: "OPENED",
    sentAt: "2026-09-14T10:02:00Z",
    createdAt: "2026-09-14T10:00:00Z",
  },
  {
    id: "del_2",
    campaignId: "cmp_1",
    contactEmail: "sara.nour@example.com",
    contactName: "سارة نور",
    status: "DELIVERED",
    sentAt: "2026-09-14T10:03:00Z",
    createdAt: "2026-09-14T10:00:00Z",
  },
  {
    id: "del_3",
    campaignId: "cmp_1",
    contactEmail: "mohamed.ali@company.net",
    contactName: "محمد علي",
    status: "FAILED",
    errorMessage: "550 5.1.1 User unknown / Host unreachable",
    sentAt: "2026-09-14T10:04:00Z",
    createdAt: "2026-09-14T10:00:00Z",
  },
];
