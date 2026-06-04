"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { encryptToken, decryptToken } from "@/lib/crypto";

// 1. دالة حفظ إعدادات الربط (Access Token, IDs)
export async function saveWhatsAppSettings(data: {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("غير مصرح لك");
  const ownerId = (session.user.parentId as string | null) ?? session.user.id;

  // تشفير الـ token قبل الحفظ في DB
  const encryptedToken = encryptToken(data.accessToken);

  await prisma.whatsAppAccount.upsert({
    where: { userId: ownerId },
    update: {
      accessToken: encryptedToken,
      phoneNumberId: data.phoneNumberId,
      wabaId: data.wabaId,
    },
    create: {
      userId: ownerId,
      accessToken: encryptedToken,
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
  const ownerId = (session.user.parentId as string | null) ?? session.user.id;

  // جلب بيانات الربط الخاصة بالمستخدم
  const account = await prisma.whatsAppAccount.findUnique({
    where: { userId: ownerId },
  });

  if (!account || !account.accessToken || !account.wabaId) {
    throw new Error("يرجى ربط حساب واتساب وإدخال البيانات أولاً");
  }

  try {
    const decryptedToken = decryptToken(account.accessToken).trim();

    let remoteTemplates: any[] = [];
    let nextUrl: string | null = `https://graph.facebook.com/v21.0/${account.wabaId}/message_templates?limit=100`;

    // Loop through paginated results
    while (nextUrl) {
      const response: Response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${decryptedToken}` },
      });

      if (!response.ok) {
        const body: any = await response.json();
        throw new Error(body.error?.message || "فشل الاتصال بميتا لجلب القوالب");
      }

      const body: any = await response.json();
      if (body.error) throw new Error(body.error.message);

      if (body.data) {
        remoteTemplates = [...remoteTemplates, ...body.data];
      }

      nextUrl = (body.paging?.next as string | undefined) || null;
    }

    let syncedCount = 0;

    // المزامنة: تحديث القالب لو موجود أو إنشاؤه لو جديد
    for (const temp of remoteTemplates) {
      // 1. Extract body content
      const bodyComp = temp.components?.find((c: any) => c.type === "BODY");
      const content = bodyComp?.text || "";

      // 2. Extract header info
      const headerComp = temp.components?.find((c: any) => c.type === "HEADER");
      const headerType = headerComp ? headerComp.format.toLowerCase() : "none";
      const headerText = headerComp?.text || null;

      // 3. Extract footer info
      const footerComp = temp.components?.find((c: any) => c.type === "FOOTER");
      const footer = footerComp?.text || null;

      // 4. Extract buttons info
      const buttonsComp = temp.components?.find((c: any) => c.type === "BUTTONS");
      const buttons = buttonsComp?.buttons || null;

      // 5. Extract rejected reason
      const rejectedReason = temp.rejected_reason || null;

      await prisma.template.upsert({
        where: {
          metaId_userId: {
            metaId: String(temp.id),
            userId: ownerId,
          },
        },
        update: {
          name: String(temp.name),
          content: content,
          language: String(temp.language),
          category: String(temp.category),
          status: String(temp.status).toUpperCase(),
          headerType,
          headerText,
          footer,
          buttons,
          rejectedReason,
          components: temp.components,
          updatedAt: new Date()
        },
        create: {
          metaId: String(temp.id),
          userId: ownerId,
          name: String(temp.name),
          content: content,
          language: String(temp.language),
          category: String(temp.category),
          status: String(temp.status).toUpperCase(),
          headerType,
          headerText,
          footer,
          buttons,
          rejectedReason,
          components: temp.components
        },
      });
      syncedCount++;
    }

    revalidatePath("/dashboard/api");
    return { success: true, count: syncedCount };
  } catch (error: any) {
    console.error("Template Sync Error:", error);
    return { success: false, error: error.message };
  }
}
