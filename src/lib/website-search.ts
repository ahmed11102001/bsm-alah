import prisma from "@/lib/prisma";
import { calculateFuzzyScore, normalizeText } from "@/lib/product-search";

export interface RelevantKnowledgeChunk {
  content: string;
  pageUrl: string;
  pageTitle: string | null;
}

export async function getRelevantWebsiteKnowledge(userId: string, query: string, limit = 3): Promise<RelevantKnowledgeChunk[]> {
  if (!userId || !query?.trim()) return [];
  const keywords = Array.from(new Set(normalizeText(query).split(/\s+/).filter(word => word.length >= 2)));
  if (!keywords.length) return [];
  const matches = await prisma.websiteKnowledgeChunk.findMany({
    where: { userId, page: { isActive: true }, OR: keywords.map(word => ({ searchText: { contains: word, mode: "insensitive" as const } })) },
    select: { content: true, searchText: true, page: { select: { url: true, title: true } } },
    take: 100,
  });
  return matches.map(chunk => {
    const normalizedContent = normalizeText(chunk.searchText);
    const score = keywords.reduce((total, keyword) => total + (normalizedContent.includes(keyword) ? 1 : calculateFuzzyScore(normalizedContent, keyword) * 0.25), 0);
    return { score, result: { content: chunk.content, pageUrl: chunk.page.url, pageTitle: chunk.page.title } };
  }).sort((a, b) => b.score - a.score).slice(0, limit).map(item => item.result);
}
