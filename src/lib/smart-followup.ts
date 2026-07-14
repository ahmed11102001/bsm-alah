// src/lib/smart-followup.ts
// ─── الملف المركزي لكل منطق المتابعة الذكية ──────────────────────────────────

import prisma from "@/lib/prisma";
import { sendWhatsAppMessage, type SendMessageParams } from "@/lib/whatsapp-api";
import { decryptToken } from "@/lib/crypto";
import { notifyAiHandoffNeeded, notifySmartFollowUpAlert } from "@/lib/notifications";
import {
  MessageDirection,
  MessageStatus,
  MessageType,
  ShippingFollowUpStage,
  CartFollowUpStage,
  ORDER_CANCEL_REASON_IDS,
  type SmartFollowUpType,
} from "@/types/enums";

// ─── Constants ────────────────────────────────────────────────────────────────

export const SMART_FOLLOWUP_TEMPLATE_NAMES: Record<"shipping" | "cart" | "order_confirm", string> = {
  shipping: "wani_shipping_followup",
  cart:     "wani_abandoned_cart_followup",
  order_confirm: "wani_order_confirm_followup",
};

export const SHIPPING_STAGE_EXPIRY_HOURS = 48;
export const CART_STAGE_EXPIRY_HOURS     = 48;

// namespaced IDs — يمنع تصادم لو اتضافت flows تانية بعدين
export const SHIPPING_RATING_IDS = [
  "shipping_rating_1",
  "shipping_rating_2",
  "shipping_rating_3",
  "shipping_rating_4",
  "shipping_rating_5",
] as const;

