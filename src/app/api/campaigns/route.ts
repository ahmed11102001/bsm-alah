import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendMessage } from "@/lib/whatsapp";

// ===============================
// GET ALL CAMPAIGNS
// ===============================
export async function GET(req: NextRequest) {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        template: true,
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, name, message, contactIds } = await req.json();

    if (!userId || !name || !message || !Array.isArray(contactIds)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify userId matches session
    if (userId !== (session.user as any).id) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 403 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        userId,
      },
    });

    // Send messages to contacts
    for (const contactId of contactIds) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: { audience: true },
      });

      if (contact && contact.audience && contact.audience.userId === userId) {
        await sendMessage(userId, contact.phone, message);
      }
    }

    return NextResponse.json({ success: true, campaignId: campaign.id });
  } catch (error: any) {
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}