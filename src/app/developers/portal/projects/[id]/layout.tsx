import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getDevSession } from "@/lib/dev-auth";
import prisma from "@/lib/prisma";
import ProjectSidebar from "./_components/ProjectSidebar";
import { getProjectForOwnerOrDeveloper } from "@/lib/dev-project-auth";

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
  });

  if (!developer) redirect("/developers/signin");

  const allProjects = await prisma.developerProject.findMany({
    where: { 
      status: "ACTIVE",
      OR: [
        { developerId: session.id },
        { ownerId: session.id }
      ]
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true },
  });

  // Verify this project belongs to this developer or owner
  const baseProject = await getProjectForOwnerOrDeveloper(id, session.id);
  if (!baseProject) redirect("/developers/portal");

  const project = await prisma.developerProject.findFirst({
    where: { id: baseProject.id },
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

  const viewerRole = project.ownerId === session.id ? "owner" : "developer";

  return (
    <div style={{ height: "100%", background: "#060810", display: "flex", overflow: "hidden" }}>
      <ProjectSidebar
        developer={developer}
        project={project}
        allProjects={allProjects}
        viewerRole={viewerRole}
      />
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
