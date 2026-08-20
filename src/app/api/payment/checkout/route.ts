// src/app/api/payment/checkout/route.ts
// ══════════════════════════════════════════════════════════════════════════════
//  ⚠️ DISABLED / FUTURE PAYMENT PROVIDER — Fawaterak
//  ─────────────────────────────────────────────────────────────────────────
//  هذا الـendpoint ليس جزءًا من الـflow النشط للدفع حاليًا. نظام الدفع الرسمي
//  هو الدفع اليدوي (Manual Payment):
//    - إنشاء الطلب:  POST /api/payment/manual/request  (src/lib/payment-requests.ts)
//    - مراجعة الأدمن: تبويب "المدفوعات" في /dashboard/admin
//  الكود هنا (وفي src/lib/fawaterak.ts وwebhook_json/route.ts) اتسيب موجود
//  عمدًا كمرجع لتفعيل Fawaterak مستقبلًا، لكنه مُعطّل الآن: أي محاولة استدعاء
//  بترجع 503. لا تربطه بأي Frontend flow جديد من غير ما تشيل الـguard ده.
// ══════════════════════════════════════════════════════════════════════════════
//
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
import { requirePermission } from "@/lib/permissions";

// اقلبه true فقط لو قررتم تفعيل Fawaterak فعليًا كوسيلة دفع بديلة/إضافية.
const FAWATERAK_ENABLED = false;

function resolveOwnerId(session: any): string {
    return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function POST(req: NextRequest) {
    // ── DISABLED — راجع تعليق أعلى الملف ────────────────────────────────────────
    if (!FAWATERAK_ENABLED) {
        return NextResponse.json(
            {
                error:
                    "بوابة الدفع الإلكتروني غير مفعّلة حاليًا. استخدم الدفع اليدوي عبر صفحة /checkout.",
            },
            { status: 503 }
        );
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "BILLING_MANAGE");
    if (denied) return denied;

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

    const appUrl = (process.env.NEXTAUTH_URL ?? "https://aiwni.com").replace(/\/$/, "");

    if (type === "subscription") {
        if (!planSlug || !SUBSCRIPTION_PLANS[planSlug])
            return NextResponse.json({ error: "الباقة غير صالحة" }, { status: 400 });

        const plan = SUBSCRIPTION_PLANS[planSlug];
        const billingCycle: BillingCycle = planSlug === "starter"
            ? "monthly"
            : (BILLING_CYCLES[cycle] ? cycle : "monthly");
        const cycleInfo = BILLING_CYCLES[billingCycle];
        const baseCartTotal = computePrice(plan.monthly, billingCycle) * cycleInfo.months;

        // ── تطبيق رصيد الإحالات إن وُجد ───────────────────────────────────────
        let creditApplied = 0;
        const { getAvailableReferralCredit, applyReferralCreditToInvoice } = await import("@/lib/referral/service");
        const availableCredit = await getAvailableReferralCredit(ownerId);

        if (body.useReferralCredit !== false && availableCredit > 0) {
            creditApplied = Math.min(availableCredit, baseCartTotal);
        }

        cartTotal = Math.max(0, baseCartTotal - creditApplied);
        itemName = `اشتراك ${plan.name} — ${cycleInfo.label}${creditApplied > 0 ? ` (تم خصم ${creditApplied} ج.م رصيد إحالات)` : ""}`;
        payLoadObj = { type: "subscription", planSlug, cycle: billingCycle, userId: ownerId, creditApplied };

        // ── إذا كان الرصيد يغطي الفاتورة بالكامل (Amount Due = 0) ─────────────
        if (cartTotal === 0) {
            await applyReferralCreditToInvoice({
                userId: ownerId,
                amountToDeduct: creditApplied,
                description: `تغطية اشتراك ${plan.name} بالكامل من رصيد الإحالات`,
            });

            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + cycleInfo.months);

            await prisma.subscription.upsert({
                where: { userId: ownerId },
                update: {
                    plan: planSlug,
                    status: "active",
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    campaignsUsedThisMonth: 0,
                    mcpCommandsUsedThisMonth: 0,
                    aiTokensUsedThisMonth: 0,
                    periodResetAt: now,
                },
                create: {
                    userId: ownerId,
                    plan: planSlug,
                    status: "active",
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                },
            });

            return NextResponse.json({
                success: true,
                coveredByCredit: true,
                checkoutUrl: "/payment/success",
            });
        }

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
