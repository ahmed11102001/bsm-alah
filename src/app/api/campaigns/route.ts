// src/app/api/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  MessageDirection,
  MessageStatus,
  MessageType,
  CampaignStatus,
} from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** استخراج userId الحقيقي (يدعم sub-accounts) */
function resolveUserId(session: any): string {
  const raw    = (session.user as any).id as string;
  const parent = (session.user as any).parentId as string | null;
  return parent ?? raw;
}

/** إرسال رسالة واحدة عبر Meta API */
async function sendWhatsAppTemplate(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  language = "ar"
): Promise<{ ok: boolean; whatsappId?: string; error?: string }> {
  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: templateName, language: { code: language } },
      }),
    }
  );
  const data = await res.json();
  if (data.error) return { ok: false, error: data.error.message };
  return { ok: true, whatsappId: data.messages?.[0]?.id };
}

/** إرسال حملة كاملة (يُستخدم للإرسال الفوري وعند التكرار) */
async function runCampaign(
  campaignId: string,
  userId: string,
  numbers: string[],
  templateName: string,
  phoneNumberId: string,
  accessToken: string
): Promise<{ sentCount: number; failedCount: number }> {
  let sentCount = 0;
  let failedCount = 0;

  for (const phone of numbers) {
    try {
      // upsert جهة الاتصال
      const contact = await prisma.contact.upsert({
        where: { phone_userId: { phone, userId } },
        update: { lastMessageAt: new Date() },
        create: { phone, userId, lastMessageAt: new Date() },
      });

      const result = await sendWhatsAppTemplate(
        phoneNumberId,
        accessToken,
        phone,
        templateName
      );

      await prisma.message.create({
        data: {
          content: `حملة: ${campaignId}`,
          type: MessageType.template,
          direction: MessageDirection.outbound,
          status: result.ok ? MessageStatus.sent : MessageStatus.failed,
          userId,
          contactId: contact.id,
          campaignId,
          whatsappId: result.ok ? result.whatsappId : undefined,
          error: result.ok ? undefined : result.error,
          sentAt: result.ok ? new Date() : undefined,
        },
      });

      result.ok ? sentCount++ : failedCount++;
    } catch {
      failedCount++;
    }
  }

  return { sentCount, failedCount };
}

// ─── GET /api/campaigns ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const userId = resolveUserId(session);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit  = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const page   = Math.max(parseInt(searchParams.get("page")  || "1"),  1);

    const where: Record<string, unknown> = { userId };
    if (status && status !== "all") where.status = status;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        template: { select: { name: true, content: true } },
      },
    });

    return NextResponse.json(campaigns);
  } catch (err) {
    console.error("GET /api/campaigns:", err);
    return NextResponse.json({ error: "فشل في جلب الحملات" }, { status: 500 });
  }
}

// ─── POST /api/campaigns ──────────────────────────────────────────────────────
// الحالات المدعومة:
//   1. إنشاء حملة جديدة  → { name, templateName, numbers, scheduledAt? }
//   2. تكرار حملة        → { _action: "repeat", campaignId }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const userId = resolveUserId(session);
    const body   = await req.json();

    // ── حالة 2: تكرار ────────────────────────────────────────────
    if (body._action === "repeat" && body.campaignId) {
      return await handleRepeat(userId, body.campaignId);
    }

    // ── حالة 1: إنشاء ─────────────────────────────────────────────
    return await handleCreate(userId, body);
  } catch (err: any) {
    console.error("POST /api/campaigns:", err);
    return NextResponse.json({ error: err.message ?? "خطأ في السيرفر" }, { status: 500 });
  }
}

