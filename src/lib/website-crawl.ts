import { lookup } from "dns/promises";
import { isIP } from "net";
import { createHash } from "crypto";
import * as cheerio from "cheerio";
import prisma from "@/lib/prisma";
import { buildSearchText } from "@/lib/product-sync";

export const MAX_PAGES_PER_CRAWL = 15;
export const MAX_PAGE_SIZE_BYTES = 2 * 1024 * 1024;
export const CHUNK_SIZE_CHARS = 700;
export const FETCH_TIMEOUT_MS = 10_000;
export const WEBSITE_BOT_USER_AGENT = "WANI-KnowledgeBot/1.0 (+https://wani.app/bot)";

// ─── File Extensions to Exclude ──────────────────────────────────────────────
export const EXCLUDED_EXTENSIONS = new Set([
  "pdf", "jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp", "tiff",
  "zip", "tar", "gz", "rar", "7z", "exe", "dmg", "iso",
  "mp4", "mp3", "wav", "ogg", "webm", "avi", "mov", "mkv",
  "css", "js", "mjs", "json", "xml", "txt", "woff", "woff2", "ttf", "eot",
]);

// ─── Marketing / Analytics Query Params to Strip ─────────────────────────────
export const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "msclkid", "dclid", "_ga", "_gl", "mc_cid", "mc_eid",
  "ref", "source",
]);

// ─── SSRF & Safe URL Validation ──────────────────────────────────────────────
function isPrivateIp(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "0.0.0.0" ||
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("127.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("169.254.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized) ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("URL must use http or https");
  }
  const addresses = isIP(url.hostname)
    ? [url.hostname]
    : (await lookup(url.hostname, { all: true })).map(address => address.address);
  for (const ip of addresses) {
    if (isPrivateIp(ip)) throw new Error("This URL points to a private network address");
  }
  return url;
}

// ─── Safe HTTP Fetching ───────────────────────────────────────────────────────
async function fetchSafe(rawUrl: string, robots = false): Promise<Response> {
  let url = await assertSafeUrl(rawUrl);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        "User-Agent": WEBSITE_BOT_USER_AGENT,
        Accept: "text/html,application/xml,text/xml,text/plain",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    url = await assertSafeUrl(new URL(location, url).toString());
  }
  throw new Error("Too many redirects");
}

async function readBodyLimited(response: Response): Promise<string> {
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_PAGE_SIZE_BYTES) throw new Error("Page response exceeds the 2MB limit");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PAGE_SIZE_BYTES) throw new Error("Page response exceeds the 2MB limit");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))));
}

async function robotsAllow(origin: string): Promise<boolean> {
  try {
    const response = await fetchSafe(`${origin}/robots.txt`, true);
    if (!response.ok) return true;
    const text = (await readBodyLimited(response)).replace(/\r/g, "");
    const lines = text.split("\n").map(line => line.trim());
    let applies = false;
    let hasUniversalDisallow = false;
    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const [key, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      if (key.toLowerCase() === "user-agent") applies = value === "*";
      if (applies && key.toLowerCase() === "disallow" && value === "/") hasUniversalDisallow = true;
    }
    return !hasUniversalDisallow;
  } catch {
    return true;
  }
}

// ─── URL Normalization & Validation ──────────────────────────────────────────
export function normalizeUrl(rawUrl: string, baseOrigin?: string): string | null {
  try {
    let parsed: URL;
    if (baseOrigin) {
      parsed = new URL(rawUrl, baseOrigin);
    } else {
      parsed = new URL(rawUrl);
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    // Remove fragments (#...)
    parsed.hash = "";

    // Lowercase hostname and protocol
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.protocol = parsed.protocol.toLowerCase();

    // Check file extension
    const pathname = parsed.pathname;
    const lastDot = pathname.lastIndexOf(".");
    if (lastDot !== -1) {
      const ext = pathname.slice(lastDot + 1).toLowerCase();
      if (EXCLUDED_EXTENSIONS.has(ext)) {
        return null;
      }
    }

    // Clean tracking query parameters
    const searchParams = parsed.searchParams;
    for (const key of Array.from(searchParams.keys())) {
      const lower = key.toLowerCase();
      if (TRACKING_PARAMS.has(lower) || lower.startsWith("utm_")) {
        searchParams.delete(key);
      }
    }
    parsed.search = searchParams.toString() ? `?${searchParams.toString()}` : "";

    // Normalize trailing slash (strip trailing slash unless path is strictly '/')
    let cleanPath = parsed.pathname;
    if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
      cleanPath = cleanPath.replace(/\/+$/, "");
    }
    parsed.pathname = cleanPath || "/";

    return parsed.toString();
  } catch {
    return null;
  }
}

