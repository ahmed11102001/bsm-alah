import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // ✅ صح

// ===============================
// ENV
// ===============================
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

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

// ===============================
// CREATE + SEND CAMPAIGN
// ===============================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      description,
      templateId,
      numbers,
      message,
      scheduledAt,
      userId,
    } = body;

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json(
        { error: "Numbers required" },
        { status: 400 }
      );
    }

    // ===============================
    // CREATE CAMPAIGN
    // ===============================
    const campaign = await prisma.campaign.create({
      data: {
        name: name || "Unnamed Campaign",
        description,
        templateId,
        userId,
        status: scheduledAt ? "scheduled" : "sending",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        startedAt: scheduledAt ? null : new Date(),
      },
    });

    // لو Scheduled فقط
    if (scheduledAt) {
      return NextResponse.json({
        success: true,
        campaign,
        message: "Campaign scheduled successfully",
      });
    }

    // ===============================
    // SEND NOW
    // ===============================
    let sent = 0;
    let failed = 0;

    for (const phone of numbers) {
      try {
        // ===============================
        // CREATE OR FIND CONTACT
        // ===============================
        let contact = await prisma.contact.findFirst({
          where: { phone },
        });

        if (!contact) {
          const audience = await prisma.audience.findFirst({
            where: { userId },
          });

          if (!audience) {
            throw new Error("No audience found");
          }

          contact = await prisma.contact.create({
            data: {
              phone,
              audienceId: audience.id,
            },
          });
        }

        // ===============================
        // CREATE MESSAGE RECORD
        // ===============================
        const msg = await prisma.message.create({
          data: {
            content: message,
            campaignId: campaign.id,
            contactId: contact.id,
            userId,
            status: "sending",
          },
        });

        // ===============================
        // SEND TO WHATSAPP
        // ===============================
        const response = await fetch(
          `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone,
              type: "text",
              text: {
                body: message,
              },
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error?.message || "WhatsApp send failed");
        }

        await prisma.message.update({
          where: { id: msg.id },
          data: {
            status: "sent",
            sentAt: new Date(),
            whatsappId: data.messages?.[0]?.id,
          },
        });

        sent++;
      } catch (err: any) {
        failed++;

        console.error("Send Error:", err.message);
      }
    }

    // ===============================
    // UPDATE CAMPAIGN FINAL STATUS
    // ===============================
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: failed === numbers.length ? "failed" : "completed",
        sentCount: sent,
        failedCount: failed,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      sent,
      failed,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}