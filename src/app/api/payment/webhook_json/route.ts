// src/app/api/payment/webhook_json/route.ts
// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/payment/webhook_json
//
//  الدوكيومنتيشن بتقول:
//    "In case you want to receive web hook data in json format be sure
//     that your url has _json ex: https://yourwebsite.com/webhook_json"
//
//  فواتيرك بتبعت ٣ أنواع من الـ events:
//    1. Paid        → { hashKey, invoice_key, invoice_id, payment_method, invoice_status: "paid", pay_load, referenceNumber }
//    2. Cancelled   → { hashKey, referenceId, status: "EXPIRED", paymentMethod, ... }
//    3. Failed      → { invoice_key, invoice_id, payment_method, errorMessage, ... } (مفيش hashKey)
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
    verifyFawaterakWebhook,
    verifyFawaterakCancelWebhook,
    type FawaterakWebhookPayload,
    type FawaterakCancelWebhookPayload,
} from "@/lib/fawaterak";
import {
    TOKEN_PACKAGES,
    BILLING_CYCLES,
    type BillingCycle,
} from "@/lib/pricing";
import type { PlanTier } from "@/lib/plans";

const SLUG_TO_TIER: Record<string, PlanTier> = {
    starter: "starter",
    pro: "pro",
    enterprise: "enterprise",
};

export async function POST(req: NextRequest) {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // ── تحديد نوع الـ webhook ─────────────────────────────────────────────────

    // 1. Paid webhook
    if (body.invoice_status === "paid") {
        return handlePaidWebhook(body as FawaterakWebhookPayload);
    }

    // 2. Cancelled/Expired webhook (Fawry, Aman, Masary)
    if (body.status === "EXPIRED") {
        return handleCancelWebhook(body as FawaterakCancelWebhookPayload);
    }

    // 3. Failed webhook (مفيش hashKey — فواتيرك بتبعت للمعلومات بس)
    if (body.errorMessage || body.invoice_id) {
        console.warn("[Webhook] Failed payment — invoice_id:", body.invoice_id, "error:", body.errorMessage);
        return NextResponse.json({ received: true });
    }

    console.warn("[Webhook] Unknown event type:", JSON.stringify(body).slice(0, 200));
    return NextResponse.json({ received: true });
}

// ── Handler: Paid ─────────────────────────────────────────────────────────────

async function handlePaidWebhook(payload: FawaterakWebhookPayload) {
    // 1. Verify HMAC
    if (!verifyFawaterakWebhook(payload)) {
        console.warn("[Webhook] HMAC مش صح — invoice_id:", payload.invoice_id);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse payLoad — دي JSON object جات من فواتيرك
    const meta = payload.pay_load as {
        type: "subscription" | "ai_credits" | "mcp_addon";
        userId: string;
        planSlug?: string;
        cycle?: BillingCycle;
        packageId?: string;
    } | null;

    if (!meta?.userId || !meta?.type) {
        console.error("[Webhook] payLoad ناقص:", meta);
        return NextResponse.json({ received: true });
    }

    const { userId, type } = meta;

    try {
        if (type === "subscription") {
            const tier = SLUG_TO_TIER[meta.planSlug ?? ""];
            if (!tier) throw new Error(`planSlug غير معروف: ${meta.planSlug}`);

            const cycle = meta.cycle ?? "monthly";
            const cycleInfo = BILLING_CYCLES[cycle] ?? BILLING_CYCLES.monthly;
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + cycleInfo.months);

            await prisma.subscription.upsert({
                where: { userId },
                update: {
                    plan: tier,
                    status: "active",
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    campaignsUsedThisMonth: 0,
                    mcpCommandsUsedThisMonth: 0,
                    aiTokensUsedThisMonth: 0,
                    periodResetAt: now,
                },
                create: {
                    userId,
                    plan: tier,
                    status: "active",
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                },
            });

            console.info(`[Webhook] ✅ Subscription — user=${userId} plan=${tier} cycle=${cycle}`);

        } else if (type === "ai_credits") {
            const pkg = TOKEN_PACKAGES.find(p => p.id === meta.packageId);
            if (!pkg) throw new Error(`packageId غير معروف: ${meta.packageId}`);

            await prisma.subscription.update({
                where: { userId },
                data: { aiTokensBonusBalance: { increment: pkg.tokens } },
            });

            console.info(`[Webhook] ✅ AI Credits — user=${userId} +${pkg.tokens} tokens`);

        } else if (type === "mcp_addon") {
            // -999999 يخلي العداد تحت الـ limit فيبقى "غير محدود" للشهر
            await prisma.subscription.update({
                where: { userId },
                data: { mcpCommandsUsedThisMonth: { decrement: 999_999 } },
            });

            console.info(`[Webhook] ✅ MCP Addon — user=${userId}`);
        }

        return NextResponse.json({ received: true, success: true });

    } catch (err: any) {
        console.error("[Webhook] خطأ في DB:", err?.message);
        // نرجع 200 عشان فواتيرك ما تعيدش الإرسال
        return NextResponse.json({ received: true, error: err?.message }, { status: 200 });
    }
}

// ── Handler: Cancelled/Expired ────────────────────────────────────────────────

async function handleCancelWebhook(payload: FawaterakCancelWebhookPayload) {
    if (!verifyFawaterakCancelWebhook(payload)) {
        console.warn("[Webhook] Cancel HMAC مش صح — transactionId:", payload.transactionId);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // للـ cancel مش محتاجين نعمل حاجة في الـ DB — الفاتورة اتنهت من غير دفع
    console.info(`[Webhook] Cancel/Expired — ref=${payload.referenceId} method=${payload.paymentMethod}`);
    return NextResponse.json({ received: true });
}