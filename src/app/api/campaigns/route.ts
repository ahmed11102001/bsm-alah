// app/api/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus, MessageType, CampaignStatus } from "@prisma/client";

// ===============================
// GET /api/campaigns?status=&search=&page=&limit=
// ===============================
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const rawUserId = (session.user as any).id;
    const parentId = (session.user as any).parentId;
    const userId = parentId ?? rawUserId;

    const { searchParams } = new URL(req.url);
    const isReport = searchParams.get("report") === "true";
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const period = searchParams.get("period");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    // ===============================
    // حالة 1: جلب تقرير إحصائيات
    // ===============================
    if (isReport) {
      const startDate = getStartDate(period || "30d");
      const dateFilter = startDate ? { createdAt: { gte: startDate } } : {};

      const [totalCampaigns, campaignStats] = await Promise.all([
        prisma.campaign.count({ where: { userId, ...dateFilter } }),
        prisma.campaign.aggregate({
          where: { userId, status: CampaignStatus.completed, ...dateFilter },
          _sum: { sentCount: true, failedCount: true },
        }),
      ]);

      const totalSent = campaignStats._sum.sentCount || 0;
      const totalFailed = campaignStats._sum.failedCount || 0;
      const successRate = totalSent + totalFailed > 0
        ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(2)
        : 0;

      const dailyStats = await getDailyStats(userId, startDate);
      const templatePerformance = await getTemplatePerformance(userId, startDate);

      return NextResponse.json({
        summary: {
          totalCampaigns,
          totalSent,
          totalFailed,
          successRate: parseFloat(successRate as string),
        },
        dailyStats,
        templatePerformance,
      });
    }

    // ===============================
    // حالة 2: جلب حملة واحدة
    // ===============================
    if (id) {
      const campaign = await prisma.campaign.findFirst({
        where: { id, userId },
        include: {
          template: true,
          messages: {
            include: { contact: { select: { phone: true } } },
            orderBy: { sentAt: "desc" },
            take: 100,
          },
        },
      });

      if (!campaign) {
        return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
      }

      return NextResponse.json(campaign);
    }

    // ===============================
    // حالة 3: جلب كل الحملات ✅ ترجع ARRAY مباشرة
    // ===============================
    const where: any = { userId };
    if (status && status !== "all") where.status = status;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const skip = (page - 1) * limit;
    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { template: { select: { name: true, content: true } } },
    });

    // ✅ هنا التعديل: أرجع campaigns مباشرة كـ Array
    return NextResponse.json(campaigns);
    
  } catch (error) {
    console.error("GET campaigns error:", error);
    return NextResponse.json({ error: "فشل في جلب الحملات" }, { status: 500 });
  }
}