export const CART_REASON_IDS = {
  priceHigh:   "cart_reason_price_high",
  changedMind: "cart_reason_changed_mind",
  other:       "cart_reason_other",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type FollowUpKind = "shipping" | "cart" | "order_confirm";

export type FollowUpContext = {
  kind: "shipping";
  order: Awaited<ReturnType<typeof findStoreOrderByContext>>;
} | {
  kind: "cart";
  cart: Awaited<ReturnType<typeof findAbandonedCartByContext>>;
} | {
  kind: "order_confirm";
  order: Awaited<ReturnType<typeof findStoreOrderByCancelContext>>;
};

// ─── Template Resolution ──────────────────────────────────────────────────────

export async function resolveSmartFollowUpTemplate(userId: string, type: FollowUpKind) {
  const templateName = SMART_FOLLOWUP_TEMPLATE_NAMES[type];
  const template = await prisma.template.findFirst({
    where: {
      userId,
      name: { equals: templateName, mode: "insensitive" },
    },
    orderBy: { status: "asc" }, // APPROVED comes before PENDING alphabetically
    select: { id: true, name: true, status: true, language: true },
  });
  // APPROVED only — anything else (PENDING/DISABLED/REJECTED/PAUSED) = null
  if (!template || template.status.toLowerCase() !== "approved") return null;
  return template;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSmartFollowUpSetting(userId: string, type: FollowUpKind) {
  return prisma.smartFollowUpSetting.findUnique({
    where: { userId_type: { userId, type } },
  });
}

// ─── Scheduling ───────────────────────────────────────────────────────────────

export async function scheduleShippingFollowUp(storeOrderId: string, userId: string) {
  const setting = await getSmartFollowUpSetting(userId, "shipping");
  if (!setting || !setting.isEnabled) return;

  const template = await resolveSmartFollowUpTemplate(userId, "shipping");
  if (!template) {
    console.warn(`[SmartFollowUp] Template wani_shipping_followup not approved for user ${userId} — skipping schedule`);
    return;
  }

  const { inngest } = await import("@/inngest/client");
  await inngest.send({
    name: "followup/shipping.schedule",
    data: { storeOrderId, userId, delayDays: setting.triggerDelayDays, replyDelayMinutes: setting.replyDelayMinutes },
  });
  console.log(`[SmartFollowUp] Scheduled shipping follow-up for order ${storeOrderId} in ${setting.triggerDelayDays} days`);
}

export async function scheduleCartFollowUp(abandonedCartId: string, userId: string) {
  const setting = await getSmartFollowUpSetting(userId, "cart");
  if (!setting || !setting.isEnabled) return;

  const template = await resolveSmartFollowUpTemplate(userId, "cart");
  if (!template) {
    console.warn(`[SmartFollowUp] Template wani_abandoned_cart_followup not approved for user ${userId} — skipping schedule`);
    return;
  }

  const { inngest } = await import("@/inngest/client");
  await inngest.send({
    name: "followup/cart.schedule",
    data: { abandonedCartId, userId, delayDays: setting.triggerDelayDays, replyDelayMinutes: setting.replyDelayMinutes },
  });
  console.log(`[SmartFollowUp] Scheduled cart follow-up for cart ${abandonedCartId} in ${setting.triggerDelayDays} days`);
}

// ─── Reschedule Check ─────────────────────────────────────────────────────────

export async function checkShippingRescheduleNeeded(
  storeOrderId: string,
  originalDelayDays: number
): Promise<{ needsReschedule: boolean; extraSleepSeconds: number }> {
  const order = await prisma.storeOrder.findUnique({
    where: { id: storeOrderId },
    select: { userId: true },
  });
  if (!order) return { needsReschedule: false, extraSleepSeconds: 0 };

  const setting = await getSmartFollowUpSetting(order.userId, "shipping");
  if (!setting) return { needsReschedule: false, extraSleepSeconds: 0 };

  const currentDelayDays = setting.triggerDelayDays;
  if (currentDelayDays <= originalDelayDays) return { needsReschedule: false, extraSleepSeconds: 0 };

  const extraDays = currentDelayDays - originalDelayDays;
  return { needsReschedule: true, extraSleepSeconds: extraDays * 24 * 60 * 60 };
}

export async function checkCartRescheduleNeeded(
  abandonedCartId: string,
  originalDelayDays: number
): Promise<{ needsReschedule: boolean; extraSleepSeconds: number }> {
  const cart = await prisma.abandonedCart.findUnique({
    where: { id: abandonedCartId },
    select: { userId: true },
  });
  if (!cart) return { needsReschedule: false, extraSleepSeconds: 0 };

  const setting = await getSmartFollowUpSetting(cart.userId, "cart");
  if (!setting) return { needsReschedule: false, extraSleepSeconds: 0 };

  const currentDelayDays = setting.triggerDelayDays;
  if (currentDelayDays <= originalDelayDays) return { needsReschedule: false, extraSleepSeconds: 0 };

  const extraDays = currentDelayDays - originalDelayDays;
  return { needsReschedule: true, extraSleepSeconds: extraDays * 24 * 60 * 60 };
}

// ─── Send Helpers (session messages inside 24h window) ────────────────────────

export async function sendSessionText(
  toPhone: string,
  phoneNumberId: string,
  accessToken: string,
  body: string,
  opts?: { userId?: string; contactId?: string; label?: string }
) {
  const result = await sendWhatsAppMessage({
    toPhone,
    phoneNumberId,
    accessToken,
    messageType: "text",
    templateName: null,
    templateLang: "ar",
    templateVars: null,
    content: body,
  });

  if (opts?.userId && opts?.contactId && result.ok) {
    await prisma.message.create({
      data: {
        userId: opts.userId,
        contactId: opts.contactId,
        content: `[متابعة ذكية] ${opts.label ?? body.slice(0, 50)}`,
        type: MessageType.text,
        direction: MessageDirection.outbound,
        status: MessageStatus.sent,
        senderType: "bot" as any,
        whatsappId: result.whatsappMsgId,
        sentAt: new Date(),
      },
    }).catch(() => {});
  }
  return result;
}

export async function sendSessionButtons(
  toPhone: string,
  phoneNumberId: string,
  accessToken: string,
  body: string,
  buttons: { id: string; title: string }[],
  opts?: { userId?: string; contactId?: string; label?: string }
) {
  const result = await sendWhatsAppMessage({
    toPhone,
    phoneNumberId,
    accessToken,
    messageType: "interactive_buttons",
    templateName: null,
    templateLang: "ar",
    templateVars: null,
    content: null,
    interactive: { body, buttons: buttons.slice(0, 3) },
  });

  if (opts?.userId && opts?.contactId && result.ok) {
    await prisma.message.create({
      data: {
        userId: opts.userId,
        contactId: opts.contactId,
        content: `[متابعة ذكية] ${opts.label ?? body.slice(0, 50)}`,
        type: MessageType.text,
        direction: MessageDirection.outbound,
        status: MessageStatus.sent,
        senderType: "bot" as any,
        whatsappId: result.whatsappMsgId,
        sentAt: new Date(),
      },
    }).catch(() => {});
  }
  return result;
}

async function sendSessionList(
  toPhone: string,
  phoneNumberId: string,
  accessToken: string,
  body: string,
  buttonText: string,
  rows: { id: string; title: string; description?: string }[],
  opts?: { userId?: string; contactId?: string; label?: string }
) {
  const result = await sendWhatsAppMessage({
    toPhone,
    phoneNumberId,
    accessToken,
    messageType: "interactive_list",
    templateName: null,
    templateLang: "ar",
    templateVars: null,
    content: null,
    interactive: { body, list: { buttonText, rows: rows.slice(0, 10) } },
  });

  if (opts?.userId && opts?.contactId && result.ok) {
    await prisma.message.create({
      data: {
        userId: opts.userId,
        contactId: opts.contactId,
        content: `[متابعة ذكية] ${opts.label ?? body.slice(0, 50)}`,
        type: MessageType.text,
        direction: MessageDirection.outbound,
        status: MessageStatus.sent,
        senderType: "bot" as any,
        whatsappId: result.whatsappMsgId,
        sentAt: new Date(),
      },
    }).catch(() => {});
  }
  return result;
}

// ─── Get WhatsApp Account ─────────────────────────────────────────────────────

async function getWhatsappAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      whatsappAccount: {
        select: { accessToken: true, phoneNumberId: true },
      },
    },
  });
  return user?.whatsappAccount ?? null;
}

