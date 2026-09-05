// src/lib/campaigns-actions.ts
// ─── منطق إنشاء/تكرار الحملات — قابل للاستدعاء المباشر من الراوت أو من MCP ──
//
// اتنقل هنا من src/app/api/campaigns/route.ts عشان MCP يقدر ينادي عليه
// كـ function عادي (import) بدل ما يعمل HTTP request لنفسه، وده بيقفل ثغرة
// كانت موجودة: كان في "MCP internal call bypass" بيثق في flag جوه الـ body
// (`_mcpInternal` / `_mcpOwnerId`) من غير أي secret أو توقيع — أي حد برة
// النظام كان يقدر يزوّد نفس الـ flags ويبعت حملة باسم أي يوزر.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CampaignStatus, MessageDirection } from "@/types/enums";
import {
  checkFeature,
  consumeCampaignQuotaAtomic, refundCampaignQuota,
  guardResponse,
} from "@/lib/plan-guard";
import { enqueueCampaign } from "@/lib/queue";
import { inngest } from "@/inngest/client";
import { decryptToken } from "@/lib/crypto";

export async function createCampaignForUser(userId: string, body: any) {
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

    if (isScheduled) {
      await inngest.send({
        name: "campaign/schedule",
        data: {
          campaignId: campaign.id,
          scheduledAt: scheduledDate!.toISOString(),
          userId,
        },
      });
    } else {
      await inngest.send({
        name: "campaign/send",
        data: {
          campaignId: campaign.id,
          userId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      queued,
      scheduled: isScheduled,
      message: isScheduled
        ? `تم جدولة الحملة — ${queued} رسالة في الانتظار`
        : `تم وضع الحملة في قائمة الانتظار — سيبدأ الإرسال تلقائياً`,
    });
  } catch (err) {
    await refundCampaignQuota(userId);
    throw err;
  }
}

export async function repeatCampaignForUser(userId: string, campaignId: string) {
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
      data: { campaignId: newCampaign.id, userId },
    });

    return NextResponse.json({
      success: true,
      campaignId: newCampaign.id,
      queued,
      message: `تم وضع الحملة المكررة في قائمة الانتظار — سيبدأ الإرسال تلقائياً`,
    });
  } catch (err) {
    await refundCampaignQuota(userId);
    throw err;
  }
}