// ─── DELETE /api/campaigns ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const userId = resolveUserId(session);
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
    }

    // تأكد إن الحملة تبع المستخدم ده
    const campaign = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!campaign) {
      return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
    }

    // حذف الرسائل أولاً ثم الحملة (transaction)
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

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleCreate(userId: string, body: any) {
  const { name, templateName, numbers, scheduledAt } = body;

  // validation
  if (!name?.trim()) {
    return NextResponse.json({ error: "اسم الحملة مطلوب" }, { status: 400 });
  }
  if (!templateName) {
    return NextResponse.json({ error: "القالب مطلوب" }, { status: 400 });
  }
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return NextResponse.json({ error: "قائمة الأرقام مطلوبة" }, { status: 400 });
  }

  // حساب واتساب
  const account = await prisma.whatsAppAccount.findUnique({ where: { userId } });
  if (!account) {
    return NextResponse.json(
      { error: "لم يتم ربط حساب واتساب — اذهب للإعدادات وأضف بياناتك" },
      { status: 400 }
    );
  }

  // القالب
  const template = await prisma.template.findFirst({
    where: {
      userId,
      OR: [{ id: templateName }, { name: templateName }],
    },
  });
  if (!template) {
    return NextResponse.json({ error: `القالب "${templateName}" غير موجود` }, { status: 404 });
  }

  // تحديد نوع الجدولة
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const isScheduled   = scheduledDate ? scheduledDate > new Date() : false;

  // إنشاء سجل الحملة
  const campaign = await prisma.campaign.create({
    data: {
      name: name.trim(),
      userId,
      templateId: template.id,
      status: isScheduled ? CampaignStatus.scheduled : CampaignStatus.running,
      scheduledAt: isScheduled ? scheduledDate : null,
      startedAt: !isScheduled ? new Date() : null,
    },
  });

  // ── جدولة: حفظ فقط وإرجاع ──────────────────────────────────────
  if (isScheduled) {
    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      scheduledAt: scheduledDate,
      message: "تم جدولة الحملة بنجاح",
    });
  }

  // ── إرسال فوري ─────────────────────────────────────────────────
  const { sentCount, failedCount } = await runCampaign(
    campaign.id,
    userId,
    numbers,
    template.name,
    account.phoneNumberId,
    account.accessToken
  );

  // تحديث نتائج الحملة
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: sentCount > 0 ? CampaignStatus.completed : CampaignStatus.failed,
      sentCount,
      failedCount,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    campaignId: campaign.id,
    sentCount,
    failedCount,
    total: numbers.length,
  });
}

async function handleRepeat(userId: string, campaignId: string) {
  // جلب الحملة الأصلية مع رسائلها عشان نعرف الأرقام
  const original = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      template: true,
      messages: {
        where: { direction: MessageDirection.outbound },
        include: { contact: { select: { phone: true } } },
      },
    },
  });

  if (!original) {
    return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
  }
  if (!original.template) {
    return NextResponse.json({ error: "القالب الأصلي للحملة غير موجود" }, { status: 400 });
  }

  // حساب واتساب
  const account = await prisma.whatsAppAccount.findUnique({ where: { userId } });
  if (!account) {
    return NextResponse.json({ error: "لم يتم ربط حساب واتساب" }, { status: 400 });
  }

  // استخراج الأرقام من رسائل الحملة الأصلية
  const numbers = [
    ...new Set(
      original.messages
        .map((m) => m.contact?.phone)
        .filter((p): p is string => Boolean(p))
    ),
  ];

  if (numbers.length === 0) {
    return NextResponse.json({ error: "لا توجد أرقام في الحملة الأصلية" }, { status: 400 });
  }

  // إنشاء حملة جديدة بنفس الاسم + "(تكرار)"
  const newCampaign = await prisma.campaign.create({
    data: {
      name: `${original.name} (تكرار)`,
      userId,
      templateId: original.template.id,
      status: CampaignStatus.running,
      startedAt: new Date(),
    },
  });

  // إرسال
  const { sentCount, failedCount } = await runCampaign(
    newCampaign.id,
    userId,
    numbers,
    original.template.name,
    account.phoneNumberId,
    account.accessToken
  );

  await prisma.campaign.update({
    where: { id: newCampaign.id },
    data: {
      status: sentCount > 0 ? CampaignStatus.completed : CampaignStatus.failed,
      sentCount,
      failedCount,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    campaignId: newCampaign.id,
    sentCount,
    failedCount,
    total: numbers.length,
  });
}
