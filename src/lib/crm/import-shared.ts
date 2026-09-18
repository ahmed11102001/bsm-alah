// src/lib/crm/import-shared.ts
// ─── معالجة صف استيراد واحد (إكسل/جوجل شيت) — نفس منطق تاسك الاستور ────────
// رقم → phone_userId (وتحديث الإيميل لو ناقص) | إيميل بس → email_userId |
// ولا حاجة → skip مرصود في التقرير.

import prisma from "@/lib/prisma";
import { upsertStoreContact } from "@/lib/store-contacts";
import { normalizeCrmPhone, normalizeCrmEmail } from "./contacts";

export interface ImportRow {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
}

export type ImportSkipReason = "NO_CHANNEL" | "ROW_LIMIT";

export interface ImportSummary {
  total: number;
  added: number;
  updated: number;
  skipped: number;
  skippedSamples: Array<{ row: number; reason: ImportSkipReason }>;
}

export const IMPORT_MAX_ROWS = 500;

function cleanImportName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 120);
  return s || null;
}

async function existedBefore(ownerId: string, phone: string | null, email: string | null): Promise<boolean> {
  if (phone) {
    const r = await prisma.contact.findUnique({
      where: { phone_userId: { phone, userId: ownerId } },
      select: { id: true },
    });
    if (r) return true;
  }
  if (email) {
    const r = await prisma.contact.findUnique({
      where: { email_userId: { email, userId: ownerId } },
      select: { id: true },
    });
    if (r) return true;
  }
  return false;
}

/** معالجة صف واحد — بترجع الحالة للملخص */
export async function processImportRow(
  ownerId: string,
  row: ImportRow
): Promise<"added" | "updated" | ImportSkipReason> {
  const phone = normalizeCrmPhone(row.phone);
  const email = normalizeCrmEmail(row.email);
  if (!phone && !email) return "NO_CHANNEL";

  const name = cleanImportName(row.name);
  const wasThere = await existedBefore(ownerId, phone, email);
  await upsertStoreContact({
    userId: ownerId,
    phone,
    email,
    updateName: name ?? undefined,
    createName: name ?? "",
  });
  return wasThere ? "updated" : "added";
}

/** معالجة دفعة صفوف مع ملخص (added/updated/skipped) */
export async function processImportRows(
  ownerId: string,
  rows: ImportRow[]
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    total: rows.length,
    added: 0,
    updated: 0,
    skipped: 0,
    skippedSamples: [],
  };
  const limited = rows.slice(0, IMPORT_MAX_ROWS);
  for (let i = 0; i < limited.length; i++) {
    try {
      const outcome = await processImportRow(ownerId, limited[i]);
      if (outcome === "added") summary.added++;
      else if (outcome === "updated") summary.updated++;
      else {
        summary.skipped++;
        if (summary.skippedSamples.length < 20) {
          summary.skippedSamples.push({ row: i + 1, reason: outcome });
        }
      }
    } catch {
      summary.skipped++;
      if (summary.skippedSamples.length < 20) {
        summary.skippedSamples.push({ row: i + 1, reason: "NO_CHANNEL" });
      }
    }
  }
  if (rows.length > IMPORT_MAX_ROWS) {
    summary.skipped += rows.length - IMPORT_MAX_ROWS;
  }
  return summary;
}
