import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLimit = vi.hoisted(() => vi.fn());

const MockRatelimitClass = vi.hoisted(() => {
  return class {
    limit = mockLimit;
    static slidingWindow = vi.fn();
  };
});

vi.mock("@upstash/ratelimit", () => {
  return {
    Ratelimit: MockRatelimitClass,
  };
});

vi.mock("@upstash/redis", () => {
  return {
    Redis: class {
      constructor() {}
    },
  };
});

import { rateLimit, getIP } from "@/lib/rate-limit";

describe("Rate Limit Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "http://fake-redis");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
    vi.stubEnv("NODE_ENV", "production");
  });

  describe("rateLimit", () => {
    it("تحت الحد → success: true", async () => {
      mockLimit.mockResolvedValue({ success: true, remaining: 5, reset: Date.now() + 10000 });

      const res = await rateLimit("ip-1", { limit: 10, windowSecs: 60 });
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(5);
    });

    it("فوق الحد → success: false مع retryAfter رقم موجب", async () => {
      // reset after 5 seconds
      const resetTime = Date.now() + 5000;
      mockLimit.mockResolvedValue({ success: false, remaining: 0, reset: resetTime });

      const res = await rateLimit("ip-1", { limit: 10, windowSecs: 60 });
      expect(res.success).toBe(false);
      expect(res.remaining).toBe(0);
      expect(res.retryAfter).toBeGreaterThanOrEqual(4); // ~5
      expect(res.retryAfter).toBeLessThanOrEqual(6);
    });

    it("لو الـ Redis رمى error (مشكلة اتصال) → fail-open (success: true)", async () => {
      mockLimit.mockRejectedValue(new Error("Connection refused"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await rateLimit("ip-1", { limit: 10, windowSecs: 60 });
      expect(res.success).toBe(true);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Redis error"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("getIP", () => {
    function mockRequest(headers: Record<string, string>) {
      return {
        headers: {
          get: (name: string) => headers[name] || null,
        }
      } as any as Request;
    }

    it("بياخد أول IP من x-forwarded-for لو فيه أكتر من واحد", () => {
      const req = mockRequest({
        "x-forwarded-for": " 192.168.1.1 , 10.0.0.1, 127.0.0.1 ",
      });
      expect(getIP(req)).toBe("192.168.1.1");
    });

    it("فاليباك لـ x-real-ip لو x-forwarded-for مش موجود", () => {
      const req = mockRequest({
        "x-real-ip": "10.0.0.1",
      });
      expect(getIP(req)).toBe("10.0.0.1");
    });

    it("بيرجع unknown لو مفيش headers", () => {
      const req = mockRequest({});
      expect(getIP(req)).toBe("unknown");
    });
  });
});
