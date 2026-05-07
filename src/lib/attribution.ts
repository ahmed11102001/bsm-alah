// src/lib/attribution.ts
// ─── Revenue Attribution Helpers ─────────────────────────────────────────────
// دوال مشتركة بتتاستخدم من:
//   - campaigns/route.ts     (توليد الـ tracked token لكل كونتاكت)
//   - shopify/webhooks        (ربط الأوردر بالحملة)
//   - easy-orders/webhooks    (نفس المنطق)

import prisma from "@/lib/prisma";
import crypto from "crypto";

// ─── Attribution Window: 48 ساعة ─────────────────────────────────────────────
export const ATTRIBUTION_HOURS = 48;

// ─── توليد token فريد للـ tracked link ───────────────────────────────────────
export function generateClickToken(
  campaignId: string,
  contactPhone: string
): string {
  // HMAC عشان نضمن uniqueness + صعوبة التخمين
  return crypto
    .createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(`${campaignId}:${contactPhone}:${Date.now()}`)
    .digest("hex")
    .slice(0, 32);
}

// ─── بناء الـ tracked URL اللي هيتبعت في الرسالة ────────────────────────────
export function buildTrackedUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app";
  return `${base}/t/${token}`;
}

// ─── Attribution: لما أوردر يوصل، ابص هل في كليك مفتوح لنفس الرقم ──────────
// بتتاستخدم من Shopify + EasyOrders webhooks
export async function attributeOrderToCampaign(params: {
  userId:        string;
  customerPhone: string;
  storeOrderId:  string;
  revenue:       number;
}): Promise<{ attributed: boolean; campaignId?: string }> {
  const { userId, customerPhone, storeOrderId, revenue } = params;

  // نظف الرقم
  const cleanPhone = customerPhone.replace(/\D/g, "");

  const now = new Date();

  // ابص هل في TrackedClick:
  // - نفس الـ userId
  // - نفس الرقم (عن طريق contactId)
  // - اتضغط فعلاً (isClicked = true)
  // - لسه في الـ attribution window (attributionExpiresAt > now)
  // رتب من الأحدث لأن هناخد الحملة الأخيرة اللي الشخص ده ضغط عليها
  const click = await prisma.trackedClick.findFirst({
    where: {
      userId,
      isClicked:            true,
      attributionExpiresAt: { gt: now },
      contact: {
        phone: cleanPhone,
        userId,
      },
    },
    orderBy: { clickedAt: "desc" },
    select: {
      id:         true,
      campaignId: true,
    },
  });

  if (!click) {
    return { attributed: false };
  }

  // ربط الأوردر بالحملة في transaction واحدة
  try {
    await prisma.$transaction([
      // أنشئ CampaignOrder
      prisma.campaignOrder.create({
        data: {
          campaignId:   click.campaignId,
          storeOrderId: storeOrderId,
          revenue:      revenue,
        },
      }),
      // حدّث إجماليات الحملة
      prisma.campaign.update({
        where: { id: click.campaignId },
        data: {
          revenue:     { increment: revenue },
          ordersCount: { increment: 1 },
        },
      }),
    ]);

    console.log(
      `[ATTRIBUTION] Order ${storeOrderId} attributed to campaign ${click.campaignId} — revenue: ${revenue}`
    );

    return { attributed: true, campaignId: click.campaignId };
  } catch (err: any) {
    // لو الأوردر ده اتنسب قبل كده (unique constraint على storeOrderId) — مش error
    if (err?.code === "P2002") {
      console.log(`[ATTRIBUTION] Order ${storeOrderId} already attributed — skipping`);
      return { attributed: false };
    }
    console.error("[ATTRIBUTION] Failed to attribute order:", err);
    return { attributed: false };
  }
}