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

  const [beta, sub, wa] = await Promise.all([
    getAgentBetaStatus(ownerId),
    prisma.subscription.findUnique({
      where: { userId: ownerId },
      select: { plan: true },
    }),
    // P1: الجاهزية = ربط واتساب فعلي (نفس تعريف hasMetaConnection في الداشبورد)
    prisma.whatsAppAccount.findUnique({
      where: { userId: ownerId },
      select: { phoneNumberId: true, wabaId: true, tokenStatus: true },
    }),
  ]);

  const isEnterprise = (sub?.plan as string) === "enterprise";
  const whatsappConnected = Boolean(
    wa?.phoneNumberId &&
    wa?.wabaId &&
    (wa?.tokenStatus as string) !== "INVALID" &&
    (wa?.tokenStatus as string) !== "EXPIRED"
  );
  return NextResponse.json({
    ...beta,
    plan: (sub?.plan as string) ?? "free",
    isEnterprise,
    whatsappConnected,
    // هل يحق له رؤية زر التفعيل؟ — لا يبدأ العداد إلا والعميل جاهز (ربط ميتا).
    eligible: !isEnterprise && !beta.consumed && !beta.active && whatsappConnected,
  });
}
