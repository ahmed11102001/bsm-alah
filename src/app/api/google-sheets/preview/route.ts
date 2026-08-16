import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleSheetsClient, ownedConnection, parseColumnIndex, GOOGLE_SHEETS_MAX_ROWS } from "@/lib/google-sheets";
import { normalizePhone } from "@/lib/phone";
import prisma from "@/lib/prisma";
import { getContactsLimitStatus } from "@/lib/plan-guard";
import { requirePermission } from "@/lib/permissions";

function rangeFor(sheetName: string, endRow: number): string {
  const safeName = sheetName.replace(/'/g, "''");
  return `'${safeName}'!A1:ZZ${endRow}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "CONTACTS_MANAGE");

  if (denied) return denied;
  const params = new URL(req.url).searchParams;
  const spreadsheetId = params.get("spreadsheetId");
  const sheetName = params.get("sheetName");
  if (!spreadsheetId || !sheetName) return NextResponse.json({ error: "spreadsheetId و sheetName مطلوبان" }, { status: 400 });

  try {
    const connection = await ownedConnection(session!.user.id, params.get("connectionId"));
    const sheets = await getGoogleSheetsClient(connection);
    const [meta, values] = await Promise.all([
      sheets.spreadsheets.get({
        spreadsheetId,
        fields: "properties(title),sheets(properties(sheetId,title))",
      }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: rangeFor(sheetName, GOOGLE_SHEETS_MAX_ROWS + 2), valueRenderOption: "FORMATTED_VALUE" }),
    ]);
    const currentSheet = (meta.data.sheets ?? []).find((sheet) => sheet.properties?.title === sheetName);
    if (!currentSheet) return NextResponse.json({ error: "صفحة الشيت غير موجودة" }, { status: 404 });
    const rows = (values.data.values ?? []) as string[][];
    const headers = rows[0] ?? [];
    const phoneColumn = params.get("phoneColumn");
    const phoneIndex = phoneColumn ? parseColumnIndex(phoneColumn, headers) : (headers.length > 1 ? 1 : 0);
    const actualRows = rows.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
    if (actualRows.length > GOOGLE_SHEETS_MAX_ROWS) {
      return NextResponse.json({ error: "الشيت يحتوي على أكثر من 10,000 صف فعلي. الحد الأقصى للاستيراد حاليًا هو 10,000 جهة اتصال." }, { status: 400 });
    }
    const validRowCount = actualRows.filter((row) => Boolean(normalizePhone(String(row[phoneIndex] ?? "").trim()))).length;
    const validPhones = [...new Set(actualRows
      .map((row) => normalizePhone(String(row[phoneIndex] ?? "").trim()))
      .filter((phone): phone is string => Boolean(phone)))];
    const existing = await prisma.contact.findMany({
      where: { userId: connection.userId, phone: { in: validPhones } },
      select: { phone: true },
    });
    const existingPhones = new Set(existing.map((contact) => contact.phone));
    const limitStatus = await getContactsLimitStatus(connection.userId);
    const newContacts = validPhones.filter((phone) => !existingPhones.has(phone)).length;
    return NextResponse.json({
      connectionId: connection.id,
      spreadsheetId,
      spreadsheetName: meta.data.properties?.title ?? "",
      sheetId: currentSheet.properties?.sheetId,
      sheetName,
      headers: headers.map((value, index) => ({ index, value: String(value ?? "") })),
      rows: rows.slice(1, 11).map((row) => headers.map((_, index) => String(row[index] ?? ""))),
      // عدد العملاء الفعليين، وليس عدد الصفوف الافتراضية في Google grid.
      rowCount: validRowCount,
      limitInfo: {
        currentContacts: limitStatus.used,
        newContacts,
        availableSlots: limitStatus.unlimited ? null : limitStatus.available,
        unlimited: limitStatus.unlimited,
      },
    });
  } catch (error) {
    console.error("[GoogleSheets] preview failed", error);
    return NextResponse.json({ error: "تعذر قراءة Preview من Google Sheets" }, { status: 400 });
  }
}
