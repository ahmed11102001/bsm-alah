// src/app/api/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CampaignStatus, MessageDirection, MessageStatus, QueueStatus } from "@/types/enums";
import {
  checkCampaignsLimit, checkFeature,
  consumeCampaignQuotaAtomic, refundCampaignQuota,
  incrementCampaignUsage, guardResponse,
} from "@/lib/plan-guard";
import { enqueueCampaign } from "@/lib/queue";
import { inngest } from "@/inngest/client";
import { decryptToken } from "@/lib/crypto";
function resolveUserId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

// ─── GET /api/campaigns ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });

    const userId = resolveUserId(session);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);

    const where: any = { userId };
    if (status && status !== "all") where.status = status;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const [rawCampaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          template: { select: { name: true, content: true, category: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    // ── احسب totalQueued + queuedCount + deliveredCount + readCount لكل حملة ──
    const campaignIds = rawCampaigns.map(c => c.id);

    const [
      totalQueueCounts,
      pendingCounts,
      deliveredCounts,
      readCounts,
    ] = await Promise.all([
      prisma.messageQueue.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: campaignIds } },
        _count: { id: true },
      }),
      prisma.messageQueue.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: campaignIds }, status: QueueStatus.pending },
        _count: { id: true },
      }),
      // ✅ deliveredCount من Message table مباشرة — نفس منطق صفحة التقارير
      prisma.message.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: campaignIds }, status: MessageStatus.delivered },
        _count: { id: true },
      }),
      // ✅ readCount من Message table مباشرة — نفس منطق صفحة التقارير
      prisma.message.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: campaignIds }, status: MessageStatus.read },
        _count: { id: true },
      }),
    ]);

    const totalMap = new Map(
      totalQueueCounts.map(p => [p.campaignId, p._count.id])
    );

    const pendingMap = new Map(
      pendingCounts.map(p => [p.campaignId, p._count.id])
    );

    const deliveredMap = new Map(
      deliveredCounts.map(p => [p.campaignId!, p._count.id])
    );

    const readMap = new Map(
      readCounts.map(p => [p.campaignId!, p._count.id])
    );

    // ── شكّل الـ response بكل البيانات الحقيقية ──────────────────────────────
    const campaigns = rawCampaigns.map(c => {
      const totalQueued = totalMap.get(c.id) ?? 0;
      const queuedCount = pendingMap.get(c.id) ?? 0;
      const deliveredCount = deliveredMap.get(c.id) ?? 0;  // ✅ من Message table
      const readCount = readMap.get(c.id) ?? 0;  // ✅ من Message table

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        sentCount: c.sentCount,
        deliveredCount,                                       // ✅ من Message table
        readCount,                                            // ✅ من Message table
        failedCount: c.failedCount,
        totalQueued,
        queuedCount,
        scheduledAt: c.scheduledAt,
        createdAt: c.createdAt,
        completedAt: c.completedAt,
        template: c.template,
      };
    });

    return NextResponse.json({ campaigns, total, page, limit });
  } catch (err) {
    console.error("GET /api/campaigns:", err);
    return NextResponse.json({ error: "فشل في جلب الحملات" }, { status: 500 });
  }
}

// ─── POST /api/campaigns ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // ── MCP internal call bypass ──────────────────────────────────────────
    const body = await req.json();
    if (body._mcpInternal === true && body._mcpOwnerId) {
      const mcpUserId = body._mcpOwnerId as string;
      // تحقق إن المستخدم موجود فعلاً
      const mcpUser = await prisma.user.findUnique({
        where: { id: mcpUserId, deletedAt: null },
        select: { id: true },
      });
      if (!mcpUser)
        return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 401 });
      // نظّف الـ internal fields قبل ما نمرر الـ body
      const { _mcpInternal: _, _mcpOwnerId: __, ...cleanBody } = body;
      return handleCreate(mcpUserId, cleanBody);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });

    const userId = resolveUserId(session);

    if (body._action === "repeat" && body.campaignId)
      return handleRepeat(userId, body.campaignId);

    return handleCreate(userId, body);
  } catch (err: any) {
    console.error("POST /api/campaigns:", err);
    return NextResponse.json({ error: err.message ?? "خطأ في السيرفر" }, { status: 500 });
  }
}

