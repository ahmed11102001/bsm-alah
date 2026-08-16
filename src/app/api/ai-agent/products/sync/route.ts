// src/app/api/ai-agent/products/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { inngest } from "@/inngest/client";
import { requirePermission } from "@/lib/permissions";

async function resolveUserId(session: any): Promise<string | null> {
  const directId = session?.user?.id;
  if (typeof directId === "string" && directId.trim()) return directId;
  const email = session?.user?.email;
  if (typeof email !== "string" || !email.trim()) return null;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  return user?.id ?? null;
}

// ── POST — طلب مزامنة فورية للمنتجات (عبر Inngest) ──
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "AI_AGENT_MANAGE");

  if (denied) return denied;
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guard = await checkFeature(userId, "aiAgent");
  const blocked = guardResponse(guard);
  if (blocked) return blocked;

  try {
    const body = await req.json().catch(() => ({}));
    const source = body?.source || "all";
    if (!["shopify", "easyorders", "woocommerce", "all"].includes(source)) return NextResponse.json({ error: "Invalid source" }, { status: 400 });

    await inngest.send({
      name: "product/sync.requested",
      data: { userId, source },
    });

    return NextResponse.json({
      success: true,
      message: "تم بدء مزامنة المنتجات في الخلفية",
    });
  } catch (error: any) {
    console.error("[ProductSync/Trigger] Error sending Inngest event", error);
    return NextResponse.json({ error: "فشل بدء المزامنة" }, { status: 500 });
  }
}
