import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import {
  getEmailCampaigns,
  createEmailCampaign,
} from "@/lib/email-marketing/campaigns";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET() {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    const campaigns = await getEmailCampaigns(ownerId);

    return NextResponse.json(campaigns);
  } catch (err: any) {
    console.error("[api/email/campaigns GET]:", err);
    return NextResponse.json({ error: "فشل جلب الحملات" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    const body = await req.json();

    if (!body.name || !body.subject || !body.templateId) {
      return NextResponse.json(
        { error: "يرجى ملء اسم الحملة، عنوان الرسالة، واختيار القالب" },
        { status: 400 }
      );
    }

    const campaign = await createEmailCampaign(ownerId, {
      name: body.name,
      subject: body.subject,
      templateId: body.templateId,
      targetTag: body.targetTag,
    });

    return NextResponse.json(campaign);
  } catch (err: any) {
    console.error("[api/email/campaigns POST]:", err);
    return NextResponse.json({ error: "فشل إنشاء الحملة" }, { status: 500 });
  }
}
