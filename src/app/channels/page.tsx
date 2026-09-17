import { getAppServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ChannelsClient from "./_components/ChannelsClient";

export default async function ChannelsPage() {
  const session = await getAppServerSession();

  if (!session?.user) {
    redirect("/ar?openLogin=1&callbackUrl=/dashboard/channels");
  }

  const ownerId =
    ((session.user as any).parentId as string | null) ?? session.user.id;

  // فحص وجود WhatsAppAccount للمستخدم المالك
  const whatsappAccount = await prisma.whatsAppAccount.findUnique({
    where: { userId: ownerId },
    select: {
      phoneNumberId: true,
      wabaId: true,
      tokenStatus: true,
    },
  });

  const isWhatsAppConnected = Boolean(
    whatsappAccount?.phoneNumberId &&
      whatsappAccount?.wabaId &&
      whatsappAccount?.tokenStatus !== "INVALID" &&
      whatsappAccount?.tokenStatus !== "EXPIRED"
  );

  // فحص وجود EmailConnection للمستخدم المالك
  const emailConnection = await prisma.emailConnection.findUnique({
    where: { userId: ownerId },
    select: {
      host: true,
      fromEmail: true,
      lastTestSuccess: true,
    },
  });

  const isEmailConnected = Boolean(emailConnection?.host);

  return (
    <ChannelsClient
      isWhatsAppConnected={isWhatsAppConnected}
      whatsAppData={whatsappAccount}
      isEmailConnected={isEmailConnected}
      emailData={emailConnection}
      userName={session.user.name}
    />
  );
}