// ===============================
// POST /api/campaigns (إنشاء حملة جديدة)
// ===============================
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, templateName, numbers, scheduledAt, campaignId } = body;

    const rawUserId = (session.user as any).id;
    const parentId = (session.user as any).parentId;
    const userId = parentId ?? rawUserId;

    // حالة التحديث
    if (campaignId && body._action !== "delete") {
      return await updateCampaign(userId, campaignId, body);
    }

    // حالة الحذف
    if (body._action === "delete" && campaignId) {
      return await deleteCampaign(userId, campaignId);
    }

    // حالة الإنشاء الجديد
    if (!name || !templateName || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: name, templateName, or numbers" },
        { status: 400 }
      );
    }

    const whatsappAccount = await prisma.whatsAppAccount.findUnique({ where: { userId } });
    if (!whatsappAccount) {
      return NextResponse.json({ error: "WhatsApp account not connected" }, { status: 400 });
    }

    const template = await prisma.template.findFirst({ where: { name: templateName, userId } });
    if (!template) {
      return NextResponse.json({ error: `Template "${templateName}" not found` }, { status: 404 });
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const isScheduled = scheduledDate ? scheduledDate > new Date() : false;
    
    const campaign = await prisma.campaign.create({
      data: {
        name,
        userId,
        templateId: template.id,
        status: isScheduled ? CampaignStatus.scheduled : CampaignStatus.running,
        scheduledAt: isScheduled ? scheduledDate : null,
        startedAt: !isScheduled ? new Date() : null,
      },
    });

    if (isScheduled) {
      return NextResponse.json({
        success: true,
        campaignId: campaign.id,
        message: "تم جدولة الحملة بنجاح",
        scheduledAt: scheduledDate,
      });
    }

    // الإرسال الفوري
    let sentCount = 0, failedCount = 0;
    
    for (const phone of numbers) {
      try {
        const contact = await prisma.contact.upsert({
          where: { phone_userId: { phone, userId } },
          update: { lastMessageAt: new Date() },
          create: { phone, userId, lastMessageAt: new Date() },
        });

        const payload = {
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: { name: templateName, language: { code: "ar" } },
        };

        const metaRes = await fetch(
          `https://graph.facebook.com/v20.0/${whatsappAccount.phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${whatsappAccount.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const meta = await metaRes.json();
        if (meta.error) throw new Error(meta.error.message);

        await prisma.message.create({
          data: {
            content: `Campaign: ${name}`,
            type: MessageType.template,
            direction: MessageDirection.outbound,
            status: MessageStatus.sent,
            userId,
            contactId: contact.id,
            campaignId: campaign.id,
            whatsappId: meta.messages?.[0]?.id,
            sentAt: new Date(),
          },
        });
        sentCount++;
      } catch (error) {
        failedCount++;
      }
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { 
        status: CampaignStatus.completed, 
        sentCount, 
        failedCount, 
        completedAt: new Date() 
      },
    });

    return NextResponse.json({ 
      success: true, 
      campaignId: campaign.id, 
      sentCount, 
      failedCount, 
      total: numbers.length 
    });
    
  } catch (error: any) {
    console.error("POST campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===============================
// دوال مساعدة
// ===============================

async function updateCampaign(userId: string, campaignId: string, body: any) {
  const { name, status, scheduledAt } = body;
  const existing = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
  
  if (!existing) {
    return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
  }
  
  if (existing.status === CampaignStatus.completed) {
    return NextResponse.json({ error: "لا يمكن تعديل حملة مكتملة" }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      name: name || existing.name,
      status: status || existing.status,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : existing.scheduledAt,
    },
  });
  
  return NextResponse.json({ success: true, campaign: updated });
}

async function deleteCampaign(userId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
  
  if (!campaign) {
    return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { campaignId } }),
    prisma.campaign.delete({ where: { id: campaignId } }),
  ]);
  
  return NextResponse.json({ success: true, message: "تم الحذف بنجاح" });
}

function getStartDate(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case "7d": return new Date(now.setDate(now.getDate() - 7));
    case "30d": return new Date(now.setDate(now.getDate() - 30));
    case "90d": return new Date(now.setDate(now.getDate() - 90));
    default: return null;
  }
}

async function getDailyStats(userId: string, startDate: Date | null) {
  const campaigns = await prisma.campaign.findMany({
    where: { 
      userId, 
      status: CampaignStatus.completed, 
      ...(startDate && { createdAt: { gte: startDate } }) 
    },
    select: { createdAt: true, sentCount: true, failedCount: true },
  });
  
  const dailyMap = new Map();
  
  campaigns.forEach(c => {
    const date = c.createdAt.toISOString().split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, sent: 0, failed: 0 });
    }
    const day = dailyMap.get(date);
    day.sent += c.sentCount || 0;
    day.failed += c.failedCount || 0;
  });
  
  return Array.from(dailyMap.values());
}

async function getTemplatePerformance(userId: string, startDate: Date | null) {
  const performance = await prisma.campaign.groupBy({
    by: ['templateId'],
    where: { 
      userId, 
      status: CampaignStatus.completed, 
      ...(startDate && { createdAt: { gte: startDate } }) 
    },
    _sum: { sentCount: true, failedCount: true },
  });

  const templateIds = performance
    .map(p => p.templateId)
    .filter((id): id is string => id !== null);

  const templates = await prisma.template.findMany({
    where: { id: { in: templateIds } },
    select: { id: true, name: true },
  });
  
  const templateMap = new Map<string, string>(templates.map(t => [t.id, t.name]));
  
  return performance.map(p => ({
    name: templateMap.get(p.templateId ?? "") || "غير معروف",
    sent: p._sum.sentCount || 0,
    failed: p._sum.failedCount || 0,
  }));
}