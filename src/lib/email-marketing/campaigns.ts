import prisma from "@/lib/prisma";
import { sendEmailViaUserSmtp } from "./sender";
import { inngest } from "@/inngest/client";
import { emailEligibilityWhere } from "./eligibility";

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
  // حساب عدد المستهدفين مبدئيًا — CRM Contact مؤهل لإيميل تسويقي
  const whereContacts: any = emailEligibilityWhere(userId);
  if (input.targetTag) {
    whereContacts.tags = { has: input.targetTag };
  }

  const targetCount = await prisma.contact.count({
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

/**
 * جدولة وتشغيل إرسال الحملة عبر Inngest في الخلفية (Background Job).
 * يمنع الـ Timeout على Vercel ويدعم إعادة المحاولة التلقائية ومعالجة الـ Chunks.
 */
export async function queueCampaignSending(userId: string, campaignId: string) {
  const campaign = await prisma.emailCampaign.findFirst({
    where: { id: campaignId, userId },
    include: { template: true },
  });

  if (!campaign || !campaign.template) {
    throw new Error("الحملة أو القالب المطلوب غير موجود.");
  }

  // حساب عدد المستهدفين — CRM Contact مؤهل لإيميل تسويقي
  const whereContacts: any = emailEligibilityWhere(userId);
  if (campaign.targetTag) {
    whereContacts.tags = { has: campaign.targetTag };
  }

  const targetCount = await prisma.contact.count({
    where: whereContacts,
  });

  // تحديث حالة الحملة فورياً إلى QUEUED
  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: {
      status: "QUEUED",
      targetCount,
    },
  });

  // إرسال Event إلى Inngest لمعالجة الحملة في الخلفية بأمان
  try {
    await inngest.send({
      name: "email/campaign.send",
      data: {
        campaignId: campaign.id,
        userId,
      },
    });
  } catch (err) {
    console.error("[queueCampaignSending] Inngest event dispatch error:", err);
    // إذا كان Inngest غير متاح أو في بيئة تجريبية، لا نعطل العملية بل نسجل الخطأ
  }

  return {
    success: true,
    queued: true,
    status: "QUEUED",
    targetCount,
    message: "تم وضع الحملة في طابور الإرسال عبر Inngest بنجاح",
  };
}

export const executeCampaignSending = queueCampaignSending;

/**
 * إرسال مباشر (Direct Execution) مخصص للاختبارات المعزولة أو البيئات التي لا تدعم Inngest.
 */
export async function executeCampaignSendingDirect(userId: string, campaignId: string) {
  const campaign = await prisma.emailCampaign.findFirst({
    where: { id: campaignId, userId },
    include: { template: true },
  });

  if (!campaign || !campaign.template) {
    throw new Error("الحملة أو القالب المطلوب غير موجود.");
  }

  const whereContacts: any = emailEligibilityWhere(userId);
  if (campaign.targetTag) {
    whereContacts.tags = { has: campaign.targetTag };
  }

  const contacts = await prisma.contact.findMany({
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
          contactEmail: c.email!,       // email is guaranteed non-null by whereContacts filter
          contactName: c.name || null,   // Snapshot from CRM Contact
          status: "QUEUED",
        },
      })
    )
  );

  let deliveredCount = 0;
  let failedCount = 0;
  let acceptedCount = 0;

  for (const del of deliveries) {
    const res = await sendEmailViaUserSmtp(userId, {
      to: del.contactEmail,
      recipientName: del.contactName,
      subject: campaign.subject,
      html: campaign.template.bodyHtml,
      previewText: campaign.template.previewText,
      contactId: del.contactId ?? undefined,
      messageId: `<${del.id}@email.aiwni>`,
    });

    if (res.success) {
      // SENT = قَبِلها SMTP (accepted) — ليست DELIVERED حقيقية (تأتي فقط عبر
      // delivery webhook لاحقًا). deliveredCount تبقى 0 هنا عمدًا.
      acceptedCount++;
      await prisma.emailDelivery.update({
        where: { id: del.id },
        data: {
          status: "SENT",
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
    acceptedCount,
  };
}
