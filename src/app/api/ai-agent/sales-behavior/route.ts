import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { requirePermission } from "@/lib/permissions";

const defaults = {
  goal: "balanced" as const,
  suggestAlternatives: true,
  suggestUpsell: true,
  suggestCrossSell: false,
  suggestDiscounts: false,
  maxSuggestedProducts: 1,
};

async function resolveUserId(session: any): Promise<string | null> {
  const directId = session?.user?.id;
  if (typeof directId === "string" && directId.trim()) return directId;
  const email = session?.user?.email;
  if (typeof email !== "string" || !email.trim()) return null;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  return user?.id ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "AI_AGENT_MANAGE");

  if (denied) return denied;
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await prisma.salesBehaviorSettings.findUnique({ where: { userId } });
  return NextResponse.json(settings ?? defaults);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "AI_AGENT_MANAGE");

  if (denied) return denied;
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = guardResponse(await checkFeature(userId, "aiAgent"));
  if (blocked) return blocked;
  const body = await req.json().catch(() => ({}));
  const goal = body?.goal;
  const maxSuggestedProducts = Number(body?.maxSuggestedProducts);
  if (!["customer_service", "balanced", "sales_focused"].includes(goal)) return NextResponse.json({ error: "Invalid sales goal" }, { status: 400 });
  if (!Number.isInteger(maxSuggestedProducts) || maxSuggestedProducts < 1 || maxSuggestedProducts > 3) return NextResponse.json({ error: "maxSuggestedProducts must be between 1 and 3" }, { status: 400 });
  const payload = {
    goal,
    suggestAlternatives: Boolean(body.suggestAlternatives),
    suggestUpsell: Boolean(body.suggestUpsell),
    suggestCrossSell: Boolean(body.suggestCrossSell),
    suggestDiscounts: Boolean(body.suggestDiscounts),
    maxSuggestedProducts,
  };
  const result = await prisma.salesBehaviorSettings.upsert({ where: { userId }, update: payload, create: { userId, ...payload } });
  return NextResponse.json(result);
}
