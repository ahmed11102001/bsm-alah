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
export const WEBSITE_BOT_USER_AGENT = "WhatsPro-KnowledgeBot/1.0 (+https://whatspro.app/bot)";

function isPrivateIp(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return normalized === "0.0.0.0" || normalized === "::" || normalized === "::1" || normalized.startsWith("127.") || normalized.startsWith("10.") || normalized.startsWith("169.254.") || normalized.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized) || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized.startsWith("::ffff:127.") || normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.");
}

export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("URL must use http or https");
  const addresses = isIP(url.hostname) ? [url.hostname] : (await lookup(url.hostname, { all: true })).map(address => address.address);
  for (const ip of addresses) if (isPrivateIp(ip)) throw new Error("This URL points to a private network address");
  return url;
}

async function fetchSafe(rawUrl: string, robots = false): Promise<Response> {
  let url = await assertSafeUrl(rawUrl);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": WEBSITE_BOT_USER_AGENT, Accept: "text/html,application/xml,text/xml,text/plain" },
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
  } finally { await reader.cancel().catch(() => undefined); }
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
  } catch { return true; }
}

function extractReadableText(html: string): { title: string | null; text: string; links: string[] } {
  const $ = cheerio.load(html);
  const links = $("a[href]").map((_, element) => $(element).attr("href") || "").get();
  $("script, style, nav, footer, header, noscript, iframe, svg").remove();
  return { title: $("title").first().text().trim() || null, text: $("body").text().replace(/\s+/g, " ").trim(), links };
}

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  while (remaining) {
    if (remaining.length <= CHUNK_SIZE_CHARS) { chunks.push(remaining); break; }
    let cut = remaining.lastIndexOf(". ", CHUNK_SIZE_CHARS);
    if (cut < CHUNK_SIZE_CHARS * 0.5) cut = remaining.lastIndexOf(" ", CHUNK_SIZE_CHARS);
    if (cut <= 0) cut = CHUNK_SIZE_CHARS;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  return chunks.filter(Boolean);
}

async function discoverPages(root: URL): Promise<string[]> {
  const pages = new Set<string>([root.toString()]);
  try {
    const sitemap = await fetchSafe(new URL("/sitemap.xml", root).toString());
    if (sitemap.ok) {
      const xml = await readBodyLimited(sitemap);
      for (const match of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
        const candidate = await assertSafeUrl(match[1].trim());
        if (candidate.origin === root.origin) pages.add(candidate.toString());
        if (pages.size >= MAX_PAGES_PER_CRAWL) break;
      }
    }
  } catch { /* Fall back to one-level links below. */ }
  if (pages.size === 1) {
    const response = await fetchSafe(root.toString());
    if (!response.ok) throw new Error(`Website returned HTTP ${response.status}`);
    const html = await readBodyLimited(response);
    const extracted = extractReadableText(html);
    for (const href of extracted.links) {
      try {
        const candidate = await assertSafeUrl(new URL(href, root).toString());
        if (candidate.origin === root.origin && candidate.hash === "") pages.add(candidate.toString());
        if (pages.size >= MAX_PAGES_PER_CRAWL) break;
      } catch { /* Ignore malformed or unsafe links. */ }
    }
  }
  return Array.from(pages).slice(0, MAX_PAGES_PER_CRAWL);
}

export async function crawlWebsite(userId: string, rootUrl: string): Promise<{ pagesProcessed: number; chunksCreated: number; errors: string[] }> {
  const root = await assertSafeUrl(rootUrl);
  const errors: string[] = [];
  if (!(await robotsAllow(root.origin))) return { pagesProcessed: 0, chunksCreated: 0, errors: ["Crawling is disallowed by robots.txt"] };
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
      const { title, text } = extractReadableText(html);
      if (!text) continue;
      const contentHash = createHash("sha256").update(text).digest("hex");
      const existing = await prisma.websitePage.findUnique({ where: { userId_url: { userId, url: safePageUrl.toString() } }, select: { id: true, contentHash: true } });
      if (existing?.contentHash === contentHash) {
        await prisma.websitePage.update({ where: { id: existing.id }, data: { title, isActive: true, lastCrawledAt: new Date() } });
        pagesProcessed++;
        continue;
      }
      const page = await prisma.websitePage.upsert({ where: { userId_url: { userId, url: safePageUrl.toString() } }, update: { title, contentHash, isActive: true, lastCrawledAt: new Date() }, create: { userId, url: safePageUrl.toString(), title, contentHash } });
      await prisma.websiteKnowledgeChunk.deleteMany({ where: { pageId: page.id } });
      const chunks = splitIntoChunks(text);
      if (chunks.length) await prisma.websiteKnowledgeChunk.createMany({ data: chunks.map((content, position) => ({ pageId: page.id, userId, content, searchText: buildSearchText({ name: content }), position })) });
      pagesProcessed++;
      chunksCreated += chunks.length;
    } catch (error: any) { errors.push(`${pageUrl}: ${error?.message || "crawl failed"}`); }
  }
  return { pagesProcessed, chunksCreated, errors };
}
