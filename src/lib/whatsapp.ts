import prisma from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export async function sendMessage(
  userId: string,
  phone: string,
  message: string
): Promise<void> {
  try {
    const whatsappAccount = await prisma.whatsAppAccount.findUnique({
      where: { userId },
    });

    if (!whatsappAccount || !whatsappAccount.accessToken || !whatsappAccount.phoneNumberId) {
      throw new Error("Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ÙˆØ§ØªØ³Ø§Ø¨ ØºÙŠØ± Ù…ÙƒØªÙ…Ù„Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„Ø­Ø³Ø§Ø¨");
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      throw new Error("رقم الهاتف غير صالح");
    }

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${whatsappAccount.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappAccount.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizedPhone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "ÙØ´Ù„ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø³Ø§Ù„Ø©");
    }

    // âœ… Ø§Ù„ØªØ­Ø³ÙŠÙ†: Ø§Ø¨Ø­Ø« Ø¹Ù† Ø§Ù„ÙƒÙˆÙ†ØªØ§ÙƒØª Ø£Ùˆ Ø£Ù†Ø´Ø¦Ù‡ Ù„Ùˆ Ù…Ø´ Ù…ÙˆØ¬ÙˆØ¯
    const contact = await prisma.contact.upsert({
      where: { phone_userId: { phone: normalizedPhone, userId } },
      update: {}, // Ù„Ø§ ØªØºÙŠØ± Ø´ÙŠØ¡ Ù„Ùˆ Ù…ÙˆØ¬ÙˆØ¯
      create: {
        phone: normalizedPhone,
        userId: userId,
        name: "Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯", // Ø§Ø³Ù… Ø§ÙØªØ±Ø§Ø¶ÙŠ
      },
    });

    // âœ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø¯Ø§ÙŠÙ…Ø§Ù‹
    await prisma.message.create({
      data: {
        content: message,
        direction: "outbound",
        status: "sent",
        whatsappId: data.messages?.[0]?.id, // Ù…Ù‡Ù… Ø¬Ø¯Ø§Ù‹ Ù„Ù„Ø±Ø¨Ø· Ù…Ø¹ Ø§Ù„ÙˆÙŠØ¨ Ù‡ÙˆÙƒ
        userId,
        contactId: contact.id,
      },
    });

  } catch (error) {
    console.error("WhatsApp send error:", error);
    throw error;
  }
}

