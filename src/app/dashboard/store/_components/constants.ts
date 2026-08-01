// src/app/dashboard/store/_components/constants.ts
// ─── إعدادات ثابتة وترجمات صفحة المتجر ──────────────────────────────────────

import type { Lang, StoreAutomationType } from "./types";

// اسم القالب المخصص المطلوب لكل نوع أتمتة تلقائية
// المستخدم لازم يعمل قوالب على ميتا بهذه الأسماء بالظبط
export const DEDICATED_TEMPLATE_NAMES: Record<string, string> = {
    order_confirm: "wani_order_confirm",
    order_shipped: "wani_order_shipped",
    cart_abandon: "wani_cart_abandon",
};

export const AUTO_LABELS: Record<StoreAutomationType, {
    label: { ar: string; en: string };
    desc: { ar: string; en: string };
    icon: string;
    shopifyOnly?: boolean;
    isDedicated?: boolean; // لو true: قالب مخصص ثابت، مش اختيار حر
}> = {
    order_confirm: {
        label: { ar: "تأكيد الأوردر", en: "Order Confirmation" },
        desc: { ar: "يُرسل فور إنشاء الطلب", en: "Sent instantly on order creation" },
        icon: "✅",
        isDedicated: true,
    },
    order_shipped: {
        label: { ar: "تحديث الشحن", en: "Shipping Update" },
        desc: { ar: "يُرسل لما يتشحن الطلب", en: "Sent when order is shipped" },
        icon: "🚚",
        isDedicated: true,
    },
    promo: {
        label: { ar: "عروض وخصومات", en: "Promotions" },
        desc: { ar: "ترسله يدوياً للعملاء", en: "Send manually to customers" },
        icon: "🎁",
    },
    cart_abandon: {
        label: { ar: "استرداد السلة", en: "Abandoned Cart" },
        desc: { ar: "يُرسل بعد ساعة من ترك السلة", en: "Sent 1 hour after cart is left" },
        icon: "🛒",
        shopifyOnly: true,
        isDedicated: true,
    },
};

export const STATUS_BADGE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    fulfilled: "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400",
    shipped: "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400",
    cancelled: "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
};

export const TX = {
    openChat: { ar: "فتح المحادثة", en: "Open Chat" },
    ordersCount: { ar: "طلب", en: "orders" },
    totalOrders: { ar: "إجمالي الطلبات", en: "Total Orders" },
    totalCustomers: { ar: "إجمالي العملاء", en: "Total Customers" },
    campaignRevenue: { ar: "إيرادات الحملات", en: "Campaign Revenue" },
    revenueSub: { ar: "من رسائل واتساب", en: "From WhatsApp messages" },
    lastSync: { ar: "آخر مزامنة", en: "Last Sync" },
    savedOrders: { ar: "طلب محفوظ", en: "saved orders" },
    automationsTitle: { ar: "⚙️ أتمتات المتجر", en: "⚙️ Store Automations" },
    enabled: { ar: "مفعّل", en: "enabled" },
    customersTitle: { ar: "👥 العملاء", en: "👥 Customers" },
    searchPh: { ar: "اسم أو رقم أو طلب...", en: "Name, number, or order..." },
    noCustomers: { ar: "لا يوجد عملاء مطابقون", en: "No matching customers" },
    loadMore: { ar: "تحميل المزيد", en: "Load more" },
    listTitle: { ar: "قائمة", en: "List" },
    syncedContacts: { ar: "جهة اتصال مزامَنة من المتجر", en: "contacts synced from store" },
    goContacts: { ar: "عرض القائمة", en: "View list" },
    goContactsToast: { ar: "اذهب إلى صفحة الجمهور", en: "Go to Audience page" },
    manualSync: { ar: "مزامنة يدوية", en: "Manual Sync" },
    manualSyncSub: { ar: "سحب آخر 100 طلب من إيزي أوردرز", en: "Pull latest 100 orders from EasyOrders" },
    syncing: { ar: "جاري المزامنة...", en: "Syncing..." },
    syncNow: { ar: "مزامنة الآن", en: "Sync now" },
    webhookTitle: { ar: "الطلبات تصل تلقائياً عبر Webhook", en: "Orders arrive automatically via Webhook" },
    webhookSub: { ar: "كل أوردر جديد في WooCommerce بيوصل فوراً", en: "Every new WooCommerce order arrives instantly" },
    active: { ar: "نشط", en: "Active" },
    webhookHint: { ar: "لو محتاج تضيف الـ Webhook من جديد، روح صفحة التكاملات  وانسخ الرابط من قسم WooCommerce.", en: "If you need to add the webhook again, go to Integrations page and copy the WooCommerce URL." },
    storeLoadErr: { ar: "تعذر تحميل بيانات المتجر", en: "Failed to load store data" },
    noStore: { ar: "لم يتم ربط أي متجر بعد", en: "No store connected yet" },
    noStoreSub: { ar: "اذهب إلى صفحة التكاملات لربط متجر Shopify أو EasyOrders أو WooCommerce", en: "Go to Integrations page to connect Shopify, EasyOrders, or WooCommerce" },
    connected: { ar: "متصل", en: "Connected" },
    storeFallback: { ar: "المتجر", en: "Store" },
};

export const tr = (k: keyof typeof TX, lang: Lang) => TX[k][lang];