// src/app/api/admin/protection-claims/[id]/audit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runProtectionAudit } from "@/lib/protection/audit-engine";

async function requireSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper || !session.user.id) return null;
  return session;
}

// ─── POST /api/admin/protection-claims/[id]/audit ─────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSuper();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const claimId = params.id;

  try {
    const result = await runProtectionAudit(claimId, session.user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error running protection audit:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute audit" },
      { status: 500 }
    );
  }
}