// ─── Content & Link Extraction ────────────────────────────────────────────────
export interface ExtractedLink {
  url: string;
  anchorText: string;
}

export function extractPageLinksAndContent(html: string, baseOrigin: string): {
  title: string | null;
  text: string;
  links: ExtractedLink[];
} {
  const $ = cheerio.load(html);

  // 1. Extract links and anchor text before stripping elements
  const linksMap = new Map<string, string>();

  $("a[href]").each((_, el) => {
    const rawHref = $(el).attr("href");
    if (!rawHref) return;

    // Filter out javascript:, mailto:, tel:
    const trimmed = rawHref.trim();
    if (/^(javascript|mailto|tel|data):/i.test(trimmed)) return;

    const normalized = normalizeUrl(trimmed, baseOrigin);
    if (!normalized) return;

    try {
      const parsed = new URL(normalized);
      const originParsed = new URL(baseOrigin);
      // Same origin security check
      if (parsed.origin !== originParsed.origin) return;

      const rawText = $(el).text().replace(/\s+/g, " ").trim();
      const titleAttr = $(el).attr("title")?.trim() || "";
      const ariaLabel = $(el).attr("aria-label")?.trim() || "";
      const combinedText = [rawText, titleAttr, ariaLabel].filter(Boolean).join(" ");

      if (linksMap.has(normalized)) {
        const existing = linksMap.get(normalized) || "";
        if (combinedText && !existing.includes(combinedText)) {
          linksMap.set(normalized, `${existing} ${combinedText}`.trim());
        }
      } else {
        linksMap.set(normalized, combinedText);
      }
    } catch {
      /* ignore invalid URL */
    }
  });

  const links: ExtractedLink[] = Array.from(linksMap.entries()).map(([url, anchorText]) => ({
    url,
    anchorText,
  }));

  // 2. Extract title
  const title = $("title").first().text().trim() || $("h1").first().text().trim() || null;

  // 3. Keep semantic heading cues before stripping elements
  $("h1, h2, h3").each((_, el) => {
    const hText = $(el).text().trim();
    if (hText) {
      $(el).text(`\n\n${hText}\n`);
    }
  });

  // 4. Remove irrelevant UI & non-content tags
  $("script, style, nav, footer, header, noscript, iframe, svg, form, button, input").remove();

  // 5. Extract and normalize body text
  const rawBodyText = $("body").text().replace(/\s+/g, " ").trim();

  return { title, text: rawBodyText, links };
}

// Backward-compatible extractReadableText for existing callers
export function extractReadableText(html: string): { title: string | null; text: string; links: string[] } {
  const { title, text, links } = extractPageLinksAndContent(html, "https://example.com");
  return { title, text, links: links.map(l => l.url) };
}

export function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  while (remaining) {
    if (remaining.length <= CHUNK_SIZE_CHARS) {
      chunks.push(remaining);
      break;
    }
    let cut = remaining.lastIndexOf(". ", CHUNK_SIZE_CHARS);
    if (cut < CHUNK_SIZE_CHARS * 0.5) cut = remaining.lastIndexOf(" ", CHUNK_SIZE_CHARS);
    if (cut <= 0) cut = CHUNK_SIZE_CHARS;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  return chunks.filter(Boolean);
}

// ─── Priority Scoring Engine ──────────────────────────────────────────────────
export interface PageCandidate {
  url: string;
  normalizedUrl: string;
  anchorTexts: string[];
  sitemapPriority?: number;
  depth: number;
}

