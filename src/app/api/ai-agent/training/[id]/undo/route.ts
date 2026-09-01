// src/app/api/ai-agent/training/[id]/undo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { requirePermission } from "@/lib/permissions";
import { undoTrainingRule } from "@/lib/ai-agent-training";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AI_AGENT_MANAGE");
  if (denied) return denied;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guard = await checkFeature(userId, "aiAgent");
  const blocked = guardResponse(guard);
  if (blocked) return blocked;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const result = await undoTrainingRule(id, userId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updatedRule = await prisma.agentTrainingRule.findUnique({
      where: { id },
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

    return NextResponse.json({ success: true, rule: updatedRule });
  } catch (error: any) {
    console.error("[API/AI-AGENT/TRAINING/UNDO] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to undo training rule" },
      { status: 500 }
    );
  }
}
