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
import { getCampaignQueuePressure, type CampaignQueuePressure } from "@/lib/campaign-queue";

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

  // ── ملكية القالب: المثبوت لحساب واتساب آخر مرفوض حتى لو أُرسل id يدويًا ────
  // wabaId هو الفيصل الوحيد الموثوق — whatsappAccountId بيفضل نفس القيمة
  // دايمًا لأي قالب اتزامن قبل كده (صف WhatsAppAccount ثابت بيتكتب فوقه عند
  // كل إعادة ربط)، فمينفعش نعتمد عليه هنا. null = قديم غير منسوب → مقبول
  // لعدم كسر الموجود.
  if (template.wabaId && template.wabaId !== account.wabaId)
    return NextResponse.json(
      { error: "هذا القالب تابع لحساب واتساب آخر — اختر قالبًا من الحساب المتصل حاليًا" },
      { status: 422 }
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

    const pressure = isScheduled ? null : await getCampaignQueuePressure(userId).catch(() => null);

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
      startsImmediately: pressure?.startsImmediately ?? false,
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

    const verdict = await honestQueueVerdict(userId, queued, isScheduled, pressure ?? undefined);
    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      queued,
      scheduled: isScheduled,
      startsImmediately: verdict?.startsImmediately ?? false,
      queue: verdict?.queue ?? null,
      message:
        verdict?.message ??
        (isScheduled
          ? `تم جدولة الحملة — ${queued} رسالة في الانتظار`
          : `تم وضع الحملة في قائمة الانتظار — سيبدأ الإرسال تلقائياً`),
    });
  } catch (err) {
    await refundCampaignQuota(userId);
    throw err;
  }
}

// ─── رسالة إنشاء صادقة حسب سعة التنفيذ الفعلية ───────────────────────────────
// تُستدعى بعد إرسال حدث التنفيذ: لو توجد سعة حرة → "بدأ الإرسال"، وإلا الانتظار.
// عند تعذر القياس: null → يلتزم المتصل برسالة الانتظار المحافظة (لا ادعاء كاذب).
// precomputedPressure اختياري: لو الفانكشن اللي نادى علينا كانت أصلاً قاست
// السعة قبل ما تنادي enqueueCampaign (عشان تحدد draft/queued)، بنستخدم نفس
// القياس هنا بدل ما نعمل query تاني ونخاطر بعدم اتساق بين الحالة المحفوظة
// في قاعدة البيانات والرسالة المعروضة.
export async function honestQueueVerdict(
  userId: string,
  queued: number,
  scheduled: boolean,
  precomputedPressure?: CampaignQueuePressure,
): Promise<{
  message: string;
  startsImmediately: boolean;
  queue: { globalActive: number; userActive: number; globalLimit: number; userLimit: number; queuedWaiting: number } | null;
} | null> {
  try {
    if (scheduled) {
      return {
        message: `تم جدولة الحملة — ${queued} رسالة في الانتظار`,
        startsImmediately: false,
        queue: null,
      };
    }
    const pressure = precomputedPressure ?? (await getCampaignQueuePressure(userId));
    if (pressure.startsImmediately) {
      return {
        message: `بدأ إرسال الحملة مباشرة ✅`,
        startsImmediately: true,
        queue: {
          globalActive: pressure.globalActive,
          userActive: pressure.userActive,
          globalLimit: pressure.globalLimit,
          userLimit: pressure.userLimit,
          queuedWaiting: pressure.queuedWaiting,
        },
      };
    }
    return {
      message: `الحملة في قائمة الانتظار — سعة التنفيذ مشغولة (${pressure.globalActive}/${pressure.globalLimit}) وستبدأ تلقائيًا`,
      startsImmediately: false,
      queue: {
        globalActive: pressure.globalActive,
        userActive: pressure.userActive,
        globalLimit: pressure.globalLimit,
        userLimit: pressure.userLimit,
        queuedWaiting: pressure.queuedWaiting,
      },
    };
  } catch {
    return null;
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

  // نفس قاعدة الملكية أعلاه — الحساب قد يكون تبدّل منذ الحملة الأصلية.
  // wabaId فقط هو الفيصل الموثوق (راجع تعليق createCampaignForUser).
  if (original.template.wabaId && original.template.wabaId !== account.wabaId)
    return NextResponse.json(
      { error: "قالب الحملة الأصلية تابع لحساب واتساب آخر — أنشئ حملة جديدة بقالب الحساب الحالي" },
      { status: 422 }
    );

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

    const pressure = await getCampaignQueuePressure(userId).catch(() => null);

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
      startsImmediately: pressure?.startsImmediately ?? false,
    });

    await inngest.send({
      name: "campaign/send",
      data: { campaignId: newCampaign.id, userId },
    });

    const verdict = await honestQueueVerdict(userId, queued, false, pressure ?? undefined);
    return NextResponse.json({
      success: true,
      campaignId: newCampaign.id,
      queued,
      startsImmediately: verdict?.startsImmediately ?? false,
      queue: verdict?.queue ?? null,
      message:
        verdict?.message ??
        `تم وضع الحملة المكررة في قائمة الانتظار — سيبدأ الإرسال تلقائياً`,
    });
  } catch (err) {
    await refundCampaignQuota(userId);
    throw err;
  }
}
