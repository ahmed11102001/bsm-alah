import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getDevSession } from "@/lib/dev-auth";
import prisma from "@/lib/prisma";
import PortalSidebar from "./_components/PortalSidebar";
import PortalHeader from "./_components/PortalHeader";

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getDevSession();

  if (!session) {
    redirect("/developers/signin");
  }

  // Fetch developer data
  const developer = await prisma.developerUser.findUnique({
    where: { id: session.id },
    include: {
      metaConnection: true,
      apiKeys: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!developer) {
    redirect("/developers/signin");
  }

  // If still pending meta, redirect
  if (developer.status === "PENDING_META") {
    redirect("/developers/connect-meta");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Sidebar */}
      <PortalSidebar developer={developer} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <PortalHeader developer={developer} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
