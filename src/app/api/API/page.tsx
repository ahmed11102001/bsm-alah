import API from "@/components/dashboard/API";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connection } from "next/server"; // أضف هذا السطر للنسخ الحديثة

export default async function Page() {
  // نضمن أن الصفحة يتم إنشاؤها عند كل طلب ولا تُخزن كـ Static
  await connection(); 

  const session = await getServerSession(authOptions);

  // حماية الصفحة
  if (!session?.user?.id) {
    redirect("/login");
  }

  // جلب إعدادات واتساب مباشرة من الداتابيز
  const whatsappAccount = await prisma.whatsAppAccount.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  // تجهيز البيانات لإرسالها للـ Client Component
  const initialData = whatsappAccount ? {
    accessToken: whatsappAccount.accessToken,
    phoneNumberId: whatsappAccount.phoneNumberId,
    wabaId: whatsappAccount.wabaId,
  } : null;

  return (
    <API initialData={initialData} />
  );
}