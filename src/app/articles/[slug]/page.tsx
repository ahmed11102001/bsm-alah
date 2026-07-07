// src/app/articles/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Calendar, ArrowRight } from "lucide-react";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await prisma.article.findFirst({
    where: { slug, published: true },
    select: { title: true, excerpt: true, coverImage: true },
  });
  if (!article) return { title: "مقال غير موجود" };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: { images: article.coverImage ? [article.coverImage] : [] },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await prisma.article.findFirst({
    where: { slug, published: true },
  });

  if (!article) notFound();

  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("ar-EG", {
      year: "numeric", month: "long", day: "numeric",
    })
    : "";

  return (
    <div className="min-h-screen bg-white" dir="rtl">
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
        <div
          className="prose prose-lg max-w-none text-gray-700 leading-relaxed
            prose-headings:font-bold prose-headings:text-gray-900
            prose-a:text-[#25D366] prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900
            prose-li:my-1
            whitespace-pre-wrap"
        >
          {article.content}
        </div>
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
