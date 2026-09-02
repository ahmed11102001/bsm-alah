import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}));

import {
  normalizeUrl,
  calculateUrlScore,
  extractPageLinksAndContent,
  discoverPages,
  MAX_PAGES_PER_CRAWL,
  type PageCandidate,
} from "@/lib/website-crawl";

describe("Smart Website Crawler & Discovery Suite", () => {
  const ROOT_URL = new URL("https://aiwni.com");

  // ─── Test 8: URL Normalization ─────────────────────────────────────────────
  describe("URL Normalization (Test 8)", () => {
    it("يوحد الروابط المتطابقة ويزيل الـ fragments والـ trailing slashes والـ tracking parameters", () => {
      const u1 = normalizeUrl("https://aiwni.com/strategies/");
      const u2 = normalizeUrl("https://aiwni.com/strategies#overview");
      const u3 = normalizeUrl("https://aiwni.com/strategies?utm_source=facebook&utm_medium=cpc&fbclid=12345");

      expect(u1).toBe("https://aiwni.com/strategies");
      expect(u2).toBe("https://aiwni.com/strategies");
      expect(u3).toBe("https://aiwni.com/strategies");
      expect(u1).toBe(u2);
      expect(u2).toBe(u3);
    });

    it("يحافظ على سلاش الصفحة الرئيسية '/' ولا يحذفه", () => {
      expect(normalizeUrl("https://aiwni.com/")).toBe("https://aiwni.com/");
      expect(normalizeUrl("https://aiwni.com")).toBe("https://aiwni.com/");
    });

    it("يستبعد الملفات غير المناسبة والامتدادات الثنائية", () => {
      expect(normalizeUrl("https://aiwni.com/document.pdf")).toBeNull();
      expect(normalizeUrl("https://aiwni.com/image.png")).toBeNull();
      expect(normalizeUrl("https://aiwni.com/video.mp4")).toBeNull();
      expect(normalizeUrl("https://aiwni.com/archive.zip")).toBeNull();
      expect(normalizeUrl("https://aiwni.com/style.css")).toBeNull();
    });

    it("يستبعد البروتوكولات غير الصالحة", () => {
      expect(normalizeUrl("mailto:support@aiwni.com")).toBeNull();
      expect(normalizeUrl("tel:+201000000000")).toBeNull();
      expect(normalizeUrl("javascript:void(0)")).toBeNull();
    });
  });

  // ─── Test 3: Same-Origin Security ──────────────────────────────────────────
  describe("Same-Origin Security & Link Extraction (Test 3)", () => {
    it("يستبعد الروابط الخارجية تماماً ويحتفظ بروابط نفس النطاق فقط", () => {
      const html = `
        <html>
          <body>
            <a href="/products">المنتجات</a>
            <a href="/strategies">الاستراتيجيات</a>
            <a href="https://facebook.com/aiwni">فيسبوك</a>
            <a href="https://youtube.com/watch?v=123">يوتيوب</a>
            <a href="https://google.com">جوجل</a>
          </body>
        </html>
      `;

      const { links } = extractPageLinksAndContent(html, "https://aiwni.com");
      const urls = links.map(l => l.url);

      expect(urls).toContain("https://aiwni.com/products");
      expect(urls).toContain("https://aiwni.com/strategies");
      expect(urls).not.toContain("https://facebook.com/aiwni");
      expect(urls).not.toContain("https://youtube.com/watch?v=123");
      expect(urls).not.toContain("https://google.com");
    });
  });

  // ─── Priority Scoring Tests (Test 7 & Test 9) ──────────────────────────────
  describe("Priority Scoring (Test 7 & Test 9)", () => {
    it("يضع الصفحات التجارية المهمة قبل صفحات Terms و Privacy", () => {
      const rootUrl = new URL("https://aiwni.com");

      const homeCandidate: PageCandidate = {
        url: "https://aiwni.com/",
        normalizedUrl: "https://aiwni.com/",
        anchorTexts: ["الرئيسية"],
        depth: 0,
      };

      const strategiesCandidate: PageCandidate = {
        url: "https://aiwni.com/strategies",
        normalizedUrl: "https://aiwni.com/strategies",
        anchorTexts: ["استراتيجيات التسويق والذكاء الاصطناعي"],
        depth: 1,
      };

      const pricingCandidate: PageCandidate = {
        url: "https://aiwni.com/pricing",
        normalizedUrl: "https://aiwni.com/pricing",
        anchorTexts: ["الأسعار والباقات"],
        depth: 1,
      };

      const productsCandidate: PageCandidate = {
        url: "https://aiwni.com/products",
        normalizedUrl: "https://aiwni.com/products",
        anchorTexts: ["منتجاتنا وخدماتنا"],
        depth: 1,
      };

      const termsCandidate: PageCandidate = {
        url: "https://aiwni.com/terms",
        normalizedUrl: "https://aiwni.com/terms",
        anchorTexts: ["الشروط والأحكام"],
        depth: 1,
      };

      const privacyCandidate: PageCandidate = {
        url: "https://aiwni.com/privacy",
        normalizedUrl: "https://aiwni.com/privacy",
        anchorTexts: ["سياسة الخصوصية"],
        depth: 1,
      };

      const homeScore = calculateUrlScore(homeCandidate, rootUrl);
      const stratScore = calculateUrlScore(strategiesCandidate, rootUrl);
      const priceScore = calculateUrlScore(pricingCandidate, rootUrl);
      const prodScore = calculateUrlScore(productsCandidate, rootUrl);
      const termsScore = calculateUrlScore(termsCandidate, rootUrl);
      const privScore = calculateUrlScore(privacyCandidate, rootUrl);

      // Homepage is highest
      expect(homeScore).toBeGreaterThan(stratScore);
      // Commercial pages outscore legal pages by a wide margin
      expect(stratScore).toBeGreaterThan(termsScore);
      expect(priceScore).toBeGreaterThan(termsScore);
      expect(prodScore).toBeGreaterThan(privScore);
      // Legal pages still get a positive baseline score (not banned)
      expect(termsScore).toBeGreaterThan(0);
      expect(privScore).toBeGreaterThan(0);
    });

    it("أولوية الـ Sitemap لا تتغلب على أهمية الصفحة التجارية", () => {
      const rootUrl = new URL("https://aiwni.com");

      // Developer terms in sitemap with priority 1.0
      const devTerms: PageCandidate = {
        url: "https://aiwni.com/developers/terms",
        normalizedUrl: "https://aiwni.com/developers/terms",
        anchorTexts: [],
        sitemapPriority: 1.0,
        depth: 1,
      };

      // Strategies with no sitemap priority, but linked from homepage
      const strategies: PageCandidate = {
        url: "https://aiwni.com/strategies",
        normalizedUrl: "https://aiwni.com/strategies",
        anchorTexts: ["استراتيجيات وني"],
        depth: 1,
      };

      const devTermsScore = calculateUrlScore(devTerms, rootUrl);
      const strategiesScore = calculateUrlScore(strategies, rootUrl);

      expect(strategiesScore).toBeGreaterThan(devTermsScore);
    });
  });

  // ─── Smart Discovery Integration Tests (Tests 1, 2, 4, 5, 6) ───────────────
  describe("discoverPages with Mocked Web Responses", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("Test 1 & Test 2: Sitemap موجود + Homepage تحتوي روابط مهمة مثل /strategies -> يتم اكتشافها معاً", async () => {
      const mockHomepage = `
        <!DOCTYPE html>
        <html>
          <head><title>Wani Platform</title></head>
          <body>
            <h1>منصة وني للتسويق</h1>
            <a href="/products">المنتجات والخدمات</a>
            <a href="/strategies">استراتيجيات وني</a>
            <a href="/pricing">الأسعار والباقات</a>
            <a href="/about">من نحن</a>
            <a href="/terms">الشروط</a>
          </body>
        </html>
      `;

      const mockSitemap = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://aiwni.com/faq</loc><priority>0.8</priority></url>
          <url><loc>https://aiwni.com/integrations</loc><priority>0.8</priority></url>
          <url><loc>https://aiwni.com/developers</loc><priority>0.5</priority></url>
        </urlset>`;

      // Mock fetch
      globalThis.fetch = vi.fn().mockImplementation((url: string | URL) => {
        const u = url.toString();
        if (u.includes("sitemap.xml")) {
          return Promise.resolve(new Response(mockSitemap, { status: 200 }));
        }
        if (u === "https://aiwni.com" || u === "https://aiwni.com/") {
          return Promise.resolve(new Response(mockHomepage, { status: 200 }));
        }
        return Promise.resolve(new Response("<html><body>Content</body></html>", { status: 200 }));
      });

      const pages = await discoverPages(ROOT_URL);

      // Test 6: Homepage is always included and first
      expect(pages[0]).toBe("https://aiwni.com/");

      // Test 2: /strategies was NOT in sitemap, but was in Homepage -> DISCOVERED!
      expect(pages).toContain("https://aiwni.com/strategies");

      // Test 1: Both Homepage links and Sitemap links are discovered
      expect(pages).toContain("https://aiwni.com/products");
      expect(pages).toContain("https://aiwni.com/pricing");
      expect(pages).toContain("https://aiwni.com/faq");
      expect(pages).toContain("https://aiwni.com/integrations");
    });

    it("Test 4: نفس الرابط موجود في Sitemap وHomepage -> رابط واحد فقط (Deduplication)", async () => {
      const mockHomepage = `
        <html><body><a href="/pricing">الأسعار</a></body></html>
      `;

      const mockSitemap = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://aiwni.com/pricing</loc></url>
          <url><loc>https://aiwni.com/pricing/</loc></url>
        </urlset>`;

      globalThis.fetch = vi.fn().mockImplementation((url: string | URL) => {
        const u = url.toString();
        if (u.includes("sitemap.xml")) {
          return Promise.resolve(new Response(mockSitemap, { status: 200 }));
        }
        return Promise.resolve(new Response(mockHomepage, { status: 200 }));
      });

      const pages = await discoverPages(ROOT_URL);
      const pricingOccurrences = pages.filter(p => p === "https://aiwni.com/pricing");
      expect(pricingOccurrences.length).toBe(1);
    });

    it("Test 5 & Test 9: لا يتم تجاوز MAX_PAGES_PER_CRAWL (15)، والصفحات التجارية المهمة تتقدم على القانونية", async () => {
      // 25 URLs in sitemap, mostly low-value docs and legal
      const mockSitemap = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://aiwni.com/developers/terms</loc></url>
          <url><loc>https://aiwni.com/developers/privacy</loc></url>
          <url><loc>https://aiwni.com/developers/cookies</loc></url>
          <url><loc>https://aiwni.com/legal/disclaimer</loc></url>
          <url><loc>https://aiwni.com/docs/intro</loc></url>
          <url><loc>https://aiwni.com/docs/auth</loc></url>
          <url><loc>https://aiwni.com/docs/webhooks</loc></url>
          <url><loc>https://aiwni.com/docs/endpoints</loc></url>
          <url><loc>https://aiwni.com/docs/errors</loc></url>
          <url><loc>https://aiwni.com/docs/rate-limits</loc></url>
          <url><loc>https://aiwni.com/docs/changelog</loc></url>
          <url><loc>https://aiwni.com/docs/sdk</loc></url>
          <url><loc>https://aiwni.com/docs/faq</loc></url>
          <url><loc>https://aiwni.com/articles/post-1</loc></url>
          <url><loc>https://aiwni.com/articles/post-2</loc></url>
          <url><loc>https://aiwni.com/articles/post-3</loc></url>
          <url><loc>https://aiwni.com/articles/post-4</loc></url>
          <url><loc>https://aiwni.com/articles/post-5</loc></url>
        </urlset>`;

      // Homepage contains the high-value business links
      const mockHomepage = `
        <html>
          <body>
            <a href="/products">المنتجات</a>
            <a href="/services">الخدمات</a>
            <a href="/strategies">استراتيجيات التسويق</a>
            <a href="/pricing">الأسعار والباقات</a>
            <a href="/features">المميزات</a>
            <a href="/integrations">التكاملات</a>
            <a href="/faq">الأسئلة الشائعة</a>
            <a href="/about">عن وني</a>
          </body>
        </html>
      `;

      globalThis.fetch = vi.fn().mockImplementation((url: string | URL) => {
        const u = url.toString();
        if (u.includes("sitemap.xml")) {
          return Promise.resolve(new Response(mockSitemap, { status: 200 }));
        }
        return Promise.resolve(new Response(mockHomepage, { status: 200 }));
      });

      const pages = await discoverPages(ROOT_URL);

      // Never exceeds 15
      expect(pages.length).toBeLessThanOrEqual(MAX_PAGES_PER_CRAWL);

      // Homepage is #1
      expect(pages[0]).toBe("https://aiwni.com/");

      // High value business pages are chosen ahead of low-priority docs/legal
      expect(pages).toContain("https://aiwni.com/products");
      expect(pages).toContain("https://aiwni.com/services");
      expect(pages).toContain("https://aiwni.com/strategies");
      expect(pages).toContain("https://aiwni.com/pricing");
      expect(pages).toContain("https://aiwni.com/features");
      expect(pages).toContain("https://aiwni.com/integrations");
      expect(pages).toContain("https://aiwni.com/faq");
      expect(pages).toContain("https://aiwni.com/about");

      // Low-priority developer terms should be pushed out by the top 15 quota
      expect(pages).not.toContain("https://aiwni.com/developers/terms");
      expect(pages).not.toContain("https://aiwni.com/developers/privacy");
    });
  });
});
