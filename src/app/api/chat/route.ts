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
    rawFilter === "archived"
      ? rawFilter
      : "all";
  const search = sp.get("search") ?? "";
  const isArchivedFilter = filter === "archived";

  // Base where: only contacts that have at least one INBOUND message (replied)
  const where: any = {
    userId,
    isArchived: isArchivedFilter,
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
    isArchived: c.isArchived,
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
//   { action: "archive" | "unarchive" | "delete" | "addToAudience", contactId, audienceId? }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);

  const { action, contactId, audienceId } = await req.json();

  if (!contactId) return NextResponse.json({ error: "contactId مطلوب" }, { status: 400 });

  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
  if (!contact) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

  if (action === "archive" || action === "unarchive") {
    await prisma.contact.update({
      where: { id: contactId },
      data:  { isArchived: action === "archive" },
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

  // ── جيب الـ contact والـ account بالتوازي (بدل sequential) ──────────────
  const [contact, account] = await Promise.all([
    prisma.contact.findFirst({ where: { id: contactId, userId } }),
    prisma.whatsAppAccount.findUnique({ where: { userId } }),
  ]);

  if (!contact) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
  if (!account)  return NextResponse.json({ error: "حساب واتساب غير مربوط" }, { status: 400 });

  const isTemplate = type === "template" && !!templateName;
  const msgType: MessageType = isTemplate ? MessageType.template : MessageType.text;
  const msgContent = content ?? `[قالب] ${templateName}`;

  // ── احفظ الرسالة pending + ضيفها في الـ Queue في transaction واحدة ──────
  const pending = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        userId, contactId,
        content:   msgContent,
        type:      msgType,
        direction: MessageDirection.outbound,
        status:    MessageStatus.pending,
      },
    });

    // ضيف في الـ Queue — الـ Cron هيبعتها خلال أقل من دقيقة
    // نفس الـ rate-limit وbackoff وretry logic بتاع الحملات
    await tx.messageQueue.create({
      data: {
        userId,
        whatsappAccountId: account.id,
        phoneNumberId:     account.phoneNumberId,
        accessTokenSnap:   account.accessToken,
        toPhone:           contact.phone,
        contactId,
        messageType:       isTemplate ? "template" : "text",
        templateName:      isTemplate ? templateName : null,
        templateLang:      "ar",
        content:           isTemplate ? null : content!,
        scheduledAt:       new Date(),
        status:            "pending",
        maxAttempts:       3,
        existingMessageId: msg.id, // ← الـ Cron هيعمل update للرسالة دي مش create جديدة
      },
    });

    // حدّث lastMessageAt فوراً
    await tx.contact.update({
      where: { id: contactId },
      data:  { lastMessageAt: new Date() },
    });

    return msg;
  });

  // ارجع فوراً — الـ UI يشوف الرسالة pending، والـ Cron يبعتها
  return NextResponse.json({ success: true, message: pending });
}

// ─── Send media (file upload) ─────────────────────────────────────────────────
// الـ flow:
//   1. ارفع الملف على Meta فوراً عشان تجيب media_id  (~1-2 ثانية)
//   2. احفظ pending message + ضيف في Queue
//   3. ارجع للـ UI فوراً — الـ Cron يبعت رسالة الإرسال
async function sendMedia(userId: string, req: NextRequest) {
  try {
    const formData  = await req.formData();
    const file      = formData.get("file") as File | null;
    const contactId = formData.get("contactId") as string | null;
    const fileType  = (formData.get("type") as string | null) ?? "document";

    if (!file || !contactId)
      return NextResponse.json({ error: "file و contactId مطلوبان" }, { status: 400 });

    // جيب الـ contact والـ account بالتوازي
    const [contact, account] = await Promise.all([
      prisma.contact.findFirst({ where: { id: contactId, userId } }),
      prisma.whatsAppAccount.findUnique({ where: { userId } }),
    ]);

    if (!contact) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    if (!account)  return NextResponse.json({ error: "حساب واتساب غير مربوط" }, { status: 400 });

    // ── Step 1: ارفع الملف على Meta عشان تجيب media_id ──────────────────────
    // ده لازم يحصل في الـ request — مش ممكن ترفع File object في Queue
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

    // map نوع الملف
    const msgTypeMap: Record<string, MessageType> = {
      image: MessageType.image,
      video: MessageType.image,   // مفيش video enum — بنستخدم image
      audio: MessageType.audio,
      document: MessageType.document,
    };
    const msgType = msgTypeMap[fileType] ?? MessageType.document;
    const metaType = fileType === "video" ? "video" : fileType; // Meta بيقبل video

    // ── Step 2: احفظ pending + ضيف في Queue في transaction واحدة ────────────
    const pending = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          userId, contactId,
          content:   file.name,
          type:      msgType,
          direction: MessageDirection.outbound,
          status:    MessageStatus.pending,
          mediaUrl:  mediaId,   // نحفظ الـ media_id هنا للـ preview في الـ UI
        },
      });

      // ضيف في Queue — الـ Cron هيبعت رسالة الإرسال
      await tx.messageQueue.create({
        data: {
          userId,
          whatsappAccountId: account.id,
          phoneNumberId:     account.phoneNumberId,
          accessTokenSnap:   account.accessToken,
          toPhone:           contact.phone,
          contactId,
          messageType:       "media",
          content:           `${metaType}:${mediaId}`, // نحتفظ بالنوع والـ ID معاً
          scheduledAt:       new Date(),
          status:            "pending",
          maxAttempts:       3,
          existingMessageId: msg.id,
        },
      });

      await tx.contact.update({
        where: { id: contactId },
        data:  { lastMessageAt: new Date() },
      });

      return msg;
    });

    // ارجع فوراً
    return NextResponse.json({ success: true, message: pending });

  } catch (err: any) {
    console.error("sendMedia error:", err);
    return NextResponse.json({ error: err.message ?? "خطأ في السيرفر" }, { status: 500 });
  }
}