import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleSheetsClient, ownedConnection } from "@/lib/google-sheets";
import { requirePermission } from "@/lib/permissions";
import { requireGoogleSheetsAccess } from "@/lib/google-sheets-access";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "CONTACTS_MANAGE");
  if (denied) return denied;
  const locked = await requireGoogleSheetsAccess(session!.user.id);
  if (locked) return locked;
  const params = new URL(req.url).searchParams;
  const spreadsheetId = params.get("spreadsheetId");
  if (!spreadsheetId) return NextResponse.json({ error: "spreadsheetId مطلوب" }, { status: 400 });
  try {
    const connection = await ownedConnection(session!.user.id, params.get("connectionId"));
    const sheets = await getGoogleSheetsClient(connection);
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "spreadsheetId,properties(title),sheets(properties(sheetId,title,index))",
    });
    return NextResponse.json({
      spreadsheetId,
      spreadsheetName: response.data.properties?.title ?? "",
      sheets: (response.data.sheets ?? []).map((sheet) => ({
        sheetId: sheet.properties?.sheetId,
        title: sheet.properties?.title,
        index: sheet.properties?.index,
      })),
    });
  } catch (error) {
    console.error("[GoogleSheets] sheets failed", error);
    return NextResponse.json({ error: "تعذر تحميل صفحات الشيت. تأكد من صلاحية الوصول." }, { status: 400 });
  }
}
