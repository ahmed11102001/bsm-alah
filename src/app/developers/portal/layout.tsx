import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getDevSession } from "@/lib/dev-auth";
import prisma from "@/lib/prisma";
import PortalTopBar from "./_components/PortalTopBar";
import { MobileNavProvider } from "./_components/MobileNavContext";
import { LanguageProvider } from "../_components/LanguageProvider";

// ── Portal layout: auth check + TopBar موحّد لكل الـ portal
// كل route group بيعرض سيدباره الخاص:
//   - ( home )/layout.tsx      → PortalSidebar
//   - projects/[id]/layout.tsx → ProjectSidebar
// ────────────────────────────────────────────────────────────────────────────
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getDevSession();
  if (!session) redirect("/developers/signin");

  const developer = await prisma.developerUser.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      status: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  if (!developer) redirect("/developers/signin");
  if (developer.status === "SUSPENDED") redirect("/developers/signin?error=suspended");

  return (
    <LanguageProvider>
      <MobileNavProvider>
        <div
          style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#060810",
          }}
        >
          <PortalTopBar developer={developer} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            {children}
          </div>
        </div>
      </MobileNavProvider>
    </LanguageProvider>
  );
}