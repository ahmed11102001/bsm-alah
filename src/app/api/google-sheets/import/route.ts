import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ownedConnection } from "@/lib/google-sheets";
import { GoogleContactsLimitError, importGoogleSheet } from "@/lib/google-sheets-sync";
import { requirePermission } from "@/lib/permissions";
import { requireGoogleSheetsAccess } from "@/lib/google-sheets-access";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "CONTACTS_MANAGE");
  if (denied) return denied;
  const locked = await requireGoogleSheetsAccess(session!.user.id);
  if (locked) return locked;

  try {
    const body = await req.json();
    if (!body.connectionId || !body.spreadsheetId || !body.sheetName) return NextResponse.json({ error: "بيانات Google Sheets ناقصة" }, { status: 400 });
    const connection = await ownedConnection(session!.user.id, body.connectionId);
    const result = await importGoogleSheet(connection, body, { allowPartial: body.allowPartial === true });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof GoogleContactsLimitError) {
      return NextResponse.json({
        error: error.message,
        code: error.code,
        needsConfirmation: true,
        newContacts: error.details.newContacts,
        currentContacts: error.details.status.used,
        availableSlots: error.details.status.unlimited ? null : error.details.status.available,
        unlimited: error.details.status.unlimited,
      }, { status: 409 });
    }
    console.error("[GoogleSheets] import failed", error);
    return NextResponse.json({ error: error?.message ?? "فشل استيراد Google Sheets" }, { status: 400 });
  }
}
