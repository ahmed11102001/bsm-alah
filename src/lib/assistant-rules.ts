// ═══════════════════════════════════════════════════════════════════════════════
//  WhatsPro Dashboard Assistant — Rules Engine
//  كل تحذير أو اقتراح في الداشبورد بيتعرف هنا بدون hardcoding
// ═══════════════════════════════════════════════════════════════════════════════

export type Severity   = "info" | "warning" | "critical";
export type DisplayAs  = "banner" | "card" | "floating";
export type PageId =
  | "home" | "chat" | "contacts" | "campaigns" | "templates"
  | "reports" | "automation" | "store" | "api" | "admin" | "team" | "*";

// ── الـ context اللي كل rule بتشوفه ─────────────────────────────────────────
export interface RuleContext {
  // بيانات الـ dashboard الأساسية
  whatsappConnected:   boolean;
  totalContacts:       number;
  deliveryRate:        number;   // 0-100
  planStatus:          string;   // "active" | "trialing" | "past_due" | ...
  planName:            string;
  // بيانات الـ assistant API
  expiredChats:        number;   // conversations عدت 24h
  automationCount:     number;   // عدد الـ automation rules
  lastCampaignStatus?: string;   // "completed" | "failed" | ...
  lastCampaignDelivery?: number; // نسبة delivery آخر campaign
}

