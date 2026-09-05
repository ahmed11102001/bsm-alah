import { ReactNode } from "react";
import { getDevSession } from "@/lib/dev-auth";
import { devRedirect } from "@/lib/dev-server";
import prisma from "@/lib/prisma";
import PortalSidebar from "../_components/PortalSidebar";

export default async function PortalHomeLayout({ children }: { children: ReactNode }) {
  const session = await getDevSession();
  if (!session) return devRedirect("/developers/signin");

  const developer = await prisma.developerUser.findUnique({
    where: { id: session.id },
    include: {
      projects: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!developer) return devRedirect("/developers/signin");

  return (
    <div style={{ height: "100%", background: "#060810", display: "flex", overflow: "hidden" }}>
      <PortalSidebar developer={developer} />
      <main style={{ flex: 1, overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
