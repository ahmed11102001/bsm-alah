import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.hoisted(() => {
  process.env.DEV_JWT_SECRET = "super-secret-key-12345";
  process.env.NODE_ENV = "production";
});

import {
  signDevToken,
  verifyDevToken,
  getDevSessionFromRequest,
  buildDevSessionCookie,
  buildDevLogoutCookie,
  type DevSession,
} from "@/lib/dev-auth";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";

describe("Dev Auth Module", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("signDevToken & verifyDevToken", () => {
    const payload: DevSession = {
      id: "user-1",
      email: "dev@example.com",
      name: "Ahmed",
      status: "ACTIVE",
    };

    it("تشفير وفك تشفير الجلسة (Round-trip) يرجع نفس البيانات", async () => {
      const token = await signDevToken(payload);
      
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);

      const decoded = await verifyDevToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.id).toBe(payload.id);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.name).toBe(payload.name);
      expect(decoded?.status).toBe(payload.status);
    });

    it("توكن متلاعب فيه يرجع null (بدون رمي exception)", async () => {
      const token = await signDevToken(payload);
      const tampered = token.slice(0, -5) + "abcde"; // تغيير النهاية

      const decoded = await verifyDevToken(tampered);
      expect(decoded).toBeNull();
    });

    it("توكن منتهي الصلاحية يرجع null", async () => {
      // ننشئ توكن ينتهي بعد ثانية واحدة (للتجربة المباشرة بـ jose)
      const SECRET = new TextEncoder().encode("super-secret-key-12345");
      const shortToken = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1s") // 1 second
        .sign(SECRET);

      // نسرع الزمن ثانيتين
      vi.advanceTimersByTime(2000);

      const decoded = await verifyDevToken(shortToken);
      expect(decoded).toBeNull();
    });

    it("توكن فاضي أو undefined أو فورمات غلط يرجع null من غير كراش", async () => {
      expect(await verifyDevToken("")).toBeNull();
      expect(await verifyDevToken("random-string-not-jwt")).toBeNull();
      expect(await verifyDevToken(undefined as any)).toBeNull();
    });
  });

  describe("getDevSessionFromRequest", () => {
    it("كوكي صحيح → بيرجع الجلسة", async () => {
      const token = await signDevToken({
        id: "user-1",
        email: "test@test.com",
        name: null,
        status: "ACTIVE",
      });

      // Mock NextRequest
      const req = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: token }),
        },
      } as unknown as NextRequest;

      const session = await getDevSessionFromRequest(req);
      expect(session).not.toBeNull();
      expect(session?.id).toBe("user-1");
      expect(req.cookies.get).toHaveBeenCalledWith("dev-session");
    });

    it("من غير كوكي → يرجع null", async () => {
      const req = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as NextRequest;

      const session = await getDevSessionFromRequest(req);
      expect(session).toBeNull();
    });
  });

  describe("Cookie Builders", () => {
    it("buildDevSessionCookie بيبني الـ cookie بالخصائص الصح لـ Production", () => {
      const cookie = buildDevSessionCookie("my-token");
      
      expect(cookie).toContain("dev-session=my-token");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Secure"); // لأن NODE_ENV="production" متعملها stub
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toMatch(/Max-Age=\d+/);
    });

    it("buildDevLogoutCookie بيبني cookie يمسح الجلسة بـ Max-Age=0", () => {
      const cookie = buildDevLogoutCookie();
      
      expect(cookie).toContain("dev-session=");
      expect(cookie).not.toContain("my-token");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Max-Age=0");
    });
  });
});
