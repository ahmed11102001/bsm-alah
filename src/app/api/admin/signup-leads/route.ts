// GET /api/admin/signup-leads — عرض التسجيلات الناقصة للأدمن (isSuper فقط)
// Query: status (all|PENDING|REMINDED|CONVERTED) — source (all|DASHBOARD|PORTAL)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const VALID_STATUSES = ["PENDING", "REMINDED", "CONVERTED"] as const;
const VALID_SOURCES = ["DASHBOARD", "PORTAL"] as const;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(req.url).searchParams;
  const statusFilter = searchParams.get("status");
  const sourceFilter = searchParams.get("source");

  const where: Record<string, unknown> = {};
  if (statusFilter && (VALID_STATUSES as readonly string[]).includes(statusFilter)) {
    where.status = statusFilter;
  }
  if (sourceFilter && (VALID_SOURCES as readonly string[]).includes(sourceFilter)) {
    where.source = sourceFilter;
  }

  const [rows, total] = await Promise.all([
    prisma.signupLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        email: true,
        name: true,
        source: true,
        locale: true,
        stage: true,
        phone: true,
        status: true,
        reminderSentAt: true,
        convertedAt: true,
        createdAt: true,
      },
    }),
    prisma.signupLead.count({ where }),
  ]);

  return NextResponse.json({ leads: rows, total });
}
