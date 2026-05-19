// src/lib/store-automation.ts
// ─── Helper مشترك: تشغيل أتمتة المتجر (order_confirm / order_shipped / promo) ──
//
// بيُستدعى من الـ 3 webhooks (Shopify / EasyOrders / WooCommerce) مباشرة
// بعد حفظ الأوردر، يبعت قالب واتساب رسمي أول بأول طالما الأتمتة متفعّلة.
//
// الاستخدام:
//   await triggerStoreAutomation({
//     userId,
//     automationType: "order_confirm",   // أو "order_shipped" أو "promo"
//     storeSource:    "shopify",          // أو "easyorders" أو "woocommerce"
//     storeId,
//     customerPhone,
//     contactId,
//     templateVars:   { body: ["اسم العميل", "رقم الأوردر"] }, // اختياري
//   });

import prisma                  from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp-api";
import { decryptToken }        from "@/lib/crypto";
import {
  MessageDirection,
  MessageStatus,
  MessageType,
} from "@/types/enums";

export type StoreAutomationType = "order_confirm" | "order_shipped" | "promo";
export type StoreSource         = "shopify" | "easyorders" | "woocommerce";

export interface TriggerStoreAutomationParams {
  userId:         string;
  automationType: StoreAutomationType;
  storeSource:    StoreSource;
  storeId:        string;         // shopifyStoreId / easyOrdersStoreId / wooCommerceStoreId
  customerPhone:  string;         // رقم مُنظَّف بدون حروف
  contactId:      string;         // id الـ contact في DB
  templateVars?:  { body: string[] } | null; // متغيرات القالب (اختياري)
}

// ── Where clause حسب الـ source ───────────────────────────────────────────────
function buildAutomationWhere(
  source:  StoreSource,
  storeId: string,
  type:    StoreAutomationType
) {
  if (source === "shopify")
    return { shopifyStoreId_type:     { shopifyStoreId:     storeId, type } };
  if (source === "easyorders")
    return { easyOrdersStoreId_type:  { easyOrdersStoreId:  storeId, type } };
  return   { wooCommerceStoreId_type: { wooCommerceStoreId: storeId, type } };
}

// ── الدالة الرئيسية ────────────────────────────────────────────────────────────
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
  } = params;

  // 1. جيب الأتمتة من الـ DB مع القالب وحساب الواتساب
  const automation = await prisma.storeAutomation.findUnique({
    where:   buildAutomationWhere(storeSource, storeId, automationType),
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

  // 2. تحقق من الشروط
  if (!automation) {
    console.log(`[StoreAuto] No automation for ${storeSource}/${automationType}`);
    return { sent: false, reason: "no_automation" };
  }
  if (!automation.isEnabled) {
    console.log(`[StoreAuto] ${storeSource}/${automationType} is disabled`);
    return { sent: false, reason: "disabled" };
  }
  if (!automation.template || automation.template.status?.toLowerCase() !== "approved") {
    console.warn(`[StoreAuto] Template not approved for ${storeSource}/${automationType}`);
    return { sent: false, reason: "template_not_approved" };
  }

  const account = automation.user?.whatsappAccount;
  if (!account) {
    console.warn(`[StoreAuto] No WhatsApp account for userId: ${userId}`);
    return { sent: false, reason: "no_whatsapp_account" };
  }

  // 3. ابعت الرسالة عبر Meta API
  const result = await sendWhatsAppMessage({
    toPhone:       customerPhone,
    phoneNumberId: account.phoneNumberId,
    accessToken:   decryptToken(account.accessToken),
    messageType:   "template",
    templateName:  automation.template.name,
    templateLang:  automation.template.language ?? "ar",
    templateVars,
    content:       null,
  });

  // 4. سجّل الرسالة في الـ DB
  await prisma.message.create({
    data: {
      userId,
      contactId,
      content:    `[أتمتة متجر] ${automation.template.name}`,
      type:       MessageType.template,
      direction:  MessageDirection.outbound,
      status:     result.ok ? MessageStatus.sent : MessageStatus.failed,
      whatsappId: result.ok ? result.whatsappMsgId : null,
      error:      result.ok ? null : (result.error ?? "فشل الإرسال"),
      sentAt:     result.ok ? new Date() : null,
    },
  }).catch((e) => console.error("[StoreAuto] DB message save failed:", e));

  // 5. زوّد عداد الإرسال
  if (result.ok) {
    await prisma.storeAutomation.update({
      where: { id: automation.id },
      data:  { sentCount: { increment: 1 } },
    }).catch(() => {});
  }

  if (result.ok) {
    console.log(
      `[StoreAuto] ✓ Sent ${automationType} to ${customerPhone} via ${storeSource}`
    );
  } else {
    console.error(
      `[StoreAuto] ✗ Failed ${automationType} to ${customerPhone}:`,
      result.error
    );
  }

  return { sent: result.ok, reason: result.ok ? undefined : result.error };
}