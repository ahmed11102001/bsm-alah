// src/lib/store-automation.ts
// ─── Helper مشترك: تشغيل أتمتة المتجر (order_confirm / order_shipped / promo) ──

import prisma from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp-api";
import { decryptToken } from "@/lib/crypto";
import { notifyStoreAutoSent, notifyStoreAutoFailed } from "@/lib/notifications";
import {
  MessageDirection,
  MessageStatus,
  MessageType,
} from "@/types/enums";

export type StoreAutomationType = "order_confirm" | "order_shipped" | "promo" | "cart_abandon";
export type StoreSource = "shopify" | "easyorders" | "woocommerce";

// المتغيرات اللي بتتحقن في القالب
// body: ["قيمة {{1}}", "قيمة {{2}}", ...]
// لو null → القالب بدون متغيرات (ميتا بتقبله لو القالب مش فيه vars)
export interface TemplateVars {
  body: string[];                              // متغيرات الـ body {{1}} {{2}} ...
  header?: string;                                 // (قديم) نص هيدر — غير مستخدم حالياً
  headerMediaUrl?: string;                                 // رابط صورة/فيديو/PDF لو الـ Header من نوع media
  headerMediaType?: "image" | "video" | "document";          // نوع الميديا — افتراضي "image"
  buttons?: string[];                                // لو فيه أزرار dynamic (اختياري)
}

export interface TriggerStoreAutomationParams {
  userId: string;
  automationType: StoreAutomationType;
  storeSource: StoreSource;
  storeId: string;
  customerPhone: string;
  contactId: string;
  templateVars?: TemplateVars | null;
  storeOrderId?: string;
  abandonedCartId?: string;
}

function buildAutomationWhere(
  source: StoreSource,
  storeId: string,
  type: StoreAutomationType
) {
  if (source === "shopify")
    return { shopifyStoreId_type: { shopifyStoreId: storeId, type } };
  if (source === "easyorders")
    return { easyOrdersStoreId_type: { easyOrdersStoreId: storeId, type } };
  return { wooCommerceStoreId_type: { wooCommerceStoreId: storeId, type } };
}

