import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getDevSession } from "@/lib/dev-auth";
import prisma from "@/lib/prisma";
import ProjectSidebar from "./_components/ProjectSidebar";
import PortalHeader from "../../_components/PortalHeader";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getDevSession();
  if (!session) redirect("/developers/signin");

  const developer = await prisma.developerUser.findUnique({
    where: { id: session.id },
    include: {
      projects: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!developer) redirect("/developers/signin");

  // Verify this project belongs to this developer
  const project = await prisma.developerProject.findFirst({
    where: { id, developerId: session.id },
    include: {
      metaConnection: {
        select: {
          id: true,
          displayPhone: true,
          isVerified: true,
          wabaId: true,
          phoneNumberId: true,
          accessToken: true,
        },
      },
      _count: {
        select: {
          apiKeys: { where: { status: "ACTIVE" } },
          otpTemplates: { where: { status: "APPROVED" } },
        },
      },
    },
  });

  if (!project) redirect("/developers/portal");

  return (
    <div style={{ minHeight: "100vh", background: "#060810", display: "flex" }}>
      <ProjectSidebar
        developer={developer}
        project={project}
        allProjects={developer.projects}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <PortalHeader developer={developer} currentProject={project} />
        <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
      </div>
    </div>
  );
}