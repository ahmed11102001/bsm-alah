// src/lib/rate-limit.ts
// ─── Rate Limiter موحد — Redis في Production، In-Memory في Dev ───────────────
//
// على Vercel كل serverless instance عنده memory منفصلة، يعني الـ in-memory
// store بيتصفّر مع كل cold start وبيخلي الحماية بلا معنى.
// الحل: Upstash Redis (HTTP-based) بيشتغل على Edge + Serverless بدون مشاكل.
//
// Sliding Window Algorithm:
//   أدق من Fixed Window — مش بيسمح بـ burst في نهاية window وأول التانية.
//   مثال: limit=5 كل دقيقة → مش هينفع تعمل 5 في :59 وتاني 5 في 1:00.
//
// Fallback:
//   لو UPSTASH_REDIS_REST_URL مش متحط → ephemeralCache للـ dev.
//   في Production لازم يكون Redis متحط.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis }     from "@upstash/redis";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** عدد الطلبات المسموح بيها في الـ window */
  limit:      number;
  /** المدة بالثواني */
  windowSecs: number;
}

export interface RateLimitResult {
  success:      boolean;
  retryAfter?:  number;   // ثواني لحين إعادة المحاولة
  remaining?:   number;   // كم طلب فاضل في الـ window
}

// ─── Cache: نحتفظ بـ Ratelimit instance لكل config مختلف ─────────────────────
// عشان مننشئش Redis connection جديد مع كل request
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowSecs: number): Ratelimit {
  const cacheKey = `${limit}:${windowSecs}`;

  if (limiterCache.has(cacheKey)) {
    return limiterCache.get(cacheKey)!;
  }

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // ── Production: Upstash Redis ─────────────────────────────────────────────
  if (url && token) {
    const redis   = new Redis({ url, token });
    const limiter = new Ratelimit({
      redis,
      limiter:   Ratelimit.slidingWindow(limit, `${windowSecs} s`),
      prefix:    "rl",
      analytics: false,
    });
    limiterCache.set(cacheKey, limiter);
    return limiter;
  }

  // ── Development: ephemeralCache fallback ──────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[rate-limit] UPSTASH_REDIS_REST_URL و UPSTASH_REDIS_REST_TOKEN مطلوبين في Production.\n" +
      "  1. سجّل على console.upstash.com\n" +
      "  2. أنشئ Redis database\n" +
      "  3. حط الـ env vars في Vercel Dashboard"
    );
  }

  const limiter = new Ratelimit({
    redis:          new Redis({ url: "http://localhost", token: "dev" }),
    limiter:        Ratelimit.slidingWindow(limit, `${windowSecs} s`),
    ephemeralCache: new Map(),
    prefix:         "rl",
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

// ═══════════════════════════════════════════════════════════════════════════════
// الدالة الرئيسية — نفس الـ API القديم + async
// ═══════════════════════════════════════════════════════════════════════════════

export async function rateLimit(
  key: string,
  { limit, windowSecs }: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const limiter = getLimiter(limit, windowSecs);
    const { success, remaining, reset } = await limiter.limit(key);

    if (success) {
      return { success: true, remaining };
    }

    const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
    return { success: false, retryAfter, remaining: 0 };

  } catch (err) {
    // لو Redis وقع → نسمح بالطلب ومننكسرش الـ app
    console.error("[rate-limit] Redis error — allowing request as fallback:", err);
    return { success: true, remaining: undefined };
  }
}

// ─── Helper: استخراج الـ IP من الـ Request ───────────────────────────────────

export function getIP(req: Request): string {
  const headers = (req as any).headers;
  return (
    headers.get?.("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get?.("x-real-ip")                              ??
    "unknown"
  );
}