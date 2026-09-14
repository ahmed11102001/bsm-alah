// ═══════════════════════════════════════════════════════════════════════════════
//  WANI Dashboard Assistant — Rules Engine
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
  planTier?:           string;   // "free" | "starter" | "pro" | "enterprise"
  role?:               string;   // "OWNER" | "FULL_ACCESS" | "CHAT_ONLY"
  // بيانات الـ assistant API
  expiredChats:        number;   // conversations عدت 24h
  automationCount:     number;   // عدد الـ automation rules
  lastCampaignStatus?: string;   // "completed" | "failed" | ...
  lastCampaignDelivery?: number; // نسبة delivery آخر campaign
  // ── Agent Beta Access (تُملأ من /api/agent-beta/status) ──
  agentBetaActive?:     boolean;
  agentBetaConsumed?:   boolean;
  agentBetaEligible?:   boolean;
  agentBetaDaysLeft?:   number;
  agentBetaRemaining?:  number;
  agentBetaReason?:     string;
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
    target: string;               // section id أو URL أو action-id
    type:   "navigate" | "link" | "action";
  };
  secondaryAction?: {
    label:  Record<"ar" | "en", string>;
    target: string;
    type:   "navigate" | "link" | "action";
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RULES — أضف أي rule جديدة هنا بس بدون ما تلمس أي component
// ═══════════════════════════════════════════════════════════════════════════════
export const ASSISTANT_RULES: AssistantRule[] = [

  // ── 🟡 WARNING: محادثات خرجت من نافذة الـ24 ساعة ────────────────────────
  {
    id:            "expired_chats_24h",
    pages:         ["*"],
    severity:      "warning",
    displayAs:     "card",
    cooldownHours: 0,
    condition:     ctx => ctx.expiredChats > 0,
    title:   {
      ar: (ctx: RuleContext) => `💬 عندك ${ctx.expiredChats} محادثة عدى عليها 24 ساعة`,
      en: (ctx: RuleContext) => `💬 ${ctx.expiredChats} conversation${ctx.expiredChats === 1 ? "" : "s"} passed 24 hours`,
    },
    message: {
      ar: "المحادثات دي خرجت من نافذة خدمة العملاء. لو هتبدأ محادثة جديدة، استخدم قالب WhatsApp معتمد.",
      en: "These conversations are outside the customer-service window. Use an approved WhatsApp template to start a new message.",
    },
    tip: {
      ar: "راجع المحادثات القديمة من صندوق المحادثات وحدد اللي محتاج متابعة.",
      en: "Review the older conversations in the inbox and follow up where needed.",
    },
    action: { label: { ar: "فتح المحادثات", en: "Open Conversations" }, target: "chat", type: "navigate" },
  },

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

  // ── 🤖 INFO: Agent Beta Access — دعوة التفعيل (Free/Go/Pro فقط) ─────────
  // التفعيل بزر من المساعد — العداد يبدأ من لحظة الضغط، لمرة واحدة.
  // P1: لا تُعرض الدعوة إلا والعميل جاهز (ربط واتساب سليم) حتى لا تضيع الأيام.
  {
    id:            "agent_beta_access",
    pages:         ["*"],
    severity:      "info",
    displayAs:     "card",
    cooldownHours: 0,
    condition:     ctx => ctx.role !== "CHAT_ONLY"
      && ctx.planTier !== "enterprise"
      && ctx.whatsappConnected === true
      && ctx.agentBetaEligible === true
      && ctx.agentBetaActive !== true,
    title:   { ar: "🤖 جرّب إيجنت وني مجاناً — Agent Beta Access", en: "🤖 Try Wani Agent free — Agent Beta Access" },
    message: {
      ar: "اتفتح لك تجربة إيجنت وني (Gemini) لمدة 5 أيام وبحد 30K توكن — بدون ما تغيّر باقتك. دوس تفعيل والعداد يبدأ.",
      en: "You got a Wani agent (Gemini) trial: 5 days, 30K tokens — no plan change. Activate and the timer starts.",
    },
    tip: {
      ar: "التجربة بتفتح تاب الأتمتة (جزء الإيجنت) وتفاصيل الاستهلاك — وبعد ما تخلص إعداداتك بتفضل محفوظة.",
      en: "The trial opens the Automation tab (agent part) and usage details — your settings stay saved after it ends.",
    },
    action:  { label: { ar: "تفعيل Agent Beta Access", en: "Activate Agent Beta Access" }, target: "activate_agent_beta", type: "action" },
    secondaryAction: { label: { ar: "شوف الأتمتة", en: "View Automation" }, target: "automation", type: "navigate" },
  },

  // ── ⏳ WARNING: البيتا قرّبت تخلص (يومين أو أقل) ────────────────────────
  {
    id:            "agent_beta_expiring",
    pages:         ["*"],
    severity:      "warning",
    displayAs:     "banner",
    cooldownHours: 12,
    condition:     ctx => ctx.agentBetaActive === true
      && (ctx.agentBetaDaysLeft ?? 99) <= 2,
    title:   {
      ar: (ctx: RuleContext) => `⏳ تجربة الإيجنت قرّبت تخلص — متبقي ${ctx.agentBetaDaysLeft ?? 0} ${((ctx.agentBetaDaysLeft ?? 0) === 1) ? "يوم" : "أيام"}`,
      en: (ctx: RuleContext) => `⏳ Agent trial expiring — ${ctx.agentBetaDaysLeft ?? 0} day(s) left`,
    },
    message: {
      ar: (ctx: RuleContext) => `متبقي ${(ctx.agentBetaRemaining ?? 0).toLocaleString("ar-EG")} توكن — رقِّ إلى Max عشان تكمل بدون توقف.`,
      en: (ctx: RuleContext) => `${(ctx.agentBetaRemaining ?? 0).toLocaleString("en-US")} tokens left — upgrade to Max to continue.`,
    },
    shortTitle:   { ar: "⏳ البيتا قرّبت تخلص", en: "⏳ Beta expiring" },
    shortMessage: { ar: "رقِّ إلى Max عشان تكمل.", en: "Upgrade to Max to continue." },
    action:  { label: { ar: "الترقية إلى Max", en: "Upgrade to Max" }, target: "/checkout?plan=max", type: "link" },
  },

  // ── ⚠️ WARNING: توكنز البيتا قرّبت تخلص ────────────────────────────────
  {
    id:            "agent_beta_low_tokens",
    pages:         ["*"],
    severity:      "warning",
    displayAs:     "banner",
    cooldownHours: 12,
    condition:     ctx => ctx.agentBetaActive === true && (ctx.agentBetaRemaining ?? 999999) <= 5000,
    title:   { ar: "⚠️ توكنز التجربة قرّبت تخلص", en: "⚠️ Trial tokens running low" },
    message: {
      ar: (ctx: RuleContext) => `متبقي ${(ctx.agentBetaRemaining ?? 0).toLocaleString("ar-EG")} توكن بس من الـ 30K — رقِّ إلى Max عشان تكمل.`,
      en: (ctx: RuleContext) => `Only ${(ctx.agentBetaRemaining ?? 0).toLocaleString("en-US")} of 30K tokens left — upgrade to Max.`,
    },
    shortTitle:   { ar: "⚠️ التوكنز قرّبت تخلص", en: "⚠️ Tokens low" },
    shortMessage: { ar: "متبقي أقل من 5K توكن.", en: "Less than 5K tokens left." },
    action:  { label: { ar: "الترقية إلى Max", en: "Upgrade to Max" }, target: "/checkout?plan=max", type: "link" },
  },

  // ── 🔒 CRITICAL: البيتا انتهت (مدة أو توكنز) ───────────────────────────
  {
    id:            "agent_beta_ended",
    pages:         ["automation", "home", "reports"],
    severity:      "warning",
    displayAs:     "banner",
    cooldownHours: 24,
    condition:     ctx => ctx.role !== "CHAT_ONLY"
      && ctx.planTier !== "enterprise"
      && ctx.agentBetaConsumed === true
      && ctx.agentBetaActive !== true
      && (ctx.agentBetaReason === "expired" || ctx.agentBetaReason === "tokens_exhausted"),
    title:   { ar: "🔒 انتهت Agent Beta Access", en: "🔒 Agent Beta Access ended" },
    message: {
      ar: "إعدادات الإيجنت بتاعتك محفوظة — رقِّ إلى Max عشان تفتحها تاني وتكمل.",
      en: "Your agent settings are saved — upgrade to Max to reopen and continue.",
    },
    shortTitle:   { ar: "🔒 انتهت التجربة", en: "🔒 Trial ended" },
    shortMessage: { ar: "إعداداتك محفوظة — رقِّ إلى Max.", en: "Settings saved — upgrade to Max." },
    action:  { label: { ar: "الترقية إلى Max", en: "Upgrade to Max" }, target: "/checkout?plan=max", type: "link" },
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