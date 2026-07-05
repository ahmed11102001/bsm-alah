import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";

// ── GET /api/developers/reports ──────────────────────────────────────────────
// تقارير المطور نفسه: المشاريع اللي عملها، سلّمها، نشطة، أو اتشال منها.
// مش تقارير OTP/رسايل بتاعت الأونر — دي حاجة تانية خالص وليها مكانها لكل مشروع.
export async function GET(req: NextRequest) {
    const session = await getDevSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    // كل المشاريع اللي المطور ده هو منشئها (developerId)، مش أي مشروع هو أونر ليه بس
    const projects: Array<{
        id: string;
        name: string;
        status: "ACTIVE" | "TRANSFERRED" | "ARCHIVED";
        createdAt: Date;
        transferredAt: Date | null;
        developerRemovedAt: Date | null;
        ownerId: string | null;
        owner: { firstName: string; lastName: string; email: string } | null;
    }> = await prisma.developerProject.findMany({
        where: { developerId: session.id },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            transferredAt: true,
            developerRemovedAt: true,
            ownerId: true,
            owner: { select: { firstName: true, lastName: true, email: true } },
        },
    });

    // ── KPIs ───────────────────────────────────────────────────────────────────
    const total = projects.length;
    const active = projects.filter(p => p.status === "ACTIVE" && !p.developerRemovedAt).length;
    const delivered = projects.filter(p => p.status === "TRANSFERRED" || p.transferredAt).length;
    const removedFrom = projects.filter(p => p.developerRemovedAt !== null).length;
    const archived = projects.filter(p => p.status === "ARCHIVED").length;
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    const distinctOwners = new Set(projects.filter(p => p.ownerId).map(p => p.ownerId)).size;

    // متوسط الوقت من الإنشاء للتسليم (بالأيام) للمشاريع المُسلَّمة بس
    const deliveredWithDates = projects.filter(p => p.transferredAt);
    const avgDeliveryDays = deliveredWithDates.length > 0
        ? Math.round(
            deliveredWithDates.reduce((sum: number, p) => {
                const days = (new Date(p.transferredAt!).getTime() - new Date(p.createdAt).getTime()) / 86_400_000;
                return sum + days;
            }, 0) / deliveredWithDates.length
        )
        : null;

    // ── اتجاه شهري: عدد المشاريع الجديدة آخر 12 شهر ─────────────────────────────
    const monthly: { month: string; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const count = projects.filter(p => {
            const c = new Date(p.createdAt);
            return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
        }).length;
        monthly.push({ month: key, count });
    }

    return NextResponse.json({
        kpis: { total, active, delivered, removedFrom, archived, deliveryRate, distinctOwners, avgDeliveryDays },
        monthly,
        projects: projects.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            createdAt: p.createdAt,
            transferredAt: p.transferredAt,
            developerRemovedAt: p.developerRemovedAt,
            ownerName: p.owner ? `${p.owner.firstName} ${p.owner.lastName}` : null,
            ownerEmail: p.owner?.email ?? null,
        })),
    });
}