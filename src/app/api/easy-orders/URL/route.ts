// src/app/api/easyorder/url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createHmac } from "crypto";
import prisma from "@/lib/prisma";

function userToken(userId: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where:  { email: session.user?.email! },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const base  = process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app";
  const token = userToken(user.id);
  const url   = `${base}/api/easyorder/webhook?uid=${user.id}&token=${token}`;

  return NextResponse.json({ url });
}