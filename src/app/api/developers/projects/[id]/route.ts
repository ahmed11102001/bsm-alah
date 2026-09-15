import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";

import { getProjectForOwnerOrDeveloper } from "@/lib/dev-project-auth";

// ── GET /api/developers/projects/[id] — جلب تفاصيل مشروع واحد ──────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDevSessionFromRequest(req);
  if (!session) return devError("غير مصرح", "AUTH_REQUIRED", 401);

  const project = await getProjectForOwnerOrDeveloper(id, session.id);
  if (!project) {
    return devError("المشروع مش موجود", "NOT_FOUND", 404);
  }

  const projectWithDetails = await prisma.developerProject.findFirst({
    where: { id: project.id },
    include: {
      metaConnection: {
        select: {
          id: true,
          wabaId: true,
          phoneNumberId: true,
          displayPhone: true,
          isVerified: true,
          connectedAt: true,
        },
      },
      _count: {
        select: {
          apiKeys: { where: { status: "ACTIVE" } },
          otpTemplates: { where: { status: "APPROVED" } },
        },
      },
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      developer: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!projectWithDetails) {
    return devError("المشروع مش موجود", "NOT_FOUND", 404);
  }

  // OTP count for today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const otpToday = await prisma.otpLog.count({
    where: {
      projectId: id,
      createdAt: { gte: startOfDay },
    },
  });

  const viewerRole = projectWithDetails.ownerId === session.id ? "owner" : "developer";

  return NextResponse.json({
    project: {
      ...projectWithDetails,
      otpToday,
      viewerRole,
      transactions: [],
    },
  });
}

// ── DELETE /api/developers/projects/[id] — حذف مشروع (archive) ──────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDevSessionFromRequest(req);
  if (!session) return devError("غير مصرح", "AUTH_REQUIRED", 401);

  const project = await getProjectForOwnerOrDeveloper(id, session.id);

  if (!project) {
    return devError("المشروع مش موجود", "NOT_FOUND", 404);
  }

  if (project.status === "TRANSFERRED") {
    return devError("المشروع اتسلم لعميل — مش تقدر تحذفه", "INVALID_REQUEST", 400);
  }

  await prisma.developerProject.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json({ ok: true });
}