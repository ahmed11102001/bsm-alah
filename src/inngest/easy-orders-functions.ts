// src/inngest/easy-orders-functions.ts
// ─── حفظ بيانات أوردرات EasyOrders فقط — بدون إرسال تلقائي ──────────────────
// الإرسال بيحصل من صفحة الأتمتة عبر قوالب ميتا المعتمدة

import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { upsertStoreContact } from "@/lib/store-contacts";

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
    // EasyOrders payload مفيهوش إيميل أصلًا (رقم + اسم بس) — التعامل بالرقم فقط زي قبل كده
    const contact = await step.run("upsert-contact", async () => {
      return upsertStoreContact({
        userId,
        phone,
        email: undefined,
        updateName: name && name !== "العميل" ? name : undefined,
        createName: name || "عميل",
      });
    });

    // ── Step 2: Save StoreOrder ────────────────────────────────────────────
    const order = await step.run("save-order", async () => {
      return prisma.storeOrder.upsert({
        where: {
          source_externalId_userId: {
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
          total:         total != null ? Number(total) : undefined,
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

    await step.run("check-vip-status", async () => {
      const orderCount = await prisma.storeOrder.count({ where: { contactId: contact.id } });
      if (orderCount === 2) {
        await inngest.send({ name: "email/vip.qualified", data: { userId, contactId: contact.id } });
      }
    });

    return { success: true, orderId: order.id, contactId: contact.id };
  }
);
