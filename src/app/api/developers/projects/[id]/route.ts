import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";

// ── GET /api/developers/projects/[id] — جلب تفاصيل مشروع واحد ──────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const project = await prisma.developerProject.findFirst({
    where: { id, developerId: session.id },
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
    },
  });

  if (!project) {
    return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });
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

  return NextResponse.json({ project: { ...project, otpToday } });
}

// ── DELETE /api/developers/projects/[id] — حذف مشروع (archive) ──────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const project = await prisma.developerProject.findFirst({
    where: { id, developerId: session.id },
  });

  if (!project) {
    return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });
  }

  if (project.status === "TRANSFERRED") {
    return NextResponse.json({ error: "المشروع اتسلم لعميل — مش تقدر تحذفه" }, { status: 400 });
  }

  await prisma.developerProject.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json({ ok: true });
}