import prisma from "@/lib/prisma";
import { CampaignFollowUpStage } from "@/types/enums";
import { getWhatsappAccount } from "./whatsapp";
import { sendSessionText, type ReplyParams } from "./smart-followup";
import { notifyAiHandoffNeeded } from "./notifications";

export async function resolveActiveCampaignFollowUpContext({
  userId,
  phone,
  contextId,
}: {
  userId: string;
  phone: string;
  contextId?: string | null;
}) {
  const now = new Date();
  if (contextId) {
    const record = await prisma.campaignFollowUpRecord.findFirst({
      where: {
        userId,
        followUpMessageId: contextId,
        followUpStage: "SENT",
        followUpStageExpiresAt: { gt: now }
      },
    });
    if (record) return record;
  }
  if (phone) {
    const record = await prisma.campaignFollowUpRecord.findFirst({
      where: {
        userId,
        customerPhone: phone,
        followUpStage: "SENT",
        followUpStageExpiresAt: { gt: now }
      },
      orderBy: { createdAt: "desc" }
    });
    if (record) return record;
  }
  return null;
}

export async function executeCampaignFollowUpAction(recordId: string, action: string) {
  console.log(`[CampaignFollowUp] Executing action ${action} for record ${recordId}`);

  const record = await prisma.campaignFollowUpRecord.findUnique({
    where: { id: recordId },
    select: {
      id: true, userId: true, customerPhone: true, contactId: true,
      followUpStage: true, followUpMessageId: true,
      user: {
        select: {
          whatsappAccount: {
            select: { id: true, phoneNumberId: true, accessToken: true }
          }
        }
      }
    }
  });

  if (!record || !record.user.whatsappAccount) return;
  
  const accountOwner = record.user.whatsappAccount;

  await handleCampaignFollowUpReply(record as any, {
    payloadId: action,
    messageText: action,
    accountOwner: accountOwner as any,
    userId: record.userId,
  });
}

export async function handleCampaignFollowUpReply(
  record: { id: string; userId: string; customerPhone: string; contactId: string; followUpStage: string | null },
  { payloadId, messageText, accountOwner, userId }: ReplyParams
) {
  // Get settings
  const setting = await prisma.campaignFollowUpSetting.findFirst({
    where: { userId, isEnabled: true },
    orderBy: { createdAt: "desc" } // Simplified resolution for this implementation
  });
  
  if (!setting || !setting.isEnabled) return;
  const texts = (setting.texts ?? {}) as Record<string, string>;

  // Mark as DONE since they replied
  await prisma.campaignFollowUpRecord.updateMany({
    where: { id: record.id, followUpStage: "SENT" },
    data: { followUpStage: "DONE" }
  });

  const contact = await prisma.contact.findUnique({ where: { id: record.contactId }, select: { id: true, name: true, phone: true }});

  // Branch 1: Want Order (Lead ساخن)
  if (payloadId === "WANT_ORDER") {
    await sendSessionText(
      record.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.wantOrder || "ممتاز 🎉\n\nيمكنك إكمال الطلب الآن أو سيقوم أحد ممثلينا بالتواصل معك.",
      { userId, contactId: record.contactId, label: "رد طلب أوردر الحملة" }
    );
    if (contact) {
      await notifyAiHandoffNeeded(userId, contact.name ?? contact.phone, contact.id, "عميل مهتم بحملة تسويقية", "high");
    }
    return;
  }

  // Branch 2: Have Question (Lead دافئ)
  if (payloadId === "HAVE_QUESTION") {
    await sendSessionText(
      record.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.hasQuestion || "يسعدنا مساعدتك ❤️\n\nاكتب استفسارك وسيتم الرد عليك في أقرب وقت.",
      { userId, contactId: record.contactId, label: "رد سؤال الحملة" }
    );
    if (contact) {
      await notifyAiHandoffNeeded(userId, contact.name ?? contact.phone, contact.id, "استفسار عن حملة تسويقية", "normal");
    }
    return;
  }

  // Branch 3: Not Interested (لا شكرا)
  if (payloadId === "NOT_INTERESTED") {
    await sendSessionText(
      record.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.notInterested || "شكرًا لك ❤️\n\nلن نرسل لك متابعة لهذه الحملة.",
      { userId, contactId: record.contactId, label: "رد عدم اهتمام بالحملة" }
    );
    return;
  }
}
