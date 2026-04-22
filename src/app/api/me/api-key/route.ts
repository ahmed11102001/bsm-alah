// src/app/api/me/api-key/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { checkFeature, guardResponse } from "@/lib/plan-guard";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ✅ Guard: API Access (Enterprise فقط)
  const check = await checkFeature(session.user.id, "apiAccess");
  const block = guardResponse(check);
  if (block) return block;

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { apiKey: true },
  });

  return NextResponse.json({ apiKey: user?.apiKey || "" });
}

// إنشاء / تجديد الـ API Key
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ✅ Guard: API Access
  const check = await checkFeature(session.user.id, "apiAccess");
  const block = guardResponse(check);
  if (block) return block;

  const newKey = `bsm_${crypto.randomBytes(24).toString("hex")}`;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data:  { apiKey: newKey },
    select: { apiKey: true },
  });

  return NextResponse.json({ apiKey: user.apiKey });
}