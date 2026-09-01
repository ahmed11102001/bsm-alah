/**
 * src/lib/articles.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for reading Markdown (.md) articles from the filesystem.
 *
 * All public-facing article pages, sitemap, and metadata generation
 * MUST use these functions instead of accessing the filesystem directly.
 *
 * Architecture note: The interface (Article type, getAllArticles, etc.)
 * is designed so that switching the data source from filesystem to Prisma
 * in the future requires changes ONLY in this file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

// ─── Constants ────────────────────────────────────────────────────────────────

const ARTICLES_DIR = path.join(process.cwd(), "src", "content", "articles");
const SITE_URL = "https://aiwni.com";

// ─── Article Types ────────────────────────────────────────────────────────────

export interface ArticleRobots {
  index: boolean;
  follow: boolean;
}

export interface Article {
  /** URL-safe unique identifier (lowercase English letters, numbers, and hyphens only) */
  slug: string;

  /** Article title (required) */
  title: string;

  /** Meta description for SEO (required) */
  description: string;

  /** Short excerpt for article cards/listings */
  excerpt: string | null;

  /** Primary SEO keywords */
  keywords: string[];

  /** Article category (e.g. "whatsapp-marketing") */
  category: string | null;

  /** Tags for filtering/grouping */
  tags: string[];

  /** Author name */
  author: string;

  /** ISO date string — when the article was first published (required, no fallback) */
  publishedAt: string;

  /** ISO date string — when the article was last updated */
  updatedAt: string | null;

  /** Cover image URL */
  coverImage: string | null;

  /** Alt text for the cover image */
  coverImageAlt: string | null;

  /** Whether this article should appear in "featured" sections */
  featured: boolean;

  /** Robots directive (default: { index: true, follow: true }) */
  robots: ArticleRobots;

  /** Canonical URL override */
  canonical: string | null;

  /** Open Graph title override */
  ogTitle: string | null;

  /** Open Graph description override */
  ogDescription: string | null;

  /** Open Graph image override */
  ogImage: string | null;

  /** Estimated reading time in minutes */
  readingTime: number;

  /** Slugs of related articles for internal linking */
  relatedArticles: string[];

  /** Raw Markdown content body (without frontmatter) */
  content: string;
}

/** Article metadata without the full content body — used in listings */
export type ArticleMeta = Omit<Article, "content">;

// ─── Frontmatter Validation ───────────────────────────────────────────────────

interface FrontmatterValidationResult {
  valid: boolean;
  errors: string[];
}

const REQUIRED_FIELDS = ["title", "slug", "description", "publishedAt"] as const;

