// src/lib/product-search.ts
import prisma from "@/lib/prisma";

export interface RelevantProduct {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  description: string | null;
  stock: number | null;
  variants: any;
  url: string | null;
}

/**
  * Tokenizes input text into clean lowercase search terms (ignoring very short words).
  */
function extractKeywords(text: string): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  return Array.from(new Set(words));
}

/**
  * Retrieves up to `limit` (default 5) active products for a user matching the customer's query.
  * Uses keyword tokenization and ILIKE scoring.
  * Note: Image URLs are deliberately EXCLUDED from the return object sent to AI prompt context.
  */
export async function getRelevantProducts(
  userId: string,
  query: string,
  limit: number = 5
): Promise<RelevantProduct[]> {
  if (!userId || !query?.trim()) return [];

  const keywords = extractKeywords(query);
  if (!keywords.length) return [];

  // Construct OR conditions for ILIKE matching on searchText column
  const matches = await prisma.product.findMany({
    where: {
      userId,
      isActive: true,
      OR: keywords.map((word) => ({
        searchText: {
          contains: word,
          mode: "insensitive" as const,
        },
      })),
    },
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
      description: true,
      stock: true,
      variants: true,
      url: true,
      searchText: true,
    },
    take: 30, // Initial candidate pool before scoring
  });

  if (!matches.length) return [];

  // Score candidate products by how many distinct query keywords match their searchText
  const scored = matches.map((product) => {
    const text = product.searchText.toLowerCase();
    let score = 0;

    for (const kw of keywords) {
      if (text.includes(kw)) {
        score += 1;
        // Extra weight if keyword matches product name directly
        if (product.name.toLowerCase().includes(kw)) {
          score += 2;
        }
      }
    }

    return { product, score };
  });

  // Filter products with score > 0, sort descending by score, take top `limit`
  scored.sort((a, b) => b.score - a.score);

  return scored
    .slice(0, limit)
    .map(({ product }) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      description: product.description,
      stock: product.stock,
      variants: product.variants,
      url: product.url,
    }));
}
