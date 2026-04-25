import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

function uid(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

function extensionFromContentType(contentType: string) {
  const type = contentType.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
  };
  return map[type] ?? "bin";
}

function sanitizeFilename(name: string) {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const userId = uid(session);
    const { mediaId: rawMediaId } = await params;
    const mediaId = decodeURIComponent(rawMediaId);

    const message = await prisma.message.findFirst({
      where: {
        userId,
        mediaUrl: mediaId,
        deletedAt: null,
      },
      select: {
        id: true,
        content: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: "الوسيط غير موجود" }, { status: 404 });
    }

    const account = await prisma.whatsAppAccount.findUnique({
      where: { userId },
      select: { accessToken: true },
    });

    if (!account) {
      return NextResponse.json({ error: "حساب واتساب غير مربوط" }, { status: 400 });
    }

    const mediaInfoRes = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(mediaId)}`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
      cache: "no-store",
    });

    if (!mediaInfoRes.ok) {
      const errBody = await mediaInfoRes.text();
      return NextResponse.json(
        { error: "فشل قراءة بيانات الوسيط", details: errBody },
        { status: 502 }
      );
    }

    const mediaInfo = await mediaInfoRes.json();
    const upstreamUrl = mediaInfo?.url as string | undefined;

    if (!upstreamUrl) {
      return NextResponse.json({ error: "رابط الوسيط غير متاح" }, { status: 502 });
    }

    const mediaRes = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
      cache: "no-store",
    });

    if (!mediaRes.ok || !mediaRes.body) {
      const errBody = await mediaRes.text();
      return NextResponse.json(
        { error: "فشل تحميل الوسيط", details: errBody },
        { status: 502 }
      );
    }

    const contentType = mediaRes.headers.get("content-type") ?? "application/octet-stream";
    const ext = extensionFromContentType(contentType);
    const requestedName = req.nextUrl.searchParams.get("filename");
    const baseName = sanitizeFilename(requestedName || message.content || `media-${message.id}`);
    const fileName = baseName.includes(".") ? baseName : `${baseName}.${ext}`;

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "private, max-age=300");

    if (req.nextUrl.searchParams.get("download") === "1") {
      headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    } else {
      headers.set("Content-Disposition", "inline");
    }

    return new NextResponse(mediaRes.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("chat media proxy error:", error);
    return NextResponse.json({ error: "حدث خطأ في تحميل الوسيط" }, { status: 500 });
  }
}
