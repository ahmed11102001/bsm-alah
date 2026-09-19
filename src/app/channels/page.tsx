import { getAppServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getPlanStatus } from "@/lib/plan-guard";
import { hasPermission, type UserRole } from "@/lib/permissions-core";
import ChannelsClient from "./_components/ChannelsClient";

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAppServerSession();

  if (!session?.user) {
    redirect("/ar?openLogin=1&callbackUrl=/dashboard/channels");
  }

  const ownerId =
    ((session.user as any).parentId as string | null) ?? session.user.id;

  // ── Store integrations: plan gate + permission backstop ──────────────
  // (الـ API routes بتفرض STORE_INTEGRATIONS_MANAGE بنفسها — ده backstop للـ UI)
  const [planStatus, sp] = await Promise.all([
    getPlanStatus(ownerId),
    searchParams,
  ]);
  const canStore = planStatus.limits.storeIntegration ?? false;
  const canManageStore = hasPermission(
    (session.user as { role?: UserRole }).role,
    "STORE_INTEGRATIONS_MANAGE"
  );
  const connectStoreRequested =
    sp?.connectStore === "1" || (Array.isArray(sp?.connectStore) && sp.connectStore.includes("1"));

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
      canStore={canStore}
      canManageStore={canManageStore}
      connectStoreRequested={connectStoreRequested}
    />
  );
}
