import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "CONTACTS_MANAGE");

  if (denied) return denied;
  const { connectionId } = await req.json();
  if (!connectionId) return NextResponse.json({ error: "connectionId مطلوب" }, { status: 400 });
  const deleted = await prisma.googleSheetsConnection.deleteMany({ where: { id: connectionId, userId: session!.user.id } });
  if (!deleted.count) return NextResponse.json({ error: "اتصال Google Sheets غير موجود" }, { status: 404 });
  return NextResponse.json({ success: true });
}
