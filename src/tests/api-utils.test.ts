import { describe, it, expect, vi } from "vitest";
import {
  successResponse,
  errorResponse,
  validationError,
  notFoundResponse,
  unauthorizedResponse,
  serverErrorResponse,
  safeAPIRoute,
  validateBody,
  checkRequired,
  sanitizeError,
} from "@/lib/api-utils";
import { NextResponse } from "next/server";

// Mock NextResponse
vi.mock("next/server", () => {
  return {
    NextResponse: {
      json: vi.fn((body, init) => {
        return {
          status: init?.status ?? 200,
          json: async () => body,
        };
      }),
    },
  };
});

describe("API Utils Module", () => {
  describe("Response Helpers", () => {
    it("successResponse بترجع الـ format الصح (status 200 by default)", async () => {
      const res = successResponse({ user: "Ahmed" });
      const body = await (res as any).json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: { user: "Ahmed" },
        message: "Success",
        status: 200,
      });
    });

    it("errorResponse بترجع الـ format الصح وتقبل string أو Error", async () => {
      const res1 = errorResponse("Something went wrong", 400);
      const body1 = await (res1 as any).json();

      expect(res1.status).toBe(400);
      expect(body1).toEqual({
        success: false,
        error: "Something went wrong",
        status: 400,
      });

      const res2 = errorResponse(new Error("Another error"), 500);
      const body2 = await (res2 as any).json();
      expect(body2.error).toBe("Another error");
    });

    it("validationError بيرجع 400", async () => {
      const res = validationError("Invalid input");
      expect(res.status).toBe(400);
    });

    it("notFoundResponse بيرجع 404", async () => {
      const res = notFoundResponse();
      expect(res.status).toBe(404);
    });

    it("unauthorizedResponse بيرجع 401", async () => {
      const res = unauthorizedResponse();
      expect(res.status).toBe(401);
    });

    it("serverErrorResponse بيرجع 500", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const res = serverErrorResponse(new Error("Crash"));
      expect(res.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("safeAPIRoute wrapper", () => {
    it("لو الدالة نجحت → بيرجع نتيجتها", async () => {
      const handler = async () => successResponse("OK");
      const wrapped = await safeAPIRoute(handler);

      const res = await wrapped({} as Request);
      expect(res.status).toBe(200);
    });

    it("لو الدالة رمت exception → بيتلقفها ويرجع 500 من غير ما يكسر السيرفر", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const handler = async () => { throw new Error("Boom"); };
      
      const wrapped = await safeAPIRoute(handler as any);
      const res = await wrapped({} as Request);

      expect(res.status).toBe(500);
      const body = await (res as any).json();
      expect(body.error).toBe("Internal server error");

      consoleSpy.mockRestore();
    });
  });

  describe("validateBody", () => {
    it("body صحيح → بيعدي", async () => {
      const req = { json: async () => ({ name: "Ahmed" }) } as Request;
      const schema = (data: any) => ({ valid: !!data.name });

      const result = await validateBody(req, schema);
      expect(result.data).toEqual({ name: "Ahmed" });
      expect(result.error).toBeNull();
    });

    it("body غلط → بيرجع error", async () => {
      const req = { json: async () => ({ age: 20 }) } as Request;
      const schema = (data: any) => ({ valid: !!data.name, errors: ["Missing name"] });

      const result = await validateBody(req, schema);
      expect(result.data).toBeNull();
      expect(result.error).toBe("Missing name");
    });
  });

  describe("checkRequired", () => {
    it("حقول موجودة → تعدي", () => {
      const result = checkRequired({ name: "A", email: "B" }, ["name", "email"]);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("حقل ناقص → بيرجع اسم الحقل الناقص في الرسالة", () => {
      const result = checkRequired({ name: "A" }, ["name", "email"]);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(["email"]);
    });
  });

  describe("sanitizeError", () => {
    it("UNIQUE constraint → هذا البريد مسجل بالفعل", () => {
      expect(sanitizeError(new Error("UNIQUE constraint failed"))).toBe("هذا البريد مسجل بالفعل");
    });
    
    it("Foreign key → خطأ في البيانات المرجعية", () => {
      expect(sanitizeError(new Error("Foreign key constraint failed"))).toBe("خطأ في البيانات المرجعية");
    });
  });
});
