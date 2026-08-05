import type { Audience, Template, Conversation, Message } from "@/app/demo/chat/_components/types";

// ─────────────────────────────────────────────────────────────────────────
// كل الرسائل مؤرخة نسبيًا لوقت التحميل (Date.now() - كذا دقيقة) عشان الشات
// يحس إنه حي ومحدث دايمًا، مش تاريخ ثابت هيبان قديم بعد شهر.
// ─────────────────────────────────────────────────────────────────────────
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 3600_000).toISOString();

// ─── محادثة 1: سارة أحمد — وكيل واني الذكي بيقفل بيع كامل ─────────────────────
const sara: Conversation = {
    contact: { id: "demo-contact-sara", name: "سارة أحمد", phone: "201112223334" },
    lastMessage: {
        id: "m-sara-8", content: "تمام، هوصلك رابط تأكيد الطلب دلوقتي 🌸", type: "text",
        direction: "outbound", status: "read", createdAt: minutesAgo(2),
    },
    unreadCount: 0,
    lastMessageAt: minutesAgo(2),
    isArchived: false,
    textAiEnabled: true,
    aiStatus: "AUTO",
};

const saraMessages: Message[] = [
    { id: "m-sara-1", content: "مساء الخير، عايزة أعرف سعر طقم عطور ليالي الفاخر", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: minutesAgo(14) },
    { id: "m-sara-2", content: "أهلًا سارة 🌸 طقم ليالي الفاخر (3 عطور + بخاخ سفر) بـ 890 جنيه، وفيه عرض دلوقتي: التوصيل مجاني لأي طلب فوق 500 جنيه.", type: "text", direction: "outbound", status: "read", mediaUrl: null, createdAt: minutesAgo(13) },
    { id: "m-sara-3", content: "تمام، بس هيوصلني إمتى لو طلبت النهاردة؟", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: minutesAgo(10) },
    { id: "m-sara-4", content: "التوصيل من 2 لـ 4 أيام عمل داخل القاهرة والجيزة، وممكن تدفعي كاش عند الاستلام أو أونلاين دلوقتي.", type: "text", direction: "outbound", status: "read", mediaUrl: null, createdAt: minutesAgo(9) },
    { id: "m-sara-5", content: "تمام كده حلو، عايزة أطلب. اسمي سارة أحمد والعنوان مدينة نصر", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: minutesAgo(6) },
    { id: "m-sara-6", content: "تمام يا فندم ✅ سجلت طلبك:\n- طقم ليالي الفاخر × 1\n- الإجمالي: 890 جنيه (توصيل مجاني)\n- العنوان: مدينة نصر، القاهرة\n\nتأكدي التفاصيل في رسالة التأكيد الجايه.", type: "text", direction: "outbound", status: "read", mediaUrl: null, createdAt: minutesAgo(5) },
    { id: "m-sara-7", content: "تمام تسلم 🌸", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: minutesAgo(3) },
    { id: "m-sara-8", content: "تمام، هوصلك رابط تأكيد الطلب دلوقتي 🌸", type: "text", direction: "outbound", status: "read", mediaUrl: null, createdAt: minutesAgo(2) },
];

// ─── محادثة 2: عمر خالد — مسار أتمتة شحن كامل (للـ Timeline / فلتر الأتمتة) ───
const omar: Conversation = {
    contact: { id: "demo-contact-omar", name: "عمر خالد", phone: "201223344556" },
    lastMessage: {
        id: "m-omar-4", content: "تم شحن طلبك رقم #4821 🚚 هيوصلك خلال يومين", type: "text",
        direction: "outbound", status: "delivered", createdAt: minutesAgo(40),
    },
    unreadCount: 0,
    lastMessageAt: minutesAgo(40),
    isArchived: false,
    textAiEnabled: true,
    aiStatus: "AUTO",
};

