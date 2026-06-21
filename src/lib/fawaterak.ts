// src/lib/fawaterak.ts
// ══════════════════════════════════════════════════════════════════════════════
//  فواتيرك — Payment Gateway Integration
//  API Docs: https://fawaterak-api.readme.io/reference/overview
//
//  Environments:
//    Staging:    https://staging.fawaterk.com/api/v2
//    Production: https://app.fawaterk.com/api/v2
// ══════════════════════════════════════════════════════════════════════════════

import { createHmac } from "crypto";

// ─── Base URL حسب الـ environment ───────────────────────────────────────────
// staging للتجارب، production للـ live
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const FAWATERAK_BASE_URL = IS_PRODUCTION
    ? "https://app.fawaterk.com/api/v2"
    : "https://staging.fawaterk.com/api/v2";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FawaterakCustomer {
    first_name: string;
    last_name: string;
    email?: string;   // optional حسب الدوكيومنتيشن
    phone?: string;   // optional
    address?: string;
}

export interface FawaterakCartItem {
    name: string;
    price: string | number;   // decimal
    quantity: string | number;   // integer
}

export interface CreateInvoiceParams {
    cartTotal: number | string;   // decimal — mandatory
    currency: "EGP" | "USD" | "SR" | "AED" | "KWD" | "QAR" | "BHD";
    customer: FawaterakCustomer;
    cartItems: FawaterakCartItem[];
    redirectionUrls: {
        successUrl: string;
        failUrl: string;
        pendingUrl: string;
        webhookUrl?: string;   // يتجاوز URL الـ dashboard لو محتاج
    };
    payLoad?: object | null;   // JSON object — مش string
    sendEmail?: boolean;
    sendSMS?: boolean;
    due_date?: string;          // Y-m-d
}

// Response من createInvoiceLink
export interface FawaterakInvoiceResponse {
    status: "success" | "fail";
    data: {
        url: string;
        invoiceKey: string;
        invoiceId: number;
    };
}

// Webhook payload — paid
export interface FawaterakWebhookPayload {
    hashKey: string;
    invoice_key: string;
    invoice_id: number;
    payment_method: string;
    invoice_status: "paid";
    pay_load: object | null;
    referenceNumber: string;
}

// Webhook payload — cancelled (Fawry/Aman expired)
export interface FawaterakCancelWebhookPayload {
    hashKey: string;
    referenceId: string;
    status: "EXPIRED";
    paymentMethod: string;
    pay_load: string | null;
    transactionId: number;
    transactionKey: string;
}

// ─── Core API call ────────────────────────────────────────────────────────────

async function fawaterakPost<T>(
    endpoint: string,
    body: object
): Promise<T> {
    const apiKey = process.env.FAWATERAK_API_KEY;
    if (!apiKey) throw new Error("[Fawaterak] FAWATERAK_API_KEY غير موجود في env");

    const url = `${FAWATERAK_BASE_URL}${endpoint}`;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`[Fawaterak] HTTP ${res.status} on ${url}: ${text}`);
    }

    return res.json() as Promise<T>;
}

// ─── Create Invoice Link ──────────────────────────────────────────────────────
// POST /createInvoiceLink
// الدوكيومنتيشن: https://fawaterak-api.readme.io/reference/sendpayment

export async function createFawaterakInvoice(
    params: CreateInvoiceParams
): Promise<{ checkoutUrl: string; invoiceKey: string; invoiceId: number }> {

    const result = await fawaterakPost<FawaterakInvoiceResponse>(
        "/createInvoiceLink",
        params
    );

    if (result.status !== "success" || !result.data?.url) {
        throw new Error("[Fawaterak] فشل إنشاء الفاتورة: " + JSON.stringify(result));
    }

    return {
        checkoutUrl: result.data.url,
        invoiceKey: result.data.invoiceKey,
        invoiceId: result.data.invoiceId,
    };
}

// ─── Verify Paid Webhook Signature ───────────────────────────────────────────
// الدوكيومنتيشن:
//   secretKey  = FAWATERAK_VENDOR_KEY  (مش API key — ده مختلف)
//   queryParam = "InvoiceId={id}&InvoiceKey={key}&PaymentMethod={method}"
//   hash       = HMAC-SHA256(queryParam, secretKey)

export function verifyFawaterakWebhook(
    payload: FawaterakWebhookPayload
): boolean {
    const vendorKey = process.env.FAWATERAK_VENDOR_KEY;
    if (!vendorKey) {
        console.error("[Fawaterak] FAWATERAK_VENDOR_KEY غير موجود في env");
        return false;
    }

    const queryParam = `InvoiceId=${payload.invoice_id}&InvoiceKey=${payload.invoice_key}&PaymentMethod=${payload.payment_method}`;
    const expected = createHmac("sha256", vendorKey)
        .update(queryParam)
        .digest("hex");

    return expected === payload.hashKey;
}

// ─── Verify Cancelled/Expired Webhook (Fawry/Aman) ───────────────────────────
// queryParam مختلف: "referenceId={id}&PaymentMethod={method}"

export function verifyFawaterakCancelWebhook(
    payload: FawaterakCancelWebhookPayload
): boolean {
    const vendorKey = process.env.FAWATERAK_VENDOR_KEY;
    if (!vendorKey) return false;

    const queryParam = `referenceId=${payload.referenceId}&PaymentMethod=${payload.paymentMethod}`;
    const expected = createHmac("sha256", vendorKey)
        .update(queryParam)
        .digest("hex");

    return expected === payload.hashKey;
}

// ─── Build customer object from user data ────────────────────────────────────

export function buildFawaterakCustomer(user: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
}): FawaterakCustomer {
    const nameParts = (user.name ?? "عميل واتس برو").trim().split(/\s+/);
    return {
        first_name: nameParts[0] ?? "عميل",
        last_name: nameParts.slice(1).join(" ") || "واتس برو",
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        address: "Egypt",
    };
}