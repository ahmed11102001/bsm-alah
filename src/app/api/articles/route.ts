// src/app/api/articles/route.ts  — public endpoint
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const articles = await prisma.article.findMany({
    where:   { published: true },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true, title: true, slug: true,
      excerpt: true, coverImage: true, publishedAt: true,
    },
  });
  return NextResponse.json(articles);
}