// ─── Atomic Claim Helpers ─────────────────────────────────────────────────────

function expiryDate(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function isRateLimit(result: { isRateLimit?: boolean }) {
  return result.isRateLimit === true;
}

// ─── Send Shipping Follow-Up Now ──────────────────────────────────────────────

export async function sendShippingFollowUpNow(storeOrderId: string, originalDelayDays: number) {
  const order = await prisma.storeOrder.findUnique({
    where: { id: storeOrderId },
    select: {
      id: true, status: true, customerPhone: true, contactId: true,
      userId: true, followUpSentAt: true, orderNumber: true, customerName: true,
    },
  });
  if (!order) return { sent: false, reason: "order_not_found" };

  // ── Re-verification (fresh checks) ──
  if (["cancelled", "returned", "refunded"].includes(order.status)) {
    return { sent: false, reason: "order_cancelled" };
  }
  if (!order.contactId) return { sent: false, reason: "no_contact" };

  const setting = await getSmartFollowUpSetting(order.userId, "shipping");
  if (!setting || !setting.isEnabled) return { sent: false, reason: "disabled" };

  const template = await resolveSmartFollowUpTemplate(order.userId, "shipping");
  if (!template) return { sent: false, reason: "template_not_approved" };

  // ── Atomic claim ──
  const claim = await prisma.storeOrder.updateMany({
    where: { id: storeOrderId, followUpSentAt: null },
    data:  { followUpSentAt: new Date() },
  });
  if (claim.count === 0) return { sent: false, reason: "already_sent" };

  // ── Send ──
  const account = await getWhatsappAccount(order.userId);
  if (!account) {
    await prisma.storeOrder.updateMany({
      where: { id: storeOrderId },
      data: { followUpSentAt: null },
    });
    return { sent: false, reason: "no_whatsapp_account" };
  }

  const result = await sendWhatsAppMessage({
    toPhone:       order.customerPhone,
    phoneNumberId: account.phoneNumberId,
    accessToken:   decryptToken(account.accessToken),
    messageType:   "template",
    templateName:  template.name,
    templateLang:  template.language ?? "ar",
    templateVars:  { body: [order.customerName || "عزيزي العميل"] },
    content:       null,
  });

  if (result.ok) {
    const now = new Date();
    await prisma.storeOrder.update({
      where: { id: storeOrderId },
      data: {
        followUpMessageId:      result.whatsappMsgId,
        followUpStage:          ShippingFollowUpStage.SENT,
        followUpStageExpiresAt: expiryDate(SHIPPING_STAGE_EXPIRY_HOURS),
      },
    });

    await prisma.message.create({
      data: {
        userId:      order.userId,
        contactId:   order.contactId,
        content:     `[متابعة ذكية] wani_shipping_followup`,
        type:        MessageType.template,
        direction:   MessageDirection.outbound,
        status:      MessageStatus.sent,
        senderType:  "bot" as any,
        whatsappId:  result.whatsappMsgId,
        sentAt:      now,
      },
    }).catch(() => {});

    await prisma.smartFollowUpSetting.update({
      where: { userId_type: { userId: order.userId, type: "shipping" } },
      data:  { sentCount: { increment: 1 }, lastSentAt: now },
    }).catch(() => {});

    return { sent: true, messageId: result.whatsappMsgId };
  } else {
    // Rate limit → rollback claim + throw for Inngest retry
    if (isRateLimit(result)) {
      await prisma.storeOrder.updateMany({
        where: { id: storeOrderId },
        data:  { followUpSentAt: null },
      });
      throw new Error(`Rate limit on shipping follow-up: ${result.error}`);
    }

    // Other failure → keep claim, log + notify
    await prisma.smartFollowUpSetting.update({
      where: { userId_type: { userId: order.userId, type: "shipping" } },
      data:  { failedCount: { increment: 1 } },
    }).catch(() => {});

    await notifySmartFollowUpAlert(
      order.userId,
      "shipping_send_failed",
      { customerPhone: order.customerPhone, orderNumber: order.orderNumber ?? undefined, error: result.error }
    ).catch(() => {});

    return { sent: false, reason: result.error };
  }
}

// ─── Send Cart Follow-Up Now ──────────────────────────────────────────────────

export async function sendCartFollowUpNow(abandonedCartId: string, originalDelayDays: number) {
  const cart = await prisma.abandonedCart.findUnique({
    where: { id: abandonedCartId },
    select: {
      id: true, userId: true, customerPhone: true, customerName: true,
      recoveredAt: true, followUpSentAt: true, recoveryUrl: true,
    },
  });
  if (!cart) return { sent: false, reason: "cart_not_found" };

  // ── Re-verification ──
  if (cart.recoveredAt) return { sent: false, reason: "recovered" };

  const setting = await getSmartFollowUpSetting(cart.userId, "cart");
  if (!setting || !setting.isEnabled) return { sent: false, reason: "disabled" };

  const template = await resolveSmartFollowUpTemplate(cart.userId, "cart");
  if (!template) return { sent: false, reason: "template_not_approved" };

  // ── Atomic claim ──
  const claim = await prisma.abandonedCart.updateMany({
    where: { id: abandonedCartId, followUpSentAt: null },
    data:  { followUpSentAt: new Date() },
  });
  if (claim.count === 0) return { sent: false, reason: "already_sent" };

  // ── Send ──
  const account = await getWhatsappAccount(cart.userId);
  if (!account) {
    await prisma.abandonedCart.updateMany({
      where: { id: abandonedCartId },
      data: { followUpSentAt: null },
    });
    return { sent: false, reason: "no_whatsapp_account" };
  }

  const result = await sendWhatsAppMessage({
    toPhone:       cart.customerPhone,
    phoneNumberId: account.phoneNumberId,
    accessToken:   decryptToken(account.accessToken),
    messageType:   "template",
    templateName:  template.name,
    templateLang:  template.language ?? "ar",
    templateVars:  { body: [cart.customerName || "عزيزي العميل"] },
    content:       null,
  });

  if (result.ok) {
    const now = new Date();
    await prisma.abandonedCart.update({
      where: { id: abandonedCartId },
      data: {
        followUpMessageId:      result.whatsappMsgId,
        followUpStage:          CartFollowUpStage.SENT,
        followUpStageExpiresAt: expiryDate(CART_STAGE_EXPIRY_HOURS),
      },
    });

    await prisma.message.create({
      data: {
        userId:     cart.userId,
        contactId:  (await prisma.contact.findFirst({
          where: { phone: cart.customerPhone, userId: cart.userId },
          select: { id: true },
        }))?.id ?? "",
        content:    `[متابعة ذكية] wani_abandoned_cart_followup`,
        type:       MessageType.template,
        direction:  MessageDirection.outbound,
        status:     MessageStatus.sent,
        senderType: "bot" as any,
        whatsappId: result.whatsappMsgId,
        sentAt:     now,
      },
    }).catch(() => {});

    await prisma.smartFollowUpSetting.update({
      where: { userId_type: { userId: cart.userId, type: "cart" } },
      data:  { sentCount: { increment: 1 }, lastSentAt: now },
    }).catch(() => {});

    return { sent: true, messageId: result.whatsappMsgId };
  } else {
    if (isRateLimit(result)) {
      await prisma.abandonedCart.updateMany({
        where: { id: abandonedCartId },
        data:  { followUpSentAt: null },
      });
      throw new Error(`Rate limit on cart follow-up: ${result.error}`);
    }

    await prisma.smartFollowUpSetting.update({
      where: { userId_type: { userId: cart.userId, type: "cart" } },
      data:  { failedCount: { increment: 1 } },
    }).catch(() => {});

    await notifySmartFollowUpAlert(
      cart.userId,
      "cart_send_failed",
      { customerPhone: cart.customerPhone, error: result.error }
    ).catch(() => {});

    return { sent: false, reason: result.error };
  }
}

// ─── Context Resolution ───────────────────────────────────────────────────────

async function findStoreOrderByContext(ctx: { id?: string | null; userId: string; phone?: string }) {
  const now = new Date();
  if (ctx.id) {
    const order = await prisma.storeOrder.findFirst({
      where: {
        userId: ctx.userId,
        followUpMessageId: ctx.id,
        followUpStage: { not: ShippingFollowUpStage.DONE },
        followUpStageExpiresAt: { gt: now },
      },
    });
    if (order) return order;
  }
  if (ctx.phone) {
    const order = await prisma.storeOrder.findFirst({
      where: {
        userId: ctx.userId,
        customerPhone: ctx.phone,
        followUpStage: { not: ShippingFollowUpStage.DONE },
        followUpStageExpiresAt: { gt: now },
      },
      orderBy: { followUpSentAt: "desc" },
    });
    if (order) return order;
  }
  return null;
}

async function findAbandonedCartByContext(ctx: { id?: string | null; userId: string; phone?: string }) {
  const now = new Date();
  if (ctx.id) {
    const cart = await prisma.abandonedCart.findFirst({
      where: {
        userId: ctx.userId,
        followUpMessageId: ctx.id,
        followUpStage: { not: CartFollowUpStage.DONE },
        followUpStageExpiresAt: { gt: now },
      },
    });
    if (cart) return cart;
  }
  if (ctx.phone) {
    const cart = await prisma.abandonedCart.findFirst({
      where: {
        userId: ctx.userId,
        customerPhone: ctx.phone,
        followUpStage: { not: CartFollowUpStage.DONE },
        followUpStageExpiresAt: { gt: now },
      },
      orderBy: { followUpSentAt: "desc" },
    });
    if (cart) return cart;
  }
  return null;
}

// ─── Order Confirm Cancel Reason Context ──────────────────────────────────────

async function findStoreOrderByCancelContext(ctx: { id?: string | null; userId: string; phone?: string }) {
  const now = new Date();
  if (ctx.id) {
    const order = await prisma.storeOrder.findFirst({
      where: {
        userId: ctx.userId,
        cancelReasonMessageId: ctx.id,
        cancelReasonStage: "AWAITING_REASON",
        cancelReasonExpiresAt: { gt: now },
      },
    });
    if (order) return order;
  }
  if (ctx.phone) {
    const order = await prisma.storeOrder.findFirst({
      where: {
        userId: ctx.userId,
        customerPhone: ctx.phone,
        cancelReasonStage: "AWAITING_REASON",
        cancelReasonExpiresAt: { gt: now },
      },
      orderBy: { orderedAt: "desc" },
    });
    if (order) return order;
  }
  return null;
}

export async function resolveActiveFollowUpContext({
  userId,
  phone,
  contextId,
}: {
  userId: string;
  phone: string;
  contextId?: string | null;
}): Promise<FollowUpContext | null> {
  // 1. Try StoreOrder by contextId (shipping follow-up)
  if (contextId) {
    const order = await findStoreOrderByContext({ id: contextId, userId });
    if (order) return { kind: "shipping", order };
  }
  // 2. Try AbandonedCart by contextId
  if (contextId) {
    const cart = await findAbandonedCartByContext({ id: contextId, userId });
    if (cart) return { kind: "cart", cart };
  }
  // 3. Try StoreOrder cancel reason by contextId
  if (contextId) {
    const order = await findStoreOrderByCancelContext({ id: contextId, userId });
    if (order) return { kind: "order_confirm", order };
  }
  // 4. Fallback: StoreOrder by phone (shipping)
  const order = await findStoreOrderByContext({ userId, phone });
  if (order) return { kind: "shipping", order };
  // 5. Fallback: AbandonedCart by phone
  const cart = await findAbandonedCartByContext({ userId, phone });
  if (cart) return { kind: "cart", cart };
  // 6. Fallback: StoreOrder cancel reason by phone
  const cancelOrder = await findStoreOrderByCancelContext({ userId, phone });
  if (cancelOrder) return { kind: "order_confirm", order: cancelOrder };
  // 7. Nothing
  return null;
}

// ─── Close Expired Stage ──────────────────────────────────────────────────────

export async function closeExpiredStageIfNeeded(
  kind: "shipping" | "cart",
  record: { id: string; followUpStage?: string | null; followUpStageExpiresAt?: Date | null }
) {
  if (!record.followUpStage || record.followUpStage === "DONE") return;
  if (!record.followUpStageExpiresAt) return;
  if (record.followUpStageExpiresAt > new Date()) return; // still valid

  if (kind === "shipping") {
    await prisma.storeOrder.updateMany({
      where: { id: record.id, followUpStage: { not: ShippingFollowUpStage.DONE } },
      data:  { followUpStage: ShippingFollowUpStage.DONE },
    });
  } else {
    await prisma.abandonedCart.updateMany({
      where: { id: record.id, followUpStage: { not: CartFollowUpStage.DONE } },
      data:  { followUpStage: CartFollowUpStage.DONE },
    });
  }
  console.log(`[SmartFollowUp] Auto-closed expired stage for ${kind} ${record.id}`);
}

// ─── Handle Shipping Reply ────────────────────────────────────────────────────

export interface ReplyParams {
  payloadId?: string | null;
  payloadTitle?: string;
  messageText: string;
  accountOwner: { accessToken: string; phoneNumberId: string };
  userId: string;
}

export async function handleShippingFollowUpReply(
  order: NonNullable<Awaited<ReturnType<typeof findStoreOrderByContext>>>,
  { payloadId, messageText, accountOwner, userId }: ReplyParams
) {
  const setting = await getSmartFollowUpSetting(userId, "shipping");
  if (!setting) return;

  const texts = (setting.texts ?? {}) as Record<string, string>;
  const contact = order.contactId
    ? await prisma.contact.findUnique({ where: { id: order.contactId }, select: { id: true, phone: true, name: true } })
    : null;

  // ── Branch: delivered ──
  if (payloadId === "delivered" && order.followUpStage === ShippingFollowUpStage.SENT) {
    const claim = await prisma.storeOrder.updateMany({
      where: { id: order.id, followUpStage: ShippingFollowUpStage.SENT },
      data: {
        followUpStage:          ShippingFollowUpStage.AWAITING_RATING,
        followUpStageExpiresAt: expiryDate(SHIPPING_STAGE_EXPIRY_HOURS),
      },
    });
    if (claim.count === 0) return;

    const result = await sendSessionList(
      order.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.rating || "يسعدنا معرفة رأيك في المنتج ⭐",
      "التقييم",
      Array.from({ length: 5 }, (_, i) => ({
        id:    `shipping_rating_${i + 1}`,
        title: `${"⭐".repeat(i + 1)}`,
      })),
      { userId, contactId: contact?.id, label: "طلب تقييم" }
    );
    if (result.ok && result.whatsappMsgId) {
      await prisma.storeOrder.update({
        where: { id: order.id },
        data:  { followUpMessageId: result.whatsappMsgId },
      });
    }
    return;
  }

  // ── Branch: rating 1-5 ──
  if (payloadId?.startsWith("shipping_rating_") && order.followUpStage === ShippingFollowUpStage.AWAITING_RATING) {
    const rating = parseInt(payloadId.replace("shipping_rating_", ""), 10);
    if (isNaN(rating) || rating < 1 || rating > 5) return;

    const claim = await prisma.storeOrder.updateMany({
      where: { id: order.id, followUpStage: ShippingFollowUpStage.AWAITING_RATING },
      data:  { followUpStage: ShippingFollowUpStage.DONE, followUpRating: rating },
    });
    if (claim.count === 0) return;

    if (rating <= 2) {
      await notifySmartFollowUpAlert(
        userId,
        "low_rating",
        { customerPhone: order.customerPhone, orderNumber: order.orderNumber ?? undefined, rating }
      );
    } else {
      await sendSessionText(
        order.customerPhone,
        accountOwner.phoneNumberId,
        accountOwner.accessToken,
        texts.ratingThanks || "شكرًا لتقييمك ❤️",
        { userId, contactId: contact?.id, label: "شكر على التقييم" }
      );
    }
    return;
  }

  // ── Branch: not_delivered ──
  if (payloadId === "not_delivered" && order.followUpStage === ShippingFollowUpStage.SENT) {
    const claim = await prisma.storeOrder.updateMany({
      where: { id: order.id, followUpStage: ShippingFollowUpStage.SENT },
      data:  { followUpStage: ShippingFollowUpStage.DONE },
    });
    if (claim.count === 0) return;

    await sendSessionText(
      order.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.notArrived || "شكرًا لإبلاغنا. سيتم متابعة الشحنة مع فريق الشحن وسنتواصل معك في أقرب وقت.",
      { userId, contactId: contact?.id, label: "لم يستلم" }
    );

    await notifySmartFollowUpAlert(
      userId,
      "shipping_not_delivered",
      { customerPhone: order.customerPhone, orderNumber: order.orderNumber ?? undefined }
    );
    return;
  }

  // ── Branch: problem ──
  if (payloadId === "problem" && order.followUpStage === ShippingFollowUpStage.SENT) {
    const claim = await prisma.storeOrder.updateMany({
      where: { id: order.id, followUpStage: ShippingFollowUpStage.SENT },
      data: {
        followUpStage:          ShippingFollowUpStage.AWAITING_PROBLEM_DETAILS,
        followUpStageExpiresAt: expiryDate(SHIPPING_STAGE_EXPIRY_HOURS),
      },
    });
    if (claim.count === 0) return;

    const result = await sendSessionText(
      order.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.problemType || "ما نوع المشكلة؟",
      { userId, contactId: contact?.id, label: "سؤال المشكلة" }
    );
    if (result.ok && result.whatsappMsgId) {
      await prisma.storeOrder.update({
        where: { id: order.id },
        data:  { followUpMessageId: result.whatsappMsgId },
      });
    }
    return;
  }

  // ── Free-text reply while AWAITING_PROBLEM_DETAILS ──
  if (order.followUpStage === ShippingFollowUpStage.AWAITING_PROBLEM_DETAILS && messageText.trim()) {
    const claim = await prisma.storeOrder.updateMany({
      where: { id: order.id, followUpStage: ShippingFollowUpStage.AWAITING_PROBLEM_DETAILS },
      data:  { followUpStage: ShippingFollowUpStage.DONE },
    });
    if (claim.count === 0) return;

    await sendSessionText(
      order.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.problemThanks || "شكرًا لإبلاغنا. سيتم تحويل طلبك إلى أحد موظفي خدمة العملاء للتواصل معك في أقرب وقت.",
      { userId, contactId: contact?.id, label: "شكر على التبليغ" }
    );

    if (contact) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          aiStatus:      "NEEDS_HUMAN" as any,
          handoffReason: "مشكلة في الشحن — متابعة ذكية",
          handoffAt:     new Date(),
        },
      });
      await notifyAiHandoffNeeded(
        userId,
        contact.name ?? order.customerPhone,
        contact.id,
        "مشكلة في الشحن — متابعة ذكية",
        "high"
      );
    }
    return;
  }

  // Unknown payload for current stage — ignore silently
  console.log(`[SmartFollowUp] Unknown payload "${payloadId}" for shipping stage ${order.followUpStage}`);
}

