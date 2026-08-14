import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ownedConnection } from "@/lib/google-sheets";
import { importGoogleSheet } from "@/lib/google-sheets-sync";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.connectionId || !body.spreadsheetId || !body.sheetName) return NextResponse.json({ error: "بيانات Google Sheets ناقصة" }, { status: 400 });
    const connection = await ownedConnection(session.user.id, body.connectionId);
    const result = await importGoogleSheet(connection, body);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[GoogleSheets] import failed", error);
    return NextResponse.json({ error: error?.message ?? "فشل استيراد Google Sheets" }, { status: 400 });
  }
}