export async function executeStoreAutomationSend(
  params: TriggerStoreAutomationParams
): Promise<{ sent: boolean; reason?: string }> {
  const {
    userId,
    automationType,
    storeSource,
    storeId,
    customerPhone,
    contactId,
    templateVars = null,
    storeOrderId,
    abandonedCartId,
  } = params;

  const automation = await prisma.storeAutomation.findUnique({
    where: buildAutomationWhere(storeSource, storeId, automationType),
    include: {
      template: {
        select: { id: true, name: true, language: true, status: true },
      },
      user: {
        select: {
          whatsappAccount: {
            select: { accessToken: true, phoneNumberId: true },
          },
        },
      },
    },
  });

  if (!automation) return { sent: false, reason: "no_automation" };
  if (!automation.isEnabled) return { sent: false, reason: "disabled" };
  if (!automation.template || automation.template.status?.toLowerCase() !== "approved")
    return { sent: false, reason: "template_not_approved" };

  const account = automation.user?.whatsappAccount;
  if (!account) return { sent: false, reason: "no_whatsapp_account" };
  // Claims must happen immediately before the WhatsApp call. The timestamp
  // makes rollback ownership-safe: a failed request can only release its own
  // claim, never a newer concurrent request's claim.
  let confirmationClaimedAt: Date | null = null;
  let shippedClaimedAt: Date | null = null;
  let cartClaimedAt: Date | null = null;

  if (automationType === "order_confirm" && storeOrderId) {
    confirmationClaimedAt = new Date();
    const claim = await prisma.storeOrder.updateMany({
      where: { id: storeOrderId, confirmationClaimedAt: null, confirmationMessageId: null },
      data: { confirmationClaimedAt },
    });
    if (claim.count !== 1) {
      return { sent: false, reason: "already_confirmed_or_in_progress" };
    }
  }

  // ── Atomic claim for order_shipped (prerequisite for smart follow-up) ──
  // Claim before sending to avoid duplicate sends when the webhook/handler
  // is invoked concurrently for the same order.
  let claimedShipped = false;
  if (automationType === "order_shipped" && storeOrderId) {
    shippedClaimedAt = new Date();
    const claim = await prisma.storeOrder.updateMany({
      where: { id: storeOrderId, shippedAt: null, shippedMessageId: null },
      data: { shippedAt: shippedClaimedAt },
    });
    claimedShipped = claim.count === 1;
    if (!claimedShipped) {
      // Already shipped or in progress — don't send again
      return { sent: false, reason: "already_shipped_or_in_progress" };
    }
  }

  if (automationType === "cart_abandon" && abandonedCartId) {
    cartClaimedAt = new Date();
    const claim = await prisma.abandonedCart.updateMany({
      where: { id: abandonedCartId, recoveredAt: null, sentAt: null, sendClaimedAt: null },
      data: { sendClaimedAt: cartClaimedAt },
    });
    if (claim.count !== 1) {
      return { sent: false, reason: "already_abandoned_cart_sent_or_in_progress" };
    }
  }

  let result;
  try {
    result = await sendWhatsAppMessage({
      toPhone: customerPhone,
      phoneNumberId: account.phoneNumberId,
      accessToken: decryptToken(account.accessToken),
      messageType: "template",
      templateName: automation.template.name,
      templateLang: automation.template.language ?? "ar",
      templateVars,
      content: null,
    });
  } catch (error) {
    await releaseAutomationClaims({ storeOrderId, abandonedCartId, confirmationClaimedAt, shippedClaimedAt, cartClaimedAt });
    throw error;
  }


  await prisma.message.create({
    data: {
      userId,
      contactId,
      content: `[أتمتة متجر] ${automation.template.name}`,
      type: MessageType.template,
      direction: MessageDirection.outbound,
      status: result.ok ? MessageStatus.sent : MessageStatus.failed,
      whatsappId: result.ok ? result.whatsappMsgId : null,
      error: result.ok ? null : (result.error ?? "فشل الإرسال"),
      sentAt: result.ok ? new Date() : null,
    },
  }).catch((e) => console.error("[StoreAuto] DB message save failed:", e));

  if (result.ok) {
    await prisma.storeAutomation.update({
      where: { id: automation.id },
      data: { sentCount: { increment: 1 }, lastSentAt: new Date() },
    }).catch(() => { });

    if (automationType === "order_confirm" && storeOrderId) {
      await prisma.storeOrder.update({
        where: { id: storeOrderId },
        data: {
          status: "awaiting_confirmation",
          ...(result.whatsappMsgId ? { confirmationMessageId: result.whatsappMsgId } : {}),
          confirmationClaimedAt: null,
        },
      }).catch((e) => console.error("[StoreAuto] Failed to update StoreOrder with confirmationMessageId", e));
    }

    if (automationType === "order_shipped" && storeOrderId) {
      await prisma.storeOrder.update({
        where: { id: storeOrderId },
        data: result.whatsappMsgId ? { shippedMessageId: result.whatsappMsgId } : {},
      }).catch((e) => console.error("[StoreAuto] Failed to update StoreOrder with shippedMessageId", e));

      // Schedule smart follow-up (fire and forget)
      try {
        const { scheduleShippingFollowUp } = await import("@/lib/smart-followup");
        await scheduleShippingFollowUp(storeOrderId, userId);
      } catch (e) {
        console.error("[SmartFollowUp] Failed to schedule shipping follow-up:", e);
      }

    }

    if (automationType === "cart_abandon" && abandonedCartId && cartClaimedAt) {
      await prisma.abandonedCart.updateMany({
        where: { id: abandonedCartId, sendClaimedAt: cartClaimedAt, sentAt: null },
        data: { sentAt: new Date(), sendClaimedAt: null },
      }).catch((e) => console.error("[StoreAuto] Failed to finalize abandoned cart claim", e));
    }
  } else {
    await prisma.storeAutomation.update({
      where: { id: automation.id },
      data: { failedCount: { increment: 1 } },
    }).catch(() => { });

    await releaseAutomationClaims({ storeOrderId, abandonedCartId, confirmationClaimedAt, shippedClaimedAt, cartClaimedAt });
  }

  console.log(result.ok
    ? `[StoreAuto] ✓ ${automationType} → ${customerPhone} (${storeSource})`
    : `[StoreAuto] ✗ ${automationType} → ${customerPhone}: ${result.error}`
  );

  // 🔔 إشعار نجاح أو فشل الإرسال
  if (result.ok) {
    await notifyStoreAutoSent(
      userId, automationType, storeSource, customerPhone, automation.template.name,
    ).catch(() => { });
  } else {
    await notifyStoreAutoFailed(
      userId, automationType, storeSource, customerPhone,
      automation.template.name, result.error ?? "فشل غير معروف",
    ).catch(() => { });
  }

  return { sent: result.ok, reason: result.ok ? undefined : result.error };
}

