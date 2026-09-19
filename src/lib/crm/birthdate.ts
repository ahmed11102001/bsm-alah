// src/lib/crm/birthdate.ts
// ─── تحويل تاريخ الميلاد من صيغ شائعة (شيت/إكسل/فورم) ───────────────────────
// المقبول: YYYY-MM-DD ، DD/MM/YYYY ، DD-MM-YYYY ، DD.MM.YYYY ،
// كائن Date ، الرقم التسلسلي بتاع Excel.
// بيرجع Date (منتصف ليل UTC) أو null لو الصيغة غلط أو التاريخ مستحيل/مستقبلي.

function isValidCalendarDate(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1900) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function notFuture(y: number, m: number, d: number): boolean {
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Date.UTC(y, m - 1, d) <= todayUTC;
}

function fromExcelSerial(n: number): Date | null {
  // Excel: أيام من 1899-12-30 (بتجاهل bug الـ leap year 1900 — كفاية لدقة يوم)
  if (!Number.isFinite(n) || n < 20000 || n > 80000) return null;
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  if (!isValidCalendarDate(y, m, d) || !notFuture(y, m, d)) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

export function parseBirthDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getUTCFullYear();
    const m = value.getUTCMonth() + 1;
    const d = value.getUTCDate();
    if (!isValidCalendarDate(y, m, d) || !notFuture(y, m, d)) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (Number.isInteger(value)) return fromExcelSerial(value);
    return null;
  }

  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;

  // YYYY-MM-DD (زي ما بيطلع من input type=date)
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!isValidCalendarDate(y, mo, d) || !notFuture(y, mo, d)) return null;
    return new Date(Date.UTC(y, mo - 1, d));
  }

  // DD/MM/YYYY أو DD-MM-YYYY أو DD.MM.YYYY
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    if (!isValidCalendarDate(y, mo, d) || !notFuture(y, mo, d)) return null;
    return new Date(Date.UTC(y, mo - 1, d));
  }

  return null;
}

export function cleanCity(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().slice(0, 120);
  return s || null;
}
