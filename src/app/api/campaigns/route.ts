// src/app/api/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus, MessageType, CampaignStatus } from "@prisma/client";
import {
  checkCampaignsLimit,
  checkFeature,
  incrementCampaignUsage,
  guardResponse,
} from "@/lib/plan-guard";

// ─── Helper ───────────────────────────────────────────────────────────────────
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
    const limit  = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const page   = Math.max(parseInt(searchParams.get("page")  || "1"),  1);

    const where: any = { userId };
    if (status && status !== "all") where.status = status;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { template: { select: { name: true, content: true } } },
    });

    return NextResponse.json(campaigns);
  } catch (err) {
    console.error("GET /api/campaigns:", err);
    return NextResponse.json({ error: "فشل في جلب الحملات" }, { status: 500 });
  }
}

// ─── POST /api/campaigns ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });

    const userId = resolveUserId(session);
    const body   = await req.json();

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
  const { name, templateName, numbers, scheduledAt } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "اسم الحملة مطلوب" }, { status: 400 });
  if (!templateName)
    return NextResponse.json({ error: "القالب مطلوب" }, { status: 400 });
  if (!Array.isArray(numbers) || numbers.length === 0)
    return NextResponse.json({ error: "قائمة الأرقام مطلوبة" }, { status: 400 });

  // ✅ Guard 1: حد الحملات الشهري
  const campaignCheck = await checkCampaignsLimit(userId);
  const campaignBlock = guardResponse(campaignCheck);
  if (campaignBlock) return campaignBlock;

  // ✅ Guard 2: الحملات المجدولة (إذا طلب جدولة)
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const isScheduled   = scheduledDate ? scheduledDate > new Date() : false;

  if (isScheduled) {
    const scheduleCheck = await checkFeature(userId, "scheduledCampaigns");
    const scheduleBlock = guardResponse(scheduleCheck);
    if (scheduleBlock) return scheduleBlock;
  }

  // حساب واتساب
  const account = await prisma.whatsAppAccount.findUnique({ where: { userId } });
  if (!account)
    return NextResponse.json(
      { error: "لم يتم ربط حساب واتساب — اذهب للإعدادات وأضف بياناتك" },
      { status: 400 }
    );

  // القالب
  const template = await prisma.template.findFirst({
    where: { userId, OR: [{ id: templateName }, { name: templateName }] },
  });
  if (!template)
    return NextResponse.json(
      { error: `القالب "${templateName}" غير موجود` },
      { status: 404 }
    );

  // إنشاء الحملة
  const campaign = await prisma.campaign.create({
    data: {
      name: name.trim(),
      userId,
      templateId: template.id,
      status:     isScheduled ? CampaignStatus.scheduled : CampaignStatus.running,
      scheduledAt: isScheduled ? scheduledDate : null,
      startedAt:  !isScheduled ? new Date() : null,
    },
  });

  // ✅ زيادة عداد الحملات بعد الإنشاء
  await incrementCampaignUsage(userId);

  // جدولة فقط
  if (isScheduled) {
    return NextResponse.json({
      success: true, campaignId: campaign.id,
      scheduledAt: scheduledDate, message: "تم جدولة الحملة بنجاح",
    });
  }

  // إرسال فوري
  const { sentCount, failedCount } = await runCampaign(
    campaign.id, userId, numbers, template.name,
    account.phoneNumberId, account.accessToken
  );

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status:      sentCount > 0 ? CampaignStatus.completed : CampaignStatus.failed,
      sentCount, failedCount, completedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, campaignId: campaign.id, sentCount, failedCount, total: numbers.length });
}

// ─── handleRepeat ─────────────────────────────────────────────────────────────
async function handleRepeat(userId: string, campaignId: string) {
  // ✅ Guard: حد الحملات
  const check = await checkCampaignsLimit(userId);
  const block = guardResponse(check);
  if (block) return block;

  const original = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      template: true,
      messages: {
        where:   { direction: MessageDirection.outbound },
        include: { contact: { select: { phone: true } } },
      },
    },
  });

  if (!original) return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
  if (!original.template) return NextResponse.json({ error: "القالب غير موجود" }, { status: 400 });

  const account = await prisma.whatsAppAccount.findUnique({ where: { userId } });
  if (!account) return NextResponse.json({ error: "لم يتم ربط حساب واتساب" }, { status: 400 });

  const numbers = [...new Set(
    original.messages.map(m => m.contact?.phone).filter((p): p is string => Boolean(p))
  )];

  if (numbers.length === 0)
    return NextResponse.json({ error: "لا توجد أرقام في الحملة الأصلية" }, { status: 400 });

  const newCampaign = await prisma.campaign.create({
    data: {
      name: `${original.name} (تكرار)`, userId,
      templateId: original.template.id,
      status: CampaignStatus.running, startedAt: new Date(),
    },
  });

  await incrementCampaignUsage(userId);

  const { sentCount, failedCount } = await runCampaign(
    newCampaign.id, userId, numbers, original.template.name,
    account.phoneNumberId, account.accessToken
  );

  await prisma.campaign.update({
    where: { id: newCampaign.id },
    data: {
      status:      sentCount > 0 ? CampaignStatus.completed : CampaignStatus.failed,
      sentCount, failedCount, completedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, campaignId: newCampaign.id, sentCount, failedCount });
}

// ─── runCampaign ──────────────────────────────────────────────────────────────
async function runCampaign(
  campaignId: string, userId: string, numbers: string[],
  templateName: string, phoneNumberId: string, accessToken: string
): Promise<{ sentCount: number; failedCount: number }> {
  let sentCount = 0, failedCount = 0;

  for (const phone of numbers) {
    try {
      const contact = await prisma.contact.upsert({
        where:  { phone_userId: { phone, userId } },
        update: { lastMessageAt: new Date() },
        create: { phone, userId, lastMessageAt: new Date() },
      });

      const res = await fetch(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp", to: phone, type: "template",
            template: { name: templateName, language: { code: "ar" } },
          }),
        }
      );
      const meta = await res.json();

      await prisma.message.create({
        data: {
          content: `حملة: ${campaignId}`, type: MessageType.template,
          direction: MessageDirection.outbound,
          status: meta.error ? MessageStatus.failed : MessageStatus.sent,
          userId, contactId: contact.id, campaignId,
          whatsappId: meta.messages?.[0]?.id,
          error:      meta.error?.message,
          sentAt:     meta.error ? undefined : new Date(),
        },
      });

      meta.error ? failedCount++ : sentCount++;
    } catch {
      failedCount++;
    }
  }

  return { sentCount, failedCount };
}