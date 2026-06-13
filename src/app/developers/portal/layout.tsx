import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getDevSession } from "@/lib/dev-auth";
import prisma from "@/lib/prisma";

// ── Portal layout: auth check فقط
// كل route group بيعرض سيدباره الخاص:
//   - portal/page.tsx          → سيدبار مدمج فيها (standalone)
//   - portal/projects/[id]/    → ProjectSidebar في layout.tsx الخاص بيها
// ────────────────────────────────────────────────────────────────────────────
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getDevSession();
  if (!session) redirect("/developers/signin");

  const developer = await prisma.developerUser.findUnique({
    where: { id: session.id },
    select: { id: true, status: true },
  });

  if (!developer) redirect("/developers/signin");
  if (developer.status === "SUSPENDED") redirect("/developers/signin?error=suspended");

  return (
    <div style={{ minHeight: "100vh", background: "#060810" }}>
      {children}
    </div>
  );
}