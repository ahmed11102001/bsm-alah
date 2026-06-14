import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { NextRequest } from "next/server";

// PUT /api/developers/notifications/read-all — تحويل كل الإشعارات لمقروءة
export async function PUT(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  await prisma.developerNotification.updateMany({
    where: { developerId: session.id, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
