import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import {
  getEmailCampaignById,
  deleteEmailCampaign,
} from "@/lib/email-marketing/campaigns";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET(
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
    const campaign = await getEmailCampaignById(ownerId, id);

    if (!campaign) {
      return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (err: any) {
    console.error("[api/email/campaigns/[id] GET]:", err);
    return NextResponse.json({ error: "فشل جلب تفاصيل الحملة" }, { status: 500 });
  }
}

export async function DELETE(
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

    await deleteEmailCampaign(ownerId, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/email/campaigns/[id] DELETE]:", err);
    return NextResponse.json({ error: "فشل حذف الحملة" }, { status: 500 });
  }
}
