// src/app/api/referral/history/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAffiliateHistory } from "@/lib/referral/service";

function resolveOwnerId(session: any): string {
  return (session?.user?.parentId as string | null) ?? (session?.user?.id as string);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);
  const history = await getAffiliateHistory(ownerId);

  return NextResponse.json({ history });
}
