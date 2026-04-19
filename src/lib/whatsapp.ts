import prisma from "@/lib/prisma";

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
      throw new Error("إعدادات واتساب غير مكتملة لهذا الحساب");
    }

    const normalizedPhone = phone.replace(/\D/g, "");

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
      throw new Error(data.error?.message || "فشل إرسال الرسالة");
    }

    // ✅ التحسين: ابحث عن الكونتاكت أو أنشئه لو مش موجود
    const contact = await prisma.contact.upsert({
      where: { phone_userId: { phone: normalizedPhone, userId } },
      update: {}, // لا تغير شيء لو موجود
      create: {
        phone: normalizedPhone,
        userId: userId,
        name: "عميل جديد", // اسم افتراضي
      },
    });

    // ✅ تسجيل الرسالة دايماً
    await prisma.message.create({
      data: {
        content: message,
        direction: "outbound",
        status: "sent",
        whatsappId: data.messages?.[0]?.id, // مهم جداً للربط مع الويب هوك
        userId,
        contactId: contact.id,
      },
    });

  } catch (error) {
    console.error("WhatsApp send error:", error);
    throw error;
  }
}