export function calculateUrlScore(candidate: PageCandidate, rootUrl: URL): number {
  let score = 0;
  const parsed = new URL(candidate.normalizedUrl);
  const path = parsed.pathname.toLowerCase();
  const rootPath = rootUrl.pathname.toLowerCase().replace(/\/+$/, "") || "/";

  // 1. Homepage / Root URL (+120 points guaranteed top priority)
  if (
    candidate.normalizedUrl === normalizeUrl(rootUrl.toString()) ||
    path === "/" ||
    path === rootPath ||
    path === "/ar" ||
    path === "/en"
  ) {
    return 150;
  }

  // 2. Path-based Category Scoring
  // Products / Services / Store (+90)
  if (/(products|services|store|shop|solutions|offerings|catalog|menu)/.test(path)) {
    score += 90;
  }
  // Pricing / Plans (+90)
  else if (/(pricing|plans|packages|subscription|prices|rates)/.test(path)) {
    score += 90;
  }
  // Strategies / Use Cases (+85)
  else if (/(strategies|strategy|use-cases|case-studies|workflows)/.test(path)) {
    score += 85;
  }
  // Features / Capabilities (+80)
  else if (/(features|capabilities|how-it-works)/.test(path)) {
    score += 80;
  }
  // Integrations (+80)
  else if (/(integrations|integration|apps|connect|whatsapp|shopify|woocommerce)/.test(path)) {
    score += 80;
  }
  // FAQ & Help (+75)
  else if (/(faq|faqs|frequently-asked-questions|help|support|questions)/.test(path)) {
    score += 75;
  }
  // About / Company (+70)
  else if (/(about|about-us|company|who-we-are|team|contact|contact-us)/.test(path)) {
    score += 70;
  }
  // Articles / Blog / Guides (+50)
  else if (/(articles|article|blog|posts|news|guides|resources|tutorials)/.test(path)) {
    score += 50;
  }
  // Developers / Documentation (+45)
  else if (/(developers|developer|docs|documentation|api|sdk)/.test(path)) {
    score += 45;
  }
  // Legal / Privacy / Terms / Policies (+15, lower priority)
  else if (/(privacy|terms|policy|policies|cookies|legal|disclaimer|security|imprint)/.test(path)) {
    score += 15;
  } else {
    // Default baseline for unknown business pages
    score += 40;
  }

  // 3. Anchor Text Keywords (Arabic & English)
  const combinedAnchor = candidate.anchorTexts.join(" ").toLowerCase();
  if (combinedAnchor) {
    if (/(استراتيجيات|استراتيجية|strategies|strategy|use cases)/.test(combinedAnchor)) {
      score += 35;
    }
    if (/(منتجات|خدمات|متجر|products|services|store|solutions)/.test(combinedAnchor)) {
      score += 35;
    }
    if (/(أسعار|اسعار|باقات|خطط|pricing|plans|prices)/.test(combinedAnchor)) {
      score += 35;
    }
    if (/(مميزات|خصائص|features|capabilities)/.test(combinedAnchor)) {
      score += 30;
    }
    if (/(تكاملات|ربط|integrations|connect)/.test(combinedAnchor)) {
      score += 30;
    }
    if (/(الأسئلة الشائعة|أسئلة شائعة|faq|help|مساعدة)/.test(combinedAnchor)) {
      score += 25;
    }
    if (/(من نحن|عن الشركة|عن وني|about|who we are)/.test(combinedAnchor)) {
      score += 20;
    }
    if (/(مقالات|مدونة|blog|articles)/.test(combinedAnchor)) {
      score += 15;
    }
    // Anchor text penalties for legal/terms links
    if (/(شروط|خصوصية|terms|privacy|cookie|سياسة)/.test(combinedAnchor)) {
      score -= 15;
    }
  }

  // 4. Crawl Depth Factor
  if (candidate.depth === 0) {
    score += 50;
  } else if (candidate.depth === 1) {
    score += 25;
  } else if (candidate.depth === 2) {
    score += 10;
  }

  // 5. Sitemap Priority Signal (bonus, max +10 so it cannot overcome category weight)
  if (typeof candidate.sitemapPriority === "number") {
    score += Math.min(10, Math.max(0, candidate.sitemapPriority * 10));
  }

  // 6. Path Depth Penalty for excessively deep paths
  const segments = path.split("/").filter(Boolean);
  if (segments.length > 2) {
    score -= (segments.length - 2) * 4;
  }

  return score;
}

