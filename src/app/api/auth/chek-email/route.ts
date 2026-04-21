// ═══════════════════════════════════════════════════════════════════════════
// FILE 1: src/app/api/auth/check-email/route.ts
// GET /api/auth/check-email?email=
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("email")?.toLowerCase();
  if (!email) return NextResponse.json({ exists: false });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return NextResponse.json({ exists: !!user });
}