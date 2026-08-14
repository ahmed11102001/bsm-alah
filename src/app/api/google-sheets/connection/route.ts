import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const connection = await prisma.googleSheetsConnection.findFirst({
    where: { userId: session.user.id, id: new URL(req.url).searchParams.get("connectionId") ?? undefined },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, audienceId: true, spreadsheetId: true, spreadsheetName: true,
      sheetId: true, sheetName: true, nameColumn: true, phoneColumn: true,
      lastSyncAt: true, syncInterval: true,
      audience: { select: { name: true, _count: { select: { contacts: { where: { deletedAt: null } } } } } },
    },
  });
  return NextResponse.json({ connection });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  if (!body.connectionId || !["off", "hourly", "6hours", "daily"].includes(body.syncInterval)) return NextResponse.json({ error: "إعداد المزامنة غير صحيح" }, { status: 400 });
  const updated = await prisma.googleSheetsConnection.updateMany({
    where: { id: body.connectionId, userId: session.user.id },
    data: { syncInterval: body.syncInterval },
  });
  if (!updated.count) return NextResponse.json({ error: "اتصال Google Sheets غير موجود" }, { status: 404 });
  return NextResponse.json({ success: true });
}
