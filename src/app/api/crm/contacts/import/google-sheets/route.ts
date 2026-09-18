// POST /api/crm/contacts/import/google-sheets — استيراد لمرة واحدة من شيت
// (بدون OAuth وبدون GoogleSheetsConnection — الشيت لازم يكون متشير "Anyone with the link").
//
// { mode: "preview", url } → { headers, rows (أول 5), rowCount }
// { mode: "import", url, mapping: { nameCol?, phoneCol?, emailCol? } } → { summary }
// الأعمدة بـ index (0-based) في مصفوفة الصف. لو mapping مش مبعوت، تخمين تلقائي من الهيدر.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { processImportRows } from "@/lib/crm/import-shared";
import { parseCsv } from "@/lib/csv";

const FETCH_TIMEOUT_MS = 15000;
const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_PARSE_ROWS = 5000;

function toCsvUrl(input: string): string | null {
  const url = input.trim();
  if (!url) return null;
  if (/[?&]format=csv\b/.test(url)) return url;
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  const gidMatch = url.match(/[#?&]gid=(\d+)/);
  const gid = gidMatch ? `&gid=${gidMatch[1]}` : "";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid}`;
}

async function fetchSheetRows(url: string): Promise<string[][]> {
  const csvUrl = toCsvUrl(url);
  if (!csvUrl) {
    const err: any = new Error("رابط الشيت غير مدعوم — ابعت لينك Google Sheets متشير (Anyone with the link)");
    err.code = "BAD_URL";
    throw err;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(csvUrl, { signal: ctrl.signal, redirect: "follow" });
  } catch {
    const err: any = new Error("تعذر الوصول للشيت — اتأكد إنه متشير (Anyone with the link)");
    err.code = "FETCH_FAILED";
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const err: any = new Error(
      res.status === 401 || res.status === 403
        ? "الشيت مقفول — اعمله Share (Anyone with the link) وحاول تاني"
        : `جوجل رجعت خطأ (${res.status}) — حاول تاني`
    );
    err.code = res.status === 401 || res.status === 403 ? "NOT_SHARED" : "FETCH_FAILED";
    throw err;
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_CSV_BYTES) {
    const err: any = new Error("الشيت أكبر من 5MB — قلل الصفوف وحاول تاني");
    err.code = "TOO_BIG";
    throw err;
  }
  const text = new TextDecoder("utf-8").decode(buf);
  return parseCsv(text).slice(0, MAX_PARSE_ROWS);
}

const NAME_HINTS = ["name", "الاسم", "full name", "fullname", "العميل", "customer", "client"];
const PHONE_HINTS = ["phone", "mobile", "tel", "telephone", "whatsapp", "التليفون", "الهاتف", "رقم", "الموبايل", "جوال", "هاتف"];
const EMAIL_HINTS = ["email", "e-mail", "mail", "الإيميل", "البريد", "ايميل", "بريد"];

function guessColumn(headers: string[], hints: string[]): number | null {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim().toLowerCase();
    if (!h) continue;
    if (hints.some((hint) => h === hint || h.includes(hint))) return i;
  }
  return null;
}

function pickCol(mapping: any, key: string, headers: string[], hints: string[], fallbackIndex: number | null): number | null {
  const v = mapping?.[key];
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < headers.length) return v;
  const guessed = guessColumn(headers, hints);
  if (guessed !== null) return guessed;
  return fallbackIndex !== null && fallbackIndex < headers.length ? fallbackIndex : null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const denied = requirePermission(session, "CONTACTS_MANAGE");
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "import" ? "import" : "preview";
  const url = typeof body?.url === "string" ? body.url : "";

  let rows: string[][];
  try {
    rows = await fetchSheetRows(url);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "تعذر قراءة الشيت", code: err?.code || "FETCH_FAILED" },
      { status: 400 }
    );
  }
  if (rows.length < 2) {
    return NextResponse.json({ error: "الشيت فاضي أو مفيهوش بيانات", code: "EMPTY_SHEET" }, { status: 400 });
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  if (mode === "preview") {
    return NextResponse.json({
      headers: headers.map((value, index) => ({ index, value })),
      rows: dataRows.slice(0, 5),
      rowCount: dataRows.length,
    });
  }

  // ── import ──
  const mapping = body?.mapping ?? {};
  const nameCol = pickCol(mapping, "nameCol", headers, NAME_HINTS, 0);
  const phoneCol = pickCol(mapping, "phoneCol", headers, PHONE_HINTS, 1);
  const emailCol = pickCol(mapping, "emailCol", headers, EMAIL_HINTS, 2);

  const ownerId = (session.user.parentId as string | null) ?? (session.user.id as string);
  const summary = await processImportRows(
    ownerId,
    dataRows.map((r) => ({
      name: nameCol !== null ? r[nameCol] : undefined,
      phone: phoneCol !== null ? r[phoneCol] : undefined,
      email: emailCol !== null ? r[emailCol] : undefined,
    }))
  );
  return NextResponse.json({ summary });
}
