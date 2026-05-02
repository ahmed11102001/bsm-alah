// src/app/api/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CampaignStatus, MessageDirection, QueueStatus } from "@prisma/client";
import {
  checkCampaignsLimit, checkFeature,
  incrementCampaignUsage, guardResponse,
} from "@/lib/plan-guard";
import { enqueueCampaign, processQueue } from "@/lib/queue";

// حملة صغيرة: نبعتها فوراً بـ await — 50 × 350ms ≈ 17s (آمن على Vercel)
// حملة كبيرة: الـ Cron هيبعتها في أقل من دقيقة
const SMALL_CAMPAIGN_LIMIT = 50;

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

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        include: { template: { select: { name: true, content: true } } },
      }),
      prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({ campaigns, total, page, limit });
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

    // إلغاء الرسائل في الـ queue + حذف الحملة
    await prisma.$transaction([
      prisma.messageQueue.updateMany({
        where: { campaignId: id, status: QueueStatus.pending },
        data:  { status: QueueStatus.cancelled },
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
  const { name, templateName, numbers, scheduledAt, templateVars } = body;

  // Validation
  if (!name?.trim())
    return NextResponse.json({ error: "اسم الحملة مطلوب" }, { status: 400 });
  if (!templateName)
    return NextResponse.json({ error: "القالب مطلوب" }, { status: 400 });
  if (!Array.isArray(numbers) || numbers.length === 0)
    return NextResponse.json({ error: "قائمة الأرقام مطلوبة" }, { status: 400 });

  // ✅ Guard: حد الحملات الشهري
  const campaignCheck = await checkCampaignsLimit(userId);
  const campaignBlock = guardResponse(campaignCheck);
  if (campaignBlock) return campaignBlock;

  // ✅ Guard: الجدولة
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
      { error: "لم يتم ربط حساب واتساب — اذهب للإعدادات" },
      { status: 400 }
    );

  // التحقق من الـ backoff
  if (account.backoffUntil && account.backoffUntil > new Date()) {
    const waitMin = Math.ceil((account.backoffUntil.getTime() - Date.now()) / 60_000);
    return NextResponse.json(
      { error: `رقمك في فترة توقف مؤقت بسبب ضغط Meta. انتظر ${waitMin} دقيقة.` },
      { status: 429 }
    );
  }

  // القالب
  const template = await prisma.template.findFirst({
    where: { userId, OR: [{ id: templateName }, { name: templateName }] },
  });
  if (!template)
    return NextResponse.json(
      { error: `القالب "${templateName}" غير موجود` },
      { status: 404 }
    );

  // إنشاء سجل الحملة
  const campaign = await prisma.campaign.create({
    data: {
      name:       name.trim(),
      userId,
      templateId: template.id,
      status:     CampaignStatus.draft, // سيُحدَّث بواسطة enqueueCampaign
    },
  });

  // ✅ إضافة للـ Queue بدل الإرسال المباشر
  const { queued } = await enqueueCampaign({
    campaignId:        campaign.id,
    userId,
    numbers,
    templateName:      template.name,
    templateLang:      template.language ?? "ar",
    templateVars:      templateVars ?? null,
    scheduledAt:       isScheduled ? scheduledDate : null,
    whatsappAccountId: account.id,
    phoneNumberId:     account.phoneNumberId,
  });

  // ✅ زيادة عداد الحملات
  await incrementCampaignUsage(userId);

  // ✅ تشغيل الـ Queue بذكاء حسب حجم الحملة:
  // - حملة صغيرة (≤ 50): await مباشر — آمن (أقل من 20 ثانية)
  // - حملة كبيرة (> 50): الـ Cron هيبعتها في أقل من دقيقة تلقائياً
  if (!isScheduled && numbers.length <= SMALL_CAMPAIGN_LIMIT) {
    await processQueue();
  }

  return NextResponse.json({
    success:    true,
    campaignId: campaign.id,
    queued,
    scheduled:  isScheduled,
    message:    isScheduled
      ? `تم جدولة الحملة — ${queued} رسالة في الانتظار`
      : numbers.length <= SMALL_CAMPAIGN_LIMIT
        ? `تم إنشاء الحملة — جاري الإرسال`
        : `تم إنشاء الحملة — سيبدأ الإرسال خلال دقيقة`,
  });
}

// ─── handleRepeat ─────────────────────────────────────────────────────────────
async function handleRepeat(userId: string, campaignId: string) {
  // ✅ Guard: حد الحملات
  const check = await checkCampaignsLimit(userId);
  const block = guardResponse(check);
  if (block) return block;

  const original = await prisma.campaign.findFirst({
    where:   { id: campaignId, userId },
    include: {
      template: true,
      messages: {
        where:   { direction: MessageDirection.outbound },
        select:  { contact: { select: { phone: true } } },
        take:    10_000,
      },
    },
  });

  if (!original) return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
  if (!original.template) return NextResponse.json({ error: "القالب غير موجود" }, { status: 400 });

  // منع التكرار قبل مرور 48 ساعة من إنشاء الحملة
  const minRepeatAt = new Date(original.createdAt.getTime() + 48 * 60 * 60 * 1000);
  if (new Date() < minRepeatAt) {
    return NextResponse.json(
      { error: `تكرار الحملة متاح بعد 48 ساعة من إنشائها. متاح بعد: ${minRepeatAt.toLocaleString("ar-EG")}` },
      { status: 400 }
    );
  }

  const account = await prisma.whatsAppAccount.findUnique({ where: { userId } });
  if (!account) return NextResponse.json({ error: "لم يتم ربط حساب واتساب" }, { status: 400 });

  // استخرج الأرقام من رسائل الحملة الأصلية
  const numbers = [
    ...new Set(
      original.messages
        .map((m) => m.contact?.phone)
        .filter((p): p is string => Boolean(p))
    ),
  ];

  if (numbers.length === 0)
    return NextResponse.json({ error: "لا توجد أرقام في الحملة الأصلية" }, { status: 400 });

  // حملة جديدة
  const newCampaign = await prisma.campaign.create({
    data: {
      name:       `${original.name} (تكرار)`,
      userId,
      templateId: original.template.id,
      status:     CampaignStatus.draft,
    },
  });

  const { queued } = await enqueueCampaign({
    campaignId:        newCampaign.id,
    userId,
    numbers,
    templateName:      original.template.name,
    templateLang:      original.template.language ?? "ar",
    scheduledAt:       null,
    whatsappAccountId: account.id,
    phoneNumberId:     account.phoneNumberId,
  });

  await incrementCampaignUsage(userId);

  // نفس المنطق — حملة صغيرة فوراً، كبيرة على الـ Cron
  if (numbers.length <= SMALL_CAMPAIGN_LIMIT) {
    await processQueue();
  }

  return NextResponse.json({
    success:    true,
    campaignId: newCampaign.id,
    queued,
    message:    numbers.length <= SMALL_CAMPAIGN_LIMIT
      ? `تم تكرار الحملة — جاري الإرسال`
      : `تم تكرار الحملة — سيبدأ الإرسال خلال دقيقة`,
  });
}
