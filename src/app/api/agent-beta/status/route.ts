// src/app/api/agent-beta/status/route.ts
// ─── حالة Agent Beta Access للمالك الحالي ─────────────────────────────
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAgentBetaStatus } from "@/lib/plan-guard";

function resolveOwnerId(session: any): string | null {
  if (!session?.user) return null;
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const ownerId = resolveOwnerId(session);
  if (!ownerId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const [beta, sub] = await Promise.all([
    getAgentBetaStatus(ownerId),
    prisma.subscription.findUnique({
      where: { userId: ownerId },
      select: { plan: true },
    }),
  ]);

  const isEnterprise = (sub?.plan as string) === "enterprise";
  return NextResponse.json({
    ...beta,
    plan: (sub?.plan as string) ?? "free",
    isEnterprise,
    // هل يحق له رؤية زر التفعيل؟
    eligible: !isEnterprise && !beta.consumed && !beta.active,
  });
}
