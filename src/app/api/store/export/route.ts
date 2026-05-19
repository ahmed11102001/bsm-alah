// src/app/api/store/export/route.ts
// ─── تصدير عملاء المتجر ملف Excel ───────────────────────────────────────────
//
// GET /api/store/export?source=shopify&search=optional
// يرجع ملف .xlsx بكل بيانات العملاء (بدون pagination — الكل دفعة واحدة)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import ExcelJS                       from "exceljs";

function resolveOwnerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);
  const sp      = new URL(req.url).searchParams;
  const source  = sp.get("source") ?? "";
  const search  = sp.get("search")?.trim() ?? "";

  if (!["shopify", "easyorders", "woocommerce"].includes(source)) {
    return NextResponse.json({ error: "source غير صحيح" }, { status: 400 });
  }

  // ── جيب المتجر ───────────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where:  { id: ownerId },
    select: {
      shopifyStore:     { select: { id: true } },
      easyOrdersStore:  { select: { id: true } },
      wooCommerceStore: { select: { id: true } },
    },
  });

  const storeId =
    source === "shopify"    ? user?.shopifyStore?.id :
    source === "easyorders" ? user?.easyOrdersStore?.id :
                              (user as any)?.wooCommerceStore?.id;

  if (!storeId) {
    return NextResponse.json({ error: "المتجر غير مربوط" }, { status: 404 });
  }

  const storeFilter: Record<string, string> =
    source === "shopify"    ? { shopifyStoreId:     storeId } :
    source === "easyorders" ? { easyOrdersStoreId:  storeId } :
                              { wooCommerceStoreId:  storeId };

  const searchFilter = search
    ? {
        OR: [
          { customerName:  { contains: search, mode: "insensitive" as const } },
          { customerPhone: { contains: search } },
          { orderNumber:   { contains: search } },
        ],
      }
    : {};

  const where = { ...storeFilter, ...searchFilter };

  // ── جيب كل العملاء (بدون حد أقصى) ───────────────────────────────────────
  const rawGroups = await prisma.storeOrder.groupBy({
    by:      ["customerPhone"],
    where,
    _count:  { id:    true },
    _sum:    { total: true },
    _max:    { orderedAt: true },
    orderBy: { _max: { orderedAt: "desc" } },
  });

  const phones = rawGroups.map((c: any) => c.customerPhone);

  // آخر أوردر لكل عميل
  const lastOrders = await prisma.storeOrder.findMany({
    where:    { ...storeFilter, customerPhone: { in: phones } },
    orderBy:  { orderedAt: "desc" },
    distinct: ["customerPhone"],
    select: {
      customerPhone: true,
      customerName:  true,
      orderNumber:   true,
      total:         true,
      currency:      true,
      status:        true,
      orderedAt:     true,
    },
  });

  const lastMap = new Map(lastOrders.map((o) => [o.customerPhone, o]));

  const rows = rawGroups.map((c: any) => {
    const last = lastMap.get(c.customerPhone);
    return {
      name:        last?.customerName ?? "عميل",
      phone:       c.customerPhone,
      ordersCount: c._count.id,
      totalSpent:  c._sum.total ?? 0,
      currency:    last?.currency ?? "EGP",
      lastStatus:  last?.status   ?? "—",
      lastOrderNo: last?.orderNumber ?? "—",
      lastDate:    last?.orderedAt
        ? new Date(last.orderedAt).toLocaleDateString("ar-EG")
        : "—",
    };
  });

  // ── بناء ملف Excel ────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator  = "WatsPro";
  wb.created  = new Date();

  const ws = wb.addWorksheet("عملاء المتجر", {
    views:      [{ rightToLeft: true }],
    properties: { defaultRowHeight: 20 },
  });

  // الألوان
  const GREEN   = "FF25D366";
  const WHITE   = "FFFFFFFF";
  const GRAY_BG = "FFF9FAFB";
  const BORDER  = "FFE5E7EB";

  // ── الأعمدة ───────────────────────────────────────────────────────────────
  ws.columns = [
    { key: "name",        width: 28 },
    { key: "phone",       width: 20 },
    { key: "ordersCount", width: 14 },
    { key: "totalSpent",  width: 18 },
    { key: "currency",    width: 10 },
    { key: "lastStatus",  width: 16 },
    { key: "lastOrderNo", width: 18 },
    { key: "lastDate",    width: 18 },
  ];

  // ── رأس الجدول ────────────────────────────────────────────────────────────
  const headers = [
    "اسم العميل",
    "رقم الهاتف",
    "عدد الطلبات",
    "إجمالي الإنفاق",
    "العملة",
    "حالة آخر طلب",
    "رقم آخر طلب",
    "تاريخ آخر طلب",
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
    cell.font   = { bold: true, color: { argb: WHITE }, size: 11, name: "Calibri" };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    cell.border = {
      bottom: { style: "thin", color: { argb: BORDER } },
    };
  });

  // ── البيانات ──────────────────────────────────────────────────────────────
  rows.forEach((r, idx) => {
    const row = ws.addRow([
      r.name,
      r.phone,
      r.ordersCount,
      r.totalSpent,
      r.currency,
      r.lastStatus,
      r.lastOrderNo,
      r.lastDate,
    ]);

    const isEven = idx % 2 === 0;
    row.eachCell((cell, colNum) => {
      cell.fill = {
        type: "pattern", pattern: "solid",
        fgColor: { argb: isEven ? WHITE : GRAY_BG.replace("#", "") },
      };
      cell.font      = { size: 10, name: "Calibri" };
      cell.alignment = { vertical: "middle", readingOrder: "rtl",
        horizontal: colNum <= 2 ? "right" : "center" };
      cell.border = {
        bottom: { style: "hair", color: { argb: BORDER } },
        right:  { style: "hair", color: { argb: BORDER } },
        left:   { style: "hair", color: { argb: BORDER } },
      };
    });

    // الإجمالي كـ number للـ sorting
    row.getCell(4).numFmt = "#,##0.00";
  });

  // ── صف الملخص ─────────────────────────────────────────────────────────────
  ws.addRow([]);
  const sumRow = ws.addRow([
    `إجمالي العملاء: ${rows.length}`,
    "",
    rows.reduce((s, r) => s + r.ordersCount, 0),
    rows.reduce((s, r) => s + r.totalSpent,  0),
    rows[0]?.currency ?? "EGP",
    "", "", "",
  ]);
  sumRow.getCell(1).font   = { bold: true, size: 10 };
  sumRow.getCell(3).font   = { bold: true, size: 10 };
  sumRow.getCell(4).font   = { bold: true, size: 10 };
  sumRow.getCell(4).numFmt = "#,##0.00";
  sumRow.getCell(3).alignment = { horizontal: "center" };
  sumRow.getCell(4).alignment = { horizontal: "center" };

  // ── تجميد الصف الأول ──────────────────────────────────────────────────────
  ws.views = [{ state: "frozen", ySplit: 1, rightToLeft: true }];

  // ── تصدير Buffer ──────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();

  const today    = new Date().toISOString().slice(0, 10);
  const filename = `customers-${source}-${today}.xlsx`;

  return new NextResponse(buffer as any, {
    status:  200,
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}