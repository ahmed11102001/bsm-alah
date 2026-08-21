import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleDriveClient, ownedConnection } from "@/lib/google-sheets";
import { requirePermission } from "@/lib/permissions";
import { requireGoogleSheetsAccess } from "@/lib/google-sheets-access";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "CONTACTS_MANAGE");
  if (denied) return denied;
  const locked = await requireGoogleSheetsAccess(session!.user.id);
  if (locked) return locked;

  try {
    const connection = await ownedConnection(session!.user.id, new URL(req.url).searchParams.get("connectionId"));
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
