// src/inngest/easyorder-functions.ts
import { inngest } from "./client";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Function 4: Handle EasyOrder Order Received
// ─────────────────────────────────────────────────────────────────────────────

export const handleEasyOrderReceived = inngest.createFunction(
  {
    id:      "easyorder-order-received",
    retries: 2,
    triggers: [{ event: "easyorder/order.received" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, contactId, phone, name, orderNumber, total, status } = event.data;

    const user = await step.run("get-user", async () => {
      return prisma.user.findUnique({
        where:  { id: userId },
        select: { whatsappAccount: { select: { accessToken: true, phoneNumberId: true } } },
      });
    });

    if (!user?.whatsappAccount) return { skipped: true, reason: "no_whatsapp" };

    const lines = [
      `مرحباً ${name}! 👋`,
      ``,
      `✅ تم استلام طلبك بنجاح`,
    ];
    if (orderNumber) lines.push(`📦 رقم الطلب: #${orderNumber}`);
    if (total)       lines.push(`💰 الإجمالي: ${total}`);
    if (status)      lines.push(`📋 الحالة: ${status}`);
    lines.push(``, `سيتم التواصل معك قريباً لتأكيد التفاصيل.`, `شكراً لثقتك بنا! 🙏`);

    const content = lines.join("\n");

    const result = await step.run("send-whatsapp", async () => {
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${user.whatsappAccount!.phoneNumberId}/messages`,
        {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${user.whatsappAccount!.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to:   phone,
            type: "text",
            text: { body: content },
          }),
        }
      );
      const data = await res.json();
      return { ok: res.ok, whatsappMsgId: data?.messages?.[0]?.id };
    });

    if (result.ok) {
      await step.run("log-message", async () => {
        await prisma.message.create({
          data: {
            userId,
            contactId,
            content,
            type:      "text",
            direction: "outbound",
            status:    "sent",
            whatsappId: result.whatsappMsgId,
            sentAt:     new Date(),
          },
        });
      });
      return { success: true };
    }

    return { success: false };
  }
);