// ─── DELETE /api/campaigns ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });

    const userId = resolveUserId(session);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

    const campaign = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!campaign)
      return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });

    await prisma.$transaction([
      prisma.messageQueue.updateMany({
        where: { campaignId: id, status: QueueStatus.pending },
        data: { status: QueueStatus.cancelled },
      }),
      prisma.message.deleteMany({ where: { campaignId: id } }),
      prisma.campaign.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/campaigns:", err);
    return NextResponse.json({ error: "فشل الحذف" }, { status: 500 });
  }
}

// ─── handleCreate ─────────────────────────────────────────────────────────────
async function handleCreate(userId: string, body: any) {
  const { name, templateName, numbers, scheduledAt, templateVars, attributionHours, recipients } = body;

  // Validate attributionHours (1–168 ساعة = أسبوع)
  if (attributionHours !== undefined) {
    const h = Number(attributionHours);
    if (!Number.isInteger(h) || h < 1 || h > 168)
      return NextResponse.json({ error: "attributionHours يجب أن يكون بين 1 و 168 ساعة" }, { status: 400 });
  }

  if (!name?.trim())
    return NextResponse.json({ error: "اسم الحملة مطلوب" }, { status: 400 });
  if (!templateName)
    return NextResponse.json({ error: "القالب مطلوب" }, { status: 400 });

  // Support both old-style `numbers[]` and new-style `recipients[{phone, templateVars}]`
  const hasRecipients = Array.isArray(recipients) && recipients.length > 0;
  const phoneList: string[] = hasRecipients
    ? recipients.map((r: any) => r.phone)
    : (Array.isArray(numbers) ? numbers : []);

  if (phoneList.length === 0)
    return NextResponse.json({ error: "قائمة الأرقام مطلوبة" }, { status: 400 });

  // checkCampaignsLimit is replaced by atomic consume later.

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const isScheduled = scheduledDate ? scheduledDate > new Date() : false;

  if (isScheduled) {
    const scheduleCheck = await checkFeature(userId, "scheduledCampaigns");
    const scheduleBlock = guardResponse(scheduleCheck);
    if (scheduleBlock) return scheduleBlock;
  }

  const account = await prisma.whatsAppAccount.findUnique({ where: { userId } });
  if (!account)
    return NextResponse.json(
      { error: "لم يتم ربط حساب واتساب — اذهب للإعدادات" },
      { status: 400 }
    );

  if (account.backoffUntil && account.backoffUntil > new Date()) {
    const waitMin = Math.ceil((account.backoffUntil.getTime() - Date.now()) / 60_000);
    return NextResponse.json(
      { error: `رقمك في فترة توقف مؤقت بسبب ضغط Meta. انتظر ${waitMin} دقيقة.` },
      { status: 429 }
    );
  }

  const template = await prisma.template.findFirst({
    where: { userId, OR: [{ id: templateName }, { name: templateName }] },
  });
  if (!template)
    return NextResponse.json(
      { error: `القالب "${templateName}" غير موجود` },
      { status: 404 }
    );

  // Build templateVariables snapshot for the campaign record
  const templateVariablesSnapshot = hasRecipients
    ? { mapping: body.recipients?.[0]?.templateVars ?? null, source: "per-recipient" }
    : (templateVars ?? null);

  // ── Atomic Quota Consumption ──
  const campaignConsume = await consumeCampaignQuotaAtomic(userId);
  const campaignBlock = guardResponse(campaignConsume);
  if (campaignBlock) return campaignBlock;

  try {
    const campaign = await prisma.campaign.create({
      data: {
        name: name.trim(),
        userId,
        templateId: template.id,
        attributionHours: attributionHours ? Number(attributionHours) : 48,
        status: CampaignStatus.draft,
        templateVariables: templateVariablesSnapshot ?? undefined,
      },
    });

    const { queued } = await enqueueCampaign({
      campaignId: campaign.id,
      userId,
      numbers: phoneList,
      recipients: hasRecipients ? recipients : undefined,
      templateName: template.name,
      templateLang: template.language ?? "ar",
      templateVars: hasRecipients ? undefined : (templateVars ?? null),
      scheduledAt: isScheduled ? scheduledDate : null,
      whatsappAccountId: account.id,
      phoneNumberId: account.phoneNumberId,
      accessToken: decryptToken(account.accessToken),
    });

    await inngest.send({
      name: "campaign/send",
      data: {
        campaignId: campaign.id,
        scheduledAt: isScheduled ? scheduledDate?.toISOString() : null,
      },
    });

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      queued,
      scheduled: isScheduled,
      message: isScheduled
        ? `تم جدولة الحملة — ${queued} رسالة في الانتظار`
        : `تم إنشاء الحملة — جاري الإرسال`,
    });
  } catch (err) {
    await refundCampaignQuota(userId);
    throw err;
  }
}

