import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleSheetsClient, ownedConnection } from "@/lib/google-sheets";

function rangeFor(sheetName: string, endRow: number): string {
  const safeName = sheetName.replace(/'/g, "''");
  return `'${safeName}'!A1:ZZ${endRow}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const spreadsheetId = params.get("spreadsheetId");
  const sheetName = params.get("sheetName");
  if (!spreadsheetId || !sheetName) return NextResponse.json({ error: "spreadsheetId و sheetName مطلوبان" }, { status: 400 });

  try {
    const connection = await ownedConnection(session.user.id, params.get("connectionId"));
    const sheets = await getGoogleSheetsClient(connection);
    const [meta, values] = await Promise.all([
      sheets.spreadsheets.get({
        spreadsheetId,
        fields: "properties(title),sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))",
      }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: rangeFor(sheetName, 11) }),
    ]);
    const currentSheet = (meta.data.sheets ?? []).find((sheet) => sheet.properties?.title === sheetName);
    if (!currentSheet) return NextResponse.json({ error: "صفحة الشيت غير موجودة" }, { status: 404 });
    const rows = (values.data.values ?? []) as string[][];
    const headers = rows[0] ?? [];
    return NextResponse.json({
      connectionId: connection.id,
      spreadsheetId,
      spreadsheetName: meta.data.properties?.title ?? "",
      sheetId: currentSheet.properties?.sheetId,
      sheetName,
      headers: headers.map((value, index) => ({ index, value: String(value ?? "") })),
      rows: rows.slice(1, 11).map((row) => headers.map((_, index) => String(row[index] ?? ""))),
      rowCount: currentSheet.properties?.gridProperties?.rowCount ?? null,
    });
  } catch (error) {
    console.error("[GoogleSheets] preview failed", error);
    return NextResponse.json({ error: "تعذر قراءة Preview من Google Sheets" }, { status: 400 });
  }
}
