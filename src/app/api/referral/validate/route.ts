// src/app/api/referral/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ valid: false, error: "Referral code is required" }, { status: 400 });
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { code },
    select: { id: true, code: true, name: true, status: true },
  });

  if (!affiliate || affiliate.status !== "ACTIVE") {
    return NextResponse.json({ valid: false, error: "Invalid referral code" }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    code: affiliate.code,
    name: affiliate.name,
  });
}