// ─── handleRepeat ─────────────────────────────────────────────────────────────
async function handleRepeat(userId: string, campaignId: string) {
  // checkCampaignsLimit is replaced by atomic consume later.

  const original = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      template: true,
      messages: {
        where: { direction: MessageDirection.outbound },
        select: { contact: { select: { phone: true } } },
        take: 10_000,
      },
    },
  });

  if (!original) return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
  if (!original.template) return NextResponse.json({ error: "القالب غير موجود" }, { status: 400 });

  const minRepeatAt = new Date(original.createdAt.getTime() + 48 * 60 * 60 * 1000);
  if (new Date() < minRepeatAt) {
    return NextResponse.json(
      { error: `تكرار الحملة متاح بعد 48 ساعة من إنشائها. متاح بعد: ${minRepeatAt.toLocaleString("ar-EG")}` },
      { status: 400 }
    );
  }

  const account = await prisma.whatsAppAccount.findUnique({ where: { userId } });
  if (!account) return NextResponse.json({ error: "لم يتم ربط حساب واتساب" }, { status: 400 });

  const numbers = [
    ...new Set(
      original.messages
        .map((m) => m.contact?.phone)
        .filter((p): p is string => Boolean(p))
    ),
  ];

  if (numbers.length === 0)
    return NextResponse.json({ error: "لا توجد أرقام في الحملة الأصلية" }, { status: 400 });

  // ── Atomic Quota Consumption ──
  const campaignConsume = await consumeCampaignQuotaAtomic(userId);
  const campaignBlock = guardResponse(campaignConsume);
  if (campaignBlock) return campaignBlock;

  try {
    const newCampaign = await prisma.campaign.create({
      data: {
        name: `${original.name} (تكرار)`,
        userId,
        templateId: original.template.id,
        status: CampaignStatus.draft,
      },
    });

    const { queued } = await enqueueCampaign({
      campaignId: newCampaign.id,
      userId,
      numbers,
      templateName: original.template.name,
      templateLang: original.template.language ?? "ar",
      scheduledAt: null,
      whatsappAccountId: account.id,
      phoneNumberId: account.phoneNumberId,
      accessToken: decryptToken(account.accessToken),
    });

    await inngest.send({
      name: "campaign/send",
      data: { campaignId: newCampaign.id, scheduledAt: null },
    });

    return NextResponse.json({
      success: true,
      campaignId: newCampaign.id,
      queued,
      message: `تم تكرار الحملة — جاري الإرسال`,
    });
  } catch (err) {
    await refundCampaignQuota(userId);
    throw err;
  }
}