import Link from "next/link";
import prisma from "@/lib/prisma";
import { Calendar, ArrowRight } from "lucide-react";

export const revalidate = 60;

export async function generateMetadata() {
  return {
    title: "المقالات",
    description: "مقالات ونصائح حول أتمتة واتساب وإدارة المتجر",
  };
}

export default async function ArticlesIndexPage() {
  const articles = await prisma.article.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#25D366] transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">المقالات</h1>
        <p className="text-gray-500 mb-10">آخر المنشورات</p>

        {articles.length === 0 ? (
          <p className="text-gray-500">لا توجد مقالات منشورة حالياً.</p>
        ) : (
          <ul className="space-y-10">
            {articles.map((article) => {
              const date = article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : null;
              return (
                <li key={article.id}>
                  <Link href={`/articles/${article.slug}`} className="group block">
                    {article.coverImage && (
                      <div className="rounded-2xl overflow-hidden mb-4 aspect-video bg-gray-100">
                        <img
                          src={article.coverImage}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                        />
                      </div>
                    )}
                    {date && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>{date}</span>
                      </div>
                    )}
                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-[#25D366] transition-colors">
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-gray-600 mt-2 leading-relaxed line-clamp-2">{article.excerpt}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
