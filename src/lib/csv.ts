// src/lib/csv.ts
// CSV parser صغير (quotes/commas/CRLF/BOM) — مشترك بين السيرفر والكلاينت، بدون dependencies.

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\r") {
      // تجاهل — الـ \n هي اللي بتقفل السطر
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);
  // شيل السطور الفاضية تمامًا
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
