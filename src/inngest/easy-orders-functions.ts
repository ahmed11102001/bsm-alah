// src/inngest/easy-orders-functions.ts
// ─── حفظ بيانات أوردرات EasyOrders فقط — بدون إرسال تلقائي ──────────────────
// الإرسال بيحصل من صفحة الأتمتة عبر قوالب ميتا المعتمدة

import { inngest } from "./client";
import prisma from "@/lib/prisma";

export const handleEasyOrderReceived = inngest.createFunction(
  {
    id:      "easy-order-order-received",
    retries: 2,
    triggers: [{ event: "easyorder/order.received" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const {
      userId,
      phone,
      name,
      orderNumber,
      externalId,
      total,
      currency,
      status,
      rawData,
    } = event.data;

    // ── Step 1: Upsert Contact ─────────────────────────────────────────────
    const contact = await step.run("upsert-contact", async () => {
      return prisma.contact.upsert({
        where:  { phone_userId: { phone, userId } },
        update: { name: name && name !== "العميل" ? name : undefined },
        create: { phone, userId, name: name || "عميل" },
      });
    });

    // ── Step 2: Save StoreOrder ────────────────────────────────────────────
    const order = await step.run("save-order", async () => {
      return prisma.storeOrder.upsert({
        where: {
          userId_source_externalId: {
            userId,
            source:     "easyorders",
            externalId: String(externalId || orderNumber || Date.now()),
          },
        },
        update: { status, total },
        create: {
          userId,
          source:        "easyorders",
          externalId:    String(externalId || orderNumber || Date.now()),
          orderNumber:   orderNumber ? String(orderNumber) : undefined,
          customerName:  name,
          customerPhone: phone,
          total:         total ? String(total) : undefined,
          currency:      currency || "EGP",
          status:        status  || "pending",
          rawData:       rawData ?? undefined,
          contactId:     contact.id,
        },
      });
    });

    // ── Step 3: تحديث عداد المزامنة في EasyOrdersStore ───────────────────
    await step.run("update-sync-count", async () => {
      await prisma.easyOrdersStore.updateMany({
        where: { userId },
        data:  {
          lastSyncAt:  new Date(),
          totalSynced: { increment: 1 },
        },
      });
    });

    return { success: true, orderId: order.id, contactId: contact.id };
  }
);
