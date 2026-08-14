import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleDriveClient, ownedConnection } from "@/lib/google-sheets";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const connection = await ownedConnection(session.user.id, new URL(req.url).searchParams.get("connectionId"));
    const drive = await getGoogleDriveClient(connection);
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      orderBy: "modifiedTime desc",
      pageSize: 100,
      fields: "files(id,name,modifiedTime,webViewLink)",
      spaces: "drive",
    });
    return NextResponse.json({ connectionId: connection.id, spreadsheets: response.data.files ?? [] });
  } catch (error: any) {
    console.error("[GoogleSheets] spreadsheets failed", error);
    return NextResponse.json({ error: error?.message?.includes("Google") ? error.message : "تعذر تحميل ملفات Google Sheets" }, { status: 400 });
  }
}
