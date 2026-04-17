import API from "@/components/dashboard/API";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getServerSession(authOptions);

  // حماية الصفحة
  if (!session?.user?.id) {
    redirect("/login");
  }

  // جلب إعدادات واتساب الخاصة بالمستخدم
  const whatsappAccount = await prisma.whatsAppAccount.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  return (
    <API
      initialData={
        whatsappAccount
          ? {
              accessToken: whatsappAccount.accessToken,
              phoneNumberId: whatsappAccount.phoneNumberId,
              wabaId: whatsappAccount.wabaId,
            }
          : null
      }
    />
  );
}