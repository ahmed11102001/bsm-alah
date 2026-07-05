import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await prisma.developerProject.findFirst({
    where: { id, ownerId: session.id },
    include: { developer: { select: { firstName: true } } },
  });

  if (!project) {
    return NextResponse.json({ error: "المشروع مش موجود أو مش بتاعك" }, { status: 404 });
  }

  if (project.ownerWelcomeSeenAt) {
    return NextResponse.json({ alreadySeen: true });
  }

  const updated = await prisma.developerProject.updateMany({
    where: { id: project.id, ownerWelcomeSeenAt: null },
    data: { ownerWelcomeSeenAt: new Date() },
  });

  if (updated.count === 0) {
    return NextResponse.json({ alreadySeen: true });
  }

  return NextResponse.json({
    alreadySeen: false,
    projectName: project.name,
    developerFirstName: project.developer.firstName,
  });
}
