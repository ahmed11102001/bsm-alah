// src/app/api/ai-agent/training/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { TrainingRuleStatus } from "@prisma/client";

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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AI_AGENT_MANAGE");
  if (denied) return denied;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");

  const where: any = { userId };
  if (statusParam && ["pending", "approved", "rejected"].includes(statusParam)) {
    where.status = statusParam as TrainingRuleStatus;
  }

  const rules = await prisma.agentTrainingRule.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });

  return NextResponse.json({ rules });
}