// ─── Smart Website Discovery (Sitemap + Homepage Links + Priority) ───────────
export async function discoverPages(root: URL): Promise<string[]> {
  const normalizedRoot = normalizeUrl(root.toString());
  if (!normalizedRoot) return [root.toString()];

  const candidatesMap = new Map<string, PageCandidate>();

  // 1. Root / Homepage is ALWAYS Candidate #0
  candidatesMap.set(normalizedRoot, {
    url: root.toString(),
    normalizedUrl: normalizedRoot,
    anchorTexts: ["الرئيسية", "Home"],
    depth: 0,
  });

  // 2. Fetch Homepage HTML to extract Depth 1 internal links & anchor texts
  let homepageHtml: string | null = null;
  try {
    const homeResponse = await fetchSafe(root.toString());
    if (homeResponse.ok) {
      homepageHtml = await readBodyLimited(homeResponse);
      const { links } = extractPageLinksAndContent(homepageHtml, root.origin);

      for (const link of links) {
        const norm = normalizeUrl(link.url, root.origin);
        if (!norm) continue;

        try {
          const candidateUrl = new URL(norm);
          if (candidateUrl.origin !== root.origin) continue;

          if (candidatesMap.has(norm)) {
            const existing = candidatesMap.get(norm)!;
            if (link.anchorText && !existing.anchorTexts.includes(link.anchorText)) {
              existing.anchorTexts.push(link.anchorText);
            }
          } else {
            candidatesMap.set(norm, {
              url: norm,
              normalizedUrl: norm,
              anchorTexts: link.anchorText ? [link.anchorText] : [],
              depth: 1,
            });
          }
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* Ignore homepage fetch error, sitemap may still provide links */
  }

  // 3. Fetch Sitemap (Candidate Source B - merged, not short-circuited)
  try {
    const sitemapResponse = await fetchSafe(new URL("/sitemap.xml", root).toString());
    if (sitemapResponse.ok) {
      const xml = await readBodyLimited(sitemapResponse);

      // Handle standard <url><loc>...</loc><priority>...</priority></url>
      const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/gi) || [];
      if (urlBlocks.length > 0) {
        for (const block of urlBlocks) {
          const locMatch = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/i);
          if (!locMatch) continue;
          const loc = locMatch[1].trim();

          const priorityMatch = block.match(/<priority>\s*([^<]+?)\s*<\/priority>/i);
          const priority = priorityMatch ? parseFloat(priorityMatch[1].trim()) : undefined;

          const norm = normalizeUrl(loc, root.origin);
          if (!norm) continue;

          try {
            const candidateUrl = new URL(norm);
            if (candidateUrl.origin !== root.origin) continue;

            if (candidatesMap.has(norm)) {
              const existing = candidatesMap.get(norm)!;
              if (typeof priority === "number" && !isNaN(priority)) {
                existing.sitemapPriority = priority;
              }
            } else {
              candidatesMap.set(norm, {
                url: norm,
                normalizedUrl: norm,
                anchorTexts: [],
                sitemapPriority: typeof priority === "number" && !isNaN(priority) ? priority : undefined,
                depth: 1,
              });
            }
          } catch {
            /* ignore */
          }
        }
      } else {
        // Fallback for simple sitemaps without <url> wrappers
        for (const match of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
          const loc = match[1].trim();
          const norm = normalizeUrl(loc, root.origin);
          if (!norm) continue;
          try {
            const candidateUrl = new URL(norm);
            if (candidateUrl.origin !== root.origin) continue;

            if (!candidatesMap.has(norm)) {
              candidatesMap.set(norm, {
                url: norm,
                normalizedUrl: norm,
                anchorTexts: [],
                depth: 1,
              });
            }
          } catch {
            /* ignore */
          }
        }
      }
    }
  } catch {
    /* Sitemap absent or unreachable - continue with homepage links */
  }

  // 4. Depth 2 Discovery (only if candidate count is below MAX_PAGES_PER_CRAWL)
  if (candidatesMap.size < MAX_PAGES_PER_CRAWL) {
    const depth1Candidates = Array.from(candidatesMap.values())
      .filter(c => c.depth === 1)
      .sort((a, b) => calculateUrlScore(b, root) - calculateUrlScore(a, root))
      .slice(0, 3);

    for (const d1 of depth1Candidates) {
      if (candidatesMap.size >= MAX_PAGES_PER_CRAWL) break;
      try {
        const d1Resp = await fetchSafe(d1.url);
        if (!d1Resp.ok) continue;
        const d1Html = await readBodyLimited(d1Resp);
        const { links } = extractPageLinksAndContent(d1Html, root.origin);

        for (const link of links) {
          if (candidatesMap.size >= MAX_PAGES_PER_CRAWL * 2) break;
          const norm = normalizeUrl(link.url, root.origin);
          if (!norm) continue;
          const candidateUrl = new URL(norm);
          if (candidateUrl.origin !== root.origin) continue;

          if (!candidatesMap.has(norm)) {
            candidatesMap.set(norm, {
              url: norm,
              normalizedUrl: norm,
              anchorTexts: link.anchorText ? [link.anchorText] : [],
              depth: 2,
            });
          }
        }
      } catch {
        /* ignore depth 2 fetch errors */
      }
    }
  }

  // 5. Score and Rank All Candidates
  const scored = Array.from(candidatesMap.values()).map(candidate => ({
    candidate,
    score: calculateUrlScore(candidate, root),
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // 6. Guarantee Root URL is at Index 0
  const result: string[] = [];
  if (candidatesMap.has(normalizedRoot)) {
    result.push(normalizedRoot);
  }

  for (const item of scored) {
    if (result.length >= MAX_PAGES_PER_CRAWL) break;
    if (!result.includes(item.candidate.normalizedUrl)) {
      result.push(item.candidate.normalizedUrl);
    }
  }

  return result.slice(0, MAX_PAGES_PER_CRAWL);
}

// ─── Main Crawl Orchestrator ─────────────────────────────────────────────────
export async function crawlWebsite(
  userId: string,
  rootUrl: string
): Promise<{ pagesProcessed: number; chunksCreated: number; errors: string[] }> {
  const root = await assertSafeUrl(rootUrl);
  const errors: string[] = [];

  if (!(await robotsAllow(root.origin))) {
    return { pagesProcessed: 0, chunksCreated: 0, errors: ["Crawling is disallowed by robots.txt"] };
  }

  const pageUrls = await discoverPages(root);
  let pagesProcessed = 0;
  let chunksCreated = 0;

  for (const pageUrl of pageUrls) {
    try {
      const safePageUrl = await assertSafeUrl(pageUrl);
      if (safePageUrl.origin !== root.origin) continue;

      const response = await fetchSafe(safePageUrl.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await readBodyLimited(response);
      const { title, text } = extractPageLinksAndContent(html, root.origin);
      if (!text) continue;

      const contentHash = createHash("sha256").update(text).digest("hex");

      const existing = await prisma.websitePage.findUnique({
        where: { userId_url: { userId, url: safePageUrl.toString() } },
        select: { id: true, contentHash: true },
      });

      if (existing?.contentHash === contentHash) {
        await prisma.websitePage.update({
          where: { id: existing.id },
          data: { title, isActive: true, lastCrawledAt: new Date() },
        });
        pagesProcessed++;
        continue;
      }

      const page = await prisma.websitePage.upsert({
        where: { userId_url: { userId, url: safePageUrl.toString() } },
        update: { title, contentHash, isActive: true, lastCrawledAt: new Date() },
        create: { userId, url: safePageUrl.toString(), title, contentHash },
      });

      await prisma.websiteKnowledgeChunk.deleteMany({ where: { pageId: page.id } });

      const chunks = splitIntoChunks(text);
      if (chunks.length) {
        await prisma.websiteKnowledgeChunk.createMany({
          data: chunks.map((content, position) => ({
            pageId: page.id,
            userId,
            content,
            searchText: buildSearchText({ name: content }),
            position,
          })),
        });
      }

      pagesProcessed++;
      chunksCreated += chunks.length;
    } catch (error: any) {
      errors.push(`${pageUrl}: ${error?.message || "crawl failed"}`);
    }
  }

  return { pagesProcessed, chunksCreated, errors };
}
