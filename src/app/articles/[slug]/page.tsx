// src/app/articles/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Calendar, ArrowRight } from "lucide-react";

import ArticleMarkdown from "@/components/ArticleMarkdown";

export const revalidate = 60;

function getPossibleSlugs(rawSlug: string): string[] {
  const list = new Set<string>();
  list.add(rawSlug);
  try {
    const decoded = decodeURIComponent(rawSlug);
    list.add(decoded);
    list.add(decoded.trim());
  } catch {}
  try {
    const encoded = encodeURIComponent(rawSlug);
    list.add(encoded);
  } catch {}
  return Array.from(list);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const possibleSlugs = getPossibleSlugs(rawSlug);
  const article = await prisma.article.findFirst({
    where: { slug: { in: possibleSlugs }, published: true },
    select: { title: true, excerpt: true, coverImage: true, publishedAt: true, slug: true },
  });
  if (!article) return { title: "مقال غير موجود" };
  const canonicalSlug = encodeURI(article.slug);
  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: `https://aiwni.com/articles/${canonicalSlug}`,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      url: `https://aiwni.com/articles/${canonicalSlug}`,
      locale: "ar_EG",
      type: "article",
      ...(article.publishedAt && {
        publishedTime: new Date(article.publishedAt).toISOString(),
      }),
      images: article.coverImage ? [article.coverImage] : [],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const possibleSlugs = getPossibleSlugs(rawSlug);
  const article = await prisma.article.findFirst({
    where: { slug: { in: possibleSlugs }, published: true },
  });

  if (!article) notFound();

  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("ar-EG", {
      year: "numeric", month: "long", day: "numeric",
    })
    : "";

  // ── SEO: JSON-LD structured data ──────────────────────────────────────────────
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    ...(article.excerpt && { description: article.excerpt }),
    ...(article.coverImage && { image: article.coverImage }),
    ...(article.publishedAt && {
      datePublished: new Date(article.publishedAt).toISOString(),
    }),
    ...(article.updatedAt && {
      dateModified: new Date(article.updatedAt).toISOString(),
    }),
    url: `https://aiwni.com/articles/${encodeURI(article.slug)}`,
    publisher: {
      "@type": "Organization",
      name: "Wani",
      url: "https://aiwni.com",
      logo: "https://aiwni.com/favicon.svg",
    },
    mainEntityOfPage: `https://aiwni.com/articles/${encodeURI(article.slug)}`,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: "https://aiwni.com" },
      { "@type": "ListItem", position: 2, name: "المقالات", item: "https://aiwni.com/articles" },
      { "@type": "ListItem", position: 3, name: article.title, item: `https://aiwni.com/articles/${encodeURI(article.slug)}` },
    ],
  };

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* SEO: JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Back */}
      <div className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Link href="/articles" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#25D366] transition-colors">
            <ArrowRight className="w-4 h-4" />
            العودة للمقالات
          </Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Cover */}
        {article.coverImage && (
          <div className="rounded-2xl overflow-hidden mb-10 aspect-video">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Meta */}
        {date && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Calendar className="w-4 h-4" />
            <span>{date}</span>
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
          {article.title}
        </h1>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-lg text-gray-500 leading-relaxed mb-8 border-r-4 border-[#25D366] pr-4">
            {article.excerpt}
          </p>
        )}

        {/* Divider */}
        <hr className="border-gray-100 mb-8" />

        {/* Content */}
        <ArticleMarkdown content={article.content} />
      </article>

      {/* CTA */}
      <div className="bg-gray-900 text-white py-16 px-4 mt-16">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">جاهز تبدأ مع وني ؟ </h2>
          <p className="text-gray-400 mb-6">أتمتة الرسائل وربط متجرك بخطوات بسيطة</p>
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20b557] text-white px-6 py-3 rounded-xl font-semibold transition"
          >
            ابدأ مجاناً الآن
          </Link>
        </div>
      </div>
    </div>
  );
}
