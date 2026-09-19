import React from "react";

export type StoreCardId = "shopify" | "easyorders" | "woocommerce";

export interface StoreCardVisual {
  id: StoreCardId;
  icon: React.ReactNode;
}

export const STORE_CARD_VISUALS: StoreCardVisual[] = [
  { id: "shopify", icon: <img src="/partners/shopify.svg" alt="Shopify" className="w-5 h-5 object-contain" /> },
  { id: "easyorders", icon: <img src="/partners/easyorder.svg" alt="EasyOrders" className="w-5 h-5 object-contain" /> },
  { id: "woocommerce", icon: <img src="/partners/woocommerce.svg" alt="WooCommerce" className="w-5 h-5 object-contain" /> },
];

export interface StepItem {
  title: string;
  desc: string;
}

export interface ExternalLinkItem {
  href: string;
  label: string;
}

export interface StoreCardDef {
  id: StoreCardId;
  title: string;
  subtitle: string;
  steps: StepItem[];
  externalLink?: ExternalLinkItem;
  /** محتوى إضافي اختياري داخل الدليل (مثال: صندوق نسخ الصلاحيات) */
  guideExtra?: React.ReactNode;
}
