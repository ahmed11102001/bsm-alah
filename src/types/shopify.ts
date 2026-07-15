/**
 * src/types/shopify.ts
 *
 * Types للـ payloads الجاية من Shopify Webhooks.
 * مبنية على Shopify REST Admin API 2024-01.
 * https://shopify.dev/docs/api/admin-rest/2024-01/resources/webhook
 */

// ─── Shared ────────────────────────────────────────────────────────────────────

export interface ShopifyAddress {
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address1?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface ShopifyCustomerBasic {
  id?: number | null;
  email?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  default_address?: ShopifyAddress | null;
}

export interface ShopifyFulfillment {
  id?: number;
  status?: string | null;
  tracking_url?: string | null;
  tracking_urls?: string[];
  tracking_number?: string | null;
}

// ─── Order ─────────────────────────────────────────────────────────────────────

export interface ShopifyOrder {
  id: number;
  order_number?: number | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  total_price?: string | null;
  currency?: string | null;
  phone?: string | null;
  created_at?: string | null;
  customer?: ShopifyCustomerBasic | null;
  billing_address?: ShopifyAddress | null;
  shipping_address?: ShopifyAddress | null;
  fulfillments?: ShopifyFulfillment[];
  line_items?: ShopifyLineItem[];
}

export interface ShopifyLineItem {
  id?: number;
  title?: string | null;
  quantity?: number;
  price?: string | null;
  sku?: string | null;
  variant_id?: number | null;
}

// ─── Customer (full webhook payload) ──────────────────────────────────────────

export interface ShopifyCustomer {
  id: number;
  email?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  default_address?: ShopifyAddress | null;
  addresses?: ShopifyAddress[];
  created_at?: string | null;
  updated_at?: string | null;
}

// ─── Checkout (abandoned cart webhook payload) ─────────────────────────────────

export interface ShopifyCheckoutLineItem {
  title?: string | null;
  quantity?: number;
  price?: string | null;
  sku?: string | null;
  product_id?: number | null;
  variant_id?: number | null;
}

export interface ShopifyCheckout {
  id: number;
  token: string;           // ← الـ unique identifier
  email?: string | null;
  phone?: string | null;
  total_price?: string | null;
  subtotal_price?: string | null;
  currency?: string | null;
  abandoned_checkout_url?: string | null;  // رابط استكمال الشراء
  created_at?: string | null;
  updated_at?: string | null;
  customer?: {
    id?: number;
    email?: string | null;
    phone?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  billing_address?: ShopifyAddress | null;
  shipping_address?: ShopifyAddress | null;
  line_items?: ShopifyCheckoutLineItem[];
}

// ─── Type Guards ───────────────────────────────────────────────────────────────
// بنتحقق إن الـ payload جاي صح من Shopify قبل ما نعالجه

export function isShopifyOrder(payload: unknown): payload is ShopifyOrder {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    typeof (payload as ShopifyOrder).id === "number"
  );
}

export function isShopifyCustomer(payload: unknown): payload is ShopifyCustomer {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    typeof (payload as ShopifyCustomer).id === "number"
  );
}

export function isShopifyCheckout(payload: unknown): payload is ShopifyCheckout {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "token" in payload &&
    typeof (payload as ShopifyCheckout).token === "string"
  );
}