/**
 * src/types/woocommerce.ts
 *
 * Types للـ payloads الجاية من WooCommerce Webhooks.
 * مبنية على WooCommerce REST API v3.
 * https://woocommerce.github.io/woocommerce-rest-api-docs
 */

// ─── Shared ────────────────────────────────────────────────────────────────────

export interface WooAddress {
  first_name?: string | null;
  last_name?:  string | null;
  email?:      string | null;
  phone?:      string | null;
  address_1?:  string | null;
  city?:       string | null;
  country?:    string | null;
}

export interface WooMetaData {
  id?:    number;
  key:    string;
  value:  string | null;
}

export interface WooLineItem {
  id?:         number;
  name?:       string | null;
  quantity?:   number;
  total?:      string | null;
  sku?:        string | null;
  product_id?: number | null;
}

export interface WooCouponLine {
  id?:           number;
  code?:         string | null;
  discount?:     string | null;
  discount_type?: string | null;
}

export interface WooShippingLine {
  id?:           number;
  method_title?: string | null;
  method_id?:    string | null;
  total?:        string | null;
}

// ─── Order ─────────────────────────────────────────────────────────────────────

export interface WooOrder {
  id:                  number;
  number?:             number | null;
  status?:             string | null;
  currency?:           string | null;
  total?:              string | null;
  date_created?:       string | null;
  date_modified?:      string | null;
  billing?:            WooAddress | null;
  shipping?:           WooAddress | null;
  line_items?:         WooLineItem[];
  coupon_lines?:       WooCouponLine[];
  shipping_lines?:     WooShippingLine[];
  meta_data?:          WooMetaData[];
}

// ─── Customer ──────────────────────────────────────────────────────────────────

export interface WooCustomer {
  id:             number;
  email?:         string | null;
  first_name?:    string | null;
  last_name?:     string | null;
  billing?:       WooAddress | null;
  shipping?:      WooAddress | null;
  date_created?:  string | null;
  date_modified?: string | null;
}

// ─── Coupon ────────────────────────────────────────────────────────────────────

export interface WooCoupon {
  id:              number;
  code?:           string | null;
  discount_type?:  string | null;  // percent / fixed_cart / fixed_product
  amount?:         string | null;
  date_expires?:   string | null;
  usage_count?:    number;
  usage_limit?:    number | null;
}

// ─── Type Guards ───────────────────────────────────────────────────────────────

export function isWooOrder(payload: unknown): payload is WooOrder {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    typeof (payload as WooOrder).id === "number"
  );
}

export function isWooCustomer(payload: unknown): payload is WooCustomer {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    typeof (payload as WooCustomer).id === "number"
  );
}

export function isWooCoupon(payload: unknown): payload is WooCoupon {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    typeof (payload as WooCoupon).id === "number"
  );
}

// ─── Helper ────────────────────────────────────────────────────────────────────

/** استخراج tracking info من WooCommerce meta_data */
export function extractWooTracking(metaData: WooMetaData[] | undefined): {
  trackingUrl:      string | null;
  trackingNumber:   string | null;
  shippingProvider: string | null;
} {
  const find = (key: string) =>
    metaData?.find(m => m.key === key)?.value ?? null;

  return {
    trackingUrl:      find("_wc_shipment_tracking_url") ?? find("tracking_url"),
    trackingNumber:   find("_wc_shipment_tracking_number") ?? find("tracking_number"),
    shippingProvider: find("_wc_shipment_tracking_provider"),
  };
}