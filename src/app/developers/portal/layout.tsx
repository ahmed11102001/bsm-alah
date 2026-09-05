import { ReactNode } from "react";
import { getDevSession } from "@/lib/dev-auth";
import { devRedirect } from "@/lib/dev-server";
import prisma from "@/lib/prisma";
import { isOwnerOnlyAccount } from "@/lib/dev-role";
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
  if (!session) return devRedirect("/developers/signin");

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

  if (!developer) return devRedirect("/developers/signin");
  if (developer.status === "SUSPENDED") return devRedirect("/developers/signin?error=suspended");

  const ownerOnly = await isOwnerOnlyAccount(developer.id);

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
          <PortalTopBar developer={developer} ownerOnly={ownerOnly} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            {children}
          </div>
        </div>
      </MobileNavProvider>
    </LanguageProvider>
  );
}