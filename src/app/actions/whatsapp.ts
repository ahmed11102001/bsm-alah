"use server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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

  revalidatePath("/dashboard/api"); // تحديث البيانات في الصفحة فوراً
  return { success: true };
}