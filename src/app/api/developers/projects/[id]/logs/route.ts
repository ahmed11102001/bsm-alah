import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { getProjectForOwnerOrDeveloper } from "@/lib/dev-project-auth";

// ─── GET /api/developers/projects/[id]/logs?page=&limit=&status= ─────────────
// سجلات OTP الخاصة بالمشروع — المصدر: OtpLog (نفس ما يكتبه otp/send).
// ملحوظة: حالة SENT تُعرض كـ PENDING ("تم الإرسال") لتوافق صفحة السجلات،
// وحقل code لا يُرجع أبدًا (مختزل REDACTED أصلًا + موجود في Redis فقط).
const DISPLAY_STATUSES = ["PENDING", "VERIFIED", "EXPIRED", "FAILED"] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await getProjectForOwnerOrDeveloper(id, session.id);
  if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const statusFilter = (searchParams.get("status") || "all").toUpperCase();

  // PENDING في العرض تشمل SENT (كلاهما "تم الإرسال" ولم يُتحقق بعد)
  let statusWhere: any = undefined;
  if (statusFilter !== "ALL") {
    if (!(DISPLAY_STATUSES as readonly string[]).includes(statusFilter)) {
      return NextResponse.json({ error: "status غير صالح" }, { status: 400 });
    }
    statusWhere = statusFilter === "PENDING"
      ? { in: ["PENDING", "SENT"] }
      : statusFilter;
  }

  const where = { projectId: id, ...(statusWhere ? { status: statusWhere } : {}) };

  const [rows, total, grouped] = await Promise.all([
    prisma.otpLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        phone: true,
        status: true,
        error: true,
        sentAt: true,
        verifiedAt: true,
        expiredAt: true,
        failedAt: true,
        createdAt: true,
      },
    }),
    prisma.otpLog.count({ where }),
    prisma.otpLog.groupBy({
      by: ["status"],
      where: { projectId: id },
      _count: { status: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.status] = g._count.status;

  return NextResponse.json({
    logs: rows.map((r) => ({
      ...r,
      // توحيد العرض: SENT تُعرض PENDING ("تم الإرسال")
      status: r.status === "SENT" ? "PENDING" : r.status,
    })),
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    page,
    stats: {
      PENDING: (counts.PENDING ?? 0) + (counts.SENT ?? 0),
      VERIFIED: counts.VERIFIED ?? 0,
      EXPIRED: counts.EXPIRED ?? 0,
      FAILED: counts.FAILED ?? 0,
    },
  });
}
