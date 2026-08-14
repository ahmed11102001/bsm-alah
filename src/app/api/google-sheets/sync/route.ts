import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ownedConnection } from "@/lib/google-sheets";
import { syncGoogleSheet } from "@/lib/google-sheets-sync";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const connection = await ownedConnection(session.user.id, body.connectionId);
    const result = await syncGoogleSheet(connection);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[GoogleSheets] sync failed", error);
    return NextResponse.json({ error: error?.message ?? "فشلت مزامنة Google Sheets" }, { status: 400 });
  }
}
