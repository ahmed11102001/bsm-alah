"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// 1. دالة حفظ إعدادات الربط (Access Token, IDs)
export async function saveWhatsAppSettings(data: {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("غير مصرح لك");

  await prisma.whatsAppAccount.upsert({
    where: { userId: session.user.id },
    update: {
      accessToken: data.accessToken,
      phoneNumberId: data.phoneNumberId,
      wabaId: data.wabaId,
    },
    create: {
      userId: session.user.id,
      accessToken: data.accessToken,
      phoneNumberId: data.phoneNumberId,
      wabaId: data.wabaId,
    },
  });

  revalidatePath("/dashboard/api");
  return { success: true };
}

// 2. دالة مزامنة القوالب من Meta API وتخزينها في الداتابيز
export async function syncWhatsAppTemplates() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("غير مصرح لك");

  // جلب بيانات الربط الخاصة بالمستخدم
  const account = await prisma.whatsAppAccount.findUnique({
    where: { userId: session.user.id },
  });

  if (!account || !account.accessToken || !account.wabaId) {
    throw new Error("يرجى ربط حساب واتساب وإدخال البيانات أولاً");
  }

  try {
    // الاتصال بـ Meta API لجلب القوالب
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${account.wabaId}/message_templates?access_token=${account.accessToken}`
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "فشل الاتصال بميتا");
    }

    const templates = data.data || [];
    let syncedCount = 0;

    // المزامنة: تحديث القالب لو موجود أو إنشاؤه لو جديد
    for (const temp of templates) {
      // نركز فقط على القوالب المعتمدة
      if (temp.status === "APPROVED") {
        // استخراج نص الرسالة (Body) من مكونات القالب
        const bodyComponent = temp.components.find((c: any) => c.type === "BODY");
        const content = bodyComponent?.text || "";

        await prisma.template.upsert({
          where: {
            metaId_userId: {
              metaId: temp.id,
              userId: session.user.id,
            },
          },
          update: {
            name: temp.name,
            content: content,
            language: temp.language,
            category: temp.category,
            status: temp.status,
          },
          create: {
            metaId: temp.id,
            userId: session.user.id,
            name: temp.name,
            content: content,
            language: temp.language,
            category: temp.category,
            status: temp.status,
          },
        });
        syncedCount++;
      }
    }

    revalidatePath("/dashboard/api");
    return { success: true, count: syncedCount };
  } catch (error: any) {
    console.error("Template Sync Error:", error);
    return { success: false, error: error.message };
  }
}