import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getDevSession } from "@/lib/dev-auth";
import prisma from "@/lib/prisma";
import PortalSidebar from "./_components/PortalSidebar";
import PortalHeader from "./_components/PortalHeader";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getDevSession();
  if (!session) redirect("/developers/signin");

  const developer = await prisma.developerUser.findUnique({
    where: { id: session.id },
    include: {
      metaConnection: true,
      apiKeys: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
      projects: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!developer) redirect("/developers/signin");
  if (developer.status === "SUSPENDED") redirect("/developers/signin?error=suspended");

  // ✅ لا redirect لـ connect-meta — المبرمج يدخل البورتال مباشرة
  // ربط Meta بيبقى اختياري داخل كل مشروع

  return (
    <div style={{ minHeight: "100vh", background: "#060810", display: "flex" }}>
      <PortalSidebar developer={developer} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <PortalHeader developer={developer} />
        <main style={{ flex: 1, overflow: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}