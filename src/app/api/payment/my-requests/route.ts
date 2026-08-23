// src/app/api/payment/my-requests/route.ts
// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/payment/my-requests — قائمة طلبات الدفع (Invoices) الخاصة بالمستخدم
//  الحالي فقط، لتبويب "الفواتير" في صفحة الاستهلاك. الفرق عن
//  /api/admin/payments إن ده مقيّد بملكية الطلب (userId = ownerId الحالي) —
//  المستخدم يقدر يشوف فواتيره هو بس، مش فواتير أي حد تاني. مفيش أي عملية
//  تعديل هنا (Read-only)، القبول/الرفض لسه حصري للأدمن عبر /api/admin/payments.
// ══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

function resolveOwnerId(session: any): string {
    return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET() {
    const session = await getServerSession(authOptions);
    // صفحة الاستهلاك كلها (وبالتالي تبويب الفواتير) مقيّدة بـUSAGE_VIEW أصلاً
    // (OWNER بس — راجع src/proxy.ts) فده نفس مستوى الحماية بالظبط على الـAPI.
    const denied = requirePermission(session, "USAGE_VIEW");
    if (denied) return denied;

    const ownerId = resolveOwnerId(session);

    const [requests, subscription] = await Promise.all([
        prisma.paymentRequest.findMany({
            where: { userId: ownerId }, // ← ownership scoping: فواتيره هو بس
            orderBy: { createdAt: "desc" },
            take: 100,
            select: {
                id: true,
                type: true,
                planSlug: true,
                cycle: true,
                packageId: true,
                productName: true,
                amount: true,
                currency: true,
                paymentMethod: true,
                status: true,
                requestedAt: true,
                reviewedAt: true,
                rejectionReason: true,
                createdAt: true,
            },
        }),
        prisma.subscription.findUnique({
            where: { userId: ownerId },
            select: { plan: true, status: true, currentPeriodEnd: true },
        }),
    ]);

    return NextResponse.json({
        requests,
        subscription: subscription
            ? {
                plan: subscription.plan,
                status: subscription.status,
                currentPeriodEnd: subscription.currentPeriodEnd,
            }
            : null,
    });
}