import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  developerOtpTemplate: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/env-deprecation", () => ({
  warnDeprecatedSecretOnce: vi.fn(),
}));

import { GET, POST } from "@/app/api/developers/webhook/route";
import { NextRequest } from "next/server";

describe("Developers Webhook API — /api/developers/webhook", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/developers/webhook (Verification)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("GET Verification", () => {
    it("إذا لم يتم ضبط WHATSAPP_VERIFY_TOKEN → 500", async () => {
      delete process.env.WHATSAPP_VERIFY_TOKEN;

      const req = new NextRequest("http://localhost/api/developers/webhook?hub.mode=subscribe&hub.verify_token=token&hub.challenge=123");
      const res = await GET(req);

      expect(res.status).toBe(500);
    });

    it("Token مطابق → 200 ويرجع challenge", async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = "my-secret-verify-token";

      const req = new NextRequest(
        "http://localhost/api/developers/webhook?hub.mode=subscribe&hub.verify_token=my-secret-verify-token&hub.challenge=challenge_12345"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe("challenge_12345");
    });

    it("Token غير مطابق → 403", async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = "my-secret-verify-token";

      const req = new NextRequest(
        "http://localhost/api/developers/webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=challenge_12345"
      );
      const res = await GET(req);

      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/developers/webhook (Meta status updates)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("POST Updates", () => {
    const APP_SECRET = "test-meta-app-secret";

    function makeSignedReq(payload: object): NextRequest {
      const rawBody = JSON.stringify(payload);
      const hmac = createHmac("sha256", APP_SECRET).update(rawBody, "utf8").digest("hex");

      return new NextRequest("http://localhost/api/developers/webhook", {
        method: "POST",
        body: rawBody,
        headers: {
          "Content-Type": "application/json",
          "x-hub-signature-256": `sha256=${hmac}`,
        },
      });
    }

    it("توقيع غير صحيح لما APP_SECRET مضبوط → 401", async () => {
      process.env.META_APP_SECRET = APP_SECRET;

      const req = new NextRequest("http://localhost/api/developers/webhook", {
        method: "POST",
        body: JSON.stringify({ entry: [] }),
        headers: {
          "Content-Type": "application/json",
          "x-hub-signature-256": "sha256=invalid-signature-hash",
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("تحديث حالة القالب لـ APPROVED بنجاح", async () => {
      process.env.META_APP_SECRET = APP_SECRET;

      const webhookPayload = {
        entry: [
          {
            changes: [
              {
                field: "message_template_status_update",
                value: {
                  event: "APPROVED",
                  message_template_id: "meta-tmpl-100",
                  message_template_name: "otp_code",
                  message_template_language: "ar",
                },
              },
            ],
          },
        ],
      };

      mockPrisma.developerOtpTemplate.findFirst.mockResolvedValue({
        id: "tmpl-1",
        name: "otp_code",
        status: "PENDING",
      });
      mockPrisma.developerOtpTemplate.update.mockResolvedValue({});

      const res = await POST(makeSignedReq(webhookPayload));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);

      expect(mockPrisma.developerOtpTemplate.update).toHaveBeenCalledWith({
        where: { id: "tmpl-1" },
        data: {
          status: "APPROVED",
          metaTemplateId: "meta-tmpl-100",
          rejectedReason: null,
        },
      });
    });

    it("تحديث حالة القالب لـ REJECTED ومعه سبب الرفض", async () => {
      process.env.META_APP_SECRET = APP_SECRET;

      const webhookPayload = {
        entry: [
          {
            changes: [
              {
                field: "message_template_status_update",
                value: {
                  event: "REJECTED",
                  message_template_id: "meta-tmpl-200",
                  message_template_name: "promo_template",
                  reason: "INCORRECT_CATEGORY",
                },
              },
            ],
          },
        ],
      };

      mockPrisma.developerOtpTemplate.findFirst.mockResolvedValue({
        id: "tmpl-2",
        name: "promo_template",
        status: "PENDING",
      });
      mockPrisma.developerOtpTemplate.update.mockResolvedValue({});

      const res = await POST(makeSignedReq(webhookPayload));

      expect(res.status).toBe(200);

      expect(mockPrisma.developerOtpTemplate.update).toHaveBeenCalledWith({
        where: { id: "tmpl-2" },
        data: {
          status: "REJECTED",
          metaTemplateId: "meta-tmpl-200",
          rejectedReason: "INCORRECT_CATEGORY",
        },
      });
    });
  });
});