// ─── Handle Cart Reply ────────────────────────────────────────────────────────

export async function handleCartFollowUpReply(
  cart: NonNullable<Awaited<ReturnType<typeof findAbandonedCartByContext>>>,
  { payloadId, messageText, accountOwner, userId }: ReplyParams
) {
  const setting = await getSmartFollowUpSetting(userId, "cart");
  if (!setting) return;

  const texts = (setting.texts ?? {}) as Record<string, string>;
  const contact = await prisma.contact.findFirst({
    where: { phone: cart.customerPhone, userId },
    select: { id: true, name: true },
  });

  // ── Branch: continue_order ──
  if (payloadId === "continue_order" && cart.followUpStage === CartFollowUpStage.SENT) {
    const claim = await prisma.abandonedCart.updateMany({
      where: { id: cart.id, followUpStage: CartFollowUpStage.SENT },
      data:  { followUpStage: CartFollowUpStage.DONE },
    });
    if (claim.count === 0) return;

    let replyText = texts.completeReply || "رائع ❤️\nيمكنك إكمال طلبك من خلال الرابط التالي:";
    if (cart.recoveryUrl) {
      replyText += `\n${cart.recoveryUrl}`;
    } else {
      console.warn(`[SmartFollowUp] Cart ${cart.id} has no recoveryUrl`);
    }

    await sendSessionText(
      cart.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      replyText,
      { userId, contactId: contact?.id, label: "رابط إكمال الطلب" }
    );
    return;
  }

  // ── Branch: ask_question ──
  if (payloadId === "ask_question" && cart.followUpStage === CartFollowUpStage.SENT) {
    const claim = await prisma.abandonedCart.updateMany({
      where: { id: cart.id, followUpStage: CartFollowUpStage.SENT },
      data:  { followUpStage: CartFollowUpStage.DONE },
    });
    if (claim.count === 0) return;

    await sendSessionText(
      cart.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.inquiryReply || "سيتم تحويلك إلى أحد موظفي المبيعات للتواصل معك في أقرب وقت.",
      { userId, contactId: contact?.id, label: "رد الاستفسار" }
    );

    if (contact) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          aiStatus:      "NEEDS_HUMAN" as any,
          handoffReason: "استفسار على السلة المتروكة — متابعة ذكية",
          handoffAt:     new Date(),
        },
      });
      await notifyAiHandoffNeeded(
        userId,
        contact.name ?? cart.customerPhone,
        contact.id,
        "استفسار على السلة المتروكة — متابعة ذكية",
        "normal"
      );
    }
    return;
  }

  // ── Branch: not_interested ──
  if (payloadId === "not_interested" && cart.followUpStage === CartFollowUpStage.SENT) {
    const claim = await prisma.abandonedCart.updateMany({
      where: { id: cart.id, followUpStage: CartFollowUpStage.SENT },
      data: {
        followUpStage:          CartFollowUpStage.AWAITING_REASON,
        followUpStageExpiresAt: expiryDate(CART_STAGE_EXPIRY_HOURS),
      },
    });
    if (claim.count === 0) return;

    const result = await sendSessionButtons(
      cart.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.reasonQuestion || "ما سبب عدم إكمال الطلب؟",
      [
        { id: CART_REASON_IDS.priceHigh,   title: "السعر مرتفع" },
        { id: CART_REASON_IDS.changedMind, title: "غيرت رأيي" },
        { id: CART_REASON_IDS.other,       title: "سبب آخر" },
      ],
      { userId, contactId: contact?.id, label: "سؤال السبب" }
    );
    if (result.ok && result.whatsappMsgId) {
      await prisma.abandonedCart.update({
        where: { id: cart.id },
        data:  { followUpMessageId: result.whatsappMsgId },
      });
    }
    return;
  }

  // ── Branch: reason selected ──
  const validReasons: string[] = [CART_REASON_IDS.priceHigh, CART_REASON_IDS.changedMind, CART_REASON_IDS.other];
  if (payloadId && validReasons.includes(payloadId) && cart.followUpStage === CartFollowUpStage.AWAITING_REASON) {
    const claim = await prisma.abandonedCart.updateMany({
      where: { id: cart.id, followUpStage: CartFollowUpStage.AWAITING_REASON },
      data:  { followUpStage: CartFollowUpStage.DONE, followUpReason: payloadId! },
    });
    if (claim.count === 0) return;

    await sendSessionText(
      cart.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.reasonThanks || "شكرًا لمشاركتنا رأيك ❤️",
      { userId, contactId: contact?.id, label: "شكر على السبب" }
    );

    await notifySmartFollowUpAlert(
      userId,
      "cart_not_interested",
      { customerPhone: cart.customerPhone, reason: payloadId! }
    );
    return;
  }

  // Unknown payload for current stage — ignore silently
  console.log(`[SmartFollowUp] Unknown payload "${payloadId}" for cart stage ${cart.followUpStage}`);
}

