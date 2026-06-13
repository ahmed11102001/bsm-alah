import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getDevSession } from "@/lib/dev-auth";
import prisma from "@/lib/prisma";
import PortalSidebar from "../_components/PortalSidebar";

export default async function PortalHomeLayout({ children }: { children: ReactNode }) {
  const session = await getDevSession();
  if (!session) redirect("/developers/signin");

  const developer = await prisma.developerUser.findUnique({
    where: { id: session.id },
    include: {
      projects: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!developer) redirect("/developers/signin");

  return (
    <div style={{ height: "100%", background: "#060810", display: "flex", overflow: "hidden" }}>
      <PortalSidebar developer={developer} />
      <main style={{ flex: 1, overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