function validateFrontmatter(
  data: Record<string, unknown>,
  filePath: string
): FrontmatterValidationResult {
  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const value = data[field];
    if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  // 1. Validate publishedAt is a valid date (NO FALLBACK)
  if (data.publishedAt !== undefined && data.publishedAt !== null) {
    const dateStr = String(data.publishedAt).trim();
    if (!dateStr) {
      errors.push(`"publishedAt" cannot be empty`);
    } else {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid date format for "publishedAt": "${data.publishedAt}". Expected ISO format (e.g. "YYYY-MM-DD")`);
      }
    }
  }

  // 2. Validate updatedAt if provided
  if (data.updatedAt !== undefined && data.updatedAt !== null && String(data.updatedAt).trim()) {
    const date = new Date(String(data.updatedAt).trim());
    if (isNaN(date.getTime())) {
      errors.push(`Invalid date format for "updatedAt": "${data.updatedAt}". Expected ISO format (e.g. "YYYY-MM-DD")`);
    }
  }

  // 3. Validate slug: English letters + numbers + hyphens ONLY
  if (typeof data.slug === "string" && data.slug.trim()) {
    const slug = data.slug.trim();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      errors.push(
        `Slug "${slug}" is invalid. Slug must contain only lowercase English letters, numbers, and hyphens (e.g. "whatsapp-marketing-guide").`
      );
    }
  }

  if (errors.length > 0) {
    console.error(
      `\n❌ Invalid article frontmatter:\n   ${filePath}\n   ${errors.join("\n   ")}\n`
    );
  }

  return { valid: errors.length === 0, errors };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function parseISOStrict(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function parseRobots(value: unknown): ArticleRobots {
  const defaultRobots: ArticleRobots = { index: true, follow: true };
  if (!value) return defaultRobots;

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    return {
      index: typeof obj.index === "boolean" ? obj.index : true,
      follow: typeof obj.follow === "boolean" ? obj.follow : true,
    };
  }

  if (typeof value === "string") {
    const lower = value.toLowerCase();
    return {
      index: !lower.includes("noindex"),
      follow: !lower.includes("nofollow"),
    };
  }

  return defaultRobots;
}

// ─── Core Loader ──────────────────────────────────────────────────────────────

function loadArticleFromFile(filePath: string): Article | null {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const validation = validateFrontmatter(data, filePath);
  if (!validation.valid) {
    throw new Error(
      `Invalid article frontmatter in ${filePath}:\n${validation.errors.join("\n")}`
    );
  }

  const slug = String(data.slug).trim();
  const publishedAtISO = parseISOStrict(data.publishedAt);
  if (!publishedAtISO) {
    throw new Error(`Failed to parse publishedAt date for ${filePath}`);
  }

  const updatedAtISO = data.updatedAt ? parseISOStrict(data.updatedAt) : null;

  return {
    slug,
    title: String(data.title).trim(),
    description: String(data.description).trim(),
    excerpt: data.excerpt ? String(data.excerpt).trim() : null,
    keywords: parseStringArray(data.keywords),
    category: data.category ? String(data.category).trim() : null,
    tags: parseStringArray(data.tags),
    author: data.author ? String(data.author).trim() : "Wani",
    publishedAt: publishedAtISO,
    updatedAt: updatedAtISO,
    coverImage: data.coverImage ? String(data.coverImage).trim() : null,
    coverImageAlt: data.coverImageAlt ? String(data.coverImageAlt).trim() : null,
    featured: data.featured === true,
    robots: parseRobots(data.robots),
    canonical: data.canonical ? String(data.canonical).trim() : null,
    ogTitle: data.ogTitle ? String(data.ogTitle).trim() : null,
    ogDescription: data.ogDescription ? String(data.ogDescription).trim() : null,
    ogImage: data.ogImage ? String(data.ogImage).trim() : null,
    readingTime:
      typeof data.readingTime === "number" && data.readingTime > 0
        ? data.readingTime
        : estimateReadingTime(content),
    relatedArticles: parseStringArray(data.relatedArticles),
    content: content.trim(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns all published articles sorted by publishedAt DESC.
 * Ignores draft files starting with `_` and documentation files like `README.md`.
 */
export function getAllArticles(): Article[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];

  const files = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .filter((f) => !f.startsWith("_") && f !== "README.md");

  const articles: Article[] = [];

  for (const file of files) {
    const filePath = path.join(ARTICLES_DIR, file);
    const article = loadArticleFromFile(filePath);
    if (article) articles.push(article);
  }

  // Check for duplicate slugs
  const slugMap = new Map<string, string>();
  for (const a of articles) {
    if (slugMap.has(a.slug)) {
      throw new Error(
        `Duplicate article slug "${a.slug}" found in articles directory. Each slug must be unique.`
      );
    }
    slugMap.set(a.slug, a.title);
  }

  // Sort by publishedAt DESC (newest first)
  articles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return articles;
}

/**
 * Returns article metadata (without full content) for listing pages.
 */
export function getAllArticleMetas(): ArticleMeta[] {
  return getAllArticles().map(({ content: _, ...meta }) => meta);
}

/**
 * Returns a single article by slug, or null if not found.
 */
export function getArticleBySlug(slug: string): Article | null {
  const articles = getAllArticles();
  return articles.find((a) => a.slug === slug) ?? null;
}

/**
 * Returns all available article slugs — used for generateStaticParams().
 */
export function getArticleSlugs(): string[] {
  return getAllArticles().map((a) => a.slug);
}

/**
 * Returns related articles for a given article slug.
 */
export function getRelatedArticles(slug: string): ArticleMeta[] {
  const article = getArticleBySlug(slug);
  if (!article || article.relatedArticles.length === 0) return [];

  const allArticles = getAllArticles();
  return article.relatedArticles
    .map((relSlug) => allArticles.find((a) => a.slug === relSlug))
    .filter((a): a is Article => a !== undefined)
    .map(({ content: _, ...meta }) => meta);
}

/**
 * Builds the canonical URL for an article.
 */
export function getArticleUrl(slug: string): string {
  return `${SITE_URL}/articles/${encodeURI(slug)}`;
}

/**
 * Builds Article JSON-LD structured data for a given article.
 * When author is "Wani", author is typed as Organization. Otherwise Person.
 */
export function buildArticleJsonLd(article: Article) {
  const isWaniOrg = article.author.trim().toLowerCase() === "wani";

  const authorSchema = isWaniOrg
    ? {
        "@type": "Organization",
        name: "Wani",
        url: SITE_URL,
      }
    : {
        "@type": "Person",
        name: article.author,
      };

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    ...(article.coverImage && { image: article.coverImage }),
    datePublished: article.publishedAt,
    ...(article.updatedAt && { dateModified: article.updatedAt }),
    author: authorSchema,
    publisher: {
      "@type": "Organization",
      name: "Wani",
      url: SITE_URL,
      logo: `${SITE_URL}/faviconlink.svg`,
    },
    url: getArticleUrl(article.slug),
    mainEntityOfPage: getArticleUrl(article.slug),
  };
}

/**
 * Builds BreadcrumbList JSON-LD for an article page.
 */
export function buildBreadcrumbJsonLd(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "الرئيسية",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "المقالات",
        item: `${SITE_URL}/articles`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: getArticleUrl(article.slug),
      },
    ],
  };
}
