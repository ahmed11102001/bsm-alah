import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { NextRequest } from "next/server";

// PUT /api/developers/notifications/[id]/read — تعليم إشعار واحد كمقروء
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const { id } = await params;

  const notification = await prisma.developerNotification.findFirst({
    where: { id, developerId: session.id },
  });

  if (!notification) {
    return NextResponse.json({ error: "الإشعار غير موجود" }, { status: 404 });
  }

  await prisma.developerNotification.update({
    where: { id },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
