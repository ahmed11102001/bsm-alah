import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { NextRequest } from "next/server";

// GET /api/developers/notifications — جلب كل إشعارات المطور
export async function GET(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const notifications = await prisma.developerNotification.findMany({
    where: { developerId: session.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.developerNotification.count({
    where: { developerId: session.id, isRead: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}
