import prisma from "@/lib/prisma";

export async function sendMessage(
  userId: string,
  phone: string,
  message: string
): Promise<void> {
  try {
    // Get user's WhatsApp account settings
    const whatsappAccount = await prisma.whatsAppAccount.findUnique({
      where: { userId },
    });

    if (!whatsappAccount) {
      throw new Error("حساب واتساب غير مكون");
    }

    // Normalize phone number (remove + if present, ensure it's numeric)
    const normalizedPhone = phone.replace(/\D/g, "");

    // Send message via WhatsApp API
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${whatsappAccount.phoneNumberId}/messages`,
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
          text: {
            body: message,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || "فشل إرسال الرسالة عبر واتساب"
      );
    }

    // Log the message in database
    const contact = await prisma.contact.findFirst({
      where: { phone: normalizedPhone, userId },
    });

    if (contact) {
      await prisma.message.create({
        data: {
          content: message,
          direction: "outbound",
          status: "sent",
          whatsappId: data.messages?.[0]?.id,
          userId,
          contactId: contact.id,
        },
      });
    }
  } catch (error) {
    console.error("WhatsApp send error:", error);
    throw error;
  }
}