const omarMessages: Message[] = [
    { id: "m-omar-1", content: "[قالب] شكرًا لطلبك رقم #4821! تم تأكيد الطلب وجاري التجهيز.", type: "text", direction: "outbound", status: "read", mediaUrl: null, createdAt: minutesAgo(180) },
    { id: "m-omar-2", content: "تمام تسلموا", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: minutesAgo(170) },
    { id: "m-omar-3", content: "[متابعة ذكية] طلبك بيتجهز دلوقتي، هيتشحن خلال ساعات ونبعتلك رقم التتبع أول ما يتحرك 📦", type: "text", direction: "outbound", status: "read", mediaUrl: null, createdAt: minutesAgo(120) },
    { id: "m-omar-4", content: "تم شحن طلبك رقم #4821 🚚 هيوصلك خلال يومين", type: "text", direction: "outbound", status: "delivered", mediaUrl: null, createdAt: minutesAgo(40) },
];

// ─── محادثة 3: منى عبد الله — استفسار عادي لسه من غير رد (unread) ─────────────
const mona: Conversation = {
    contact: { id: "demo-contact-mona", name: "منى عبد الله", phone: "201099887766" },
    lastMessage: {
        id: "m-mona-1", content: "عندكم شحن لأسوان؟", type: "text",
        direction: "inbound", status: "read", createdAt: minutesAgo(18),
    },
    unreadCount: 1,
    lastMessageAt: minutesAgo(18),
    isArchived: false,
    textAiEnabled: false,
    aiStatus: "NEEDS_HUMAN",
    handoffReason: "سؤال عن مناطق شحن غير مغطاة بالرد الآلي",
    handoffAt: minutesAgo(18),
};

const monaMessages: Message[] = [
    { id: "m-mona-1", content: "عندكم شحن لأسوان؟", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: minutesAgo(18) },
];

// ─── محادثة 4: هدير مصطفى — مؤرشفة (لفلتر الأرشيف) ───────────────────────────
const hadeer: Conversation = {
    contact: { id: "demo-contact-hadeer", name: "هدير مصطفى", phone: "201155667788" },
    lastMessage: {
        id: "m-hadeer-1", content: "شكرًا ليكم، حاجات هدية حلوة أوي 🎁", type: "text",
        direction: "inbound", status: "read", createdAt: daysAgo(9),
    },
    unreadCount: 0,
    lastMessageAt: daysAgo(9),
    isArchived: true,
    textAiEnabled: true,
    aiStatus: "AUTO",
};

const hadeerMessages: Message[] = [
    { id: "m-hadeer-1", content: "شكرًا ليكم، حاجات هدية حلوة أوي 🎁", type: "text", direction: "inbound", status: "read", mediaUrl: null, createdAt: daysAgo(9) },
];

export const DEMO_CONVERSATIONS: Conversation[] = [sara, omar, mona, hadeer];

export const DEMO_MESSAGES_BY_CONTACT: Record<string, Message[]> = {
    "demo-contact-sara": saraMessages,
    "demo-contact-omar": omarMessages,
    "demo-contact-mona": monaMessages,
    "demo-contact-hadeer": hadeerMessages,
};

export const DEMO_TEMPLATES: Template[] = [
    { id: "tpl-1", name: "order_confirm", content: "شكرًا لطلبك! تم تأكيد طلبك رقم {{1}} وجاري التجهيز.", status: "APPROVED" },
    { id: "tpl-2", name: "shipping_update", content: "تم شحن طلبك رقم {{1}} 🚚 هيوصلك خلال {{2}}.", status: "APPROVED" },
    { id: "tpl-3", name: "cart_abandon_reminder", content: "لسه شايف حاجات في عربتك 🛒 كمّل طلبك دلوقتي قبل ما تخلص الكمية!", status: "APPROVED" },
];

export const DEMO_AUDIENCES: Audience[] = [
    { id: "aud-1", name: "عملاء VIP" },
    { id: "aud-2", name: "طلبوا الجمعة البيضاء" },
];