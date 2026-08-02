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
  category?: string | null;
  aiNotes: string | null;
  aiKeywords: string[];
  aiSalesInstructions: string | null;
}

export interface SuggestedProduct extends RelevantProduct {
  suggestionType: "upsell" | "cross_sell" | "alternative";
}

/**
 * Normalizes Arabic and English text for robust string matching:
 * - Removes Arabic diacritics (Tashkeel)
 * - Normalizes alef variations (أإآ -> ا)
 * - Normalizes teh marbuta (ة -> ه)
 * - Normalizes alef maqsura (ى -> ي)
 * - Removes special punctuation while preserving letters and numbers
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "") // remove tashkeel
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts clean normalized keywords from input search query.
 */
function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const words = normalized.split(/\s+/).filter((w) => w.length >= 2);
  return Array.from(new Set(words));
}

/**
 * Calculates Levenshtein distance between two normalized strings.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates similarity score (0 to 1) based on normalized substring and Levenshtein distance.
 */
export function calculateFuzzyScore(str1: string, str2: string): number {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);
  if (!norm1 || !norm2) return 0;

  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85;

  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 0;

  const dist = levenshteinDistance(norm1, norm2);
  const similarity = 1 - dist / maxLen;

  return Math.max(0, similarity);
}

/**
 * Retrieves up to `limit` (default 5) active products for a user matching the customer's query.
 * Features:
 * - Arabic text normalization (alef/teh/alef maqsura)
 * - Multi-keyword + fuzzy trigram scoring
 * - Expanded candidate pool (150 candidates) to avoid premature truncation before scoring
 */
export async function getRelevantProducts(
  userId: string,
  query: string,
  limit: number = 5
): Promise<RelevantProduct[]> {
  if (!userId || !query?.trim()) return [];

  const rawKeywords = query
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  const normalizedKeywords = extractKeywords(query);
  const allKeywords = Array.from(new Set([...rawKeywords, ...normalizedKeywords]));

  if (!allKeywords.length) return [];

  // Construct OR conditions for ILIKE matching on searchText column
  const matches = await prisma.product.findMany({
    where: {
      userId,
      isActive: true,
      OR: allKeywords.map((word) => ({
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
      category: true,
      aiNotes: true,
      aiKeywords: true,
      aiSalesInstructions: true,
      searchText: true,
    },
    take: 150, // Expanded candidate pool before scoring
  });

  if (!matches.length) return [];

  const normalizedQuery = normalizeText(query);

  // Score candidate products with exact + keyword + fuzzy trigram scoring
  const scored = matches.map((product) => {
    const normName = normalizeText(product.name);
    const normText = normalizeText(product.searchText);
    let score = 0;

    // Exact full query match bonus
    if (normName.includes(normalizedQuery)) score += 10;
    else if (normText.includes(normalizedQuery)) score += 5;

    // Keyword match scoring
    for (const kw of normalizedKeywords) {
      if (normName.includes(kw)) {
        score += 3;
      } else if (normText.includes(kw)) {
        score += 1;
      }

      // Fuzzy matching bonus for keywords (handles spelling errors)
      const titleFuzzy = calculateFuzzyScore(normName, kw);
      if (titleFuzzy > 0.4) {
        score += titleFuzzy * 2;
      }
    }

    return { product, score };
  });

  // Filter products with score > 0, sort descending by score, take top `limit`
  scored.sort((a, b) => b.score - a.score);

  return scored
    .filter((item) => item.score > 0)
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
      category: product.category,
      aiNotes: product.aiNotes,
      aiKeywords: product.aiKeywords,
      aiSalesInstructions: product.aiSalesInstructions,
    }));
}

export async function getSuggestedProducts(
  userId: string,
  primaryProduct: { id: string; category: string | null; price: number | null; relatedProductIds?: string[] },
  settings: { suggestAlternatives: boolean; suggestUpsell: boolean; suggestCrossSell: boolean },
  limit: number,
): Promise<SuggestedProduct[]> {
  if (!userId || !primaryProduct?.id) return [];
  const safeLimit = Math.min(Math.max(limit || 1, 1), 3);
  const candidates: SuggestedProduct[] = [];
  const baseWhere = { userId, isActive: true, id: { not: primaryProduct.id } };
  const select = {
    id: true, name: true, price: true, currency: true, description: true,
    stock: true, variants: true, url: true, category: true,
    aiNotes: true, aiKeywords: true, aiSalesInstructions: true,
  } as const;

  if (settings.suggestUpsell && primaryProduct.category && primaryProduct.price != null) {
    const upsell = await prisma.product.findFirst({
      where: { ...baseWhere, category: primaryProduct.category, price: { gt: primaryProduct.price } },
      orderBy: { price: "asc" }, select,
    });
    if (upsell) candidates.push({ ...upsell, suggestionType: "upsell" });
  }

  if (settings.suggestAlternatives && primaryProduct.category) {
    const alternatives = await prisma.product.findMany({
      where: { ...baseWhere, category: primaryProduct.category },
      select, take: 50,
    });
    alternatives.sort((a, b) => Math.abs((a.price ?? 0) - (primaryProduct.price ?? 0)) - Math.abs((b.price ?? 0) - (primaryProduct.price ?? 0)));
    candidates.push(...alternatives.map((p) => ({ ...p, suggestionType: "alternative" as const })));
  }

  if (settings.suggestCrossSell) {
    const primary = primaryProduct.relatedProductIds
      ? primaryProduct
      : await prisma.product.findUnique({ where: { id: primaryProduct.id }, select: { relatedProductIds: true } });
    const relatedIds = primary?.relatedProductIds ?? [];
    if (relatedIds.length > 0) {
      const related = await prisma.product.findMany({ where: { ...baseWhere, id: { in: relatedIds } }, select });
      const byId = new Map(related.map((p) => [p.id, p]));
      candidates.push(...relatedIds.flatMap((id) => { const p = byId.get(id); return p ? [{ ...p, suggestionType: "cross_sell" as const }] : []; }));
    }
  }

  const unique = new Map<string, SuggestedProduct>();
  for (const candidate of candidates) if (!unique.has(candidate.id)) unique.set(candidate.id, candidate);
  return Array.from(unique.values()).slice(0, safeLimit);
}