// ─── Execute Follow-Up Action (for replyDelay) ────────────────────────────────

export async function executeFollowUpAction(
  kind: "shipping" | "cart" | "order_confirm",
  recordId: string,
  action: string
) {
  console.log(`[SmartFollowUp] Executing action ${action} for ${kind} ${recordId}`);
  // This function is invoked by Inngest when a delayed reply/action should be
  // executed. It reconstructs the necessary context and forwards to the
  // existing reply handlers so behavior is identical to immediate replies.
  if (kind === "shipping") {
    const order = await prisma.storeOrder.findUnique({
      where: { id: recordId },
      select: {
        id: true, status: true, customerPhone: true, contactId: true,
        userId: true, followUpSentAt: true, orderNumber: true, customerName: true,
        followUpStage: true, followUpMessageId: true,
      },
    });
    if (!order) return;

    const account = await getWhatsappAccount(order.userId);
    if (!account) return;

    await handleShippingFollowUpReply(order as any, {
      payloadId: action,
      payloadTitle: undefined,
      messageText: action,
      accountOwner: account,
      userId: order.userId,
    });
    return;
  }

  if (kind === "cart") {
    const cart = await prisma.abandonedCart.findUnique({
      where: { id: recordId },
      select: {
        id: true, userId: true, customerPhone: true, customerName: true,
        recoveredAt: true, followUpSentAt: true, recoveryUrl: true, followUpStage: true,
        followUpMessageId: true,
      },
    });
    if (!cart) return;

    const account = await getWhatsappAccount(cart.userId);
    if (!account) return;

    await handleCartFollowUpReply(cart as any, {
      payloadId: action,
      payloadTitle: undefined,
      messageText: action,
      accountOwner: account,
      userId: cart.userId,
    });
    return;
  }

  if (kind === "order_confirm") {
    const order = await prisma.storeOrder.findUnique({
      where: { id: recordId },
      select: {
        id: true, status: true, customerPhone: true, contactId: true,
        userId: true, orderNumber: true, cancelReasonStage: true,
        cancelReasonMessageId: true,
      },
    });
    if (!order) return;

    const account = await getWhatsappAccount(order.userId);
    if (!account) return;

    await handleOrderConfirmReply(order as any, {
      payloadId: action,
      messageText: action,
      accountOwner: account,
      userId: order.userId,
    });
    return;
  }
}

