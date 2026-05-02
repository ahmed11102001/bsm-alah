// src/lib/rate-limit.ts
// In-memory rate limiter — يشتغل على Vercel Serverless بدون Redis
// كل instance عنده memory منفصلة — ده كافي لمنع abuse بشكل معقول

interface RateLimitEntry {
  count:     number;
  resetAt:   number;
}

const store = new Map<string, RateLimitEntry>();

// نظّف القيود المنتهية كل 5 دقايق عشان مننفضش RAM
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** عدد الطلبات المسموح بيها */
  limit:      number;
  /** المدة بالثواني قبل ما العداد يتصفّر */
  windowSecs: number;
}

/**
 * بترجع { success: true } لو في حد للطلب،
 * أو { success: false, retryAfter } لو اتجاوز الحد.
 *
 * key: أي string — عادةً IP + endpoint
 */
export function rateLimit(
  key: string,
  { limit, windowSecs }: RateLimitConfig
): { success: boolean; retryAfter?: number } {
  const now     = Date.now();
  const resetAt = now + windowSecs * 1000;

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // طلب جديد أو نافذة انتهت
    store.set(key, { count: 1, resetAt });
    return { success: true };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { success: false, retryAfter };
  }

  entry.count++;
  return { success: true };
}

/** استخرج الـ IP من الـ Request headers */
export function getIP(req: Request): string {
  const headers = (req as any).headers;
  return (
    headers.get?.("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get?.("x-real-ip") ??
    "unknown"
  );
}