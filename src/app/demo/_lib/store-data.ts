import type {
    StoreInfo, AutomationItem, AutomationTemplate, Customer,
} from "@/app/demo/store/_components/types";
import { DEMO_STORE_NAME } from "./demo-data";

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 3600_000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const DEMO_STORE_INFO: StoreInfo = {
    id: "demo-store-1",
    storeName: DEMO_STORE_NAME,
    source: "shopify",
    totalOrders: 1284,
    totalCustomers: 812,
    campaignRevenue: 96_400,
    connectedAt: daysAgo(140),
    isActive: true,
    lastSyncAt: hoursAgo(1),
    totalSynced: 1284,
};

// ─── الأتمتات — الأربعة كلها مفعّلة وقوالبها معتمدة عشان تبان تجربة كاملة ───
export const DEMO_AUTOMATIONS: AutomationItem[] = [
    {
        id: "auto-1", type: "order_confirm", isEnabled: true, templateId: null, template: null,
        sentCount: 1204, failedCount: 12, lastSentAt: hoursAgo(1), delayMinutes: 0,
        isDedicated: true,
        dedicatedTemplate: { id: "tpl-confirm", name: "wani_order_confirm", status: "APPROVED" },
    },
    {
        id: "auto-2", type: "order_shipped", isEnabled: true, templateId: null, template: null,
        sentCount: 968, failedCount: 5, lastSentAt: hoursAgo(3), delayMinutes: 0,
        isDedicated: true,
        dedicatedTemplate: { id: "tpl-shipped", name: "wani_order_shipped", status: "APPROVED" },
    },
    {
        id: "auto-3", type: "cart_abandon", isEnabled: true, templateId: null, template: null,
        sentCount: 341, failedCount: 8, lastSentAt: hoursAgo(2), delayMinutes: 60,
        isDedicated: true,
        dedicatedTemplate: { id: "tpl-cart", name: "wani_cart_abandon", status: "APPROVED" },
    },
    {
        id: "auto-4", type: "promo", isEnabled: true, templateId: "tpl-promo-1",
        template: { id: "tpl-promo-1", name: "black_friday_offer" },
        sentCount: 3200, failedCount: 80, lastSentAt: daysAgo(2), delayMinutes: 0,
        isDedicated: false, dedicatedTemplate: null,
    },
];

export const DEMO_PROMO_TEMPLATES: AutomationTemplate[] = [
    { id: "tpl-promo-1", name: "black_friday_offer" },
    { id: "tpl-promo-2", name: "winter_launch" },
    { id: "tpl-promo-3", name: "vip_followup" },
];

// ─── عملاء المتجر ────────────────────────────────────────────────────────────
export const DEMO_STORE_CUSTOMERS: Customer[] = [
    {
        phone: "201112223334", name: "سارة أحمد", ordersCount: 4, totalSpent: 3120, currency: "EGP",
        lastOrder: { orderNumber: "4821", total: 890, status: "pending", orderedAt: hoursAgo(1) }
    },
    {
        phone: "201223344556", name: "عمر خالد", ordersCount: 2, totalSpent: 1450, currency: "EGP",
        lastOrder: { orderNumber: "4819", total: 650, status: "shipped", orderedAt: hoursAgo(3) }
    },
    {
        phone: "201099887766", name: "منى عبد الله", ordersCount: 1, totalSpent: 420, currency: "EGP",
        lastOrder: { orderNumber: "4810", total: 420, status: "fulfilled", orderedAt: daysAgo(3) }
    },
    {
        phone: "201155667788", name: "هدير مصطفى", ordersCount: 6, totalSpent: 5230, currency: "EGP",
        lastOrder: { orderNumber: "4790", total: 980, status: "fulfilled", orderedAt: daysAgo(9) }
    },
    {
        phone: "201033445566", name: "يوسف إبراهيم", ordersCount: 3, totalSpent: 2100, currency: "EGP",
        lastOrder: { orderNumber: "4805", total: 700, status: "cancelled", orderedAt: daysAgo(5) }
    },
    {
        phone: "201288997766", name: "نور الهدى", ordersCount: 1, totalSpent: 350, currency: "EGP",
        lastOrder: { orderNumber: "4801", total: 350, status: "pending", orderedAt: hoursAgo(6) }
    },
    {
        phone: "201512223344", name: "كريم عادل", ordersCount: 5, totalSpent: 4400, currency: "EGP",
        lastOrder: { orderNumber: "4795", total: 890, status: "fulfilled", orderedAt: daysAgo(7) }
    },
    {
        phone: "201677889900", name: "رنا سامي", ordersCount: 2, totalSpent: 1100, currency: "EGP",
        lastOrder: { orderNumber: "4788", total: 550, status: "shipped", orderedAt: daysAgo(1) }
    },
];