// ─── Order Confirm Follow-Up ───────────────────────────────────────────────────

export async function handleOrderConfirmReply(
  order: { id: string; userId: string; customerPhone: string; contactId: string | null;
           status: string; cancelReasonStage: string | null; orderNumber: string | null },
  { payloadId, messageText, accountOwner, userId }: ReplyParams
) {
  const setting = await getSmartFollowUpSetting(userId, "order_confirm");
  const texts = (setting?.texts ?? {}) as Record<string, string>;
  if (!setting || !setting.isEnabled) return;

  const contact = order.contactId
    ? await prisma.contact.findUnique({ where: { id: order.contactId }, select: { id: true, phone: true, name: true } })
    : null;

  // ── فرع: تأكيد الأوردر → رد شكر واحد وخلاص ──
  if (payloadId === "CONFIRM_ORDER") {
    await sendSessionText(
      order.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.confirmThanks || "شكرًا لتأكيد طلبك ❤️ جاري تجهيزه الآن.",
      { userId, contactId: contact?.id, label: "شكر تأكيد الأوردر" }
    );
    return;
  }

  // ── فرع: إلغاء الأوردر → اسأل السبب ──
  if (payloadId === "CANCEL_ORDER") {
    const claim = await prisma.storeOrder.updateMany({
      where: { id: order.id, cancelReasonStage: null },
      data: {
        cancelReasonStage: "AWAITING_REASON",
        cancelReasonExpiresAt: expiryDate(48),
      },
    });
    if (claim.count === 0) return; // اتسأل قبل كده

    const result = await sendSessionButtons(
      order.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.cancelReasonQuestion || "ممكن نعرف سبب الإلغاء؟",
      [
        { id: ORDER_CANCEL_REASON_IDS.price,       title: "السعر مرتفع" },
        { id: ORDER_CANCEL_REASON_IDS.changedMind, title: "غيرت رأيي" },
        { id: ORDER_CANCEL_REASON_IDS.other,       title: "سبب تاني" },
      ],
      { userId, contactId: contact?.id, label: "سؤال سبب الإلغاء" }
    );
    if (result.ok && result.whatsappMsgId) {
      await prisma.storeOrder.update({
        where: { id: order.id },
        data: { cancelReasonMessageId: result.whatsappMsgId },
      });
    }
    return;
  }

  // ── فرع: اختيار سبب الإلغاء → رسالة شكر ──
  if (
    order.cancelReasonStage === "AWAITING_REASON" &&
    (payloadId === ORDER_CANCEL_REASON_IDS.price ||
     payloadId === ORDER_CANCEL_REASON_IDS.changedMind ||
     payloadId === ORDER_CANCEL_REASON_IDS.other)
  ) {
    const claim = await prisma.storeOrder.updateMany({
      where: { id: order.id, cancelReasonStage: "AWAITING_REASON" },
      data: { cancelReasonStage: "DONE", cancelReason: payloadId },
    });
    if (claim.count === 0) return;

    await sendSessionText(
      order.customerPhone,
      accountOwner.phoneNumberId,
      accountOwner.accessToken,
      texts.cancelThanks || "شكرًا لمشاركتنا رأيك ❤️",
      { userId, contactId: contact?.id, label: "شكر بعد سبب الإلغاء" }
    );

    await notifySmartFollowUpAlert(
      userId,
      "order_cancelled_with_reason",
      { customerPhone: order.customerPhone, orderNumber: order.orderNumber ?? undefined, reason: payloadId }
    ).catch(() => {});
    return;
  }
}
