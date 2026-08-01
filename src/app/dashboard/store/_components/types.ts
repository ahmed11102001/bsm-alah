// src/app/dashboard/store/_components/types.ts
// ─── أنواع مشتركة لصفحة المتجر ──────────────────────────────────────────────

export type StoreAutomationType = "order_confirm" | "order_shipped" | "promo" | "cart_abandon";
export type Lang = "ar" | "en";

export interface StoreInfo {
    id: string;
    storeName: string;
    source: "shopify" | "easyorders" | "woocommerce";
    totalOrders: number;
    totalCustomers: number;
    campaignRevenue: number;
    connectedAt: string;
    isActive?: boolean;
    lastSyncAt?: string | null;
    totalSynced?: number;
}

export interface CustomerLastOrder {
    orderNumber: string | null;
    total: number | null;
    status: string | null;
    orderedAt: string;
}

export interface Customer {
    phone: string;
    name: string;
    ordersCount: number;
    totalSpent: number;
    currency: string;
    lastOrder: CustomerLastOrder | null;
}

export interface AutomationTemplate {
    id: string;
    name: string;
}

export interface DedicatedTemplate {
    id: string;
    name: string;
    status: string;
}

export interface AutomationItem {
    id: string | null;
    type: StoreAutomationType;
    isEnabled: boolean;
    templateId: string | null;
    template: AutomationTemplate | null;
    sentCount: number;
    failedCount: number;
    lastSentAt: string | null;
    delayMinutes?: number;
    // حقول جديدة
    isDedicated: boolean;
    dedicatedTemplate: DedicatedTemplate | null;
}

export interface StoreData {
    shopify: StoreInfo | null;
    easyorders: StoreInfo | null;
    woocommerce: StoreInfo | null;
}