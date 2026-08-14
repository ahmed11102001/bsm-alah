import prisma from "@/lib/prisma";
import { acquireContactsLimitLock, checkContactsLimit, getContactsLimitStatus, type ContactsLimitStatus } from "@/lib/plan-guard";
import { normalizePhone } from "@/lib/phone";
import {
  GOOGLE_SHEETS_MAX_ROWS,
  getGoogleSheetsClient,
  parseColumnIndex,
} from "@/lib/google-sheets";

type Connection = {
  id: string;
  userId: string;
  audienceId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  spreadsheetId: string | null;
  spreadsheetName: string | null;
  sheetId: string | null;
  sheetName: string | null;
  nameColumn: string | null;
  phoneColumn: string | null;
};

export class GoogleContactsLimitError extends Error {
  readonly code = "CONTACT_LIMIT";
  constructor(public readonly details: { status: ContactsLimitStatus; newContacts: number }) {
    super("عدد جهات الاتصال الجديدة يتجاوز المساحة المتاحة في الباقة");
  }
}

function sheetRange(sheetName: string): string {
  // نقرأ صفًا زائدًا حتى نقدر نرفض الشيت الذي يتجاوز الحد بدل الاعتماد على حجم الـ grid.
  return `'${sheetName.replace(/'/g, "''")}'!A1:ZZ${GOOGLE_SHEETS_MAX_ROWS + 2}`;
}

async function readRows(connection: Connection, spreadsheetId: string, sheetName: string) {
  const sheets = await getGoogleSheetsClient(connection);
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties(title),sheets(properties(sheetId,title))",
  });
  const sheet = (metadata.data.sheets ?? []).find((item) => item.properties?.title === sheetName);
  if (!sheet) throw new Error("صفحة الشيت غير موجودة أو لم يعد لديك صلاحية الوصول إليها");
  const values = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(sheetName),
    valueRenderOption: "FORMATTED_VALUE",
  });
  const rows = (values.data.values ?? []) as string[][];
  if (rows.length < 2) throw new Error("الشيت فارغ أو لا يحتوي على صفوف بيانات");
  const actualRows = rows.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  if (actualRows.length > GOOGLE_SHEETS_MAX_ROWS) {
    throw new Error("الشيت يحتوي على أكثر من 10,000 صف فعلي. الحد الأقصى للاستيراد حاليًا هو 10,000 جهة اتصال.");
  }
  return {
    spreadsheetName: metadata.data.properties?.title ?? spreadsheetId,
    sheetId: sheet.properties?.sheetId?.toString() ?? null,
    headers: rows[0].map((value) => String(value ?? "")),
    rows: rows.slice(1),
  };
}

