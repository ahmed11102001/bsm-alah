// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus, MessageType, MessageSenderType } from "@/types/enums";
import { inngest } from "@/inngest/client";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { decryptToken } from "@/lib/crypto";

// ─── helper ───────────────────────────────────────────────────────────────────
function uid(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

// ─── GET /api/chat ─────────────────────────────────────────────────────────────
//   ?type=conversations&filter=all|unread|replied|today|archived&search=
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
  const rawFilter = sp.get("filter");
  const filter =
    rawFilter === "unread" ||
      rawFilter === "replied" ||
      rawFilter === "today" ||
      rawFilter === "archived" ||
      rawFilter === "ai_replied"
      ? rawFilter
      : "all";
  const search = sp.get("search") ?? "";
  const isArchivedFilter = filter === "archived";

  // Base where: المحادثات التي فيها رسالة inbound واحدة على الأقل
  // (اللي ردوا على حملات/أتمتة + اللي بعتوا من أنفسهم)
  const where: any = {
    userId,
    isArchived: isArchivedFilter,
    deletedAt: null,
    messages: {
      some: { direction: MessageDirection.inbound, deletedAt: null },
    },
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
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
    take: 100,
    select: {
      id: true, name: true, phone: true,
      isPinned: true, isArchived: true,
      unreadCount: true, lastMessageAt: true,
      voiceAgentEnabled: true, textAiEnabled: true, lastAiRepliedAt: true,
      // آخر رسالة فعلية (inbound أو outbound) — للـ preview الصح
      messages: {
        take: 1,
        where: { deletedAt: null },
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

  // Extra filters — post-query
  let result = contacts;
  if (filter === "replied") {
    // المحادثات التي أنت رددت عليها (عندها outbound message بعد inbound)
    const repliedContactIds = await prisma.message.findMany({
      where: { userId, direction: MessageDirection.outbound, deletedAt: null },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    const s = new Set(repliedContactIds.map((m: { contactId: string }) => m.contactId));
    result = contacts.filter((c: typeof contacts[number]) => s.has(c.id));
  }
  if (filter === "ai_replied") {
    // المحادثات التي رد عليها الـ AI Agent أو Voice Agent
    const aiContactIds = await prisma.message.findMany({
      where: {
        userId,
        direction: MessageDirection.outbound,
        senderType: { in: [MessageSenderType.ai, MessageSenderType.bot] },
      },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    const s = new Set(aiContactIds.map((m: { contactId: string }) => m.contactId));
    result = contacts.filter((c: typeof contacts[number]) => s.has(c.id));
  }

  const conversations = result.map((c: typeof contacts[number]) => ({
    contact: { id: c.id, name: c.name, phone: c.phone },
    lastMessage: c.messages[0] ?? null,
    unreadCount: c._count.messages,
    lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
    isArchived: c.isArchived,
    voiceAgentEnabled: (c as any).voiceAgentEnabled ?? false,
    textAiEnabled: (c as any).textAiEnabled ?? true,
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
      data: { status: MessageStatus.read, readAt: new Date() },
    }),
    prisma.contact.update({
      where: { id: contactId },
      data: { unreadCount: 0 },
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
//   { action: "archive" | "unarchive" | "delete" | "addToAudience", contactId, audienceId? }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);

  const body = await req.json();
  const { action, contactId, audienceId, messageId, emoji } = body;

  if (!contactId) return NextResponse.json({ error: "contactId مطلوب" }, { status: 400 });

  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
  if (!contact) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

  if (action === "archive" || action === "unarchive") {
    await prisma.contact.update({
      where: { id: contactId },
      data: { isArchived: action === "archive" },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    // Soft delete messages + contact
    await prisma.$transaction([
      prisma.message.updateMany({
        where: { contactId, userId },
        data: { deletedAt: new Date() },
      }),
      prisma.contact.update({
        where: { id: contactId },
        data: { deletedAt: new Date() },
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
      data: { audienceId },
    });
    return NextResponse.json({ success: true });
  }

  // ── Toggle Voice Agent ──────────────────────────────────────────────────────
  if (action === "toggleVoiceAgent") {
    const enable = body.enable as boolean;

    // تأكد إن اليوزر عنده ElevenLabs مربوط
    const agentSettings = await prisma.aIAgent.findUnique({
      where: { userId },
      select: { elevenLabsEnabled: true, elevenLabsApiKey: true, elevenLabsAgentId: true },
    });

    if (enable && (!agentSettings?.elevenLabsEnabled || !agentSettings?.elevenLabsApiKey || !agentSettings?.elevenLabsAgentId)) {
      return NextResponse.json(
        { error: "فعّل وأضف ElevenLabs API Key و Agent ID في إعدادات الذكاء الاصطناعي أولاً" },
        { status: 400 }
      );
    }

    await prisma.contact.update({
      where: { id: contactId, userId },
      data: { voiceAgentEnabled: enable },
    });
    return NextResponse.json({ success: true });
  }

  // ── Toggle Text AI Agent ───────────────────────────────────────────────────
  if (action === "toggleTextAi") {
    const enable = body.enable as boolean;

    await prisma.contact.update({
      where: { id: contactId, userId },
      data: { textAiEnabled: enable },
    });
    return NextResponse.json({ success: true });
  }

  // ── React to message ───────────────────────────────────────────────────────
  if (action === "react") {
    if (!messageId || !emoji)
      return NextResponse.json({ error: "messageId و emoji مطلوبان" }, { status: 400 });

    const account = await prisma.whatsAppAccount.findUnique({
      where: { userId },
      select: { phoneNumberId: true, accessToken: true },
    });
    if (!account)
      return NextResponse.json({ error: "حساب واتساب غير مربوط" }, { status: 400 });

    // جيب الـ whatsappId من الرسالة
    const message = await prisma.message.findFirst({
      where: { id: messageId, userId },
      select: { whatsappId: true },
    });
    if (!message?.whatsappId)
      return NextResponse.json({ error: "الرسالة غير موجودة أو لم تُرسَل بعد" }, { status: 404 });

    // ابعت الـ reaction لـ Meta
    const contactObj = await prisma.contact.findFirst({
      where: { id: contactId, userId },
      select: { phone: true },
    });
    if (!contactObj)
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

    const metaRes = await fetch(
      `https://graph.facebook.com/v20.0/${account.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${decryptToken(account.accessToken)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: contactObj.phone,
          type: "reaction",
          reaction: {
            message_id: message.whatsappId,
            emoji,
          },
        }),
      }
    );

    const metaData = await metaRes.json();
    if (metaData.error)
      return NextResponse.json({ error: metaData.error.message }, { status: 400 });

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

  // ── جيب الـ contact والـ account بالتوازي (بدل sequential) ─────
  const [contact, account] = await Promise.all([
    prisma.contact.findFirst({ where: { id: contactId, userId } }),
    prisma.whatsAppAccount.findUnique({ where: { userId } }),
  ]);

  if (!contact) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
  if (!account) return NextResponse.json({ error: "حساب واتساب غير مربوط" }, { status: 400 });

  const isTemplate = type === "template" && !!templateName;
  const msgType: MessageType = isTemplate ? MessageType.template : MessageType.text;
  const msgContent = content ?? `[قالب] ${templateName}`;

  // ── احفظ الرسالة pending + ضيفها في الـ Queue في transaction واحدة ──────
  const result = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        userId, contactId,
        content: msgContent,
        type: msgType,
        direction: MessageDirection.outbound,
        status: MessageStatus.pending,
      },
    });

    // ضيف في الـ Queue — الـ Cron هيبعتها خلال أقل من دقيقة
    const queueItem = await tx.messageQueue.create({
      data: {
        userId,
        whatsappAccountId: account.id,
        phoneNumberId: account.phoneNumberId,
        toPhone: contact.phone,
        contactId,
        messageType: isTemplate ? "template" : "text",
        templateName: isTemplate ? templateName : null,
        templateLang: "ar",
        content: isTemplate ? null : content!,
        scheduledAt: new Date(),
        status: "pending",
        maxAttempts: 3,
        existingMessageId: msg.id,
      },
    });

    // حدّث lastMessageAt فوراً
    await tx.contact.update({
      where: { id: contactId },
      data: { lastMessageAt: new Date() },
    });

    return { msg, queueId: queueItem.id };
  });

  // ✅ بعت event لـ Inngest — هيبعت الرسالة فوراً باستخدام queueId الصحيح
  await inngest.send({
    name: "message/send",
    data: { queueId: result.queueId },
  });

  return NextResponse.json({ success: true, message: result.msg });
}

// ─── Send media (file upload) ─────────────────────────────────────────────────
async function sendMedia(userId: string, req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const contactId = formData.get("contactId") as string | null;
    const fileType = (formData.get("type") as string | null) ?? "document";

    if (!file || !contactId)
      return NextResponse.json({ error: "file و contactId مطلوبان" }, { status: 400 });

    // جيب الـ contact والـ account بالتوازي
    const [contact, account] = await Promise.all([
      prisma.contact.findFirst({ where: { id: contactId, userId } }),
      prisma.whatsAppAccount.findUnique({ where: { userId } }),
    ]);

    if (!contact) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    if (!account) return NextResponse.json({ error: "حساب واتساب غير مربوط" }, { status: 400 });

    // ── Step 1: ارفع الملف على Meta عشان تجيب media_id ──────────────────────
    const uploadForm = new FormData();
    uploadForm.append("file", file, file.name);
    uploadForm.append("messaging_product", "whatsapp");

    const uploadRes = await fetch(
      `https://graph.facebook.com/v20.0/${account.phoneNumberId}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${decryptToken(account.accessToken)}` },
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

    // ── ارفع الملف على Cloudinary وخزّن الـ URL ─────────────────────────────
    let cloudinaryUrl: string | null = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");
      const resource_type: "image" | "video" | "raw" =
        isImage ? "image" : isVideo || isAudio ? "video" : "raw";
      const folder = isImage
        ? "whatsapp-media/images"
        : isAudio
          ? "whatsapp-media/audio"
          : isVideo
            ? "whatsapp-media/video"
            : "whatsapp-media/documents";

      cloudinaryUrl = await uploadToCloudinary(buffer, {
        folder,
        resource_type,
        filename: file.name,
      });
    } catch (uploadErr) {
      console.error("[CHAT] Cloudinary upload failed for outbound media:", uploadErr);
      // fallback: نكمل بدون Cloudinary — الصورة هترسل بس مش هتتحفظ ف Cloudinary
    }

    // map نوع الملف
    const msgTypeMap: Record<string, MessageType> = {
      image: MessageType.image,
      video: MessageType.image,
      audio: MessageType.audio,
      document: MessageType.document,
    };
    const msgType = msgTypeMap[fileType] ?? MessageType.document;
    const metaType = fileType === "video" ? "video" : fileType;

    // ── Step 2: احفظ pending + ضيف في Queue في transaction واحدة ────────────
    const result = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          userId, contactId,
          content: file.name,
          type: msgType,
          direction: MessageDirection.outbound,
          status: MessageStatus.pending,
          // لو الـ Cloudinary upload نجح → حفظ الـ URL، غيره → حفظ الـ Meta ID كـ fallback
          mediaUrl: cloudinaryUrl ?? mediaId,
        },
      });

      // ضيف في Queue
      const queueItem = await tx.messageQueue.create({
        data: {
          userId,
          whatsappAccountId: account.id,
          phoneNumberId: account.phoneNumberId,
          toPhone: contact.phone,
          contactId,
          messageType: "media",
          content: `${metaType}:${mediaId}`,
          scheduledAt: new Date(),
          status: "pending",
          maxAttempts: 3,
          existingMessageId: msg.id,
        },
      });

      await tx.contact.update({
        where: { id: contactId },
        data: { lastMessageAt: new Date() },
      });

      return { msg, queueId: queueItem.id };
    });

    // ✅ بعت event لـ Inngest باستخدام queueId الصحيح
    await inngest.send({
      name: "message/send",
      data: { queueId: result.queueId },
    });

    return NextResponse.json({ success: true, message: result.msg });

  } catch (err: any) {
    console.error("sendMedia error:", err);
    return NextResponse.json({ error: err.message ?? "خطأ في السيرفر" }, { status: 500 });
  }
}