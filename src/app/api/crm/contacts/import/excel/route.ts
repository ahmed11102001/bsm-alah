// POST /api/crm/contacts/import/excel — استيراد لمرة واحدة من صفوف جاهزة
// الكلاينت بيفك ملف الإكسل (ExcelJS) وبيعمل mapping الأعمدة، والسيرفر بيستقبل
// rows: [{ name?, phone?, email? }] وبيعالجها بنفس منطق الاستور.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { processImportRows, IMPORT_MAX_ROWS, type ImportRow } from "@/lib/crm/import-shared";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const denied = requirePermission(session, "CONTACTS_MANAGE");
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body?.rows) ? (body.rows as ImportRow[]) : null;
  if (!rows) {
    return NextResponse.json({ error: "rows مطلوبة (مصفوفة)", code: "INVALID_ROWS" }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "مفيش صفوف للاستيراد", code: "EMPTY_ROWS" }, { status: 400 });
  }
  if (rows.length > 5000) {
    return NextResponse.json(
      { error: `الحد الأقصى 5000 صف في المرة (اتبعت ${rows.length})`, code: "TOO_MANY_ROWS" },
      { status: 400 }
    );
  }

  const ownerId = (session.user.parentId as string | null) ?? (session.user.id as string);
  const summary = await processImportRows(ownerId, rows);
  return NextResponse.json({ summary, maxRows: IMPORT_MAX_ROWS });
}