export async function importGoogleSheet(
  connection: Connection,
  input: { spreadsheetId: string; sheetId?: string | null; sheetName: string; nameColumn: unknown; phoneColumn: unknown },
  options: { allowPartial?: boolean } = {},
) {
  const source = await readRows(connection, input.spreadsheetId, input.sheetName);
  const nameIndex = parseColumnIndex(input.nameColumn, source.headers);
  const phoneIndex = parseColumnIndex(input.phoneColumn, source.headers);
  if (nameIndex < 0 || phoneIndex < 0 || nameIndex >= source.headers.length || phoneIndex >= source.headers.length) {
    throw new Error("اختار عمود الاسم وعمود رقم الهاتف بشكل صحيح");
  }

  const byPhone = new Map<string, { phone: string; name: string | null }>();
  for (const row of source.rows) {
    const rawPhone = String(row[phoneIndex] ?? "").trim();
    const phone = normalizePhone(rawPhone);
    if (!phone) continue;
    const name = String(row[nameIndex] ?? "").trim() || null;
    const previous = byPhone.get(phone);
    byPhone.set(phone, { phone, name: name || previous?.name || null });
  }
  const contacts = [...byPhone.values()];
  if (contacts.length === 0) throw new Error("لم نجد أي أرقام هاتف صالحة في العمود المحدد");

  const result = await prisma.$transaction(async (tx) => {
    await acquireContactsLimitLock(tx, connection.userId);
    // إعادة القراءة بعد القفل تمنع تجاوز الـ global limit عند تشغيل Importين معًا.
    const latestExisting = await tx.contact.findMany({
      where: { userId: connection.userId, phone: { in: contacts.map((contact) => contact.phone) } },
      select: { phone: true },
    });
    const latestExistingPhones = new Set(latestExisting.map((contact) => contact.phone));
    const latestNewContacts = contacts.filter((contact) => !latestExistingPhones.has(contact.phone));
    const limitStatus = await getContactsLimitStatus(connection.userId);
    if (!limitStatus.unlimited && latestNewContacts.length > limitStatus.available && !options.allowPartial) {
      // Reuse the canonical guard so the normal plan-limit notification is emitted too.
      await checkContactsLimit(connection.userId, latestNewContacts.length);
      throw new GoogleContactsLimitError({ status: limitStatus, newContacts: latestNewContacts.length });
    }
    const allowedNewContacts = limitStatus.unlimited
      ? latestNewContacts
      : latestNewContacts.slice(0, limitStatus.available);
    const allowedNewPhones = new Set(allowedNewContacts.map((contact) => contact.phone));
    const contactsToWrite = contacts.filter((contact) => latestExistingPhones.has(contact.phone) || allowedNewPhones.has(contact.phone));

    let audienceId = connection.audienceId;
    if (audienceId) {
      const ownedAudience = await tx.audience.findFirst({ where: { id: audienceId, userId: connection.userId } });
      if (!ownedAudience) throw new Error("جمهور Google Sheets غير موجود");
    } else {
      const audience = await tx.audience.create({
        data: { userId: connection.userId, name: source.spreadsheetName || input.sheetName, type: "google_sheets" },
      });
      audienceId = audience.id;
    }

    for (const contact of contactsToWrite) {
      await tx.contact.upsert({
        where: { phone_userId: { phone: contact.phone, userId: connection.userId } },
        update: {
          audienceId,
          deletedAt: null,
          ...(contact.name ? { name: contact.name } : {}),
        },
        create: { userId: connection.userId, audienceId, phone: contact.phone, name: contact.name },
      });
    }

    const savedConnection = await tx.googleSheetsConnection.update({
      where: { id: connection.id },
      data: {
        audienceId,
        spreadsheetId: input.spreadsheetId,
        spreadsheetName: source.spreadsheetName,
        sheetId: input.sheetId != null ? String(input.sheetId) : source.sheetId,
        sheetName: input.sheetName,
        nameColumn: String(input.nameColumn),
        phoneColumn: String(input.phoneColumn),
        lastSyncAt: new Date(),
      },
    });
    return {
      audienceId, savedConnection,
      contactsToWrite, latestExistingPhones, latestNewContacts, limitStatus,
    };
  });

  const created = result.contactsToWrite.filter((contact) => !result.latestExistingPhones.has(contact.phone)).length;
  const updated = result.contactsToWrite.length - created;
  return {
    imported: result.contactsToWrite.length,
    created,
    updated,
    skippedByLimit: result.latestNewContacts.length - created,
    limitInfo: {
      currentContacts: result.limitStatus.used,
      newContacts: result.latestNewContacts.length,
      availableSlots: result.limitStatus.unlimited ? null : result.limitStatus.available,
      unlimited: result.limitStatus.unlimited,
    },
    audienceId: result.audienceId,
  };
}

export async function syncGoogleSheet(connection: Connection, options: { allowPartial?: boolean } = {}) {
  if (!connection.spreadsheetId || !connection.sheetName || connection.nameColumn === null || connection.phoneColumn === null) {
    throw new Error("لم يتم إعداد مصدر Google Sheets بالكامل بعد");
  }
  return importGoogleSheet(connection, {
    spreadsheetId: connection.spreadsheetId,
    sheetId: connection.sheetId,
    sheetName: connection.sheetName,
    nameColumn: connection.nameColumn,
    phoneColumn: connection.phoneColumn,
  }, options);
}