async function releaseAutomationClaims({
  storeOrderId,
  abandonedCartId,
  confirmationClaimedAt,
  shippedClaimedAt,
  cartClaimedAt,
}: {
  storeOrderId?: string;
  abandonedCartId?: string;
  confirmationClaimedAt: Date | null;
  shippedClaimedAt: Date | null;
  cartClaimedAt: Date | null;
}) {
  const operations = [];
  if (storeOrderId && confirmationClaimedAt) {
    operations.push(prisma.storeOrder.updateMany({
      where: { id: storeOrderId, confirmationClaimedAt, confirmationMessageId: null },
      data: { confirmationClaimedAt: null },
    }));
  }
  if (storeOrderId && shippedClaimedAt) {
    operations.push(prisma.storeOrder.updateMany({
      where: { id: storeOrderId, shippedAt: shippedClaimedAt, shippedMessageId: null },
      data: { shippedAt: null },
    }));
  }
  if (abandonedCartId && cartClaimedAt) {
    operations.push(prisma.abandonedCart.updateMany({
      where: { id: abandonedCartId, sendClaimedAt: cartClaimedAt, sentAt: null },
      data: { sendClaimedAt: null },
    }));
  }
  await Promise.all(operations).catch((error) => console.error("[StoreAuto] Failed to release claim", error));
}

export async function triggerStoreAutomation(
  params: TriggerStoreAutomationParams
): Promise<{ sent: boolean; reason?: string }> {
  const {
    userId,
    automationType,
    storeSource,
    storeId,
    customerPhone,
    contactId,
    templateVars = null,
    storeOrderId,
    abandonedCartId,
  } = params;

  const automation = await prisma.storeAutomation.findUnique({
    where: buildAutomationWhere(storeSource, storeId, automationType),
    select: {
      id: true,
      isEnabled: true,
      delayMinutes: true,
    },
  });

  if (!automation) return { sent: false, reason: "no_automation" };
  if (!automation.isEnabled) return { sent: false, reason: "disabled" };

  // إذا كان هناك تأخير محدد، قم بجدولة الإرسال عبر Inngest
  if (automation.delayMinutes && automation.delayMinutes > 0) {
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "store/automation.trigger",
      data: {
        userId,
        automationType,
        storeSource,
        storeId,
        customerPhone,
        contactId,
        templateVars,
        delayMinutes: automation.delayMinutes,
        storeOrderId,
        abandonedCartId,
      },
    });
    console.log(`[StoreAuto] ⏱ Scheduled ${automationType} to send in ${automation.delayMinutes} mins for ${customerPhone}`);
    return { sent: false, reason: "scheduled" };
  }

  // إرسال فوري إذا لم يكن هناك تأخير
  return executeStoreAutomationSend(params);
}
