// src/app/api/ai-agent/guardrails/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";

async function resolveUserId(session: any): Promise<string | null> {
  const directId = session?.user?.id;
  if (typeof directId === "string" && directId.trim()) return directId;
  const email = session?.user?.email;
  if (typeof email !== "string" || !email.trim()) return null;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  return user?.id ?? null;
}

// ── GET — جيب الـ guardrails ──
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guardrails = await prisma.aIGuardrail.findUnique({ where: { userId } });

  return NextResponse.json(guardrails ?? {
    noInventPrices: true,
    noInventProducts: true,
    noMentionCompetitors: false,
    noSharePersonal: true,
    alwaysHandoffComplaints: true,
    maxReplyLines: 3,
    customRules: null,
  });
}

// ── PUT — حدّث الـ guardrails (upsert) ──
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guard = await checkFeature(userId, "aiAgent");
  const blocked = guardResponse(guard);
  if (blocked) return blocked;

  const body = await req.json();
  const {
    noInventPrices,
    noInventProducts,
    noMentionCompetitors,
    noSharePersonal,
    alwaysHandoffComplaints,
    maxReplyLines,
    customRules,
  } = body;

  const payload = {
    noInventPrices: typeof noInventPrices === "boolean" ? noInventPrices : true,
    noInventProducts: typeof noInventProducts === "boolean" ? noInventProducts : true,
    noMentionCompetitors: typeof noMentionCompetitors === "boolean" ? noMentionCompetitors : false,
    noSharePersonal: typeof noSharePersonal === "boolean" ? noSharePersonal : true,
    alwaysHandoffComplaints: typeof alwaysHandoffComplaints === "boolean" ? alwaysHandoffComplaints : true,
    maxReplyLines: typeof maxReplyLines === "number" ? Math.max(1, Math.min(10, maxReplyLines)) : 3,
    customRules: typeof customRules === "string" ? customRules.trim() || null : null,
  };

  const result = await prisma.aIGuardrail.upsert({
    where: { userId },
    update: payload,
    create: { userId, ...payload },
  });

  return NextResponse.json(result);
}
