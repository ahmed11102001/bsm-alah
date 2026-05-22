import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

// ── POST /api/leads — حفظ lead جديد (public) ─────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, business, goal, volume, lang, source, _t } = body;

    // ── Honeypot: لو أُرسل الفورم في أقل من 3 ثواني → bot ─────────────────
    if (typeof _t === "number" && Date.now() - _t < 3000) {
      // نرجع 200 لخداع الـ bot بدون حفظ
      return NextResponse.json({ ok: true });
    }

    // ── Validation ─────────────────────────────────────────────────────────
    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
    }
    if (!business || !goal || !volume) {
      return NextResponse.json({ error: "incomplete flow data" }, { status: 400 });
    }
    // تنظيف الرقم — احتفظ بالأرقام وعلامة + فقط
    const cleanPhone = phone.replace(/[^\d+]/g, "").slice(0, 20);
    if (cleanPhone.length < 7) {
      return NextResponse.json({ error: "invalid phone" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        name:     name.trim().slice(0, 100),
        phone:    cleanPhone,
        business: business.slice(0, 50),
        goal:     goal.slice(0, 50),
        volume:   volume.slice(0, 20),
        lang:     lang === "en" ? "en" : "ar",
        source:   source?.slice(0, 200) ?? null,
      },
    });

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (err) {
    console.error("[leads POST]", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// ── GET /api/leads — قائمة الـ leads (admin only) ────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");   // NEW | CONTACTED | CONVERTED | LOST | all
  const exportCsv    = searchParams.get("export") === "csv";
  const page         = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize     = 50;

  const where =
    statusFilter && statusFilter !== "all"
      ? { status: statusFilter as any }
      : {};

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * pageSize,
      take:  pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  // ── CSV export ──────────────────────────────────────────────────────────
  if (exportCsv) {
    const header = "ID,الاسم,الهاتف,النشاط,الهدف,الحجم,اللغة,المصدر,الحالة,التاريخ";
    const rows = leads.map(l =>
      [
        l.id, l.name, l.phone, l.business, l.goal, l.volume,
        l.lang, l.source ?? "", l.status,
        new Date(l.createdAt).toISOString(),
      ]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    return new NextResponse("\uFEFF" + csv, {          // BOM for Excel Arabic
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({ leads, total, page, pageSize });
}

// ── PATCH /api/leads — تحديث حالة الـ lead (admin only) ──────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id, status, notes } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const validStatuses = ["NEW", "CONTACTED", "CONVERTED", "LOST"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const updated = await prisma.lead.update({
    where: { id },
    data:  {
      ...(status ? { status } : {}),
      ...(notes  !== undefined ? { notes: notes?.slice(0, 500) ?? null } : {}),
    },
  });

  return NextResponse.json({ ok: true, lead: updated });
}