import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ التصحيح: دعم حسابات الفريق
    const rawUserId = session.user.id;
    const parentId = (session.user as any).parentId;
    const userId = parentId ?? rawUserId;

    const body = await req.json();

    const {
      contactId,
      content,
      type = "text",
      templateId
    } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId required" },
        { status: 400 }
      );
    }

    if (type === "text" && !content?.trim()) {
      return NextResponse.json(
        { error: "Message content required" },
        { status: 400 }
      );
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId  // ✅ استخدم userId المصحح
      }
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const account = await prisma.whatsappAccount.findUnique({
      where: { userId }  // ✅ استخدم userId المصحح
    });

    if (!account) {
      return NextResponse.json(
        { error: "WhatsApp not connected" },
        { status: 400 }
      );
    }

    // create pending message first
    const pendingMessage = await prisma.message.create({
      data: {
        userId,
        contactId,
        content,
        type,
        direction: "outbound",
        status: "pending",
      }
    });

    const payload = type === "template"
      ? {
          messaging_product: "whatsapp",
          to: contact.phone,
          type: "template",
          template: {
            name: templateId,
            language: { code: "ar" }
          }
        }
      : {
          messaging_product: "whatsapp",
          to: contact.phone,
          type: "text",
          text: { body: content }
        };

    const metaRes = await fetch(
      `https://graph.facebook.com/v20.0/${account.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const meta = await metaRes.json();

    if (meta.error) {
      await prisma.message.update({
        where: { id: pendingMessage.id },
        data: { status: "failed" }
      });

      return NextResponse.json(
        { error: meta.error.message },
        { status: 400 }
      );
    }

    const updated = await prisma.message.update({
      where: { id: pendingMessage.id },
      data: {
        status: "sent",
        whatsappId: meta.messages?.[0]?.id,
        sentAt: new Date()
      }
    });

    await prisma.contact.update({
      where: { id: contactId },
      data: { lastMessageAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: updated
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}