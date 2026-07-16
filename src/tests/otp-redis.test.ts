import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedis = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  ttl: vi.fn(),
};

vi.mock("@upstash/redis", () => {
  return {
    Redis: class {
      constructor() {
        return mockRedis;
      }
    }
  };
});

// Import after mocking
import {
  hashOtpCode,
  safeCompareHash,
  storeOtp,
  getOtp,
  verifyOtp,
  updateOtpStatus,
  deleteOtp,
  type OtpData,
} from "@/lib/otp-redis";

describe("OTP Redis Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "http://fake-url");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
  });

  describe("hashOtpCode & safeCompareHash", () => {
    it("hashOtpCode بيطلع نفس الـ hash لنفس الكود وبيعمل trim", () => {
      const hash1 = hashOtpCode("123456");
      const hash2 = hashOtpCode(" 123456 ");
      const hash3 = hashOtpCode("654321");

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    it("safeCompareHash بيرجع true لو متطابقين و false لو لأ", () => {
      const code = "123456";
      const hash = hashOtpCode(code);

      expect(safeCompareHash(code, hash)).toBe(true);
      expect(safeCompareHash("000000", hash)).toBe(false);
    });

    it("safeCompareHash مش بيرمي error لو طول الـ hash مختلف، بيرجع false بس", () => {
      const code = "123456";
      const badLengthHash = "abcdef"; // Not 64 chars

      expect(() => safeCompareHash(code, badLengthHash)).not.toThrow();
      expect(safeCompareHash(code, badLengthHash)).toBe(false);
    });
  });

  describe("storeOtp", () => {
    it("بيبعت للـ Redis بالفورمات الصح والـ TTL الصح", async () => {
      const opts = {
        token: "test-token",
        code: "123456",
        phone: "+201000000000",
        projectId: "proj-1",
        developerId: "dev-1",
        status: "PENDING" as const,
        expiryMinutes: 10,
      };

      await storeOtp(opts);

      expect(mockRedis.set).toHaveBeenCalledTimes(1);
      const [key, valueStr, exObj] = mockRedis.set.mock.calls[0];

      expect(key).toBe("otp:test-token");
      
      const value = JSON.parse(valueStr) as OtpData;
      expect(value.codeHash).toBe(hashOtpCode("123456"));
      expect(value.phone).toBe("+201000000000");
      expect(value.status).toBe("PENDING");
      
      // TTL = expiryMinutes + 5 = 15 minutes = 900 seconds
      expect(exObj).toEqual({ ex: 900 });
    });
  });

  describe("getOtp", () => {
    it("بيرجع الاوبجكت لو موجود في Redis", async () => {
      const fakeData = { status: "PENDING", phone: "+201000" };
      mockRedis.get.mockResolvedValue(JSON.stringify(fakeData));

      const result = await getOtp("test-token");
      expect(result).toEqual(fakeData);
      expect(mockRedis.get).toHaveBeenCalledWith("otp:test-token");
    });

    it("بيرجع null لو مش موجود", async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await getOtp("test-token");
      expect(result).toBeNull();
    });

    it("بيرجع null لو الـ JSON فاسد بدل ما يرمي error", async () => {
      mockRedis.get.mockResolvedValue("invalid-json");
      const result = await getOtp("test-token");
      expect(result).toBeNull();
    });
  });

  describe("verifyOtp", () => {
    const validCode = "123456";
    const validHash = hashOtpCode(validCode);
    const validProjectId = "proj-1";

    function makeMockOtp(overrides: Partial<OtpData> = {}): OtpData {
      return {
        codeHash: validHash,
        phone: "+201000",
        projectId: validProjectId,
        developerId: "dev-1",
        status: "PENDING",
        metaMessageId: null,
        error: null,
        sentAt: null,
        verifiedAt: null,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 100000).toISOString(), // Not expired
        ...overrides,
      };
    }

    it("token مش موجود → بيرجع error", async () => {
      mockRedis.get.mockResolvedValue(null);
      const res = await verifyOtp("t", "123456", "p");
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/غير موجود/);
    });

    it("project id مختلف → بيرجع error", async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(makeMockOtp()));
      const res = await verifyOtp("t", "123456", "wrong-proj");
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/لا ينتمي/);
    });

    it("كود غلط → بيرفض وما يغيرش الـ status", async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(makeMockOtp()));
      const res = await verifyOtp("t", "000000", validProjectId);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/غير صحيح/);
      expect(mockRedis.set).not.toHaveBeenCalled(); // No update status
    });

    it("كود صح (PENDING/SENT) → بيرجع success وبيعمل update لـ VERIFIED", async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(makeMockOtp()));
      mockRedis.ttl.mockResolvedValue(100);
      
      const res = await verifyOtp("t", validCode, validProjectId);
      expect(res.success).toBe(true);
      expect(res.phone).toBe("+201000");

      expect(mockRedis.set).toHaveBeenCalledTimes(1); // updateOtpStatus called set
      const updatedValue = JSON.parse(mockRedis.set.mock.calls[0][1]);
      expect(updatedValue.status).toBe("VERIFIED");
      expect(updatedValue.verifiedAt).not.toBeNull();
    });

    it("OTP منتهي الصلاحية → يرفض حتى لو الكود صح وبيعمل update لـ EXPIRED", async () => {
      const expiredOtp = makeMockOtp({
        expiresAt: new Date(Date.now() - 100000).toISOString() // Expired
      });
      mockRedis.get.mockResolvedValue(JSON.stringify(expiredOtp));
      mockRedis.ttl.mockResolvedValue(100);

      const res = await verifyOtp("t", validCode, validProjectId);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/انتهت صلاحيته/);
      
      expect(mockRedis.set).toHaveBeenCalledTimes(1);
      const updatedValue = JSON.parse(mockRedis.set.mock.calls[0][1]);
      expect(updatedValue.status).toBe("EXPIRED");
    });
    
    it("OTP حالة VERIFIED → بيرجع alreadyVerified: true", async () => {
      const verifiedOtp = makeMockOtp({ status: "VERIFIED" });
      mockRedis.get.mockResolvedValue(JSON.stringify(verifiedOtp));

      const res = await verifyOtp("t", validCode, validProjectId);
      expect(res.success).toBe(true);
      expect(res.alreadyVerified).toBe(true);
    });
  });

  describe("updateOtpStatus & deleteOtp", () => {
    it("updateOtpStatus بيبعت للـ Redis ويحافظ على الـ TTL", async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ status: "PENDING" }));
      mockRedis.ttl.mockResolvedValue(500);

      await updateOtpStatus("t", "SENT");

      expect(mockRedis.set).toHaveBeenCalledWith(
        "otp:t",
        expect.stringContaining('"status":"SENT"'),
        { ex: 500 }
      );
    });

    it("deleteOtp بيبعت للـ Redis", async () => {
      await deleteOtp("test-token");
      expect(mockRedis.del).toHaveBeenCalledWith("otp:test-token");
    });
  });
});