// ── شكل كل Rule ─────────────────────────────────────────────────────────────
export interface AssistantRule {
  id:            string;
  pages:         PageId[];
  severity:      Severity;
  displayAs:     DisplayAs;
  cooldownHours: number;          // 0 = دايماً يظهر, 24 = مرة في اليوم
  condition:     (ctx: RuleContext) => boolean;
  title:         Record<"ar" | "en", string | ((ctx: RuleContext) => string)>;
  shortTitle?:   Record<"ar" | "en", string>;  // للـ Banner — مختصر
  message:       Record<"ar" | "en", string | ((ctx: RuleContext) => string)>;
  shortMessage?: Record<"ar" | "en", string>;  // للـ Banner — سطر واحد
  tip?:          Record<"ar" | "en", string | ((ctx: RuleContext) => string)>;  // نصيحة إضافية
  action?: {
    label:  Record<"ar" | "en", string>;
    target: string;               // section id أو URL
    type:   "navigate" | "link";
  };
  secondaryAction?: {
    label:  Record<"ar" | "en", string>;
    target: string;
    type:   "navigate" | "link";
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RULES — أضف أي rule جديدة هنا بس بدون ما تلمس أي component
// ═══════════════════════════════════════════════════════════════════════════════
export const ASSISTANT_RULES: AssistantRule[] = [

  // ── 🔴 CRITICAL: واتساب مش متوصل ─────────────────────────────────────────
  {
    id:            "whatsapp_not_connected",
    pages:         ["*"],
    severity:      "critical",
    displayAs:     "banner",
    cooldownHours: 0,
    condition:     ctx => !ctx.whatsappConnected,
    title:   { ar: "⚠️ الواتساب مش متوصل",              en: "⚠️ WhatsApp Not Connected"           },
    message: { ar: "مش هتقدر تبعت أو تستقبل رسائل — لازم توصل حسابك الأول.", en: "You can't send or receive messages until you connect your WhatsApp account." },
    tip:     { ar: "تأكد إن الـ WhatsApp Business API متفعّل من Meta for Developers", en: "Make sure WhatsApp Business API is activated from Meta for Developers" },
    shortTitle:   { ar: "⚠️ الواتساب مش متوصل", en: "⚠️ WhatsApp Not Connected" },
    shortMessage: { ar: "مش هتقدر تبعت أو تستقبل رسائل.", en: "You can't send or receive messages." },
    action:  { label: { ar: "ربط الواتساب الآن", en: "Connect WhatsApp Now" }, target: "api", type: "navigate" },
  },

  // ── 🔴 CRITICAL: محادثات عدت 24 ساعة ────────────────────────────────────
  {
    id:            "chat_24h_expired",
    pages:         ["chat"],
    severity:      "critical",
    displayAs:     "banner",
    cooldownHours: 1,
    condition:     ctx => ctx.expiredChats > 0,
    title:   {
      ar: (ctx: RuleContext) => `🚨 ${ctx.expiredChats} محادثة عدت عليها 24 ساعة`,
      en: (ctx: RuleContext) => `🚨 ${ctx.expiredChats} conversation${ctx.expiredChats > 1 ? "s" : ""} expired`,
    },
    message: {
      ar: "لو بعتلهم رسالة عادية دلوقتي هتتحظر! الـ WhatsApp بيسمح بس بـ Template messages بعد 24 ساعة من آخر رسالة من العميل.",
      en: "Sending a regular message now will get you blocked! WhatsApp only allows Template messages after 24 hours of customer inactivity.",
    },
    tip: {
      ar: "دايماً استخدم قالب رسمي معتمد لإعادة فتح المحادثة — ده مش اختياري، ده قانون Meta.",
      en: "Always use an approved Template to re-open a conversation — this is Meta's policy, not optional.",
    },
    action:         { label: { ar: "اختار قالب وابعته", en: "Pick a Template" },             target: "templates",  type: "navigate" },
    shortTitle:   { ar: "🚨 محادثات منتهية الـ 24 ساعة", en: "🚨 Expired conversations" },
    shortMessage: { ar: "ابعت template فقط — ممنوع رسائل عادية.", en: "Send template only — regular messages are blocked." },
    secondaryAction:{ label: { ar: "شوف المحادثات المتأثرة", en: "View Affected Chats" },    target: "chat",       type: "navigate" },
  },

  // ── 🟡 WARNING: مفيش contacts ────────────────────────────────────────────
  {
    id:            "no_contacts",
    pages:         ["contacts", "home"],
    severity:      "warning",
    displayAs:     "banner",
    cooldownHours: 24,
    condition:     ctx => ctx.totalContacts === 0,
    title:   { ar: "📋 مفيش جهات اتصال بعد",          en: "📋 No Contacts Yet"                 },
    message: { ar: "من غير contacts مش هتقدر تبعت حملات أو ترد على عملاء — ابدأ برفع قائمة العملاء.", en: "Without contacts you can't run campaigns or reply to customers — start by importing your list." },
    shortTitle:   { ar: "📋 مفيش جهات اتصال", en: "📋 No Contacts" },
    shortMessage: { ar: "أضف عملاءك لتشغيل الحملات.", en: "Add customers to run campaigns." },
    action:  { label: { ar: "استيراد جهات الاتصال", en: "Import Contacts" }, target: "contacts", type: "navigate" },
  },

  // ── 🟡 WARNING: نسبة delivery وحشة ─────────────────────────────────────
  {
    id:            "low_delivery_rate",
    pages:         ["campaigns", "reports", "home"],
    severity:      "warning",
    displayAs:     "banner",
    cooldownHours: 12,
    condition:     ctx => ctx.deliveryRate > 0 && ctx.deliveryRate < 70,
    title:   { ar: "📉 نسبة الوصول منخفضة",            en: "📉 Low Delivery Rate"               },
    message: {
      ar: (ctx: RuleContext) => `📉 نسبة وصول رسائلك ${Math.round(ctx.deliveryRate)}% — المعدل الطبيعي 85%+. ممكن يكون في أرقام قديمة أو كلمات محظورة.`,
      en: (ctx: RuleContext) => `Your delivery rate is ${Math.round(ctx.deliveryRate)}% — normal is 85%+. This may be caused by stale numbers or flagged content.`,
    },
    tip:     { ar: "احذف الأرقام اللي مش بتشتغل من قائمتك وراجع محتوى الرسائل.", en: "Remove inactive numbers and review your message content for flagged words." },
    action:  { label: { ar: "مشاهدة التقارير", en: "View Reports" }, target: "reports", type: "navigate" },
  },

  // ── 🔵 INFO: مفيش automation ─────────────────────────────────────────────
  {
    id:            "no_automation",
    pages:         ["automation"],
    severity:      "info",
    displayAs:     "banner",
    cooldownHours: 72,
    condition:     ctx => ctx.automationCount === 0,
    title:   { ar: "🤖 مفيش أتمتة مفعّلة",             en: "🤖 No Automation Active"            },
    message: { ar: "مش عامل أي automation rules — يعني بترد يدوي على كل رسالة. جرب تضيف رد تلقائي على الرسالة الأولى.", en: "You have no automation rules — you're replying manually to everything. Try adding an auto-reply for first messages." },
    shortTitle:   { ar: "🤖 مفيش أتمتة", en: "🤖 No Automation" },
    shortMessage: { ar: "كل الردود يدوية — فعّل automation.", en: "All replies are manual — enable automation." },
    action:  { label: { ar: "إضافة أول Rule", en: "Add First Rule" }, target: "automation", type: "navigate" },
  },

  // ── 🟡 WARNING: آخر campaign فشلت ──────────────────────────────────────
  {
    id:            "last_campaign_failed",
    pages:         ["campaigns", "home"],
    severity:      "warning",
    displayAs:     "card",
    cooldownHours: 6,
    condition:     ctx => ctx.lastCampaignStatus === "failed",
    title:   { ar: "❌ آخر حملة فشلت",                  en: "❌ Last Campaign Failed"            },
    message: { ar: "آخر حملة بعتها فشلت — ممكن يكون بسبب مشكلة في الواتساب API أو الـ template.", en: "Your last campaign failed — this may be due to a WhatsApp API issue or template problem." },
    action:  { label: { ar: "مشاهدة التفاصيل", en: "View Details" }, target: "campaigns", type: "navigate" },
  },

];

// ═══════════════════════════════════════════════════════════════════════════════
//  Engine — تقييم الـ rules وإرجاع النشطة منها
// ═══════════════════════════════════════════════════════════════════════════════
export function evaluateRules(
  rules:      AssistantRule[],
  ctx:        RuleContext,
  page:       PageId,
  dismissed:  Record<string, number>, // { ruleId: dismissedAtMs }
): AssistantRule[] {
  return rules.filter(rule => {
    // تحقق من الصفحة
    const onPage = rule.pages.includes("*") || rule.pages.includes(page);
    if (!onPage) return false;

    // تحقق من الـ condition
    if (!rule.condition(ctx)) return false;

    // تحقق من الـ cooldown
    if (rule.cooldownHours > 0) {
      const lastDismissed = dismissed[rule.id];
      if (lastDismissed) {
        const hoursAgo = (Date.now() - lastDismissed) / 3_600_000;
        if (hoursAgo < rule.cooldownHours) return false;
      }
    }

    return true;
  });
}

// Helper: resolve dynamic title/message
export function resolveText(
  field: Record<"ar" | "en", string | ((ctx: RuleContext) => string)>,
  locale: "ar" | "en",
  ctx:   RuleContext,
): string {
  const raw = field[locale];
  return typeof raw === "function" ? raw(ctx) : raw;
}