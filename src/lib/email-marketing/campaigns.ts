import prisma from "@/lib/prisma";
import { sendEmailViaUserSmtp } from "./sender";

export interface CreateCampaignInput {
  name: string;
  subject: string;
  templateId: string;
  targetTag?: string | null;
}

export async function getEmailCampaigns(userId: string) {
  const campaigns = await prisma.emailCampaign.findMany({
    where: { userId },
    include: {
      template: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    templateId: c.templateId,
    templateName: c.template?.name,
    targetTag: c.targetTag,
    targetCount: c.targetCount,
    sentCount: c.sentCount,
    deliveredCount: c.deliveredCount,
    failedCount: c.failedCount,
    status: c.status,
    scheduledAt: c.scheduledAt?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
    completedAt: c.completedAt?.toISOString() || null,
  }));
}

export async function getEmailCampaignById(userId: string, id: string) {
  const campaign = await prisma.emailCampaign.findFirst({
    where: { id, userId },
    include: {
      template: true,
      deliveries: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });

  if (!campaign) return null;

  return {
    ...campaign,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    scheduledAt: campaign.scheduledAt?.toISOString() || null,
    completedAt: campaign.completedAt?.toISOString() || null,
    deliveries: campaign.deliveries.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      sentAt: d.sentAt?.toISOString() || null,
    })),
  };
}

export async function createEmailCampaign(
  userId: string,
  input: CreateCampaignInput
) {
  // حساب عدد المستهدفين مبدئيًا
  const whereContacts: any = {
    userId,
    status: "SUBSCRIBED",
  };
  if (input.targetTag) {
    whereContacts.tags = { has: input.targetTag };
  }

  const targetCount = await prisma.emailContact.count({
    where: whereContacts,
  });

  const campaign = await prisma.emailCampaign.create({
    data: {
      userId,
      name: input.name.trim(),
      subject: input.subject.trim(),
      templateId: input.templateId,
      targetTag: input.targetTag?.trim() || null,
      targetCount,
      status: "DRAFT",
    },
  });

  return campaign;
}

export async function deleteEmailCampaign(userId: string, id: string) {
  return prisma.emailCampaign.deleteMany({
    where: { id, userId },
  });
}

export async function executeCampaignSending(userId: string, campaignId: string) {
  const campaign = await prisma.emailCampaign.findFirst({
    where: { id: campaignId, userId },
    include: { template: true },
  });

  if (!campaign || !campaign.template) {
    throw new Error("الحملة أو القالب المطلوب غير موجود.");
  }

  // 1. جلب جهات الاتصال المستهدفة
  const whereContacts: any = {
    userId,
    status: "SUBSCRIBED",
  };
  if (campaign.targetTag) {
    whereContacts.tags = { has: campaign.targetTag };
  }

  const contacts = await prisma.emailContact.findMany({
    where: whereContacts,
  });

  if (contacts.length === 0) {
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "COMPLETED",
        targetCount: 0,
        sentCount: 0,
        completedAt: new Date(),
      },
    });
    return { success: true, delivered: 0, failed: 0 };
  }

  // 2. تحديث حالة الحملة إلى SENDING وإنشاء سجلات الـ Deliveries
  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: {
      status: "SENDING",
      targetCount: contacts.length,
    },
  });

  const deliveries = await Promise.all(
    contacts.map((c) =>
      prisma.emailDelivery.create({
        data: {
          campaignId: campaign.id,
          contactId: c.id,
          contactEmail: c.email,
          contactName: c.firstName ? `${c.firstName} ${c.lastName || ""}`.trim() : null,
          status: "QUEUED",
        },
      })
    )
  );

  // 3. الإرسال المتتابع لجهات الاتصال
  let deliveredCount = 0;
  let failedCount = 0;

  for (const del of deliveries) {
    const res = await sendEmailViaUserSmtp(userId, {
      to: del.contactEmail,
      recipientName: del.contactName,
      subject: campaign.subject,
      html: campaign.template.bodyHtml,
      previewText: campaign.template.previewText,
    });

    if (res.success) {
      deliveredCount++;
      await prisma.emailDelivery.update({
        where: { id: del.id },
        data: {
          status: "DELIVERED",
          sentAt: new Date(),
        },
      });
    } else {
      failedCount++;
      await prisma.emailDelivery.update({
        where: { id: del.id },
        data: {
          status: "FAILED",
          errorMessage: res.error || "خطأ في الإرسال",
          sentAt: new Date(),
        },
      });
    }
  }

  // 4. إنهاء الحملة وتحديث الأرقام النهائية
  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: {
      status: failedCount === contacts.length ? "FAILED" : "COMPLETED",
      sentCount: contacts.length,
      deliveredCount,
      failedCount,
      completedAt: new Date(),
    },
  });

  return {
    success: true,
    targetCount: contacts.length,
    deliveredCount,
    failedCount,
  };
}
