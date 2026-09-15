import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
import { NextRequest } from "next/server";

// PUT /api/developers/notifications/[id]/read — تعليم إشعار واحد كمقروء
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSessionFromRequest(req);
  if (!session) {
    return devError("غير مصرّح", "AUTH_REQUIRED", 401);
  }

  const { id } = await params;

  const notification = await prisma.developerNotification.findFirst({
    where: { id, developerId: session.id },
  });

  if (!notification) {
    return devError("الإشعار غير موجود", "NOT_FOUND", 404);
  }

  await prisma.developerNotification.update({
    where: { id },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
