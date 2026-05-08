// src/app/api/admin/articles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) return null;
  return session;
}

function toSlug(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .slice(0, 80);
}

// ── GET — جيب كل المقالات ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await requireSuper();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, slug: true, excerpt: true,
      coverImage: true, published: true, publishedAt: true, createdAt: true,
    },
  });

  return NextResponse.json(articles);
}

// ── POST — إنشاء مقال جديد ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await requireSuper();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, content, excerpt, coverImage, published, slug: rawSlug } = await req.json();

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "العنوان والمحتوى مطلوبان" }, { status: 400 });
  }

  const slug = rawSlug?.trim() || toSlug(title);

  // تحقق من عدم تكرار الـ slug
  const exists = await prisma.article.findUnique({ where: { slug } });
  if (exists) {
    return NextResponse.json({ error: "هذا الـ slug مستخدم بالفعل" }, { status: 409 });
  }

  const article = await prisma.article.create({
    data: {
      title: title.trim(),
      slug,
      content: content.trim(),
      excerpt: excerpt?.trim() || null,
      coverImage: coverImage?.trim() || null,
      published: !!published,
      publishedAt: published ? new Date() : null,
    },
  });

  return NextResponse.json(article, { status: 201 });
}

// ── PATCH — تحديث مقال ───────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await requireSuper();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, title, content, excerpt, coverImage, published, slug: rawSlug } = await req.json();
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  const current = await prisma.article.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "المقال غير موجود" }, { status: 404 });

  const slug = rawSlug?.trim() || (title ? toSlug(title) : current.slug);

  // تحقق من slug إذا اتغير
  if (slug !== current.slug) {
    const exists = await prisma.article.findUnique({ where: { slug } });
    if (exists) return NextResponse.json({ error: "هذا الـ slug مستخدم بالفعل" }, { status: 409 });
  }

  const wasPublished = current.published;
  const nowPublished = published !== undefined ? !!published : current.published;

  const updated = await prisma.article.update({
    where: { id },
    data: {
      title:       title?.trim()       ?? current.title,
      slug,
      content:     content?.trim()     ?? current.content,
      excerpt:     excerpt?.trim()     ?? current.excerpt,
      coverImage:  coverImage?.trim()  ?? current.coverImage,
      published:   nowPublished,
      publishedAt: nowPublished && !wasPublished ? new Date() : current.publishedAt,
    },
  });

  return NextResponse.json(updated);
}

// ── DELETE — حذف مقال ────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await requireSuper();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  await prisma.article.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
