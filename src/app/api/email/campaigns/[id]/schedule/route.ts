import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

// ─── POST /api/email/campaigns/[id]/schedule — جدولة حملة لوقت لاحق ─────────
// يضبط status = SCHEDULED + scheduledAt، ويبعت event لـ Inngest اللي بيصحى
// في الميعاد (step.sleepUntil) ويطلق الإرسال تلقائيًا.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const { scheduledAt } = body as { scheduledAt?: string };

    if (!scheduledAt) {
      return NextResponse.json({ error: "وقت الجدولة مطلوب" }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: "صيغة وقت الجدولة غير صالحة" }, { status: 400 });
    }

    if (scheduledDate.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "وقت الجدولة لازم يكون في المستقبل" },
        { status: 400 }
      );
    }

    const campaign = await prisma.emailCampaign.findFirst({
      where: { id, userId: ownerId },
      select: { id: true, status: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
    }

    // مينفعش تجدول حملة اتبعتت أو متجدولة/في الطابور بالفعل — DRAFT بس.
    if (campaign.status !== "DRAFT") {
      return NextResponse.json(
        { error: "لا يمكن جدولة هذه الحملة — حالتها الحالية لا تسمح بالجدولة" },
        { status: 409 }
      );
    }

    await prisma.emailCampaign.update({
      where: { id, userId: ownerId },
      data: { status: "SCHEDULED", scheduledAt: scheduledDate },
    });

    try {
      await inngest.send({
        name: "email/campaign.schedule",
        data: { campaignId: id, scheduledAt: scheduledDate.toISOString(), userId: ownerId },
      });
    } catch (err) {
      console.error("[api/email/campaigns/[id]/schedule POST] Inngest dispatch error:", err);
      // نرجّع الحالة لمسودة عشان Inngest موصلوش الحدث — الحملة متعلقةش كـ SCHEDULED للأبد.
      await prisma.emailCampaign.update({
        where: { id, userId: ownerId },
        data: { status: "DRAFT", scheduledAt: null },
      });
      return NextResponse.json(
        { error: "فشل جدولة الحملة — تعذر الوصول لخدمة الجدولة، حاول تاني" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      scheduled: true,
      campaignId: id,
      scheduledAt: scheduledDate.toISOString(),
    });
  } catch (err: any) {
    console.error("[api/email/campaigns/[id]/schedule POST]:", err);
    return NextResponse.json(
      { error: err?.message || "فشل جدولة الحملة البريدية" },
      { status: 500 }
    );
  }
}
