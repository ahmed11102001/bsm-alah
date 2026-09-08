// src/lib/campaign-queue.ts
// ══════════════════════════════════════════════════════════════════════════════
//  صدق حالة طابور الحملات — هل الحملة الجديدة ستبدأ فورًا أم ستنتظر؟
//
//  أين حد التزامن فعلًا (لا تعتمد فقط على Campaign.status):
//  - processCampaign (حدث campaign/send) في src/inngest/functions.ts يملك
//    concurrency: [{ limit: 5 } عامة, { limit: 2 لكل userId }].
  //  - الـ run التنفيذي يحجز الحملة ذريًا queued/draft → running (claim)، ثم
  //    يرسل inline حتى queuedCount = 0 فيتحول completed.
//  - إذن "نشط فعليًا" = status running + نشاط حديث (updatedAt يتجدد مع كل
//    sentCount++). حملة running قديمة بلا نشاط = run متعثر سابق (edge نادر)،
//    تُستبعد حتى لا تحجز سعة وهمية للأبد.
//
//  ملاحظة: queue/process-item (حد 3 لكل رقم) يخص الرسائل المفردة (سلة/متابعة)،
//  وليس حملات — لا يدخل في هذا الحساب.
// ══════════════════════════════════════════════════════════════════════════════

import prisma from "@/lib/prisma";

// مطابقة لقيم inngest/functions.ts — أي تغيير هناك يجب أن ينعكس هنا
export const CAMPAIGN_GLOBAL_CONCURRENCY = 5;
export const CAMPAIGN_USER_CONCURRENCY = 2;
// حملة running بلا أي تحديث منذ هذه المدة تُعتبر متعثرة ولا تحجز سعة
export const CAMPAIGN_ACTIVE_FRESH_MS = 30 * 60 * 1000;

export interface CampaignQueuePressure {
  globalActive: number;
  userActive: number;
  globalLimit: number;
  userLimit: number;
  queuedWaiting: number;
  startsImmediately: boolean;
}

export async function getCampaignQueuePressure(userId: string): Promise<CampaignQueuePressure> {
  const freshSince = new Date(Date.now() - CAMPAIGN_ACTIVE_FRESH_MS);

  const [globalActive, userActive, queuedWaiting] = await Promise.all([
    prisma.campaign.count({
      where: { status: "running", updatedAt: { gte: freshSince } },
    }),
    prisma.campaign.count({
      where: { userId, status: "running", updatedAt: { gte: freshSince } },
    }),
    prisma.campaign.count({
      where: { userId, status: "queued" },
    }),
  ]);

  return {
    globalActive,
    userActive,
    globalLimit: CAMPAIGN_GLOBAL_CONCURRENCY,
    userLimit: CAMPAIGN_USER_CONCURRENCY,
    queuedWaiting,
    startsImmediately:
      globalActive < CAMPAIGN_GLOBAL_CONCURRENCY &&
      userActive < CAMPAIGN_USER_CONCURRENCY,
  };
}
