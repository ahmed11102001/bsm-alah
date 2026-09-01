import Link from "next/link";
import { Calendar, ArrowRight, Tag } from "lucide-react";
import { getAllArticleMetas } from "@/lib/articles";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "مقالات ونصائح واتساب للأعمال والتسويق الإلكتروني",
  description:
    "مقالات ودلائل عملية حول التسويق عبر واتساب، أتمتة المبيعات، واستراتيجيات التجارة الإلكترونية — من فريق وني.",
  alternates: {
    canonical: "https://aiwni.com/articles",
  },
  openGraph: {
    title: "مقالات واتساب للأعمال | Wani",
    description:
      "نصائح عملية ودلائل شاملة لتنمية أعمالك عبر واتساب: حملات، أتمتة، واستراتيجيات مبيعات.",
    url: "https://aiwni.com/articles",
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "مقالات واتساب للأعمال | Wani",
    description:
      "نصائح عملية ودلائل شاملة لتنمية أعمالك عبر واتساب.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ArticlesIndexPage() {
  const articles = getAllArticleMetas();

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
              const date = new Date(article.publishedAt).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
              return (
                <li key={article.slug}>
                  <Link href={`/articles/${article.slug}`} className="group block">
                    {article.coverImage && (
                      <div className="rounded-2xl overflow-hidden mb-4 aspect-video bg-gray-100">
                        <img
                          src={article.coverImage}
                          alt={article.coverImageAlt || article.title}
                          className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{date}</span>
                      </div>
                      {article.category && (
                        <div className="flex items-center gap-1 text-[#25D366]">
                          <Tag className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{article.category}</span>
                        </div>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-[#25D366] transition-colors">
                      {article.title}
                    </h2>
                    {(article.excerpt || article.description) && (
                      <p className="text-gray-600 mt-2 leading-relaxed line-clamp-2">
                        {article.excerpt || article.description}
                      </p>
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
