// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus, MessageType } from "@prisma/client";

// ─── helper ───────────────────────────────────────────────────────────────────
function uid(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

async function whatsappAccount(userId: string) {
  return prisma.whatsAppAccount.findUnique({ where: { userId } });
}

// ─── GET /api/chat ─────────────────────────────────────────────────────────────
//   ?type=conversations&filter=all|unread|replied|today&search=
//   ?type=messages&contactId=
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type") ?? "conversations";

  if (type === "messages") return getMessages(userId, sp);
  return getConversations(userId, sp);
}

// ─── GET conversations ────────────────────────────────────────────────────────
async function getConversations(userId: string, sp: URLSearchParams) {
  const filter = sp.get("filter") ?? "all";
  const search = sp.get("search") ?? "";

  // Base where: only contacts that have at least one INBOUND message (replied)
  const where: any = {
    userId,
    isArchived: false,
    deletedAt: null,
    // Filer: only show contacts that have received at least one inbound message
    messages: {
      some: { direction: MessageDirection.inbound },
    },
  };

  if (search) {
    where.OR = [
      { name:  { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  if (filter === "unread") {
    where.unreadCount = { gt: 0 };
  }

  if (filter === "today") {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    where.lastMessageAt = { gte: today };
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
    take: 50,
    select: {
      id: true, name: true, phone: true,
      isPinned: true, isArchived: true,
      unreadCount: true, lastMessageAt: true,
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, content: true, type: true,
          direction: true, status: true, createdAt: true,
        },
      },
      _count: {
        select: {
          messages: {
            where: { direction: MessageDirection.inbound, status: { not: MessageStatus.read } },
          },
        },
      },
    },
  });

  // Extra filter for "replied" — contacts where we sent AND they replied
  let result = contacts;
  if (filter === "replied") {
    const repliedIds = await prisma.message.findMany({
      where: { userId, direction: MessageDirection.inbound },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    const s = new Set(repliedIds.map(m => m.contactId));
    result = contacts.filter(c => s.has(c.id));
  }

  const conversations = result.map(c => ({
    contact: { id: c.id, name: c.name, phone: c.phone },
    lastMessage: c.messages[0] ?? null,
    unreadCount: c._count.messages,
    lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ conversations });
}

// ─── GET messages ─────────────────────────────────────────────────────────────
async function getMessages(userId: string, sp: URLSearchParams) {
  const contactId = sp.get("contactId");
  if (!contactId) return NextResponse.json({ error: "contactId مطلوب" }, { status: 400 });

  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
  if (!contact) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: {
      contactId,
      userId,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true, content: true, type: true,
      direction: true, status: true,
      mediaUrl: true, createdAt: true,
    },
  });

  // Mark inbound as read
  await prisma.$transaction([
    prisma.message.updateMany({
      where: { contactId, userId, direction: MessageDirection.inbound, status: { not: MessageStatus.read } },
      data:  { status: MessageStatus.read, readAt: new Date() },
    }),
    prisma.contact.update({
      where: { id: contactId },
      data:  { unreadCount: 0 },
    }),
  ]);

  return NextResponse.json({ messages });
}

// ─── POST /api/chat ────────────────────────────────────────────────────────────
//   Content-Type: application/json  → text / template / location
//   Content-Type: multipart/form-data → media file (image/video/audio/document)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);

  const ct = req.headers.get("content-type") ?? "";

  // ── Media upload (multipart) ──────────────────────────────────────
  if (ct.includes("multipart/form-data")) {
    return sendMedia(userId, req);
  }

  // ── JSON message ─────────────────────────────────────────────────
  const body = await req.json();
  const { action, contactId, content, type, templateName } = body;

  if (action === "send") {
    return sendMessage(userId, { contactId, content, type, templateName });
  }

  return NextResponse.json({ error: "action غير معروف" }, { status: 400 });
}

// ─── PATCH /api/chat ───────────────────────────────────────────────────────────
//   { action: "archive" | "delete" | "addToAudience", contactId, audienceId? }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);

  const { action, contactId, audienceId } = await req.json();

  if (!contactId) return NextResponse.json({ error: "contactId مطلوب" }, { status: 400 });

  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
  if (!contact) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

  if (action === "archive") {
    await prisma.contact.update({
      where: { id: contactId },
      data:  { isArchived: true },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    // Soft delete messages + contact
    await prisma.$transaction([
      prisma.message.updateMany({
        where: { contactId, userId },
        data:  { deletedAt: new Date() },
      }),
      prisma.contact.update({
        where: { id: contactId },
        data:  { deletedAt: new Date() },
      }),
    ]);
    return NextResponse.json({ success: true });
  }

  if (action === "addToAudience") {
    if (!audienceId) return NextResponse.json({ error: "audienceId مطلوب" }, { status: 400 });

    const audience = await prisma.audience.findFirst({ where: { id: audienceId, userId } });
    if (!audience) return NextResponse.json({ error: "القائمة غير موجودة" }, { status: 404 });

    await prisma.contact.update({
      where: { id: contactId },
      data:  { audienceId },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "action غير معروف" }, { status: 400 });
}

// ─── Send message (text / template) ──────────────────────────────────────────
async function sendMessage(
  userId: string,
  {
    contactId, content, type = "text", templateName,
  }: { contactId: string; content?: string; type?: string; templateName?: string }
) {
  if (!contactId) return NextResponse.json({ error: "contactId مطلوب" }, { status: 400 });
  if (type === "text" && !content?.trim())
    return NextResponse.json({ error: "محتوى الرسالة مطلوب" }, { status: 400 });

  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
  if (!contact) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

  const account = await whatsappAccount(userId);
  if (!account) return NextResponse.json({ error: "حساب واتساب غير مربوط" }, { status: 400 });

  // Build Meta payload
  let metaPayload: object;
  let msgType: MessageType = MessageType.text;

  if (type === "template" && templateName) {
    msgType = MessageType.template;
    metaPayload = {
      messaging_product: "whatsapp",
      to: contact.phone,
      type: "template",
      template: { name: templateName, language: { code: "ar" } },
    };
  } else {
    metaPayload = {
      messaging_product: "whatsapp",
      to: contact.phone,
      type: "text",
      text: { body: content! },
    };
  }

  // Create pending record first
  const pending = await prisma.message.create({
    data: {
      userId, contactId,
      content: content ?? `[قالب] ${templateName}`,
      type: msgType,
      direction: MessageDirection.outbound,
      status: MessageStatus.pending,
    },
  });

  // Send to Meta
  const metaRes = await fetch(
    `https://graph.facebook.com/v20.0/${account.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metaPayload),
    }
  );

  const metaData = await metaRes.json();

  if (metaData.error) {
    await prisma.message.update({
      where: { id: pending.id },
      data: { status: MessageStatus.failed, error: metaData.error.message },
    });
    return NextResponse.json({ error: metaData.error.message }, { status: 400 });
  }

  const updated = await prisma.message.update({
    where: { id: pending.id },
    data: {
      status: MessageStatus.sent,
      whatsappId: metaData.messages?.[0]?.id,
      sentAt: new Date(),
    },
  });

  await prisma.contact.update({
    where: { id: contactId },
    data: { lastMessageAt: new Date() },
  });

  return NextResponse.json({ success: true, message: updated });
}

// ─── Send media (file upload) ─────────────────────────────────────────────────
async function sendMedia(userId: string, req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const contactId= formData.get("contactId") as string | null;
    const fileType = (formData.get("type") as string | null) ?? "document";

    if (!file || !contactId)
      return NextResponse.json({ error: "file و contactId مطلوبان" }, { status: 400 });

    const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
    if (!contact) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

    const account = await whatsappAccount(userId);
    if (!account) return NextResponse.json({ error: "حساب واتساب غير مربوط" }, { status: 400 });

    // Step 1: Upload media to Meta
    const uploadForm = new FormData();
    uploadForm.append("file", file, file.name);
    uploadForm.append("messaging_product", "whatsapp");

    const uploadRes = await fetch(
      `https://graph.facebook.com/v20.0/${account.phoneNumberId}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${account.accessToken}` },
        body: uploadForm,
      }
    );
    const uploadData = await uploadRes.json();

    if (uploadData.error || !uploadData.id) {
      return NextResponse.json(
        { error: uploadData.error?.message ?? "فشل رفع الملف" },
        { status: 400 }
      );
    }

    const mediaId = uploadData.id as string;

    // Step 2: Map type to Meta type
    const metaTypeMap: Record<string, string> = {
      image: "image", video: "video", audio: "audio", document: "document",
    };
    const metaType = metaTypeMap[fileType] ?? "document";

    // Step 3: Send the media message
    const msgPayload: any = {
      messaging_product: "whatsapp",
      to: contact.phone,
      type: metaType,
      [metaType]: { id: mediaId },
    };

    const sendRes = await fetch(
      `https://graph.facebook.com/v20.0/${account.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(msgPayload),
      }
    );
    const sendData = await sendRes.json();

    if (sendData.error) {
      return NextResponse.json({ error: sendData.error.message }, { status: 400 });
    }

    const msgTypeMap: Record<string, MessageType> = {
      image: MessageType.image, video: MessageType.image,
      audio: MessageType.audio, document: MessageType.document,
    };

    const saved = await prisma.message.create({
      data: {
        userId, contactId,
        content: file.name,
        type: msgTypeMap[fileType] ?? MessageType.document,
        direction: MessageDirection.outbound,
        status: MessageStatus.sent,
        whatsappId: sendData.messages?.[0]?.id,
        mediaUrl: mediaId,
        sentAt: new Date(),
      },
    });

    await prisma.contact.update({
      where: { id: contactId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ success: true, message: saved });
  } catch (err: any) {
    console.error("sendMedia error:", err);
    return NextResponse.json({ error: err.message ?? "خطأ في السيرفر" }, { status: 500 });
  }
}