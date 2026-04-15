import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: (session.user as any).id,
      },
      include: {
        template: true,
        messages: {
          take: 5,
          orderBy: { createdAt: "desc" }
        },
        _count: { select: { messages: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("❌ Database Error:", error);
    return NextResponse.json({ error: "فشل تحميل الحملات" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { name, templateId, contacts, scheduledAt } = await req.json();

    if (!name || !contacts || !Array.isArray(contacts)) {
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }

    // إنشاء الحملة
    const campaign = await prisma.campaign.create({
      data: {
        name,
        status: scheduledAt ? "scheduled" : "pending",
        userId: (session.user as any).id,
        user: {
          connect: { id: (session.user as any).id }
        },
        templateId: templateId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      }
    });

    // إنشاء الرسائل لكل جهة اتصال
    const messages = contacts.map((contactId: string) => ({
      userId: (session.user as any).id,
      campaignId: campaign.id,
      contactId,
      content: "", // سيتم تحديثها لاحقًا
    }));

    await prisma.message.createMany({
      data: messages
    });

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("❌ Database Error:", error);
    return NextResponse.json({ error: "فشل إنشاء الحملة" }, { status: 500 });
  }
}