import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import { executeCampaignSending } from "@/lib/email-marketing/campaigns";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    const { id } = await params;

    const result = await executeCampaignSending(ownerId, id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/email/campaigns/[id]/send POST]:", err);
    return NextResponse.json(
      { error: err?.message || "فشل إطلاق الحملة البريدية" },
      { status: 500 }
    );
  }
}
