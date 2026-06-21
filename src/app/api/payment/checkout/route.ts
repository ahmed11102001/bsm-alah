// src/app/api/payment/checkout/route.ts
// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/payment/checkout
//  ينشئ فاتورة على فواتيرك ويرجع { checkoutUrl } للـ client
//
//  Body: {
//    type:       "subscription" | "ai_credits" | "mcp_addon"
//    planSlug?:  "starter" | "pro" | "enterprise"
//    cycle?:     "monthly" | "quarterly" | "annual"
//    packageId?: "pack_500k" | "pack_1m" | "pack_2m" | "mcp_addon_unlimited"
//  }
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
    SUBSCRIPTION_PLANS,
    TOKEN_PACKAGES,
    MCP_ADDON_PACKAGES,
    BILLING_CYCLES,
    computePrice,
    type PlanSlug,
    type BillingCycle,
    type TokenPackageId,
    type McpAddonPackageId,
} from "@/lib/pricing";
import {
    createFawaterakInvoice,
    buildFawaterakCustomer,
} from "@/lib/fawaterak";

function resolveOwnerId(session: any): string {
    return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function POST(req: NextRequest) {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user)
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const ownerId = resolveOwnerId(session);

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const {
        type,
        planSlug,
        cycle = "monthly",
        packageId,
    } = body as {
        type: "subscription" | "ai_credits" | "mcp_addon";
        planSlug?: PlanSlug;
        cycle?: BillingCycle;
        packageId?: TokenPackageId | McpAddonPackageId;
    };

    if (!type)
        return NextResponse.json({ error: "يجب تحديد نوع العملية (type)" }, { status: 400 });

    // ── Fetch user ────────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { name: true, email: true, phone: true },
    });
    if (!user)
        return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    const sub = await prisma.subscription.findUnique({
        where: { userId: ownerId },
        select: { plan: true },
    });

    // ── Build cart ────────────────────────────────────────────────────────────
    let cartTotal: number;
    let itemName: string;
    let payLoadObj: object;   // JSON object كما تطلب الدوكيومنتيشن

    const appUrl = (process.env.NEXTAUTH_URL ?? "https://whatspro.app").replace(/\/$/, "");

    if (type === "subscription") {
        if (!planSlug || !SUBSCRIPTION_PLANS[planSlug])
            return NextResponse.json({ error: "الباقة غير صالحة" }, { status: 400 });

        const plan = SUBSCRIPTION_PLANS[planSlug];
        const cycleInfo = BILLING_CYCLES[cycle] ?? BILLING_CYCLES.monthly;
        cartTotal = computePrice(plan.monthly, cycle) * cycleInfo.months;
        itemName = `اشتراك ${plan.name} — ${cycleInfo.label}`;
        payLoadObj = { type: "subscription", planSlug, cycle, userId: ownerId };

    } else if (type === "ai_credits") {
        if (!sub || sub.plan !== "enterprise")
            return NextResponse.json(
                { error: "كريديتس الـ AI متاحة لمشتركي Enterprise فقط" },
                { status: 403 }
            );

        const pkg = TOKEN_PACKAGES.find(p => p.id === packageId);
        if (!pkg)
            return NextResponse.json({ error: "حزمة كريديتس غير صالحة" }, { status: 400 });

        cartTotal = pkg.priceEGP;
        itemName = `${pkg.label} — كريديتس AI إضافية`;
        payLoadObj = { type: "ai_credits", packageId, userId: ownerId };

    } else if (type === "mcp_addon") {
        if (!sub || sub.plan === "free" || sub.plan === "starter")
            return NextResponse.json(
                { error: "إضافة Claude متاحة لمشتركي Professional وما فوقها" },
                { status: 403 }
            );

        const pkg = MCP_ADDON_PACKAGES.find(p => p.id === packageId);
        if (!pkg)
            return NextResponse.json({ error: "حزمة MCP غير صالحة" }, { status: 400 });

        cartTotal = pkg.priceEGP;
        itemName = pkg.label;
        payLoadObj = { type: "mcp_addon", packageId, userId: ownerId };

    } else {
        return NextResponse.json({ error: "نوع عملية غير معروف" }, { status: 400 });
    }

    // ── Create Fawaterak Invoice ───────────────────────────────────────────────
    try {
        const customer = buildFawaterakCustomer(user);

        // الـ webhook URL لازم يحتوي على _json عشان فواتيرك تبعت JSON
        // حسب الدوكيومنتيشن: "your url has _json ex: https://yourwebsite.com/webhook_json"
        const webhookUrl = `${appUrl}/api/payment/webhook_json`;

        const { checkoutUrl, invoiceKey, invoiceId } = await createFawaterakInvoice({
            cartTotal: String(cartTotal),   // الدوكيومنتيشن بتقبله string أو decimal
            currency: "EGP",
            customer,
            cartItems: [
                {
                    name: itemName,
                    price: String(cartTotal),
                    quantity: "1",
                },
            ],
            redirectionUrls: {
                successUrl: `${appUrl}/payment/success`,
                failUrl: `${appUrl}/payment/fail`,
                pendingUrl: `${appUrl}/payment/pending`,
                webhookUrl,  // يتجاوز webhook الـ dashboard
            },
            payLoad: payLoadObj,   // JSON object مش string
            sendEmail: false,
            sendSMS: false,
        });

        console.info(
            `[Payment] Invoice created — id=${invoiceId} key=${invoiceKey} total=${cartTotal} EGP type=${type}`
        );

        return NextResponse.json({ success: true, checkoutUrl, invoiceKey, invoiceId });

    } catch (err: any) {
        console.error("[Payment] فشل إنشاء فاتورة فواتيرك:", err?.message ?? err);
        return NextResponse.json(
            { error: "حدث خطأ أثناء إنشاء الفاتورة، حاول مرة أخرى" },
            { status: 502 }
        );
    }
}