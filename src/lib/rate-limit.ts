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
  /** true عندما فشل الـ limiter نفسه والطلب أُغلق (failureMode: "closed") */
  unavailable?: boolean;
}

export interface RateLimitOptions {
  /**
   * ماذا يحدث لو Redis فشل أثناء الفحص:
   * - "fallback" (default): in-memory sliding-window limiter مؤقت — نفس الـ
   *   limit/window لكن per-instance (حماية جزئية على serverless، مش بديل مكافئ).
   *   مناسب للـ routes العادية حيث الـ availability أهم.
   * - "closed": رفض الطلب (`success: false, unavailable: true`) — للعمليات
   *   الحساسة (OTP send/verify) حيث الـ abuse أخطر من رفض مؤقت أثناء عطل Redis.
   */
  failureMode?: "fallback" | "closed";
}

// ─── In-memory sliding-window fallback ──────────────────────────────────────
// يُستخدم فقط عند فشل Redis. نفس semantics الـ sliding window لكن per-instance:
// على Vercel كل instance له ذاكرة منفصلة، فهو طبقة حماية مؤقتة ضد الـ bypass
// الكامل — وليس بديلًا مكافئًا لـ Redis المركزي.
const fallbackHits = new Map<string, number[]>();
const FALLBACK_MAX_KEYS = 10000;

/** للاختبارات فقط — تصفير الـ fallback state بين الحالات. */
export function clearRateLimitFallback(): void {
  fallbackHits.clear();
}

function fallbackCheck(key: string, limit: number, windowSecs: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSecs * 1000;
  const hits = (fallbackHits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    fallbackHits.set(key, hits);
    const retryAfter = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    return { success: false, retryAfter, remaining: 0 };
  }
  hits.push(now);
  fallbackHits.set(key, hits);
  if (fallbackHits.size > FALLBACK_MAX_KEYS) {
    const oldest = fallbackHits.keys().next().value;
    if (oldest) fallbackHits.delete(oldest);
  }
  return { success: true, remaining: limit - hits.length };
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
  { limit, windowSecs }: RateLimitConfig,
  opts?: RateLimitOptions
): Promise<RateLimitResult> {
  const failureMode = opts?.failureMode ?? "fallback";
  try {
    const limiter = getLimiter(limit, windowSecs);
    const { success, remaining, reset } = await limiter.limit(key);

    if (success) {
      return { success: true, remaining };
    }

    const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
    return { success: false, retryAfter, remaining: 0 };

  } catch (err) {
    if (failureMode === "closed") {
      // عملية حساسة (OTP): عطل Redis ≠ تصريح مفتوح — نرفض بدل السماح.
      console.error("[rate-limit] Redis error — failing CLOSED:", err);
      return {
        success: false,
        unavailable: true,
        retryAfter: Math.min(windowSecs, 60),
        remaining: 0,
      };
    }
    // routes العادية: in-memory fallback مؤقت بدل الـ bypass الكامل.
    console.error("[rate-limit] Redis error — in-memory fallback:", err);
    return fallbackCheck(key, limit, windowSecs);
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