// src/app/api/ai-agent/customer-service/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { requirePermission } from "@/lib/permissions";

async function resolveUserId(session: any): Promise<string | null> {
  const directId = session?.user?.id;
  if (typeof directId === "string" && directId.trim()) return directId;
  const email = session?.user?.email;
  if (typeof email !== "string" || !email.trim()) return null;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  return user?.id ?? null;
}

// ── GET — جلب إعدادات خدمة العملاء والـ FAQs والمشاكل ──
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AI_AGENT_MANAGE");
  if (denied) return denied;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings, faqs, issues] = await Promise.all([
    prisma.customerServiceSettings.findUnique({ where: { userId } }),
    prisma.brandFAQ.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.customerIssue.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return NextResponse.json({
    settings: settings || {
      generalSupportInfo: "",
      supportProcess: "",
      escalationInstructions: "",
    },
    faqs,
    issues,
  });
}

// ── PUT — تحديث / حفظ إعدادات خدمة العملاء (النصوص العامة) ──
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AI_AGENT_MANAGE");
  if (denied) return denied;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guard = await checkFeature(userId, "aiAgent");
  const blocked = guardResponse(guard);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { generalSupportInfo, supportProcess, escalationInstructions } = body;

    const payload = {
      generalSupportInfo: typeof generalSupportInfo === "string" ? generalSupportInfo.trim() : null,
      supportProcess: typeof supportProcess === "string" ? supportProcess.trim() : null,
      escalationInstructions: typeof escalationInstructions === "string" ? escalationInstructions.trim() : null,
    };

    const settings = await prisma.customerServiceSettings.upsert({
      where: { userId },
      update: payload,
      create: { userId, ...payload },
    });

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("[AI-AGENT/CUSTOMER-SERVICE/PUT] Error:", error);
    return NextResponse.json(
      { error: "Failed to save customer service settings" },
      { status: 500 }
    );
  }
}
