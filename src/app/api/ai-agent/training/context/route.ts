// src/app/api/ai-agent/training/context/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

async function resolveUserId(session: any): Promise<string | null> {
  const directId = session?.user?.id;
  if (typeof directId === "string" && directId.trim()) return directId;
  const email = session?.user?.email;
  if (typeof email !== "string" || !email.trim()) return null;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AI_AGENT_MANAGE");
  if (denied) return denied;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const messageId = searchParams.get("messageId");

  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
    select: { id: true, name: true, phone: true },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  let targetMessageTime: Date | null = null;
  let targetMessage: any = null;
  if (messageId) {
    targetMessage = await prisma.message.findFirst({
      where: { id: messageId, contactId, userId },
      select: {
        id: true,
        content: true,
        direction: true,
        senderType: true,
        type: true,
        createdAt: true,
      },
    });
    if (targetMessage) {
      targetMessageTime = targetMessage.createdAt;
    }
  }

  const messages = await prisma.message.findMany({
    where: {
      contactId,
      userId,
      deletedAt: null,
      ...(targetMessageTime ? { createdAt: { lte: targetMessageTime } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      content: true,
      direction: true,
      senderType: true,
      type: true,
      createdAt: true,
    },
  });

  const orderedMessages = messages.reverse().map((m) => ({
    id: m.id,
    role: m.senderType === "ai" || m.direction === "outbound" ? ("assistant" as const) : ("user" as const),
    content: m.content || `[${m.type}]`,
    createdAt: m.createdAt,
    isTarget: m.id === messageId,
  }));

  return NextResponse.json({
    contact,
    targetMessage,
    contextMessages: orderedMessages,
  });
}
