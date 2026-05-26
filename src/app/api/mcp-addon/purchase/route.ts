// src/app/api/mcp-addon/purchase/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MCP_ADDON_PACKAGES, type McpAddonPackageId } from "@/lib/pricing";

function resolveOwnerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const ownerId = resolveOwnerId(session);

  const sub = await prisma.subscription.findUnique({
    where:  { userId: ownerId },
    select: { plan: true },
  });

  if (!sub || sub.plan === "starter" || sub.plan === "free")
    return NextResponse.json(
      { error: "هذه الميزة متاحة لمشتركي Professional وما فوقها" },
      { status: 403 }
    );

  const body      = await req.json().catch(() => ({}));
  const packageId = body.packageId as McpAddonPackageId | undefined;

  const pkg = MCP_ADDON_PACKAGES.find(p => p.id === packageId);
  if (!pkg)
    return NextResponse.json({ error: "حزمة غير صالحة" }, { status: 400 });

  // commands: -1 = غير محدود — نخصم رقم كبير جداً من العداد
  // بحيث الحساب يظل دايماً تحت الـ limit
  const UNLIMITED_DECREMENT = 999_999;

  await prisma.subscription.update({
    where: { userId: ownerId },
    data:  { mcpCommandsUsedThisMonth: { decrement: UNLIMITED_DECREMENT } },
  });

  return NextResponse.json({
    success: true,
    message: "تمت إضافة أوامر Claude غير محدودة لحسابك لمدة شهر",
  });
}

export async function GET() {
  return NextResponse.json({ packages: MCP_ADDON_PACKAGES });
}